import { useState, useEffect, useRef } from 'react';

type Lang = 'ru' | 'uk';

type CreditLine = {
  text: string;
  customStyle?: string;
};

type AboutProjectProps = {
  lang?: Lang;
  onClose?: () => void;
};

// Настройки синхронизации с музыкой (подбираем под 8-bit трек)
const SONG_BPM = 122; // Темп трека (удары в минуту)
const MS_PER_BEAT = 60000 / SONG_BPM; // Длительность одного удара (\~491.8 мс)
const CHAR_DELAY = MS_PER_BEAT / 16; // Скорость печати (16 символов на 1 удар = \~30.7 мс)
const LINE_DELAY = MS_PER_BEAT * 1; // Пауза в конце строки (ровно 1 удар)
const EMPTY_LINE_DELAY = MS_PER_BEAT / 2; // Пауза на пустых строках (половина удара)

// Компактный ASCII-арт (35 символов в ширину) — идеально помещается на любых смартфонах
const ASCII_TITLE = `
▄▄▄ ▄▄▄ ▄▄▄ ▄▄  █ █ ▄▄▄ █ █ █ ▄▄▄ ▄▄▄
█   █ █ █▀▄ █ █ █▀█ █▀█ █ █▄█ █▄  █▀▄
▀▀▀ ▀▀▀ ▀ ▀ ▀▀  ▀ ▀ ▀ ▀ ▀ ▀ ▀ ▀▀▀ ▀ ▀
`.trim();

