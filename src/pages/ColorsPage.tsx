import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Lang } from '../App'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'rectangular'
  | 'split-complementary'
  | 'monochromatic'

type Silhouette = 'runner' | 'derby' | 'pump'

const LockIcon = ({ size = 10 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mb-[1px]"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

/* ============================================================================
   1. RUNNER — LUXURY LOW-TOP RUNNER (Стиль: Brunello Cucinelli / Loro Piana)
   ============================================================================ */
function RunnerSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0]        // 60% — Кожаный остов (берцы, носок, пятка)
  const secondaryColor = colors[1]   // 30% — Замшевая союзка, язычок, задник
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Подкладка, спойлер подошвы
  const accentColor = colors[colors.length - 1] // 10% — Тонкий латеральный акцент, ходовой слой подошвы

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.4)' : 'rgba(28, 24, 22, 0.35)'
  const stitchColor = isDark ? 'rgba(244, 240, 232, 0.55)' : 'rgba(28, 24, 22, 0.45)'
  const soleBase = isDark ? '#1C1A18' : '#FAF8F5'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 320"
      className="w-full h-auto max-h-[220px] md:max-h-[280px] select-none"
    >
      <defs>
        {/* Журнальная мягкая тень от студийного софтбокса */}
        <radialGradient id="r-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.6' : '0.14'} />
          <stop offset="60%" stopColor="#000000" stopOpacity={isDark ? '0.15' : '0.03'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Благородный матовый градиент верха (кожа/нубук без бликов пластика) */}
        <linearGradient id="r-matte" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.08' : '0.15'} />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.35' : '0.18'} />
        </linearGradient>

        <linearGradient id="r-suede" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.05' : '0.1'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <ellipse cx="340" cy="285" rx="270" ry="12" fill="url(#r-shadow)" />

      <g stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.5s ease' }}>
        
        {/* ХОДОВОЙ СЛОЙ ПОДОШВЫ (Outsole — Accent 10%) */}
        <path
          d="M 108 266 L 568 266 C 586 266, 598 258, 604 246 L 588 246 C 540 256, 440 260, 340 260 C 230 260, 150 258, 106 254 Z"
          fill={accentColor}
          strokeWidth="1.2"
        />

        {/* МЕЖПОДОШВА (Midsole — Элегантная белая/кремовая база с клином) */}
        <path
          d="M 98 238 C 96 250, 102 260, 108 266 C 210 268, 380 268, 568 266 C 586 266, 598 258, 604 246 C 606 235, 598 226, 582 224 C 510 236, 420 242, 320 242 C 210 242, 140 240, 98 238 Z"
          fill={soleBase}
          strokeWidth="1.4"
        />
        {/* Задний спойлер-стабилизатор подошвы (Tertiary 15%) */}
        <path
          d="M 98 238 C 96 245, 100 252, 106 256 L 225 256 C 230 256, 234 252, 234 247 C 234 242, 230 240, 222 240 L 115 238 Z"
          fill={tertiaryColor}
          fillOpacity="0.85"
          strokeWidth="1"
        />

        {/* ПОДКЛАДКА ВОРОТНИКА (Collar Lining — Tertiary 15%) */}
        <path
          d="M 148 116 C 172 108, 204 122, 232 142 C 255 158, 276 154, 290 128 L 272 106 C 242 118, 185 108, 148 116 Z"
          fill={tertiaryColor}
          strokeWidth="1.2"
        />

        {/* ЯЗЫЧОК (Tongue — Secondary 30%) */}
        <path
          d="M 272 106 C 280 84, 302 78, 320 86 C 342 108, 372 152, 408 188 L 316 202 C 290 168, 274 130, 272 106 Z"
          fill={secondaryColor}
          strokeWidth="1.3"
        />
        <path
          d="M 272 106 C 280 84, 302 78, 320 86 C 342 108, 372 152, 408 188 L 316 202 Z"
          fill="url(#r-suede)"
        />

        {/* ВЕРХНЯЯ СОЮЗКА (Vamp — Secondary 30%) */}
        <path
          d="M 224 172 L 400 170 C 445 184, 498 198, 545 208 C 532 232, 460 242, 360 242 L 224 238 Z"
          fill={secondaryColor}
          strokeWidth="1.3"
        />
        <path
          d="M 224 172 L 400 170 C 445 184, 498 198, 545 208 C 532 232, 460 242, 360 242 L 224 238 Z"
          fill="url(#r-suede)"
        />

        {/* ОСНОВНОЙ КАРКАС И БЕРЦЫ (Quarters Overlay — Main 60%) */}
        <path
          d="M 198 188 C 238 178, 268 145, 285 116 C 294 104, 305 102, 315 110 C 345 138, 382 170, 420 188 C 400 212, 386 235, 382 242 L 222 242 C 205 224, 198 206, 198 188 Z"
          fill={mainColor}
          strokeWidth="1.4"
        />
        <path
          d="M 198 188 C 238 178, 268 145, 285 116 C 294 104, 305 102, 315 110 C 345 138, 382 170, 420 188 C 400 212, 386 235, 382 242 L 222 242 Z"
          fill="url(#r-matte)"
        />
        <path
          d="M 205 192 C 242 182, 270 150, 288 122 C 296 110, 304 110, 312 116 C 340 144, 375 174, 410 191"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* НОСОК-ОБТЕКАТЕЛЬ (Toe Cap — Main 60%) */}
        <path
          d="M 368 242 C 374 212, 404 195, 450 198 C 495 200, 540 202, 562 208 C 576 218, 582 228, 574 236 C 520 244, 442 244, 368 242 Z"
          fill={mainColor}
          strokeWidth="1.4"
        />
        <path
          d="M 368 242 C 374 212, 404 195, 450 198 C 495 200, 540 202, 562 208 C 576 218, 582 228, 574 236 Z"
          fill="url(#r-matte)"
        />

        {/* ЗАДНИК (Heel Counter — Main 60%) */}
        <path
          d="M 98 238 C 95 204, 105 160, 126 125 C 145 146, 178 165, 222 178 C 234 202, 238 224, 236 242 C 185 242, 135 240, 98 238 Z"
          fill={mainColor}
          strokeWidth="1.4"
        />
        <path
          d="M 98 238 C 95 204, 105 160, 126 125 C 145 146, 178 165, 222 178 C 234 202, 238 224, 236 242 Z"
          fill="url(#r-matte)"
        />

        {/* ДИЗАЙНЕРСКАЯ АКЦЕНТНАЯ ЛИНИЯ (Accent 10%) */}
        <path
          d="M 215 198 C 255 225, 315 228, 395 198 C 345 235, 275 242, 202 216 Z"
          fill={accentColor}
          strokeWidth="1.2"
        />

        {/* ШНУРОВКА (Минималистичные белые/светлые штрихи) */}
        {[
          { x1: 304, y1: 122, x2: 328, y2: 110 },
          { x1: 326, y1: 140, x2: 350, y2: 128 },
          { x1: 348, y1: 156, x2: 372, y2: 144 },
          { x1: 370, y1: 172, x2: 394, y2: 160 },
        ].map((l, i) => (
          <path
            key={i}
            d={`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`}
            stroke={isDark ? '#FAF8F5' : '#FFFFFF'}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  )
}

/* ============================================================================
   2. DERBY — BESPOKE CLASSIC BROGUE (Стиль: John Lobb / Edward Green)
   ============================================================================ */
function DerbySvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0]        // 60% — Берцы, крыловидный мысок (Wingtip), пяточный стакан
  const secondaryColor = colors[1]   // 30% — Союзка (Vamp), язычок
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Кожаная подкладка, рант Goodyear
  const accentColor = colors[colors.length - 1] // 10% — Набойка каблука, подошва, шнурки

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.4)' : 'rgba(28, 24, 22, 0.35)'
  const stitchColor = isDark ? 'rgba(244, 240, 232, 0.55)' : 'rgba(28, 24, 22, 0.45)'
  const soleWood = isDark ? '#2B221E' : '#C8B29B'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 320"
      className="w-full h-auto max-h-[220px] md:max-h-[280px] select-none"
    >
      <defs>
        <radialGradient id="d-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.6' : '0.14'} />
          <stop offset="60%" stopColor="#000000" stopOpacity={isDark ? '0.15' : '0.03'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Глассаж / лоск полированной телячьей кожи */}
        <linearGradient id="d-glacage" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.15' : '0.22'} />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.4' : '0.2'} />
        </linearGradient>
      </defs>

      <ellipse cx="340" cy="285" rx="265" ry="11" fill="url(#d-shadow)" />

      <g stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.5s ease' }}>
        
        {/* НАБОРНЫЙ КАБЛУК И ПОДОШВА (Leather Sole & Stacked Heel) */}
        {/* Каблук */}
        <path d="M 112 248 L 205 250 L 205 274 L 112 274 Z" fill={soleWood} strokeWidth="1.4" />
        <line x1="112" y1="257" x2="205" y2="258" stroke={strokeColor} strokeWidth="0.9" />
        <line x1="112" y1="265" x2="205" y2="266" stroke={strokeColor} strokeWidth="0.9" />
        {/* Набойка (Accent 10%) */}
        <path d="M 112 274 L 205 274 L 203 282 L 115 282 Z" fill={accentColor} strokeWidth="1.2" />

        {/* Профиль подошвы с выраженной талией (Fiddleback Waist) */}
        <path
          d="M 205 250 C 240 250, 275 264, 320 268 L 525 268 C 555 268, 580 260, 592 248 L 588 240 C 545 252, 450 255, 320 255 C 260 255, 230 242, 205 242 Z"
          fill={soleWood}
          strokeWidth="1.4"
        />
        {/* Профилактика подошвы (Accent 10%) */}
        <path
          d="M 310 268 L 525 268 C 550 268, 572 262, 588 252 L 570 274 C 550 280, 515 282, 470 282 L 325 282 Z"
          fill={accentColor}
          strokeWidth="1.2"
        />

        {/* РАНТ ГУДЬИР (Goodyear Welt — Tertiary 15%) */}
        <path
          d="M 106 238 C 175 242, 245 242, 320 254 C 435 255, 525 250, 586 238 L 588 244 C 530 256, 440 262, 320 260 C 235 248, 165 248, 106 244 Z"
          fill={tertiaryColor}
          strokeWidth="1.2"
        />
        <path
          d="M 112 242 C 180 245, 248 245, 320 257 C 430 258, 520 253, 580 241"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.1"
          strokeDasharray="3 2"
        />

        {/* ПОДКЛАДКА ВОРОТНИКА (Lining — Tertiary 15%) */}
        <path
          d="M 136 128 C 160 114, 195 128, 230 148 C 258 162, 280 152, 296 124 L 275 106 C 242 120, 178 114, 136 128 Z"
          fill={tertiaryColor}
          strokeWidth="1.2"
        />

        {/* ЯЗЫЧОК (Tongue — Secondary 30%) */}
        <path
          d="M 275 106 C 285 86, 305 82, 322 92 C 342 114, 372 152, 405 182 L 320 196 C 298 166, 280 132, 275 106 Z"
          fill={secondaryColor}
          strokeWidth="1.3"
        />

        {/* СОЮЗКА (Vamp — Secondary 30%) */}
        <path
          d="M 240 166 L 392 154 C 445 178, 502 198, 545 208 C 525 240, 435 255, 325 254 L 240 248 Z"
          fill={secondaryColor}
          strokeWidth="1.3"
        />
        <path
          d="M 240 166 L 392 154 C 445 178, 502 198, 545 208 C 525 240, 435 255, 325 254 L 240 248 Z"
          fill="url(#d-glacage)"
        />

        {/* БЕРЦЫ ОТКРЫТОЙ ШНУРОВКИ (Quarters — Main 60%) */}
        <path
          d="M 134 132 C 160 128, 195 145, 230 156 C 262 165, 285 138, 305 108 C 312 98, 322 98, 330 106 C 358 132, 390 158, 420 174 C 395 192, 378 218, 390 236 C 355 248, 315 254, 290 255 L 188 248 L 134 186 Z"
          fill={mainColor}
          strokeWidth="1.4"
        />
        <path
          d="M 134 132 C 160 128, 195 145, 230 156 C 262 165, 285 138, 305 108 C 312 98, 322 98, 330 106 C 358 132, 390 158, 420 174 C 395 192, 378 218, 390 236 C 355 248, 315 254, 290 255 L 188 248 Z"
          fill="url(#d-glacage)"
        />
        {/* Перфорация вдоль берцев */}
        <g fill={strokeColor} opacity="0.65">
          <circle cx="340" cy="180" r="1.6" />
          <circle cx="352" cy="192" r="1.6" />
          <circle cx="362" cy="204" r="1.6" />
          <circle cx="372" cy="216" r="1.6" />
        </g>

        {/* КРЫЛОВИДНЫЙ МЫСОК С МЕДАЛЬОНОМ (Wingtip Toe Cap — Main 60%) */}
        <path
          d="M 365 254 C 388 226, 424 204, 468 184 C 476 198, 498 204, 518 195 C 550 202, 582 210, 594 220 C 600 228, 598 236, 594 242 C 540 254, 455 256, 365 254 Z"
          fill={mainColor}
          strokeWidth="1.4"
        />
        <path
          d="M 365 254 C 388 226, 424 204, 468 184 C 476 198, 498 204, 518 195 C 550 202, 582 210, 594 220 C 600 228, 598 236, 594 242 Z"
          fill="url(#d-glacage)"
        />
        {/* Изящный медальон на мыске */}
        <g fill={strokeColor} opacity="0.75">
          <circle cx="530" cy="225" r="2.2" />
          <circle cx="542" cy="225" r="1.5" />
          <circle cx="518" cy="225" r="1.5" />
          <circle cx="530" cy="216" r="1.5" />
          <circle cx="530" cy="234" r="1.5" />
          <circle cx="555" cy="228" r="1.8" />
        </g>

        {/* ЖЕСТКИЙ ЗАДНИК (Heel Counter — Main 60%) */}
        <path
          d="M 106 238 C 102 202, 114 162, 134 132 C 165 152, 202 176, 235 210 C 242 222, 246 236, 244 246 C 190 245, 142 242, 106 238 Z"
          fill={mainColor}
          strokeWidth="1.4"
        />
        <path
          d="M 106 238 C 102 202, 114 162, 134 132 C 165 152, 202 176, 235 210 C 242 222, 246 236, 244 246 Z"
          fill="url(#d-glacage)"
        />

        {/* ТОНКИЕ ВОЩЕНЫЕ ШНУРКИ (Accent 10%) */}
        {[
          { x1: 312, y1: 114, x2: 330, y2: 104 },
          { x1: 332, y1: 130, x2: 350, y2: 120 },
          { x1: 352, y1: 146, x2: 370, y2: 136 },
          { x1: 372, y1: 162, x2: 390, y2: 152 },
        ].map((l, i) => (
          <path
            key={i}
            d={`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`}
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  )
}

/* ============================================================================
   3. PUMP — HAUTE COUTURE STILETTO (Стиль: Christian Louboutin / Gianvito Rossi)
   ============================================================================ */
function PumpSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0]        // 60% — Скульптурный корпус лодочки (D'Orsay line)
  const secondaryColor = colors[1]   // 30% — Шпилька, пяточная чашка, мысок-кап
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Внутренняя кожаная стелька
  const accentColor = colors[colors.length - 1] // 10% — Лакированная подошва, набойка, пряжка

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.4)' : 'rgba(28, 24, 22, 0.35)'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 320"
      className="w-full h-auto max-h-[220px] md:max-h-[280px] select-none"
    >
      <defs>
        <radialGradient id="p-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.6' : '0.14'} />
          <stop offset="60%" stopColor="#000000" stopOpacity={isDark ? '0.15' : '0.03'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Шёлковый блеск вечерней туфли */}
        <linearGradient id="p-satin" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.18' : '0.3'} />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.42' : '0.2'} />
        </linearGradient>
      </defs>

      <ellipse cx="360" cy="285" rx="240" ry="9" fill="url(#p-shadow)" />
      <ellipse cx="160" cy="282" rx="25" ry="6" fill="url(#p-shadow)" />

      <g stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.5s ease' }}>
        
        {/* ИЗЯЩНАЯ ШПИЛЬКА (Stiletto Heel — Secondary 30%) */}
        <path
          d="M 148 160 L 190 172 C 176 200, 168 238, 164 274 L 154 274 C 154 230, 152 192, 148 160 Z"
          fill={secondaryColor}
          strokeWidth="1.3"
        />
        {/* Набойка (Accent 10%) */}
        <path d="M 154 274 L 164 274 L 164 282 L 154 282 Z" fill={accentColor} strokeWidth="1.2" />

        {/* ОТКРЫТАЯ ВНУТРЕННЯЯ СТЕЛЬКА (Insole — Tertiary 15%) */}
        <path
          d="M 154 75 C 182 72, 225 106, 280 156 C 330 202, 380 234, 420 236 L 390 255 C 310 230, 215 165, 154 122 Z"
          fill={tertiaryColor}
          strokeWidth="1.2"
        />
        {/* Тиснение на подпятнике (Accent 10%) */}
        <path d="M 185 108 L 215 132 L 206 140 L 176 116 Z" fill={accentColor} fillOpacity="0.85" strokeWidth="0.8" />

        {/* ЛАКИРОВАННАЯ ПОДОШВА ПОД СВОДОМ (Outsole — Accent 10%) */}
        <path
          d="M 150 158 C 198 168, 255 212, 320 262 C 350 282, 380 286, 412 286 L 505 286 C 535 286, 560 276, 576 264 L 570 258 C 545 270, 520 276, 492 276 L 410 276 C 380 276, 352 268, 322 245 C 255 195, 202 154, 150 150 Z"
          fill={accentColor}
          strokeWidth="1.3"
        />

        {/* ГРАЦИОЗНЫЙ КОРПУС ЛОДОЧКИ С ДЕКОЛЬТЕ (Main 60%) */}
        <path
          d="M 154 75 C 138 100, 136 136, 146 162 C 198 172, 255 212, 322 262 C 352 282, 380 286, 412 286 L 498 286 C 532 286, 560 276, 578 262 C 542 240, 482 222, 422 222 C 370 220, 318 198, 262 152 C 215 112, 178 82, 154 75 Z"
          fill={mainColor}
          strokeWidth="1.4"
        />
        <path
          d="M 154 75 C 138 100, 136 136, 146 162 C 198 172, 255 212, 322 262 C 352 282, 380 286, 412 286 L 498 286 C 532 286, 560 276, 578 262 C 542 240, 482 222, 422 222 C 370 220, 318 198, 262 152 C 215 112, 178 82, 154 75 Z"
          fill="url(#p-satin)"
        />

        {/* ПЯТОЧНАЯ ЧАШКА (Secondary 30%) */}
        <path
          d="M 154 75 C 138 100, 136 136, 146 162 C 172 168, 200 180, 228 200 C 220 170, 198 128, 154 75 Z"
          fill={secondaryColor}
          strokeWidth="1.2"
        />

        {/* ОСТРЫЙ МЫСОК-КАП (Secondary 30%) */}
        <path
          d="M 466 226 C 504 235, 545 248, 578 262 C 558 276, 532 286, 498 286 L 472 286 C 480 262, 478 242, 466 226 Z"
          fill={secondaryColor}
          strokeWidth="1.3"
        />

        {/* ЮВЕЛИРНАЯ ФУРНИТУРА / ПРЯЖКА НА МЫСКЕ (Accent 10%) */}
        <path d="M 450 220 L 485 232 L 478 248 L 442 236 Z" fill={accentColor} strokeWidth="1.1" />
        <path d="M 454 225 L 479 233 L 474 243 L 449 235 Z" fill={mainColor} strokeWidth="0.8" />
      </g>
    </svg>
  )
}

