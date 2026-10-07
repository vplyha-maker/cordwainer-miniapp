import { useState, useRef } from 'react';
// useState — для реактивного состояния UI (статус, прогресс, логи и т.д.)
// useRef — для хранения AbortController, который должен жить между рендерами
// и не вызывать лишних перерисовок

// ====================== STREAMING CSV PARSER ======================
// Класс, который принимает куски текста и по мере накопления
// целых строк вызывает onRow. Не держит весь файл в памяти.

class StreamingCSVParser {
  private buffer = '';
  // Буфер, в котором копятся "хвосты" строк,
  // которые были разрезаны границей чанка

  private headers: string[] | null = null;
  // Заголовки CSV. null, пока не прочитали первую строку

  private onRow: (row: Record<string, string>) => Promise<void>;
  // Асинхронный колбэк, который вызывается на каждую готовую строку.
  // Promise нужен, чтобы мы могли ждать отправки батча (backpressure)

  private sanitizeKey: (k: string) => string;
  // Функция очистки имён колонок от опасных ключей (__proto__ и т.п.)

  constructor(
    onRow: (row: Record<string, string>) => Promise<void>,
    sanitizeKey: (k: string) => string
  ) {
    this.onRow = onRow;
    this.sanitizeKey = sanitizeKey;
  }

  // Простейший state-machine парсер одной CSV-строки
  // Умеет игнорировать запятые внутри кавычек и правильно
  // обрабатывать экранированные кавычки ""
  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';          // текущее накапливаемое значение ячейки
    let inQuotes = false;      // находимся ли мы внутри кавычек
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        // Две кавычки подряд внутри quoted-поля = одна литеральная кавычка
        if (inQuotes && next === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // Переключаем режим "внутри кавычек / снаружи"
        inQuotes = !inQuotes;
        i++;
        continue;
      }

      // Запятая — разделитель полей, но только если мы НЕ внутри кавычек
      if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
        continue;
      }

      // Обычный символ — просто добавляем в текущую ячейку
      current += char;
      i++;
    }

    // Последняя ячейка (после последней запятой или если запятых не было)
    result.push(current.trim());

    // Убираем внешние кавычки и восстанавливаем экранированные ""
    return result.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
  }

  // Главный метод: принимает очередной кусок текста
  // и по возможности выдаёт готовые строки через onRow
  async feed(chunk: string) {
    this.buffer += chunk;   // дописываем новый кусок к хвосту

    // Режем по переводам строк. Последний элемент может быть неполным —
    // его возвращаем обратно в buffer
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;   // пустые строки пропускаем

      const values = this.parseLine(line);

      // Первая непустая строка — это заголовки
      if (!this.headers) {
        this.headers = values.map(this.sanitizeKey);
        continue;
      }

      // Собираем объект { колонка: значение }
      const obj: Record<string, string> = {};
      this.headers.forEach((h, idx) => {
        obj[h] = values[idx] ?? '';   // если колонок меньше — пустая строка
      });

      // Ждём, пока onRow закончит работу (отправка батча + пауза).
      // Именно это создаёт backpressure и не даёт устроить DDoS.
      await this.onRow(obj);
    }
  }

  // Вызывается в самом конце, когда файл закончился,
  // чтобы обработать последнюю строку, которая могла остаться в buffer
  async flush() {
    if (this.buffer.trim() && this.headers) {
      const values = this.parseLine(this.buffer);
      const obj: Record<string, string> = {};
      this.headers.forEach((h, idx) => {
        obj[h] = values[idx] ?? '';
      });
      await this.onRow(obj);
      this.buffer = '';
    }
  }
}

// Защита от Prototype Pollution и Mass Assignment
function sanitizeKey(key: string): string {
  const dangerous = [
    '__proto__', 'constructor', 'prototype',
    'toString', 'valueOf', '__defineGetter__', '__defineSetter__'
  ];
  // Если ключ опасный — переименовываем, чтобы он не мог
  // испортить Object.prototype
  if (dangerous.includes(key.toLowerCase())) {
    return `_blocked_${key}`;
  }
  // Оставляем только безопасные символы (буквы, цифры, _, -, .)
  return key.replace(/[^\wа-яА-ЯёЁ\-_.]/gi, '_');
}

