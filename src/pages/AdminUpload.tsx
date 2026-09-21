import { useState } from 'react';

// Умная функция парсинга CSV, которая не ломается о запятые внутри текста и ссылок
function parseCSVLine(text: string) {
  let ret = [], keep = false, cur = '';
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (c === '"') { 
      keep = !keep; 
    } else if (c === ',' && !keep) { 
      ret.push(cur.trim()); 
      cur = ''; 
    } else { 
      cur += c; 
    }
  }
  ret.push(cur.trim());
  return ret.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
}

export default function AdminUpload() {
  const [status, setStatus] = useState('Ожидание файла...');
  const [progress, setProgress] = useState(0);

  const handleFile = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('Чтение файла в память телефона...');
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setStatus('Файл прочитан. Разбиваем на строки...');
      
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return setStatus('Файл пуст или ошибка формата.');

      // Достаем заголовки колонок, используя правильный парсер
      const headers = parseCSVLine(lines[0]);
      const totalRows = lines.length - 1;
      setStatus(`Найдено ${totalRows} строк. Начинаем отправку в Neon...`);

      const chunkSize = 200; // Отправляем по 200 строк
      let uploaded = 0;

      for (let i = 1; i < lines.length; i += chunkSize) {
        const chunkLines = lines.slice(i, i + chunkSize);
        const rows = chunkLines.map(line => {
          // Используем надежный парсер
          const values = parseCSVLine(line);
          let obj: any = {};
          headers.forEach((h, index) => {
            obj[h] = values[index] ? values[index] : '';
          });
          return obj;
        });

        try {
          const res = await fetch('/api/upload-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows })
          });
          
          if (!res.ok) {
            const err = await res.json();
            setStatus(`Ошибка на строке ${i}: ${err.error}`);
            return;
          }

          uploaded += rows.length;
          setProgress(Math.round((uploaded / totalRows) * 100));
          setStatus(`Загружено ${uploaded} из ${totalRows} строк...`);
        } catch (err: any) {
          setStatus(`Ошибка сети: ${err.message}. Попробуй еще раз.`);
          return;
        }
      }

      setStatus('🎉 Вся база успешно загружена в Neon без сдвигов!');
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center" style={{ background: '#09090B', color: '#F4F0E8' }}>
      <div className="w-full max-w-md border p-6 rounded-2xl shadow-2xl" style={{ borderColor: 'rgba(244, 240, 232, 0.15)', background: '#141414' }}>
        <h1 className="text-2xl font-serif mb-2">Хак-загрузчик</h1>
        <p className="text-xs opacity-50 mb-6 font-sans">Заливает тяжелые CSV в Neon в обход лимитов GitHub и Vercel без поломки колонок.</p>
        
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFile}
          className="block w-full text-sm mb-6 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
        />
        
        <div className="text-sm mb-3 font-sans opacity-80">{status}</div>
        
        <div className="w-full bg-white/5 rounded-full h-3 mb-1 overflow-hidden">
          <div className="bg-[#D8A35C] h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="text-xs opacity-40 text-right font-sans">{progress}%</div>
      </div>
    </div>
  );
}
