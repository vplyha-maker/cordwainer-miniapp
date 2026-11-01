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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-[1px]">
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
   1. СНИКЕР / РАННЕР (RUNNER SILHOUETTE)
   ============================================================================ */
function RunnerSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0]
  const secondaryColor = colors[1]
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1]
  const accentColor = colors[colors.length - 1]

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.28)' : 'rgba(28, 24, 22, 0.25)'
  const stitchColor = isDark ? 'rgba(244, 240, 232, 0.45)' : 'rgba(28, 24, 22, 0.4)'
  const midsoleBase = isDark ? '#1A1918' : '#FAF8F5'
  const midsoleShadow = isDark ? '#0D0C0B' : '#E2DDD5'
  const laceColor = isDark ? '#EAE6DF' : '#FFFFFF'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 600 380"
      className="w-full h-auto max-h-[240px] md:max-h-[320px] select-none overflow-visible"
      style={{
        filter: isDark
          ? 'drop-shadow(0 25px 35px rgba(0,0,0,0.6))'
          : 'drop-shadow(0 20px 30px rgba(0,0,0,0.08))',
      }}
    >
      <defs>
        <radialGradient id="r-floorShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.75' : '0.18'} />
          <stop offset="60%" stopColor="#000000" stopOpacity={isDark ? '0.3' : '0.06'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="r-leatherSheen" x1="0%" y1="0%" x2="25%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.16' : '0.28'} />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.45' : '0.22'} />
        </linearGradient>

        <linearGradient id="r-suedeShade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>

        <linearGradient id="r-midsoleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={midsoleBase} />
          <stop offset="100%" stopColor={midsoleShadow} />
        </linearGradient>

        <linearGradient id="r-accentSheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <ellipse cx="305" cy="342" rx="255" ry="18" fill="url(#r-floorShadow)" />

      {/* Подошва-протектор (Outsole — 10%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 58 318 C 58 331, 85 336, 130 336 L 235 336 L 242 329 L 258 329 L 265 336 L 415 336 L 423 329 L 438 329 L 445 336 L 518 336 C 546 336, 560 324, 565 304 L 550 302 C 500 315, 400 322, 290 322 C 180 322, 95 320, 58 318 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M 58 318 C 58 331, 85 336, 130 336 L 518 336 C 546 336, 560 324, 565 304 Z"
          fill="url(#r-accentSheen)"
          pointerEvents="none"
        />
      </g>

      {/* Межподошва (Midsole) */}
      <g>
        <path
          d="M 48 282 C 45 300, 50 314, 58 320 C 135 324, 240 325, 345 325 C 445 325, 520 316, 565 304 C 570 288, 564 268, 548 264 C 480 278, 390 286, 285 286 C 185 286, 110 288, 48 282 Z"
          fill="url(#r-midsoleGrad)"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 72 296 C 115 298, 175 299, 215 299 C 222 299, 226 304, 226 309 C 226 314, 220 317, 212 317 C 165 317, 110 316, 68 312 C 63 308, 66 298, 72 296 Z"
          fill={tertiaryColor}
          fillOpacity="0.85"
          stroke={strokeColor}
          strokeWidth="1"
          style={{ transition: 'all 0.5s ease' }}
        />
        <path
          d="M 52 302 C 140 307, 260 308, 380 306 C 460 304, 525 296, 563 286"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1"
        />
        <path
          d="M 440 312 C 485 309, 530 300, 560 290"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
      </g>

      {/* Внутренняя подкладка */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 92 128 C 112 114, 145 128, 172 152 C 195 172, 225 165, 240 135 L 215 95 C 185 112, 130 105, 92 128 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 92 128 C 112 114, 145 128, 172 152 C 195 172, 225 165, 240 135 L 215 95 C 185 112, 130 105, 92 128 Z"
          fill="#000000"
          fillOpacity="0.22"
        />
      </g>

      {/* Язычок */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 212 92 C 222 65, 250 58, 272 68 C 295 95, 330 148, 372 192 L 265 215 C 240 175, 218 125, 212 92 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M 212 92 C 222 65, 250 58, 272 68 C 295 95, 330 148, 372 192 L 265 215 C 240 175, 218 125, 212 92 Z"
          fill="url(#r-suedeShade)"
        />
        <path
          d="M 232 67 C 245 63, 258 65, 266 72 L 256 92 C 246 86, 234 85, 224 88 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1"
        />
      </g>

      {/* Воротник лодыжки */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 78 140 C 90 118, 125 125, 160 150 C 185 168, 212 162, 232 132 L 258 165 L 140 225 L 68 188 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 78 140 C 90 118, 125 125, 160 150 C 185 168, 212 162, 232 132 L 258 165 L 140 225 L 68 188 Z"
          fill="url(#r-suedeShade)"
        />
      </g>

      {/* Союзка и боковая панель */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 165 185 L 355 182 C 405 198, 465 215, 518 228 C 500 265, 420 285, 320 285 L 165 280 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 165 185 L 355 182 C 405 198, 465 215, 518 228 C 500 265, 420 285, 320 285 L 165 280 Z"
          fill="url(#r-leatherSheen)"
        />
        <g fill={strokeColor} opacity="0.7">
          <circle cx="435" cy="215" r="1.8" />
          <circle cx="448" cy="218" r="1.8" />
          <circle cx="461" cy="221" r="1.8" />
          <circle cx="474" cy="224" r="1.8" />
          <circle cx="442" cy="226" r="1.8" />
          <circle cx="455" cy="229" r="1.8" />
          <circle cx="468" cy="232" r="1.8" />
        </g>
      </g>

      {/* Основной каркас (Берцы — 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 145 205 C 185 190, 215 155, 232 122 C 242 104, 255 102, 268 112 C 302 145, 342 182, 385 205 C 362 232, 348 260, 345 286 L 175 286 C 155 260, 145 232, 145 205 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 145 205 C 185 190, 215 155, 232 122 C 242 104, 255 102, 268 112 C 302 145, 342 182, 385 205 C 362 232, 348 260, 345 286 L 175 286 C 155 260, 145 232, 145 205 Z"
          fill="url(#r-leatherSheen)"
        />
        <path
          d="M 153 209 C 190 194, 220 160, 236 128 C 244 113, 253 112, 264 120 C 296 151, 334 186, 374 207 C 354 233, 341 258, 338 282"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3.5 3.5"
        />
      </g>

      {/* Защитное крыло мыска */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 328 286 C 335 245, 368 218, 415 220 C 460 222, 505 220, 530 224 C 546 236, 554 250, 548 264 C 485 278, 405 286, 328 286 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 328 286 C 335 245, 368 218, 415 220 C 460 222, 505 220, 530 224 C 546 236, 554 250, 548 264 C 485 278, 405 286, 328 286 Z"
          fill="url(#r-leatherSheen)"
        />
        <path
          d="M 335 282 C 342 248, 372 225, 415 227 C 458 229, 500 227, 526 230"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3.5 3.5"
        />
      </g>

      {/* Задник и фиксатор пятки */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 48 282 C 44 238, 56 185, 78 140 C 98 165, 130 185, 175 198 C 188 228, 195 258, 192 286 C 135 286, 85 285, 48 282 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 48 282 C 44 238, 56 185, 78 140 C 98 165, 130 185, 175 198 C 188 228, 195 258, 192 286 C 135 286, 85 285, 48 282 Z"
          fill="url(#r-leatherSheen)"
        />
        <path
          d="M 48 282 C 46 260, 50 240, 58 225 C 88 238, 122 252, 148 285 C 110 285, 75 284, 48 282 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 55 152 C 50 140, 54 122, 66 118 C 74 116, 78 128, 78 140 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 75 148 C 95 171, 126 190, 168 202 C 180 230, 186 256, 184 282"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3.5 3.5"
        />
      </g>

      {/* Боковой брендинг/логотип */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 155 215 C 195 248, 265 256, 358 222 C 300 266, 222 278, 142 246 C 132 241, 138 202, 155 215 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M 155 215 C 195 248, 265 256, 358 222 C 300 266, 222 278, 142 246 C 132 241, 138 202, 155 215 Z"
          fill="url(#r-accentSheen)"
        />
      </g>

      {/* Шнуровка */}
      <g>
        {[
          { x1: 256, y1: 118, x2: 282, y2: 102, accent: true },
          { x1: 280, y1: 140, x2: 306, y2: 124, accent: true },
          { x1: 304, y1: 160, x2: 330, y2: 144, accent: false },
          { x1: 328, y1: 178, x2: 354, y2: 162, accent: false },
          { x1: 352, y1: 194, x2: 376, y2: 178, accent: false },
        ].map((lace, idx) => (
          <g key={idx}>
            <circle
              cx={lace.x1}
              cy={lace.y1}
              r="5"
              fill={lace.accent ? accentColor : tertiaryColor}
              stroke={strokeColor}
              strokeWidth="1.2"
              style={{ transition: 'all 0.5s ease' }}
            />
            <circle cx={lace.x1} cy={lace.y1} r="2" fill={isDark ? '#111' : '#333'} />
            <path
              d={`M ${lace.x1} ${lace.y1} Q ${(lace.x1 + lace.x2) / 2 - 4} ${(lace.y1 + lace.y2) / 2 - 6} ${lace.x2} ${lace.y2}`}
              fill="none"
              stroke={laceColor}
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <path
              d={`M ${lace.x1} ${lace.y1} Q ${(lace.x1 + lace.x2) / 2 - 4} ${(lace.y1 + lace.y2) / 2 - 6} ${lace.x2} ${lace.y2}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="5.5"
              strokeLinecap="round"
              opacity="0.35"
            />
          </g>
        ))}
      </g>
    </svg>
  )
}

/* ============================================================================
   2. КЛАССИЧЕСКИЕ ДЕРБИ БРОГИ (CLASSIC DERBY / BROGUE SILHOUETTE)
   ============================================================================ */
function DerbySvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0] // 60% — Берцы, крыловидный мысок (Wingtip), задник
  const secondaryColor = colors[1] // 30% — Союзка (Vamp) и язычок
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Кожаная подкладка и рант Гудьир (Welt)
  const accentColor = colors[colors.length - 1] // 10% — Набойка, профилактика подошвы, люверсы и петля

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.28)' : 'rgba(28, 24, 22, 0.25)'
  const stitchColor = isDark ? 'rgba(244, 240, 232, 0.5)' : 'rgba(28, 24, 22, 0.45)'
  const soleLeather = isDark ? '#231D1A' : '#D8C7B4'
  const soleEdge = isDark ? '#14100E' : '#B59E85'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 600 380"
      className="w-full h-auto max-h-[240px] md:max-h-[320px] select-none overflow-visible"
      style={{
        filter: isDark
          ? 'drop-shadow(0 25px 35px rgba(0,0,0,0.6))'
          : 'drop-shadow(0 20px 30px rgba(0,0,0,0.08))',
      }}
    >
      <defs>
        <radialGradient id="d-floorShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.75' : '0.18'} />
          <stop offset="60%" stopColor="#000000" stopOpacity={isDark ? '0.3' : '0.06'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Глянец полированной телячьей кожи (Глассаж) */}
        <linearGradient id="d-calfSheen" x1="0%" y1="0%" x2="20%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.24' : '0.38'} />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.48' : '0.28'} />
        </linearGradient>

        {/* Мягкий свет для союзки */}
        <linearGradient id="d-vampShade" x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.18' : '0.3'} />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
        </linearGradient>

        <linearGradient id="d-soleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={soleLeather} />
          <stop offset="100%" stopColor={soleEdge} />
        </linearGradient>
      </defs>

      <ellipse cx="305" cy="342" rx="250" ry="16" fill="url(#d-floorShadow)" />

      {/* Наборный каблук и подошва (Stacked Heel & Outsole) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        {/* База каблука */}
        <path
          d="M 58 296 L 178 298 L 178 327 L 58 327 Z"
          fill="url(#d-soleGrad)"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Слои наборной кожи на каблуке */}
        <line x1="58" y1="306" x2="178" y2="307" stroke={strokeColor} strokeWidth="1" />
        <line x1="58" y1="316" x2="178" y2="317" stroke={strokeColor} strokeWidth="1" />

        {/* Акцентная набойка каблука (Accent 10%) */}
        <path
          d="M 58 327 L 178 327 L 176 336 L 62 336 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Основная кожаная подошва с геленком (Waist & Sole) */}
        <path
          d="M 178 298 C 215 298, 255 316, 305 322 L 515 322 C 542 322, 560 314, 566 302 L 562 292 C 520 304, 430 308, 305 308 C 245 308, 210 290, 178 290 Z"
          fill="url(#d-soleGrad)"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Акцентная профилактика (Tread — Accent 10%) */}
        <path
          d="M 295 322 L 515 322 C 538 322, 555 316, 563 306 L 542 329 C 525 335, 495 336, 455 336 L 310 336 L 295 322 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Рант Гудьир (Goodyear Welt — Tertiary 15%) */}
        <path
          d="M 54 286 C 125 290, 210 290, 305 304 C 425 305, 515 300, 564 288 L 566 296 C 515 308, 425 313, 305 312 C 210 298, 125 298, 54 296 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        {/* Прострочка ранта */}
        <path
          d="M 60 291 C 130 294, 212 294, 305 308 C 420 309, 510 304, 560 292"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.3"
          strokeDasharray="4 3"
        />
      </g>

      {/* Декоративная петля на пятке (Pull Tab — Accent 10%) */}
      <path
        d="M 68 168 C 58 158, 58 142, 68 136 C 75 134, 80 145, 78 162 Z"
        fill={accentColor}
        stroke={strokeColor}
        strokeWidth="1.2"
        style={{ transition: 'all 0.5s ease' }}
      />

      {/* Кожаная внутренняя подкладка и стелька (Lining — Tertiary 15%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 78 158 C 102 142, 138 156, 175 174 C 205 186, 232 175, 248 142 L 225 118 C 192 135, 125 130, 78 158 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
        <path
          d="M 78 158 C 102 142, 138 156, 175 174 C 205 186, 232 175, 248 142 L 225 118 C 192 135, 125 130, 78 158 Z"
          fill="#000000"
          fillOpacity="0.2"
        />
      </g>

      {/* Классический язычок (Tongue — Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 222 120 C 230 98, 252 94, 268 104 C 292 128, 325 165, 360 198 L 270 212 C 248 180, 228 145, 222 120 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 222 120 C 230 98, 252 94, 268 104 C 292 128, 325 165, 360 198 L 270 212 C 248 180, 228 145, 222 120 Z"
          fill="url(#d-vampShade)"
        />
      </g>

      {/* Союзка (Vamp — Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 185 205 L 342 188 C 392 212, 445 232, 495 242 C 475 282, 395 304, 305 304 L 185 294 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 185 205 L 342 188 C 392 212, 445 232, 495 242 C 475 282, 395 304, 305 304 L 185 294 Z"
          fill="url(#d-vampShade)"
        />
      </g>

      {/* Берцы открытой шнуровки Дерби (Quarters — Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 74 162 C 102 158, 138 175, 175 186 C 208 195, 232 165, 252 128 C 258 116, 270 116, 280 126 C 312 156, 345 186, 378 205 C 352 222, 336 248, 348 268 C 315 285, 285 298, 265 302 L 145 292 L 74 220 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 74 162 C 102 158, 138 175, 175 186 C 208 195, 232 165, 252 128 C 258 116, 270 116, 280 126 C 312 156, 345 186, 378 205 C 352 222, 336 248, 348 268 C 315 285, 285 298, 265 302 L 145 292 L 74 220 Z"
          fill="url(#d-calfSheen)"
        />
        {/* Брогирование и двойная строчка вдоль берцев */}
        <path
          d="M 258 134 C 288 162, 320 190, 366 208 C 342 225, 328 248, 338 266"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.1"
          strokeDasharray="3 3"
        />
        <g fill={strokeColor} opacity="0.75">
          <circle cx="360" cy="215" r="2" />
          <circle cx="350" cy="224" r="2" />
          <circle cx="343" cy="235" r="2" />
          <circle cx="340" cy="247" r="2" />
          <circle cx="343" cy="259" r="2" />
        </g>
      </g>

      {/* Крыловидный мысок с медальоном (Wingtip Toe Cap — Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 312 304 C 335 274, 372 248, 418 226 C 425 242, 448 248, 468 238 C 505 245, 542 252, 558 265 C 566 274, 566 282, 564 288 C 510 302, 420 305, 312 304 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 312 304 C 335 274, 372 248, 418 226 C 425 242, 448 248, 468 238 C 505 245, 542 252, 558 265 C 566 274, 566 282, 564 288 C 510 302, 420 305, 312 304 Z"
          fill="url(#d-calfSheen)"
        />
        {/* Зубчатый шов и перфорация крыла (Brogue Wingtip) */}
        <path
          d="M 322 298 C 344 272, 378 250, 416 232 C 425 246, 448 252, 468 243 C 502 249, 536 256, 552 268"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <g fill={strokeColor} opacity="0.8">
          <circle cx="335" cy="288" r="2.2" />
          <circle cx="350" cy="276" r="2.2" />
          <circle cx="366" cy="265" r="2.2" />
          <circle cx="383" cy="255" r="2.2" />
          <circle cx="400" cy="245" r="2.2" />
          <circle cx="415" cy="237" r="2.2" />
          <circle cx="430" cy="249" r="2.2" />
          <circle cx="446" cy="252" r="2.2" />
          <circle cx="462" cy="248" r="2.2" />
          <circle cx="480" cy="250" r="2.2" />
          <circle cx="498" cy="254" r="2.2" />
          <circle cx="516" cy="258" r="2.2" />
          <circle cx="534" cy="263" r="2.2" />
          {/* Медальон на мыске */}
          <circle cx="495" cy="274" r="3" />
          <circle cx="508" cy="274" r="2" />
          <circle cx="482" cy="274" r="2" />
          <circle cx="495" cy="265" r="2" />
          <circle cx="495" cy="283" r="2" />
          <circle cx="522" cy="277" r="2.5" />
          <circle cx="534" cy="279" r="1.8" />
        </g>
      </g>

      {/* Классический жесткий задник (Heel Counter — Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 54 286 C 50 245, 58 198, 74 162 C 110 185, 152 212, 185 250 C 194 265, 198 280, 196 292 C 140 291, 92 289, 54 286 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 54 286 C 50 245, 58 198, 74 162 C 110 185, 152 212, 185 250 C 194 265, 198 280, 196 292 C 140 291, 92 289, 54 286 Z"
          fill="url(#d-calfSheen)"
        />
        <path
          d="M 73 170 C 107 192, 146 218, 178 254 C 186 266, 190 278, 188 288"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3.5 3.5"
        />
        <g fill={strokeColor} opacity="0.75">
          <circle cx="88" cy="184" r="2" />
          <circle cx="105" cy="196" r="2" />
          <circle cx="122" cy="209" r="2" />
          <circle cx="139" cy="223" r="2" />
          <circle cx="155" cy="238" r="2" />
          <circle cx="170" cy="254" r="2" />
          <circle cx="180" cy="272" r="2" />
        </g>
      </g>

      {/* Тонкие вощеные шнурки и люверсы */}
      <g>
        {[
          { x1: 268, y1: 136, x2: 288, y2: 120, accent: true },
          { x1: 292, y1: 156, x2: 312, y2: 140, accent: false },
          { x1: 316, y1: 175, x2: 336, y2: 159, accent: false },
          { x1: 340, y1: 192, x2: 360, y2: 176, accent: false },
        ].map((lace, idx) => (
          <g key={idx}>
            <circle
              cx={lace.x1}
              cy={lace.y1}
              r="4.2"
              fill={lace.accent ? accentColor : tertiaryColor}
              stroke={strokeColor}
              strokeWidth="1.2"
              style={{ transition: 'all 0.5s ease' }}
            />
            <circle cx={lace.x1} cy={lace.y1} r="1.8" fill="#111" />
            <path
              d={`M ${lace.x1} ${lace.y1} Q ${(lace.x1 + lace.x2) / 2 - 2} ${(lace.y1 + lace.y2) / 2 - 4} ${lace.x2} ${lace.y2}`}
              fill="none"
              stroke={accentColor}
              strokeWidth="3.2"
              strokeLinecap="round"
              style={{ transition: 'all 0.5s ease' }}
            />
          </g>
        ))}
      </g>
    </svg>
  )
}

/* ============================================================================
   3. ЖЕНСКИЕ ЛОДОЧКИ НА ШПИЛЬКЕ (STILETTO PUMP SILHOUETTE)
   ============================================================================ */
function PumpSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0] // 60% — Основной корпус лодочки
  const secondaryColor = colors[1] // 30% — Изящный каблук-шпилька, скульптурный задник и носочная деталь
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Открытая внутренняя стелька и подкладка
  const accentColor = colors[colors.length - 1] // 10% — Контрастная лакированная подошва, набойка и пряжка

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.28)' : 'rgba(28, 24, 22, 0.25)'
  const stitchColor = isDark ? 'rgba(244, 240, 232, 0.45)' : 'rgba(28, 24, 22, 0.4)'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 600 380"
      className="w-full h-auto max-h-[240px] md:max-h-[320px] select-none overflow-visible"
      style={{
        filter: isDark
          ? 'drop-shadow(0 25px 35px rgba(0,0,0,0.6))'
          : 'drop-shadow(0 20px 30px rgba(0,0,0,0.08))',
      }}
    >
      <defs>
        <radialGradient id="p-floorShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.75' : '0.18'} />
          <stop offset="60%" stopColor="#000000" stopOpacity={isDark ? '0.28' : '0.06'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Глянцевый/атласный перелив для вечерней и модельной обуви */}
        <linearGradient id="p-satinSheen" x1="0%" y1="0%" x2="35%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.26' : '0.42'} />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.48' : '0.26'} />
        </linearGradient>

        {/* Внутренний объем открытой стельки */}
        <linearGradient id="p-insoleDepth" x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="55%" stopColor="#000000" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
        </linearGradient>

        <linearGradient id="p-heelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#000000" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.38" />
        </linearGradient>
      </defs>

      {/* Двойная тень на полу (под шпилькой и под пучковой зоной) */}
      <ellipse cx="315" cy="342" rx="235" ry="15" fill="url(#p-floorShadow)" />
      <ellipse cx="106" cy="339" rx="35" ry="7" fill="url(#p-floorShadow)" />
      <ellipse cx="425" cy="339" rx="125" ry="11" fill="url(#p-floorShadow)" />

      {/* Изящный каблук-шпилька (Stiletto Heel — Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 88 188 L 138 202 C 122 232, 114 275, 111 326 L 99 326 C 99 272, 96 226, 88 188 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M 88 188 L 138 202 C 122 232, 114 275, 111 326 L 99 326 C 99 272, 96 226, 88 188 Z"
          fill="url(#p-heelGrad)"
        />
        {/* Набойка шпильки (Heel Tip — Accent 10%) */}
        <path
          d="M 99 326 L 111 326 L 111 336 L 99 336 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
      </g>

      {/* Открытая внутренняя стелька и подкладка (Insole & Lining — Tertiary 15%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 96 82 C 128 78, 175 118, 235 175 C 288 225, 338 258, 382 260 L 348 282 C 265 255, 165 182, 96 135 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
        <path
          d="M 96 82 C 128 78, 175 118, 235 175 C 288 225, 338 258, 382 260 L 348 282 C 265 255, 165 182, 96 135 Z"
          fill="url(#p-insoleDepth)"
        />
        {/* Тисненый фирменный знак на подпятнике стельки (Accent 10%) */}
        <path
          d="M 132 118 L 168 148 L 158 156 L 122 126 Z"
          fill={accentColor}
          fillOpacity="0.9"
        />
      </g>

      {/* Фирменная контрастная лакированная подошва (Signature Outsole — Accent 10%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 92 186 C 145 198, 205 245, 275 302 C 308 328, 338 336, 375 336 L 478 336 C 512 336, 540 326, 558 312 L 552 305 C 525 320, 495 327, 465 327 L 372 327 C 338 327, 310 318, 278 292 C 208 235, 148 188, 92 178 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </g>

      {/* Основной скульптурный корпус лодочки (Main Body — Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 96 82 C 78 112, 76 152, 88 184 C 145 194, 206 240, 278 296 C 312 322, 340 328, 375 328 L 468 328 C 502 328, 532 320, 554 306 C 512 280, 448 258, 382 256 C 325 254, 268 228, 208 175 C 156 128, 120 92, 96 82 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 96 82 C 78 112, 76 152, 88 184 C 145 194, 206 240, 278 296 C 312 322, 340 328, 375 328 L 468 328 C 502 328, 532 320, 554 306 C 512 280, 448 258, 382 256 C 325 254, 268 228, 208 175 C 156 128, 120 92, 96 82 Z"
          fill="url(#p-satinSheen)"
        />
      </g>

      {/* Фигурная пяточная чашка и кант декольте (Sculpted Heel & Collar Trim — Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 96 82 C 78 112, 76 152, 88 184 C 118 190, 148 204, 178 226 C 172 192, 148 145, 96 82 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 96 82 C 78 112, 76 152, 88 184 C 118 190, 148 204, 178 226 C 172 192, 148 145, 96 82 Z"
          fill="url(#p-satinSheen)"
        />

        {/* Изящный заостренный мысок-кап (Pointed Toe Cap — Secondary 30%) */}
        <path
          d="M 432 262 C 475 272, 520 288, 554 306 C 532 320, 502 328, 468 328 L 438 328 C 446 304, 444 280, 432 262 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 432 262 C 475 272, 520 288, 554 306 C 532 320, 502 328, 468 328 L 438 328 C 446 304, 444 280, 432 262 Z"
          fill="url(#p-satinSheen)"
        />

        {/* Тонкая шелковая строчка вдоль выреза декольте и мыска */}
        <path
          d="M 100 92 C 128 106, 162 140, 204 180 C 264 232, 322 260, 382 262"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d="M 426 264 C 438 282, 440 304, 432 324"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </g>

      {/* Ювелирная фурнитура / пряжка на мыске (Hardware Accent — 10%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 412 254 L 452 268 L 444 284 L 404 270 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M 417 259 L 445 269 L 440 279 L 412 269 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="0.9"
        />
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

            {/* Визуализация выбранной модели с плавной анимацией */}
            <div className="mb-10 flex justify-center items-center px-2 min-h-[210px] md:min-h-[260px]">
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

            {/* Свотчи палитры */}
            <div className={`grid gap-4 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {colors.map((c, i) => (
                <div key={i} className="flex flex-col">
                  <div
                    className={`w-full h-24 mb-4 shadow-sm border ${
                      isDark ? 'border-white/10' : 'border-black/5'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                  <div className={`text-[9px] font-sans uppercase tracking-[0.2em] ${cTextMuted}`}>
                    {ratioLabels[i]}
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
