import { useState, useEffect, useRef } from 'react';

type CreditLine = {
  text: string;
  customStyle?: string;
};

type Lang = 'ru' | 'uk';

type AboutProjectProps = {
  lang?: Lang;
};

const CREDITS: Record<Lang, CreditLine[]> = {
  ru: [
    { text: 'CORDWAINER', customStyle: 'text-3xl md:text-4xl font-bold mb-8 text-[#00FF41] uppercase tracking-[0.3em]' },
    { text: '' },
    { text: '══════════════════════════════════════' },
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
    { text: '══════════════════════════════════════' },
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
    { text: '══════════════════════════════════════' },
    { text: '' },
    { text: 'Посвящается маме', customStyle: 'text-pink-400 text-xl drop-shadow-[0_0_10px_rgba(244,114,182,0.9)] tracking-widest' },
    { text: '' },
    { text: '══════════════════════════════════════' },
    { text: '' },
    { text: 'Спасибо, что открыли этот экран.' },
    { text: '' },
    { text: '> _' },
  ],
  uk: [
    { text: 'CORDWAINER', customStyle: 'text-3xl md:text-4xl font-bold mb-8 text-[#00FF41] uppercase tracking-[0.3em]' },
    { text: '' },
    { text: '══════════════════════════════════════' },
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
    { text: '══════════════════════════════════════' },
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
    { text: '══════════════════════════════════════' },
    { text: '' },
    { text: 'Присвячується мамі', customStyle: 'text-pink-400 text-xl drop-shadow-[0_0_10px_rgba(244,114,182,0.9)] tracking-widest' },
    { text: '' },
    { text: '══════════════════════════════════════' },
    { text: '' },
    { text: 'Дякуємо, що відкрили цей екран.' },
    { text: '' },
    { text: '> _' },
  ],
};

export default function AboutProject({ lang = 'ru' }: AboutProjectProps) {
  const lines = CREDITS[lang] || CREDITS.ru;

  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Попытка запустить музыку в фоне при монтировании
  useEffect(() => {
    const audio = new Audio('/audio/start-me-up-8bit.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;

    // Пробуем автозапуск (иногда работает при запуске по внешней ссылке)
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Автозапуск заблокирован — ждём клика по кнопке
      });

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

  // Эффект печатной машинки (DOS-стиль)
  useEffect(() => {
    if (currentLineIndex >= lines.length) return;

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
      }, fullText === '' ? 80 : 28); // чуть быстрее для DOS-ощущения
    } else {
      timeoutRef.current = setTimeout(() => {
        setCurrentLineIndex((i) => i + 1);
        setCurrentCharIndex(0);
        setDisplayedLines((prev) => [...prev, '']);
      }, fullText === '' ? 180 : 420);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentLineIndex, currentCharIndex, lines]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black font-mono text-[#00FF41] overflow-hidden">
      {/* Лёгкий сканлайн-эффект (опционально) */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Кнопка музыки */}
      <button
        onClick={toggleMusic}
        className="absolute top-4 right-4 z-20 px-3 py-1.5 border border-[#00FF41] hover:bg-[#00FF41] hover:text-black transition text-xs tracking-widest uppercase"
      >
        {isPlaying ? '■ STOP' : '▶ MUSIC'}
      </button>

      {/* Основной терминал */}
      <div className="relative z-0 flex-1 overflow-y-auto px-5 py-16 md:py-20">
        <div className="max-w-2xl mx-auto space-y-1 text-[13px] md:text-[15px] leading-relaxed">
          {displayedLines.map((text, idx) => {
            const style = lines[idx]?.customStyle ?? '';
            const isCurrent = idx === currentLineIndex;

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

      {/* Нижняя строка статуса */}
      <div className="relative z-20 px-5 py-3 border-t border-[#00FF41]/30 text-[11px] tracking-widest text-[#00FF41]/70 flex justify-between">
        <span>CORDWAINER TERMINAL v1.0</span>
        <span>{lang.toUpperCase()}</span>
      </div>
    </div>
  );
    }
