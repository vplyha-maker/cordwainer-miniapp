import { useState, useEffect, useRef } from 'react';

type CreditLine = {
  text: string;
  customStyle?: string;
};

type Lang = 'ru' | 'uk';

type AboutProjectProps = {
  lang?: Lang;
  onClose?: () => void;
};

const ASCII_TITLE = `
 ██████╗ ██████╗ ██████╗ ██████╗ ██╗    ██╗ █████╗ ██╗███╗   ██╗███████╗██████╗ 
██╔════╝██╔═══██╗██╔══██╗██╔══██╗██║    ██║██╔══██╗██║████╗  ██║██╔════╝██╔══██╗
██║     ██║   ██║██████╔╝██║  ██║██║ █╗ ██║███████║██║██╔██╗ ██║█████╗  ██████╔╝
██║     ██║   ██║██╔══██╗██║  ██║██║███╗██║██╔══██║██║██║╚██╗██║██╔══╝  ██╔══██╗
╚██████╗╚██████╔╝██║  ██║██████╔╝╚███╔███╔╝██║  ██║██║██║ ╚████║███████╗██║  ██║
 ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝
`.trim();

const CREDITS: Record<Lang, CreditLine[]> = {
  ru: [
    { text: '' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'ТЕХНИЧЕСКАЯ БАЗА ПРОЕКТА' },
    { text: '' },
    { text: 'Cordwainer — современное web-приложение,' },
    { text: 'разработанное на TypeScript + React.' },
    { text: '' },
    { text: 'Сборщик и dev-сервер: Vite' },
    { text: 'Архитектура: компонентный подход React' },
    { text: '' },
    { text: 'ОСНОВНОЙ СТЕК:' },
    { text: '• TypeScript (strict mode)' },
    { text: '• React + React Hooks' },
    { text: '• Vite' },
    { text: '• Tailwind CSS' },
    { text: '• Framer Motion' },
    { text: '• Web Storage API / localStorage' },
    { text: '• Telegram WebApp API' },
    { text: '• HTML5 / CSS3' },
    { text: '• ES2020 / ESNext' },
    { text: '' },
    { text: 'Страницы: WelcomePage, HomePage, BlogPage' },
    { text: 'Состояние: useState / useEffect' },
    { text: 'Данные пользователя: localStorage' },
    { text: 'Навигация: state-based (welcome / home / blog)' },
    { text: '' },
    { text: 'Performance layer: определение слабых' },
    { text: 'устройств и переключение в Fast Mode.' },
    { text: '' },
    { text: 'Интеграция с Telegram:' },
    { text: 'ready() • expand() • themeChanged' },
    { text: 'haptic feedback • цвета контейнера' },
    { text: '' },
    { text: '════════════════════════════════════════════════' },
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
    { text: 'Спасибо, что открыли этот экран.' },
    { text: '' },
    { text: '' },
  ],
  uk: [
    { text: '' },
    { text: '════════════════════════════════════════════════' },
    { text: '' },
    { text: 'ТЕХНІЧНА БАЗА ПРОЄКТУ' },
    { text: '' },
    { text: 'Cordwainer — сучасний web-застосунок,' },
    { text: 'розроблений на TypeScript + React.' },
    { text: '' },
    { text: 'Збирач і dev-сервер: Vite' },
    { text: 'Архітектура: компонентний підхід React' },
    { text: '' },
    { text: 'ОСНОВНИЙ СТЕК:' },
    { text: '• TypeScript (strict mode)' },
    { text: '• React + React Hooks' },
    { text: '• Vite' },
    { text: '• Tailwind CSS' },
    { text: '• Framer Motion' },
    { text: '• Web Storage API / localStorage' },
    { text: '• Telegram WebApp API' },
    { text: '• HTML5 / CSS3' },
    { text: '• ES2020 / ESNext' },
    { text: '' },
    { text: 'Сторінки: WelcomePage, HomePage, BlogPage' },
    { text: 'Стан: useState / useEffect' },
    { text: 'Дані користувача: localStorage' },
    { text: 'Навігація: state-based (welcome / home / blog)' },
    { text: '' },
    { text: 'Performance layer: визначення слабких' },
    { text: 'пристроїв та перемикання в Fast Mode.' },
    { text: '' },
    { text: 'Інтеграція з Telegram:' },
    { text: 'ready() • expand() • themeChanged' },
    { text: 'haptic feedback • кольори контейнера' },
    { text: '' },
    { text: '════════════════════════════════════════════════' },
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
    { text: 'Дякуємо, що відкрили цей екран.' },
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
      }, fullText === '' ? 60 : 22);
    } else {
      timeoutRef.current = setTimeout(() => {
        setCurrentLineIndex((i) => i + 1);
        setCurrentCharIndex(0);
        setDisplayedLines((prev) => [...prev, '']);
      }, fullText === '' ? 140 : 380);
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

      {/* Увеличили pt-8, чтобы освободить место сверху для кнопки */}
      <div className="relative z-20 shrink-0 pt-8 pb-3 bg-black border-b border-[#00FF41]/25 min-h-[65px] flex items-center">
        
        <div className="w-full overflow-x-auto no-scrollbar">
          {/* Конструкция w-fit min-w-full центрирует текст, но при переполнении оставляет левый край доступным */}
          <div className="w-fit min-w-full flex justify-center px-2">
            <pre
              className="text-center text-[#00FF41] whitespace-pre font-mono tracking-tighter"
              style={{
                // clamp использует ширину экрана (vw) - Android не сможет это сломать
                fontSize: 'clamp(3px, 1.15vw, 8px)',
                lineHeight: '1.05',
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
          // Кнопка приподнята (top-2), имеет фон (bg-black) и тени, чтобы всегда быть поверх текста
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
