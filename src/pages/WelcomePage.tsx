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
            

      {/* CONTENT */}
                  
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
        
