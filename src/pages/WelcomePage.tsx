import { motion } from 'framer-motion'
import { BottomDock } from '../components/BottomDock'

type WelcomePageProps = {
  onStart?: () => void
}

export function WelcomePage({ onStart }: WelcomePageProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 1.04,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative min-h-[100dvh] bg-[#151210] text-[#F5F1EB] pb-[100px]"
    >
      {/* HERO */}

      <motion.div
        className="relative h-[48vh] min-h-[300px] max-h-[420px]"
        initial={{
          scale: 1.08,
          opacity: 0,
        }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        transition={{
          duration: 1.1,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <img
          src="/hero-cover.png"
          alt="Cordwainer"
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(21,18,16,.15) 0%, rgba(21,18,16,.40) 50%, #151210 100%)",
          }}
        />

        <div className="absolute top-3 left-4 right-4 z-10 flex items-start justify-between">
          <div>
            <h1
              className="font-display text-[2.35rem] leading-[0.9] text-[#F5F1EB]"
              style={{
                textShadow: "0 2px 20px rgba(0,0,0,.5)",
              }}
            >
              Cordwainer
            </h1>

            <p className="mt-1.5 text-[10px] tracking-[0.2em] uppercase text-[#B9ACA0]">
              Энциклопедия обувного мастерства
            </p>
          </div>

          <button className="w-9 h-9 rounded-full bg-[#1D1815]/70 border border-[#C6A47A]/25 flex items-center justify-center text-[#F5F1EB] backdrop-blur-md">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>

        <motion.div
          initial={{
            y: 20,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          transition={{
            delay: .35,
            duration: .6,
          }}
          className="absolute bottom-14 left-4 z-10"
        >
          <p className="text-[9px] tracking-[0.2em] uppercase text-[#B9ACA0]/80 mb-3">
            Issue 01 · 2026
          </p>

          <div className="flex flex-col gap-0.5 text-[8px] tracking-[0.12em] uppercase text-[#B9ACA0]/50 leading-tight">
            <span>Предмет как идея.</span>
            <span>Форма как язык.</span>
            <span>Мастерство как опыт.</span>
          </div>
        </motion.div>
      </motion.div>

      {/* CONTENT */}

      <div className="relative z-10 px-4 -mt-6">

<motion.div
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    delay: 0.15,
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1],
  }}
  className="grid grid-cols-3 gap-2 mb-4"
>
  {[
    { title: 'Материалы', sub: 'Кожа · Замша\nПодошвы', accent: '#D8A35C' },
    { title: 'Цвета', sub: 'Колористика\nПатина', accent: '#A78BFA' },
    { title: 'Фасоны\nи силуэты', sub: 'Классика\nУличные', accent: '#60A5FA' },
  ].map((item, index) => (
    <motion.button
      key={item.title}
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.22 + index * 0.08,
        duration: 0.45,
      }}
      whileTap={{
        scale: 0.97,
      }}
      className="rounded-2xl p-2.5 text-left"
      style={{
        background: 'rgba(39,33,29,.78)',
        border: '1px solid rgba(198,164,122,.22)',
        backdropFilter: 'blur(24px)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,.04),0 6px 18px rgba(0,0,0,.30)',
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 text-sm"
        style={{
          background: `${item.accent}20`,
          color: item.accent,
          boxShadow: `0 0 14px ${item.accent}35`,
        }}
      >
        ●
      </div>

      <div className="text-[11px] font-semibold leading-tight text-[#F5F1EB] whitespace-pre-line">
        {item.title}
      </div>

      <div className="text-[9px] mt-1 leading-snug text-[#B9ACA0] whitespace-pre-line">
        {item.sub}
      </div>
    </motion.button>
  ))}
</motion.div>

{/* ISSUE 01 */}

<motion.button
  onClick={onStart}
  initial={{
    opacity: 0,
    y: 24,
  }}
  animate={{
    opacity: 1,
    y: 0,
  }}
  transition={{
    delay: .45,
    duration: .6,
  }}
  whileHover={{
    scale: 1.01,
  }}
  whileTap={{
    scale: .98,
  }}
  className="relative overflow-hidden w-full h-[72px] rounded-[26px] mb-5"
  style={{
    background:
      "linear-gradient(180deg,#F8F3EB 0%,#ECE1D0 100%)",
    border: "1px solid rgba(214,179,126,.30)",
    boxShadow:
      "0 14px 36px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.95)",
  }}
>

  <motion.div
    className="absolute inset-y-0 -left-24 w-24"
    animate={{
      x: [-60, 460],
    }}
    transition={{
      repeat: Infinity,
      duration: 3,
      repeatDelay: 2,
    }}
    style={{
      background:
        "linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent)",
      transform: "skewX(-18deg)",
      filter: "blur(4px)",
    }}
  />

  <div className="relative h-full flex items-center justify-between px-6">

    <div className="flex flex-col text-left">

      <span
        className="uppercase"
        style={{
          fontSize: 10,
          letterSpacing: ".30em",
          color: "#8F6A42",
          fontWeight: 700,
        }}
      >
        ISSUE 01
      </span>

      <span
        style={{
          marginTop: 6,
          fontSize: 20,
          fontWeight: 700,
          color: "#1A1612",
        }}
      >
        Начать обучение
      </span>

    </div>

    <motion.div
      animate={{
        x: [0,6,0],
      }}
      transition={{
        repeat: Infinity,
        duration: 1.4,
      }}
      style={{
        fontSize: 28,
        color: "#8F6A42",
      }}
    >
      →
    </motion.div>

  </div>

</motion.button>

{/* FAVORITES */}

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    delay: 0.65,
    duration: 0.55,
  }}
>
  <div className="flex items-center justify-between mb-2 px-0.5">
    <span className="text-[10px] tracking-[0.14em] uppercase text-[#B9ACA0]">
      Избранное
    </span>

    <button className="text-[11px] text-[#D8A35C] active:opacity-70">
      Смотреть все
    </button>
  </div>

  <div className="flex gap-2">
    {['🪵', '🎨', '👞'].map((emoji, i) => (
      <motion.div
        key={i}
        whileTap={{ scale: 0.95 }}
        whileHover={{ y: -2 }}
        className="w-14 h-14 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{
          background: '#27211D',
          border: '1px solid rgba(198,164,122,.2)',
          boxShadow: '0 6px 18px rgba(0,0,0,.25)',
        }}
      >
        {emoji}
      </motion.div>
    ))}

    <motion.div
      whileTap={{ scale: 0.95 }}
      className="w-14 h-14 rounded-xl flex items-center justify-center text-[12px] font-medium text-[#B9ACA0] shrink-0"
      style={{
        background: 'rgba(39,33,29,.85)',
        border: '1px solid rgba(198,164,122,.2)',
      }}
    >
      +12
    </motion.div>
  </div>
</motion.div>

<BottomDock active="search" />

</motion.div>





