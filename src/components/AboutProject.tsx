import { useState, useEffect, useRef } from 'react';

type CreditLine = {
  text: string;
  customStyle?: string;
};

const creditsLines: CreditLine[] = [
  { text: "CORDWAINER", customStyle: "text-4xl font-bold mb-6 text-[#00FF41] uppercase tracking-widest" },
  { text: "" },
  { text: "Идея и Разработка" },
  { text: "Имя Фамилия" },
  { text: "" },
  { text: "Саундтрек" },
  { text: "The Rolling Stones" },
  { text: "" },
  { text: "Посвящается маме", customStyle: "text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" },
  { text: "" },
  { text: "Спасибо, что играете" },
];

export default function AboutProject() {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Запуск музыки только по клику (обходит Autoplay Policy)
  const startMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/soundtrack.mp3'); // ← замените на свой путь
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
    }
    audioRef.current.play().catch(() => {});
  };

  // Эффект печатной машинки
  useEffect(() => {
    if (currentLineIndex >= creditsLines.length) return;

    const line = creditsLines[currentLineIndex];
    const fullText = line.text;

    if (currentCharIndex < fullText.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[currentLineIndex] = fullText.slice(0, currentCharIndex + 1);
          return next;
        });
        setCurrentCharIndex((c) => c + 1);
      }, 40);
    } else {
      timeoutRef.current = setTimeout(() => {
        setCurrentLineIndex((i) => i + 1);
        setCurrentCharIndex(0);
        setDisplayedLines((prev) => [...prev, '']);
      }, fullText === '' ? 300 : 800);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentLineIndex, currentCharIndex]);

  // Останавливаем музыку при размонтировании
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black font-mono text-[#00FF41]">
      <button
        onClick={startMusic}
        className="absolute top-4 right-4 px-3 py-1 border border-[#00FF41] hover:bg-[#00FF41] hover:text-black transition text-sm"
      >
        ▶ Music
      </button>

      <div className="max-w-lg w-full px-6 space-y-1 text-center">
        {displayedLines.map((text, idx) => {
          const style = creditsLines[idx]?.customStyle ?? 'text-lg';
          const isCurrent = idx === currentLineIndex;
          return (
            <div key={idx} className={style}>
              {text}
              {isCurrent && (
                <span className="inline-block w-[0.6ch] h-[1.1em] ml-0.5 bg-current animate-pulse align-middle" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