// ====================== COMPONENT ======================

export default function HackerUploader() {
  // --- Состояние UI ---
  const [status, setStatus] = useState('Ожидание файла...');
  const [progress, setProgress] = useState(0);          // 0–100
  const [logs, setLogs] = useState<string[]>([]);       // последние N сообщений
  const [isRunning, setIsRunning] = useState(false);    // идёт ли загрузка
  const [uploadedRows, setUploadedRows] = useState(0);  // сколько строк уже ушло
  const [token, setToken] = useState('');               // X-Upload-Token

  // AbortController живёт в ref, чтобы его можно было
  // вызвать из кнопки "ABORT" и чтобы он не терялся при рендерах
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Константы (можно вынести в конфиг) ---
  const CHUNK_SIZE_BYTES = 2 * 1024 * 1024; // размер куска файла (2 МБ)
  const ROWS_PER_REQUEST = 120;             // сколько строк в одном POST
  const DELAY_MS = 70;                      // пауза между запросами (мс)

  // Добавляет строку в начало лога и обрезает до 20 записей
  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  };

  // Главный обработчик выбора файла
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Базовая валидация на клиенте (бэкенд всё равно должен проверять сам)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setStatus('Только .csv');
      return;
    }
    if (!token.trim()) {
      setStatus('Введи токен');
      return;
    }

    // Сбрасываем состояние перед стартом
    setIsRunning(true);
    setProgress(0);
    setUploadedRows(0);
    setLogs([]);

    // Создаём контроллер для возможности прервать все fetch
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setStatus('Streaming mode (UTF-8 safe)...');
    addLog(`Файл: ${(file.size / 1024 / 1024).toFixed(1)} МБ`);

    let currentBatch: Record<string, string>[] = []; // накапливаем строки до ROWS_PER_REQUEST
    let totalUploaded = 0;                           // общий счётчик отправленных строк
    let bytesRead = 0;                               // сколько байт уже прочитали

    // TextDecoder в режиме stream: true запоминает "оборванные"
    // UTF-8 байты между чанками и корректно склеивает их
    const decoder = new TextDecoder('utf-8', { stream: true });

    // Отправка одного батча строк на сервер
    const sendBatch = async (batch: Record<string, string>[]) => {
      if (batch.length === 0) return;

      const res = await fetch('/api/upload-chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Upload-Token': token.trim(),   // токен, который ввёл пользователь
        },
        body: JSON.stringify({ rows: batch }),
        signal,                             // позволяет прервать запрос через AbortController
      });

      if (!res.ok) {
        // Пытаемся вытащить текст ошибки от бэкенда
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      totalUploaded += batch.length;
      setUploadedRows(totalUploaded);
      addLog(`→ ${batch.length} строк | всего ${totalUploaded}`);
    };

    // Создаём парсер. onRow будет вызываться на каждую готовую строку
    const parser = new StreamingCSVParser(async (row) => {
      currentBatch.push(row);

      // Как только набрали нужное количество строк — отправляем
      if (currentBatch.length >= ROWS_PER_REQUEST) {
        const toSend = [...currentBatch];
        currentBatch = [];                  // сразу очищаем, чтобы не держать в памяти
        await sendBatch(toSend);            // ждём ответа сервера
        await new Promise(r => setTimeout(r, DELAY_MS)); // пауза (drip-feeding)
      }
    }, sanitizeKey);

    try {
      let offset = 0;   // текущая позиция в файле (в байтах)

      // Читаем файл кусками по CHUNK_SIZE_BYTES
      while (offset < file.size) {
        // Проверяем, не нажал ли пользователь ABORT
        if (signal.aborted) {
          setStatus('Остановлено');
          addLog('ABORT');
          return;
        }

        // Вырезаем кусок файла (не загружая весь файл в RAM)
        const slice = file.slice(offset, offset + CHUNK_SIZE_BYTES);
        const arrayBuffer = await slice.arrayBuffer();

        // Декодируем байты → строка с учётом возможных оборванных UTF-8 символов
        const text = decoder.decode(arrayBuffer, { stream: true });

        bytesRead += arrayBuffer.byteLength;
        offset += CHUNK_SIZE_BYTES;

        // Отдаём кусок парсеру (он сам вызовет onRow на готовых строках)
        await parser.feed(text);

        // Обновляем прогресс-бар
        const pct = Math.min(99, Math.round((bytesRead / file.size) * 100));
        setProgress(pct);
        setStatus(`Streaming... ${pct}% · ${totalUploaded} строк`);
      }

      // После последнего куска сбрасываем внутренний буфер TextDecoder
      // (там могли остаться байты незавершённого символа)
      const finalText = decoder.decode();
      if (finalText) {
        await parser.feed(finalText);
      }

      // Обрабатываем последнюю строку, которая могла остаться в buffer парсера
      await parser.flush();

      // Отправляем хвост (если строк осталось меньше ROWS_PER_REQUEST)
      if (currentBatch.length > 0) {
        await sendBatch(currentBatch);
      }

      setProgress(100);
      setStatus(`Готово. Загружено ${totalUploaded} строк.`);
      addLog('MISSION COMPLETE');
    } catch (err: any) {
      // AbortError — это нормальное завершение по кнопке ABORT
      if (err.name === 'AbortError') {
        setStatus('Остановлено пользователем');
      } else {
        setStatus(`Ошибка: ${err.message}`);
        addLog(`FAIL: ${err.message}`);
      }
    } finally {
      // В любом случае снимаем флаг "идёт загрузка"
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  };

  // Кнопка аварийной остановки
  const stop = () => {
    abortControllerRef.current?.abort();
  };

  // ====================== UI ======================
  return (
    <div
      className="min-h-screen p-6 flex flex-col items-center justify-center font-mono"
      style={{ background: '#050505', color: '#b0b0b0' }}
    >
      <div
        className="w-full max-w-xl border rounded-xl p-6 shadow-2xl"
        style={{ borderColor: '#1a1a1a', background: '#0d0d0d' }}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl tracking-widest text-[#c9a227]">HACK.UPLOADER</h1>
          <span className="text-[10px] opacity-40 uppercase">v5 · utf-8 safe</span>
        </div>

        <p className="text-[11px] opacity-40 mb-5 leading-relaxed">
          Streaming · TextDecoder stream · backpressure · no OOM
        </p>

        {/* Поле для токена (не хардкодится в бандл) */}
        <input
          type="password"
          placeholder="X-Upload-Token"
          value={token}
          onChange={e => setToken(e.target.value)}
          disabled={isRunning}
          className="w-full mb-3 px-3 py-2 text-xs rounded bg-[#151515] border border-[#222] text-[#c9a227] placeholder:opacity-30 focus:outline-none focus:border-[#c9a227]/50"
        />

        {/* Выбор файла */}
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={isRunning}
          className="block w-full text-xs mb-5 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-[#1a1a1a] file:text-[#c9a227] hover:file:bg-[#252525] disabled:opacity-40"
        />

        {/* Кнопка аварийной остановки (видна только во время работы) */}
        {isRunning && (
          <button
            onClick={stop}
            className="mb-4 w-full py-2 text-xs rounded bg-red-950/50 text-red-400 hover:bg-red-900/60 transition border border-red-900/30"
          >
            ABORT TRANSMISSION
          </button>
        )}

        {/* Текущий статус */}
        <div className="text-sm mb-2 opacity-90">{status}</div>

        {/* Прогресс-бар */}
        <div className="w-full bg-[#151515] rounded h-1.5 mb-1 overflow-hidden">
          <div
            className="h-1.5 rounded transition-all duration-150"
            style={{
              width: `${progress}%`,
              background: progress === 100 ? '#22c55e' : '#c9a227',
            }}
          />
        </div>

        {/* Счётчики */}
        <div className="flex justify-between text-[10px] opacity-40 mb-4">
          <span>{uploadedRows} rows</span>
          <span>{progress}%</span>
        </div>

        {/* Лог последних операций */}
        {logs.length > 0 && (
          <div className="mt-3 border-t border-[#1a1a1a] pt-3">
            <div className="text-[10px] opacity-30 mb-2 tracking-wider">TRANSMISSION LOG</div>
            <div className="text-[11px] space-y-0.5 max-h-48 overflow-y-auto font-mono opacity-70 leading-tight">
              {logs.map((l, i) => (
                <div key={i} className="truncate">{l}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  }