/* ============================================================================
   ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ ЦВЕТОВ
   ============================================================================ */
export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [silhouette, setSilhouette] = useState<Silhouette>('runner')
  const [baseHue, setBaseHue] = useState(0)
  const [whiteAmount, setWhiteAmount] = useState(0.05)
  const [blackAmount, setBlackAmount] = useState(0.05)
  const [showGuide, setShowGuide] = useState(false)

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const wheelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingValue = useRef<number | null>(null)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    fetch(`/api/check-purchase?userId=${userId}&productId=pro_colors`)
      .then((res) => res.json())
      .then((data) => {
        if (data.purchased) setIsProPurchased(true)
      })
      .catch((err) => console.error('Ошибка проверки покупки:', err))
  }, [])

  const handleProClick = async () => {
    const tg = (window as any).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id

    if (!userId) {
      alert('Ошибка: Откройте приложение через Telegram.')
      return
    }

    setIsPurchasing(true)
    haptic('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: 'pro_colors' }),
      })

      const data = await response.json()
      if (!response.ok || !data.invoiceLink) throw new Error(data.error)

      tg.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          haptic('heavy')
          setIsProPurchased(true)
          setShowProModal(false)
        } else if (status === 'failed') {
          alert('Оплата была отменена или произошла ошибка.')
        }
      })
    } catch (error: any) {
      console.error(error)
      alert(`Сбой сервера: ${error.message}`)
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

  const handleSchemeClick = (s: Scheme) => {
    const isFree = s === 'complementary' || s === 'analogous'
    if (!isFree && !isProPurchased) {
      haptic('medium')
      setShowProModal(true)
      return
    }
    haptic('light')
    setScheme(s)
  }

  const handleSilhouetteChange = (next: Silhouette) => {
    if (next === silhouette) return
    haptic('light')
    setSilhouette(next)
  }

  const t = {
    ru: {
      title: 'Цвета',
      complementary: 'Комплементарная',
      analogous: 'Аналогичная',
      triadic: 'Триадная',
      tetradic: 'Тетрада (квадрат)',
      rectangular: 'Тетрада (прямоугольник)',
      'split-complementary': 'Контрастная триада',
      monochromatic: 'Монохромная',
      silhouetteRunner: 'Сникер',
      silhouetteDerby: 'Дерби',
      silhouettePump: 'Лодочки',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Верх',
      roleDetailsLining: 'Детали • Подкладка',
      roleDetails: 'Детали верха',
      roleLining: 'Подкладка • Стелька',
      roleAccent: 'Подошва • Акцент',
      quote: '«Цвет — это душа обуви.»',
      white: 'К белому',
      black: 'К чёрному',
      pure: 'Чистый',
      ittenLabel: 'Круговая палитра',
      guideBtn: 'Гид',
      guideTitle: 'Цвет в дизайне',
      guideClose: 'Закрыть',
      paywallTitle: 'PRO: Палитры',
      paywallDesc:
        'Откройте доступ ко всем профессиональным цветовым схемам: триады, тетрады и благородный монохром.',
      paywallBtn: 'ОТКРЫТЬ ДОСТУП • 1 ⭐️',
      loading: 'ОБРАБОТКА...',
      guideIntro:
        'Круг Иттена — классический инструмент гармонизации цвета. В обуви он особенно важен: основная палитра почти всегда строится вокруг нейтралей (чёрный, белый, бежевый, серый), а цвет появляется точечно — в коже верха, подкладке, строчке, подошве или фурнитуре.',
      guideBalanceTitle: 'Правило баланса',
      guideBalance:
        '60 % — основной цвет (обычно нейтраль или доминирующий тон кожи).\n30 % — поддерживающий цвет (подкладка, язычок, задник).\n10 % — акцент (строчка, логотип, металлическая фурнитура, подошва).',
      guideSchemesTitle: 'Схемы и применение',
      guideComplementary:
        'Комплементарная — два противоположных цвета. Даёт сильный, энергичный контраст. Хороша для спортивной и fashion-обуви, где нужен яркий акцент на нейтральном фоне.',
      guideAnalogous:
        'Аналогичная — соседние цвета на круге. Создаёт мягкий, спокойный переход. Идеальна для классической и повседневной обуви, когда хочется богатства тона без резкости.',
      guideTriadic:
        'Триадная — три цвета через 120°. Живая и сбалансированная. Подходит для капсульных коллекций и сезонных цветовых историй.',
      guideTetradic:
        'Тетрада (квадрат) — четыре цвета через 90°. Самая яркая схема. Используйте один доминирующий тон, два поддерживающих и один чистый акцент, иначе композиция станет пёстрой.',
      guideRectangular:
        'Тетрада (прямоугольник) — две комплементарные пары со сдвигом. Мягче квадрата, даёт больше пространства для нюансов. Отлично работает в премиальной и дизайнерской обуви.',
      guideSplit:
        'Контрастная триада — основной цвет + два соседних к его комплементу. Контраст есть, но мягче чистой комплементарной. Универсальный выбор для большинства моделей.',
      guideMono:
        'Монохромная — один цвет в разных тонах и насыщенностях. Самая элегантная и «дорогая» схема. Идеальна для минимализма, вечерней обуви и когда кожа сама по себе выразительна.',
      guideFootwearTitle: 'Специфика обуви',
      guideFootwear:
        '• Верх: основной цвет (60–70 %).\n• Подкладка и стелька: поддерживающий или более светлый тон.\n• Подошва и каблук: часто нейтраль или акцент.\n• Фурнитура и строчка: самый чистый и яркий акцент (5–10 %).\n• Чёрный и белый — не «отсутствие цвета», а мощные инструменты контраста и формы.',
      guideTip:
        'Совет: всегда проверяйте сочетание при разном освещении — дневном, тёплом искусственном и холодном. Кожа и замша меняют оттенок сильнее, чем кажется.',
    },
    uk: {
      title: 'Кольори',
      complementary: 'Комплементарна',
      analogous: 'Аналогічна',
      triadic: 'Тріадна',
      tetradic: 'Тетрада (квадрат)',
      rectangular: 'Тетрада (прямокутник)',
      'split-complementary': 'Контрастна тріада',
      monochromatic: 'Монохромна',
      silhouetteRunner: 'Снікер',
      silhouetteDerby: 'Дербі',
      silhouettePump: 'Човники',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Верх',
      roleDetailsLining: 'Деталі • Підкладка',
      roleDetails: 'Деталі верху',
      roleLining: 'Підкладка • Устілка',
      roleAccent: 'Підошва • Акцент',
      quote: '«Колір — це душа взуття.»',
      white: 'До білого',
      black: 'До чорного',
      pure: 'Чистий',
      ittenLabel: 'Кругова палітра',
      guideBtn: 'Гід',
      guideTitle: 'Колір у дизайні',
      guideClose: 'Закрити',
      paywallTitle: 'PRO: Палітри',
      paywallDesc:
        'Відкрийте доступ до всіх професійних колірних схем: тріади, тетради та шляхетний монохром.',
      paywallBtn: 'ВІДКРИТИ ДОСТУП • 1 ⭐️',
      loading: 'ОБРОБКА...',
      guideIntro:
        'Коло Іттена — класичний інструмент гармонізації кольору. У взутті він особливо важливий: основна палітра майже завжди будується навколо нейтралей (чорний, білий, бежевий, сірий), а колір з’являється точково — у шкірі верху, підкладці, рядку, підошві чи фурнітурі.',
      guideBalanceTitle: 'Правило балансу',
      guideBalance:
        '60 % — основний колір (зазвичай нейтраль або домінуючий тон шкіри).\n30 % — підтримуючий колір (підкладка, язичок, задник).\n10 % — акцент (рядок, логотип, металева фурнітура, підошва).',
      guideSchemesTitle: 'Схеми і застосування',
      guideComplementary:
        'Комплементарна — два протилежні кольори. Дає сильний, енергійний контраст. Добре працює у спортивному та fashion-взутті, де потрібен яскравий акцент на нейтральному тлі.',
      guideAnalogous:
        'Аналогічна — сусідні кольори на колі. Створює м’який, спокійний перехід. Ідеальна для класичного та повсякденного взуття, коли хочеться багатства тону без різкості.',
      guideTriadic:
        'Тріадна — три кольори через 120°. Жива і збалансована. Підходить для капсульних колекцій і сезонних кольорових історій.',
      guideTetradic:
        'Тетрада (квадрат) — чотири кольори через 90°. Найяскравіша схема. Використовуйте один домінуючий тон, два підтримуючих і один чистий акцент, інакше композиція стане строкатою.',
      guideRectangular:
        'Тетрада (прямокутник) — дві комплементарні пари зі зсувом. М’якша за квадрат, дає більше простору для нюансів. Відмінно працює в преміальному та дизайнерському взутті.',
      guideSplit:
        'Контрастна тріада — основний колір + два сусідні до його комплементу. Контраст є, але м’якший за чисту комплементарну. Універсальний вибір для більшості моделей.',
      guideMono:
        'Монохромна — один колір у різних тонах і насиченостях. Найелегантніша і «дорога» схема. Ідеальна для мінімалізму, вечірнього взуття і коли шкіра сама по собі виразна.',
      guideFootwearTitle: 'Специфіка взуття',
      guideFootwear:
        '• Верх: основний колір (60–70 %).\n• Підкладка і устілка: підтримуючий або світліший тон.\n• Підошва і підбор: часто нейтраль або акцент.\n• Фурнітура і рядок: найчистіший і найяскравіший акцент (5–10 %).\n• Чорний і білий — не «відсутність кольору», а потужні інструменти контрасту і форми.',
      guideTip:
        'Порада: завжди перевіряйте поєднання при різному освітленні — денному, теплому штучному і холодному. Шкіра і замша змінюють відтінок сильніше, ніж здається.',
    },
    de: {
      title: 'Farben',
      complementary: 'Komplementär',
      analogous: 'Analog',
      triadic: 'Triadisch',
      tetradic: 'Tetradisch (Quadrat)',
      rectangular: 'Tetradisch (Rechteck)',
      'split-complementary': 'Split-Komplementär',
      monochromatic: 'Monochromatisch',
      silhouetteRunner: 'Sneaker',
      silhouetteDerby: 'Derby',
      silhouettePump: 'Pumps',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Oberleder',
      roleDetailsLining: 'Details • Futter',
      roleDetails: 'Details',
      roleLining: 'Futter • Sohle',
      roleAccent: 'Laufsohle • Akzent',
      quote: '«Farbe ist die Seele des Schuhs.»',
      white: 'Zu Weiß',
      black: 'Zu Schwarz',
      pure: 'Rein',
      ittenLabel: 'Farbkreis',
      guideBtn: 'Guide',
      guideTitle: 'Farbe im Design',
      guideClose: 'Schließen',
      paywallTitle: 'PRO: Paletten',
      paywallDesc:
        'Schalten Sie alle professionellen Farbschemata frei: Triaden, Tetraden und edles Monochrom.',
      paywallBtn: 'FREISCHALTEN FÜR 1 ⭐️',
      loading: 'LÄDT...',
      guideIntro:
        'Der Itten-Farbkreis ist ein klassisches Werkzeug zur Farbharmonisierung. Bei Schuhen ist er besonders wichtig: Die Grundpalette ist fast immer um neutrale Farben (Schwarz, Weiß, Beige, Grau) herum aufgebaut, und Farbe taucht punktuell auf — im Oberleder, im Futter, in den Nähten, der Sohle oder den Beschlägen.',
      guideBalanceTitle: 'Die Balance-Regel',
      guideBalance:
        '60 % — Hauptfarbe (meist neutral oder der dominierende Lederton).\n30 % — Unterstützende Farbe (Futter, Zunge, Fersenkappe).\n10 % — Akzent (Nähte, Logo, Metallbeschläge, Sohle).',
      guideSchemesTitle: 'Farbschemata & Anwendung',
      guideComplementary:
        'Komplementär — zwei gegenüberliegende Farben. Ergibt einen starken, energetischen Kontrast. Gut für Sport- und Fashion-Schuhe, bei denen ein leuchtender Akzent auf neutralem Grund benötigt wird.',
      guideAnalogous:
        'Analog — benachbarte Farben auf dem Kreis. Schafft einen weichen, ruhigen Übergang. Ideal für klassische und Freizeitschuhe, wenn man eine reiche Tonalität ohne Härte wünscht.',
      guideTriadic:
        'Triadisch — drei Farben im 120°-Abstand. Lebendig und ausgewogen. Geeignet für Capsule-Kollektionen und saisonale Farbgeschichten.',
      guideTetradic:
        'Tetradisch (Quadrat) — vier Farben im 90°-Abstand. Das lebhafteste Schema. Verwenden Sie einen dominierenden Ton, zwei unterstützende und einen reinen Akzent, sonst wird die Komposition zu bunt.',
      guideRectangular:
        'Tetradisch (Rechteck) — zwei komplementäre Paare mit Verschiebung. Weicher als das Quadrat, bietet mehr Raum für Nuancen. Funktioniert hervorragend bei Premium- und Designerschuhen.',
      guideSplit:
        'Split-Komplementär — Hauptfarbe + die zwei Nachbarn ihrer Komplementärfarbe. Kontrast ist vorhanden, aber weicher als rein komplementär. Eine universelle Wahl für die meisten Modelle.',
      guideMono:
        'Monochromatisch — eine Farbe in verschiedenen Tönen und Sättigungen. Das eleganteste und „teuerste“ Schema. Ideal für Minimalismus, Abendschuhe und wenn das Leder an sich schon ausdrucksstark ist.',
      guideFootwearTitle: 'Besonderheiten bei Schuhen',
      guideFootwear:
        '• Obermaterial: Hauptfarbe (60–70 %).\n• Futter und Innensohle: unterstützender oder hellerer Ton.\n• Sohle und Absatz: oft neutral oder Akzent.\n• Beschläge und Nähte: der reinste und hellste Akzent (5–10 %).\n• Schwarz und Weiß sind keine „Farblosigkeit“, sondern mächtige Werkzeuge für Kontrast und Form.',
      guideTip:
        'Tipp: Überprüfen Sie Farbkombinationen immer bei unterschiedlichen Lichtverhältnissen — Tageslicht, warmes Kunstlicht und kaltes Licht. Leder und Wildleder verändern ihren Farbton stärker als es scheint.',
    },
  }[lang]

  const makeIttenColor = (hue: number, white: number, black: number, satBase = 85): string => {
    const sat = Math.max(12, Math.min(92, satBase * (1 - white * 0.75) * (1 - black * 0.55)))
    const light = Math.max(
      18,
      Math.min(88, 50 * (1 - black * 0.9) * (1 - white * 0.45) + white * 42)
    )
    return `hsl(${((hue % 360) + 360) % 360}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`
  }

  const getColors = useCallback((): string[] => {
    const h = ((baseHue % 360) + 360) % 360

    if (scheme === 'monochromatic') {
      return [
        makeIttenColor(h, whiteAmount * 0.15, blackAmount * 0.3, 82),
        makeIttenColor(h, whiteAmount + 0.45, blackAmount * 0.2, 45),
        makeIttenColor(h, whiteAmount * 0.05, blackAmount + 0.35, 70),
      ]
    }

    switch (scheme) {
      case 'complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.55, blackAmount * 0.45, 78),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.1, blackAmount * 0.15, 88),
        ]
      case 'analogous':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 30) % 360, whiteAmount * 0.6, blackAmount * 0.35, 80),
          makeIttenColor((h - 30 + 360) % 360, whiteAmount * 0.15, blackAmount * 0.25, 86),
        ]
      case 'triadic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 120) % 360, whiteAmount * 0.55, blackAmount * 0.4, 80),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.12, blackAmount * 0.2, 86),
        ]
      case 'tetradic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 90) % 360, whiteAmount * 0.5 + 0.1, blackAmount * 0.4 + 0.05, 72),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.45 + 0.12, blackAmount * 0.35 + 0.08, 68),
          makeIttenColor((h + 270) % 360, whiteAmount * 0.08, blackAmount * 0.12, 88),
        ]
      case 'rectangular':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 60) % 360, whiteAmount * 0.45 + 0.08, blackAmount * 0.35 + 0.05, 75),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.45 + 0.12, blackAmount * 0.35 + 0.08, 70),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.08, blackAmount * 0.12, 88),
        ]
      case 'split-complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 150) % 360, whiteAmount * 0.55, blackAmount * 0.4, 80),
          makeIttenColor((h + 210) % 360, whiteAmount * 0.12, blackAmount * 0.2, 86),
        ]
      default:
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.55, blackAmount * 0.45, 78),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.1, blackAmount * 0.15, 88),
        ]
    }
  }, [baseHue, whiteAmount, blackAmount, scheme])

  const colors = getColors()
  const isTetrad = scheme === 'tetradic' || scheme === 'rectangular'

  const wheelBackground = `conic-gradient(
    from 0deg,
    hsl(0, 90%, 50%),
    hsl(30, 90%, 50%),
    hsl(60, 90%, 50%),
    hsl(90, 90%, 50%),
    hsl(120, 90%, 50%),
    hsl(150, 90%, 50%),
    hsl(180, 90%, 50%),
    hsl(210, 90%, 50%),
    hsl(240, 90%, 50%),
    hsl(270, 90%, 50%),
    hsl(300, 90%, 50%),
    hsl(330, 90%, 50%),
    hsl(360, 90%, 50%)
  )`

  const pointerColor = `hsl(${baseHue}, 85%, 50%)`

  const updateFromAngle = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = (angle + 90 + 360) % 360

    pendingValue.current = Math.round(angle)

    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        if (pendingValue.current !== null) {
          setBaseHue(pendingValue.current)
          pendingValue.current = null
        }
        rafId.current = null
      })
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateFromAngle(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    updateFromAngle(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const pointerAngle = baseHue
  const ratioLabels = isTetrad
    ? [t.main55, t.secondary20, t.secondary15, t.accent10]
    : [t.main60, t.secondary30, t.accent10]

  const roleLabels = isTetrad
    ? [t.roleUpper, t.roleDetails, t.roleLining, t.roleAccent]
    : [t.roleUpper, t.roleDetailsLining, t.roleAccent]

  const SCHEMES: Scheme[] = [
    'complementary',
    'analogous',
    'triadic',
    'tetradic',
    'rectangular',
    'split-complementary',
    'monochromatic',
  ]

  const SILHOUETTES: { id: Silhouette; label: string }[] = [
    { id: 'runner', label: t.silhouetteRunner },
    { id: 'derby', label: t.silhouetteDerby },
    { id: 'pump', label: t.silhouettePump },
  ]

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/50' : 'text-[#1C1816]/50'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative min-h-[100dvh] w-full transition-colors duration-[1.5s] ${cBg} ${cText}`}
    >
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 1px;
          background: ${isDark ? 'rgba(244,240,232,0.2)' : 'rgba(28,24,22,0.2)'};
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: ${isDark ? '#F4F0E8' : '#1C1816'};
          margin-top: -5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 pt-8 pb-4 flex items-start justify-between z-20">
        <button
          onClick={onBack}
          className={`group flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
        >
          <span className="transform transition-transform group-hover:-translate-x-1">←</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {['ru', 'uk', 'de'].map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l as Lang)}
                className={`text-[10px] font-sans uppercase tracking-[0.25em] outline-none border-0 bg-transparent cursor-pointer transition-colors duration-300 ${
                  lang === l ? cText : cTextMuted
                } ${cHover}`}
              >
                {l === 'uk' ? 'UKR' : l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowGuide(true)}
            className={`text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
          >
            {t.guideBtn}
          </button>
        </div>
      </header>

      <div className="px-6 pb-24">
        <div className="mb-10">
          <h1 className="font-serif text-[18vw] min-[400px]:text-6xl leading-[0.85] tracking-[-0.04em]">
            {t.title}
          </h1>
        </div>

        {/* СХЕМЫ ЦВЕТОВ */}
        <div className={`flex overflow-x-auto gap-8 pb-5 mb-10 border-b ${cLine} scrollbar-hide`}>
          {SCHEMES.map((s) => {
            const isFree = s === 'complementary' || s === 'analogous'
            const isLocked = !isFree && !isProPurchased

            return (
              <button
                key={s}
                onClick={() => handleSchemeClick(s)}
                className={`flex items-center gap-1.5 text-[9px] font-sans uppercase tracking-[0.25em] whitespace-nowrap transition-all duration-300 outline-none border-none bg-transparent cursor-pointer ${
                  scheme === s ? `italic ${cText} opacity-100` : `${cTextMuted} opacity-60 hover:opacity-100`
                }`}
              >
                {isLocked && (
                  <span className="text-[#FFB020]">
                    <LockIcon size={8} />
                  </span>
                )}
                {t[s]}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center md:items-start mb-16">
          {/* ЦВЕТОВОЙ КРУГ ИТТЕНА */}
          <div className="flex flex-col items-center shrink-0">
            <div
              ref={wheelRef}
              className="relative w-[180px] h-[180px] md:w-[220px] md:h-[220px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: wheelBackground,
                boxShadow: `0 0 0 1px ${
                  isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }, 0 10px 30px rgba(0,0,0,0.15)`,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div
                className="absolute inset-[24%] rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 32%, white 0%, ${colors[0]} 42%, #111 95%)`,
                  boxShadow:
                    'inset -4px -4px 12px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.25)',
                }}
              />
              <div
                className="absolute top-1 left-1/2 w-4 h-4 rounded-full border-[1.5px] border-white shadow-md pointer-events-none origin-[50%_86px] md:origin-[50%_106px]"
                style={{
                  backgroundColor: pointerColor,
                  transform: `translateX(-50%) rotate(${pointerAngle}deg)`,
                }}
              />
            </div>
            <p className={`mt-6 text-[9px] font-sans tracking-[0.3em] uppercase ${cTextMuted}`}>
              {t.ittenLabel}
            </p>
          </div>

          {/* СИЛУЭТЫ ОБУВИ, ПЕРЕКЛЮЧАТЕЛЬ И СВОТЧИ */}
          <div className="flex-1 w-full max-w-md">
            {/* Переключатель силуэтов обуви */}
            <div className="flex justify-center items-center gap-6 mb-4">
              {SILHOUETTES.map((item) => {
                const active = silhouette === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSilhouetteChange(item.id)}
                    className={`relative pb-2 text-[9px] font-sans uppercase tracking-[0.28em] outline-none border-none bg-transparent cursor-pointer transition-all duration-300 ${
                      active ? `${cText} opacity-100` : `${cTextMuted} opacity-50 hover:opacity-85`
                    }`}
                  >
                    {item.label}
                    {active && (
                      <motion.div
                        layoutId="silhouetteIndicator"
                        className={`absolute bottom-0 left-0 right-0 h-[1px] ${
                          isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                        }`}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Визуализация выбранной модели */}
            <div className="mb-10 flex justify-center items-center px-2 min-h-[215px] md:min-h-[265px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={silhouette}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full flex justify-center items-center"
                >
                  {silhouette === 'runner' && <RunnerSvg colors={colors} isDark={isDark} />}
                  {silhouette === 'derby' && <DerbySvg colors={colors} isDark={isDark} />}
                  {silhouette === 'pump' && <PumpSvg colors={colors} isDark={isDark} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Слайдеры Тон/Тень */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <div
                  className={`flex justify-between text-[9px] font-sans uppercase tracking-widest mb-4 ${cTextMuted}`}
                >
                  <span>{t.pure}</span>
                  <span>{t.white}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={whiteAmount}
                  onChange={(e) => setWhiteAmount(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <div
                  className={`flex justify-between text-[9px] font-sans uppercase tracking-widest mb-4 ${cTextMuted}`}
                >
                  <span>{t.pure}</span>
                  <span>{t.black}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={blackAmount}
                  onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Свотчи палитры с подписями зон обуви */}
            <div className={`grid gap-4 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {colors.map((c, i) => (
                <div key={i} className="flex flex-col">
                  <div
                    className={`w-full h-24 mb-3 shadow-sm border ${
                      isDark ? 'border-white/10' : 'border-black/5'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                  <div className={`text-[9px] font-sans uppercase tracking-[0.2em] ${cText}`}>
                    {ratioLabels[i]}
                  </div>
                  <div
                    className={`mt-1 text-[8px] font-sans uppercase tracking-[0.12em] leading-tight ${cTextMuted}`}
                  >
                    {roleLabels[i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ЦИТАТА */}
        <div className="pb-10 pt-4">
          <div className="flex flex-col items-center text-center px-4">
            <div className={`w-px h-12 mb-8 ${cLine} border-l`} />
            <p className={`font-serif text-[18px] sm:text-[20px] italic leading-[1.5] ${cTextMuted}`}>
              {t.quote}
            </p>
            <p className={`mt-6 text-[9px] font-sans font-bold uppercase tracking-[0.4em] ${cText}`}>
              Cordwainer
            </p>
          </div>
        </div>
      </div>

      {/* МОДАЛКА PRO ДОСТУПА */}
      <AnimatePresence>
        {showProModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000]/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-[340px] p-8 border ${cLine} ${
                isDark ? 'bg-[#111111]' : 'bg-[#EAE6DF]'
              } shadow-2xl flex flex-col overflow-hidden`}
            >
              <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${cLine}`} />
              <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${cLine}`} />
              <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${cLine}`} />
              <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${cLine}`} />

              <button
                onClick={() => setShowProModal(false)}
                className={`absolute top-4 right-4 ${cTextMuted} hover:text-current`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className={`flex justify-center mb-5 ${cTextMuted} opacity-50`}>
                <LockIcon size={32} />
              </div>

              <h3 className={`font-serif text-2xl tracking-tight mb-4 text-center ${cText}`}>
                {t.paywallTitle}
              </h3>

              <p
                className={`text-[12px] font-sans font-light leading-relaxed mb-8 text-center ${cTextMuted}`}
              >
                {t.paywallDesc}
              </p>

              <button
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`group flex items-center justify-center gap-3 w-full py-4 border ${cLine} ${cText} hover:bg-current/5 active:scale-95 transition-all outline-none bg-transparent`}
              >
                {isPurchasing ? (
                  <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse">
                    {t.loading}
                  </span>
                ) : (
                  <>
                    <LockIcon size={14} />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                      {t.paywallBtn}
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: ГИД */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed inset-0 z-[90] flex flex-col ${cBg} ${cText} overflow-hidden`}
          >
            <div className="px-6 pt-10 pb-6 flex items-start justify-between shrink-0">
              <h2 className="font-serif text-[12vw] min-[400px]:text-5xl leading-none tracking-tight">
                {t.guideTitle}
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className={`text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors mt-2`}
              >
                {t.guideClose}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide space-y-12">
              <p className="text-[14px] min-[400px]:text-[16px] leading-[1.8] font-light max-w-lg">
                {t.guideIntro}
              </p>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                  {t.guideBalanceTitle}
                </h3>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}
                >
                  {t.guideBalance}
                </p>
              </div>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-8 ${cTextMuted}`}>
                  {t.guideSchemesTitle}
                </h3>
                <div className="space-y-8 max-w-lg">
                  {[
                    { title: t.complementary, text: t.guideComplementary },
                    { title: t.analogous, text: t.guideAnalogous },
                    { title: t.triadic, text: t.guideTriadic },
                    { title: t.tetradic, text: t.guideTetradic },
                    { title: t.rectangular, text: t.guideRectangular },
                    { title: t['split-complementary'], text: t.guideSplit },
                    { title: t.monochromatic, text: t.guideMono },
                  ].map((item) => (
                    <div key={item.title}>
                      <div className="font-serif text-[22px] min-[400px]:text-[26px] leading-[1.2] mb-3">
                        {item.title}
                      </div>
                      <p
                        className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light ${cTextMuted}`}
                      >
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                  {t.guideFootwearTitle}
                </h3>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}
                >
                  {t.guideFootwear}
                </p>
              </div>

              <div className={`pt-8 border-t ${cLine} max-w-lg`}>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light italic ${cTextMuted}`}
                >
                  {t.guideTip}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