const CREDITS: Record<Lang, CreditLine[]> = {
  ru: [
    { text: 'C:\\> INIT.EXE --boot-sequence' },
    { text: 'Loading CORDWAINER.SYS... [OK]' },
    { text: 'Mounting virtual drives... [OK]' },
    { text: 'Initializing neural core... [WARNING]' },
    { text: 'Bypassing security protocols... [DONE]' },
    { text: '' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'C:\\> TYPE GRATITUDE.TXT' },
    { text: '' },
    { text: 'БЛАГОДАРНОСТЬ' },
    { text: '' },
    { text: 'Отдельно хочу выразить искреннюю' },
    { text: 'благодарность коллективу компании' },
    { text: '«Форвард Орто».' },
    { text: '' },
    { text: 'Спасибо коллегам за профессиональный' },
    { text: 'опыт, знания, поддержку и возможность' },
    { text: 'работать в среде, где я смог получить' },
    { text: 'практическое понимание обувного' },
    { text: 'производства и ремесла.' },
    { text: '' },
    { text: 'Этот опыт стал важной частью основы,' },
    { text: 'на которой появился проект Cordwainer.' },
    { text: '' },
    { text: 'Спасибо коллективу «Форвард Орто»' },
    { text: 'за вклад в мой профессиональный путь.' },
    { text: '' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'Посвящается Маме', customStyle: 'text-pink-400 text-lg drop-shadow-[0_0_12px_rgba(244,114,182,0.95)] tracking-[0.25em]' },
    { text: '' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'C:\\> EXECUTE TECH_SPECS.BAT' },
    { text: 'Analyzing architecture... [DONE]' },
    { text: 'Loading system profiles... [OK]' },
    { text: '' },
    { text: 'ТЕХНИЧЕСКАЯ БАЗА И АРХИТЕКТУРА' },
    { text: '' },
    { text: '[ ПЛАТФОРМА ]' },
    { text: '> Telegram Mini Apps (TMA)' },
    { text: '  * SDK: @tma.js/sdk — тема, safe-area, Haptic Feedback' },
    { text: '  * Нативная синхронизация Dark / Light' },
    { text: '' },
    { text: '[ ФРОНТЕНД ]' },
    { text: '> React 18 + TypeScript (strict) + Vite' },
    { text: '  * SPA, функциональные компоненты, HMR' },
    { text: '  * Tailwind CSS, Framer Motion, React Markdown' },
    { text: '' },
    { text: '[ ЦВЕТОВАЯ НАУКА И РАСЧЁТЫ ]' },
    { text: '> Спектральная колориметрия (380–780 нм)' },
    { text: '  * База спектров отражения пигментов и связующих' },
    { text: '> Two-Constant Kubelka–Munk + Saunderson' },
    { text: '  * Модель смешения (K/S), учёт поверхностного' },
    { text: '    отражения на границе воздух–краска' },
    { text: '  * Reflectance → XYZ (CIE 1931, 2°) → sRGB' },
    { text: '  * Источники: D65, A, cool, twilight' },
    { text: '> CIEDE2000 (ΔE₀₀)' },
    { text: '  * Метрика цветового различия, согласованная' },
    { text: '    с восприятием глаза; подбор рецептов' },
    { text: '  * Поиск по объёмным долям + локальная оптимизация' },
    { text: '> Web Worker для тяжёлых переборов рецептов' },
    { text: '  * UI остаётся отзывчивым при оптимизации' },
    { text: '' },
    { text: '[ ПРОИЗВОДИТЕЛЬНОСТЬ ]' },
    { text: '> Custom Performance Profiler' },
    { text: '  * FPS (requestAnimationFrame), deviceMemory / CPU' },
    { text: '  * Fast Mode на слабых Android: отключение эффектов' },
    { text: '  * Цель: стабильные 60 FPS' },
    { text: '' },
    { text: '[ ДАННЫЕ И ИНФРАСТРУКТУРА ]' },
    { text: '> State + Web Storage (кэш, избранное, настройки)' },
    { text: '> Vercel Edge + GitHub CI/CD + глобальная CDN' },
    { text: '' },
    { text: 'SYS.STATUS: ALL SYSTEMS NOMINAL' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'C:\\> LOGOUT' },
    { text: 'Сессия завершена. Спасибо, что открыли терминал.' },
    { text: '' },
    { text: '' },
  ],
  uk: [
    { text: 'C:\\> INIT.EXE --boot-sequence' },
    { text: 'Loading CORDWAINER.SYS... [OK]' },
    { text: 'Mounting virtual drives... [OK]' },
    { text: 'Initializing neural core... [WARNING]' },
    { text: 'Bypassing security protocols... [DONE]' },
    { text: '' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'C:\\> TYPE GRATITUDE.TXT' },
    { text: '' },
    { text: 'ВДЯЧНІСТЬ' },
    { text: '' },
    { text: 'Окремо хочу висловити щиру' },
    { text: 'подяку колективу компанії' },
    { text: '«Форвард Орто».' },
    { text: '' },
    { text: 'Дякую колегам за професійний' },
    { text: 'досвід, знання, підтримку та можливість' },
    { text: 'працювати в середовищі, де я зміг отримати' },
    { text: 'практичне розуміння взуттєвого' },
    { text: 'виробництва та ремесла.' },
    { text: '' },
    { text: 'Цей досвід став важливою частиною основи,' },
    { text: 'на якій зʼявився проєкт Cordwainer.' },
    { text: '' },
    { text: 'Дякую колективу «Форвард Орто»' },
    { text: 'за внесок у мій професійний шлях.' },
    { text: '' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'Присвячується Мамі', customStyle: 'text-pink-400 text-lg drop-shadow-[0_0_12px_rgba(244,114,182,0.95)] tracking-[0.25em]' },
    { text: '' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'C:\\> EXECUTE TECH_SPECS.BAT' },
    { text: 'Analyzing architecture... [DONE]' },
    { text: 'Loading system profiles... [OK]' },
    { text: '' },
    { text: 'ТЕХНІЧНА БАЗА ТА АРХІТЕКТУРА' },
    { text: '' },
    { text: '[ ПЛАТФОРМА ]' },
    { text: '> Telegram Mini Apps (TMA)' },
    { text: '  * SDK: @tma.js/sdk — тема, safe-area, Haptic Feedback' },
    { text: '  * Нативна синхронізація Dark / Light' },
    { text: '' },
    { text: '[ ФРОНТЕНД ]' },
    { text: '> React 18 + TypeScript (strict) + Vite' },
    { text: '  * SPA, функціональні компоненти, HMR' },
    { text: '  * Tailwind CSS, Framer Motion, React Markdown' },
    { text: '' },
    { text: '[ КОЛЬОРОВА НАУКА ТА РОЗРАХУНКИ ]' },
    { text: '> Спектральна колориметрія (380–780 нм)' },
    { text: '  * База спектрів відбиття пігментів і звʼязуючих' },
    { text: '> Two-Constant Kubelka–Munk + Saunderson' },
    { text: '  * Модель змішування (K/S), урахування поверхневого' },
    { text: '    відбиття на межі повітря–фарба' },
    { text: '  * Reflectance → XYZ (CIE 1931, 2°) → sRGB' },
    { text: '  * Джерела: D65, A, cool, twilight' },
    { text: '> CIEDE2000 (ΔE₀₀)' },
    { text: '  * Метрика колірної різниці, узгоджена' },
    { text: '    зі сприйняттям ока; підбір рецептів' },
    { text: '  * Пошук за обʼємними частками + локальна оптимізація' },
    { text: '> Web Worker для важких переборів рецептів' },
    { text: '  * UI залишається чуйним під час оптимізації' },
    { text: '' },
    { text: '[ ПРОДУКТИВНІСТЬ ]' },
    { text: '> Custom Performance Profiler' },
    { text: '  * FPS (requestAnimationFrame), deviceMemory / CPU' },
    { text: '  * Fast Mode на слабких Android: вимкнення ефектів' },
    { text: '  * Мета: стабільні 60 FPS' },
    { text: '' },
    { text: '[ ДАНІ ТА ІНФРАСТРУКТУРА ]' },
    { text: '> State + Web Storage (кеш, обране, налаштування)' },
    { text: '> Vercel Edge + GitHub CI/CD + глобальна CDN' },
    { text: '' },
    { text: 'SYS.STATUS: ALL SYSTEMS NOMINAL' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'C:\\> LOGOUT' },
    { text: 'Сесію завершено. Дякуємо, що відкрили термінал.' },
    { text: '' },
    { text: '' },
  ],
};

export default function AboutProject({ lang = 'ru', onClose }: AboutProjectProps) {
  const lines = CREDITS[lang] || CREDITS.ru;

  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = new Audio('/audio/start-me-up-8bit.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => {});

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      setFinished(true);
      return;
    }

    const line = lines[currentLineIndex];
    const fullText = line.text;

    if (currentCharIndex < fullText.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[currentLineIndex] = fullText.slice(0, currentCharIndex + 1);
          return next;
        });
        setCurrentCharIndex((c) => c + 1);
      }, fullText === '' ? EMPTY_LINE_DELAY : CHAR_DELAY);
    } else {
      timeoutRef.current = setTimeout(() => {
        setCurrentLineIndex((i) => i + 1);
        setCurrentCharIndex(0);
        setDisplayedLines((prev) => [...prev, '']);
      }, fullText === '' ? EMPTY_LINE_DELAY : LINE_DELAY);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentLineIndex, currentCharIndex, lines]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedLines]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black font-mono text-[#00FF41] overflow-hidden select-none">
      <div
        className="pointer-events-none absolute inset-0 z-30 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 4px)',
        }}
      />

      <div className="relative z-20 shrink-0 pt-8 pb-3 bg-black border-b border-[#00FF41]/25 min-h-[65px] flex items-center">
        
        <div className="w-full overflow-x-auto no-scrollbar">
          <div className="w-fit min-w-full flex justify-center px-2">
            <pre
              className="text-center text-[#00FF41] whitespace-pre font-mono tracking-tighter"
              style={{
                fontSize: 'clamp(6px, 2.2vw, 12px)',
                lineHeight: '1.1',
                WebkitTextSizeAdjust: 'none',
                textSizeAdjust: 'none',
              }}
            >
              {ASCII_TITLE}
            </pre>
          </div>
        </div>

        <button
          onClick={toggleMusic}
          className="absolute top-2 right-2 z-30 bg-black px-2.5 py-1 border border-[#00FF41]/70 hover:bg-[#00FF41] hover:text-[#00FF41] transition text-[10px] tracking-widest uppercase shadow-[0_0_8px_rgba(0,0,0,1)]"
        >
          {isPlaying ? '■ STOP' : '▶ MUSIC'}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
      >
        <div className="max-w-2xl mx-auto space-y-1 text-[12.5px] md:text-[14px] leading-relaxed pb-24">
          {displayedLines.map((text, idx) => {
            const style = lines[idx]?.customStyle ?? '';
            const isCurrent = idx === currentLineIndex && !finished;

            return (
              <div key={idx} className={`${style} whitespace-pre-wrap`}>
                {text}
                {isCurrent && text !== '' && (
                  <span className="inline-block w-[0.55ch] h-[1.05em] ml-0.5 bg-current animate-pulse align-middle" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-20 shrink-0 border-t border-[#00FF41]/30 bg-black">
        {finished && (
          <div className="flex justify-center py-4">
            <button
              onClick={onClose}
              className="px-8 py-2.5 border-2 border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black transition tracking-[0.3em] uppercase text-sm font-bold"
            >
              {lang === 'uk' ? '[ ПОВЕРНУТИСЯ ]' : '[ ВЕРНУТЬСЯ ]'}
            </button>
          </div>
        )}

        <div className="px-4 py-2 flex justify-between text-[10px] tracking-widest text-[#00FF41]/60">
          <span>CORDWAINER TERMINAL v1.0</span>
          <span>{lang.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
