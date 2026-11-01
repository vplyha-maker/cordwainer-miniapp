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
   1. СНИКЕР В РАКУРСЕ 3/4 (3D RUNNER SILHOUETTE)
   ============================================================================ */
function RunnerSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0] // 60%/55% — Основной каркас, мысок, пятка
  const secondaryColor = colors[1] // 30%/20% — Верх союзки, язычок, внешний валик воротника
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Внутренняя подкладка, стелька, танкетка
  const accentColor = colors[colors.length - 1] // 10% — Протектор, свуш, лейбл стельки и язычка

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.32)' : 'rgba(28, 24, 22, 0.28)'
  const stitchColor = isDark ? 'rgba(244, 240, 232, 0.5)' : 'rgba(28, 24, 22, 0.45)'
  const midsoleBase = isDark ? '#201F1D' : '#FCFBF9'
  const midsoleSide = isDark ? '#121110' : '#E5DFD5'
  const laceColor = isDark ? '#F0ECE1' : '#FFFFFF'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 400"
      className="w-full h-auto max-h-[250px] md:max-h-[320px] select-none overflow-visible"
      style={{
        filter: isDark
          ? 'drop-shadow(0 28px 36px rgba(0,0,0,0.65))'
          : 'drop-shadow(0 22px 30px rgba(0,0,0,0.1))',
      }}
    >
      <defs>
        <radialGradient id="r3d-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.8' : '0.22'} />
          <stop offset="65%" stopColor="#000000" stopOpacity={isDark ? '0.25' : '0.06'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* 3D объем для внешних кожаных деталей */}
        <linearGradient id="r3d-mainVol" x1="15%" y1="0%" x2="45%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.22' : '0.35'} />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.5' : '0.28'} />
        </linearGradient>

        {/* Верхний свет для союзки и язычка (плоскости, обращенные вверх к зрителю) */}
        <linearGradient id="r3d-topPlane" x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.28' : '0.42'} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>

        {/* Глубокая 3D-тень внутри горловины (Подкладка) */}
        <linearGradient id="r3d-liningDepth" x1="0%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.08" />
          <stop offset="50%" stopColor="#000000" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.78" />
        </linearGradient>

        {/* Тень для стельки, уходящей внутрь носка */}
        <linearGradient id="r3d-insoleGrad" x1="0%" y1="20%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="45%" stopColor="#000000" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.82" />
        </linearGradient>

        <linearGradient id="r3d-midsole" x1="0%" y1="0%" x2="10%" y2="100%">
          <stop offset="0%" stopColor={midsoleBase} />
          <stop offset="100%" stopColor={midsoleSide} />
        </linearGradient>
      </defs>

      {/* Тень на полу под углом 3/4 */}
      <ellipse
        cx="330"
        cy="346"
        rx="265"
        ry="26"
        transform="rotate(2.5 330 346)"
        fill="url(#r3d-floor)"
      />

      {/* 1. ДАЛЬНЯЯ (МЕДИАЛЬНАЯ) ПЛАНКА ШНУРОВКИ И ЗАДНИЙ КАНТ */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 218 114 C 242 92, 265 95, 295 122 C 335 156, 378 188, 412 204 L 365 225 L 205 155 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 218 114 C 242 92, 265 95, 295 122 C 335 156, 378 188, 412 204 L 365 225 L 205 155 Z"
          fill="#000000"
          fillOpacity="0.28"
        />
      </g>

      {/* 2. ОТКРЫТАЯ 3D-ЧАША ГОРЛОВИНЫ: ПОДКЛАДКА И СТЕЛЬКА (Tertiary 15%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        {/* Внешний валик дальнего борта воротника */}
        <path
          d="M 88 152 C 95 116, 158 102, 224 116 C 242 120, 255 135, 258 155 L 92 188 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 88 152 C 95 116, 158 102, 224 116 C 242 120, 255 135, 258 155 L 92 188 Z"
          fill="#000000"
          fillOpacity="0.15"
        />

        {/* Внутренняя стенка подкладки (Lining) */}
        <path
          d="M 96 154 C 106 124, 162 112, 218 124 C 242 130, 262 152, 265 182 L 222 225 L 102 212 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 96 154 C 106 124, 162 112, 218 124 C 242 130, 262 152, 265 182 L 222 225 L 102 212 Z"
          fill="url(#r3d-liningDepth)"
        />
        {/* Вертикальные ребра мягкой текстильной подкладки пятки */}
        <path
          d="M 132 124 C 128 148, 128 172, 134 195 M 168 121 C 165 145, 165 170, 172 195"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Видимая стелька на дне обуви (Insole / Footbed) */}
        <path
          d="M 110 182 C 142 168, 195 170, 245 188 L 218 228 L 108 210 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 110 182 C 142 168, 195 170, 245 188 L 218 228 L 108 210 Z"
          fill="url(#r3d-insoleGrad)"
        />
        {/* Фирменный подпятник на стельке (Акцент 10%) */}
        <path
          d="M 132 184 L 176 188 L 166 202 L 124 196 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="0.9"
        />
      </g>

      {/* 3. ОБЪЕМНЫЙ ЯЗЫЧОК В 3/4 (Tongue — Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 206 168 C 208 122, 224 84, 252 76 C 278 70, 305 84, 315 112 C 335 152, 368 186, 405 208 L 285 228 C 252 208, 222 188, 206 168 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 206 168 C 208 122, 224 84, 252 76 C 278 70, 305 84, 315 112 C 335 152, 368 186, 405 208 L 285 228 C 252 208, 222 188, 206 168 Z"
          fill="url(#r3d-topPlane)"
        />
        {/* Тканый лейбл на вершине язычка (Акцент 10%) */}
        <path
          d="M 246 78 C 266 74, 286 78, 298 88 L 286 112 C 272 102, 254 98, 236 102 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.1"
        />
      </g>

      {/* 4. ВЕРХНЯЯ ПЛОСКОСТЬ МЫСКА И СОЮЗКИ В 3/4 (Vamp — Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 295 198 L 395 190 C 448 202, 505 212, 552 232 C 572 242, 578 258, 565 274 C 510 296, 415 304, 325 296 L 178 282 L 185 204 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M 295 198 L 395 190 C 448 202, 505 212, 552 232 C 572 242, 578 258, 565 274 C 510 296, 415 304, 325 296 L 178 282 L 185 204 Z"
          fill="url(#r3d-topPlane)"
        />
        {/* Перспективная 3D-сетка перфорации на верхней площадке носка */}
        <g fill={strokeColor} opacity="0.75">
          <ellipse cx="445" cy="216" rx="2.8" ry="1.6" transform="rotate(12 445 216)" />
          <ellipse cx="464" cy="220" rx="2.8" ry="1.6" transform="rotate(12 464 220)" />
          <ellipse cx="483" cy="224" rx="2.8" ry="1.6" transform="rotate(12 483 224)" />
          <ellipse cx="502" cy="229" rx="2.8" ry="1.6" transform="rotate(12 502 229)" />
          <ellipse cx="435" cy="228" rx="2.8" ry="1.6" transform="rotate(12 435 228)" />
          <ellipse cx="454" cy="232" rx="2.8" ry="1.6" transform="rotate(12 454 232)" />
          <ellipse cx="473" cy="236" rx="2.8" ry="1.6" transform="rotate(12 473 236)" />
          <ellipse cx="492" cy="241" rx="2.8" ry="1.6" transform="rotate(12 492 241)" />
        </g>
      </g>

      {/* 5. ПЕРЕДНИЙ (ЛАТЕРАЛЬНЫЙ) ВОРОТНИК, ПЕРЕКРЫВАЮЩИЙ ПОДКЛАДКУ */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 88 152 C 102 162, 132 182, 168 196 C 198 206, 224 192, 244 162 L 266 184 L 162 242 L 72 202 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M 88 152 C 102 162, 132 182, 168 196 C 198 206, 224 192, 244 162 L 266 184 L 162 242 L 72 202 Z"
          fill="url(#r3d-mainVol)"
        />
        {/* Объемный кант горловины (отделяет внешнюю часть от внутренней подкладки) */}
        <path
          d="M 88 152 C 102 162, 132 182, 168 196 C 198 206, 224 192, 244 162"
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.8)'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>

      {/* 6. 3D ШНУРОВКА МЕЖДУ ДВУМЯ БОРТАМИ */}
      <g>
        {[
          { x1: 256, y1: 145, x2: 298, y2: 122, accent: true },
          { x1: 282, y1: 166, x2: 324, y2: 144, accent: true },
          { x1: 308, y1: 185, x2: 350, y2: 164, accent: false },
          { x1: 334, y1: 202, x2: 375, y2: 182, accent: false },
          { x1: 360, y1: 216, x2: 398, y2: 198, accent: false },
        ].map((lace, idx) => (
          <g key={idx}>
            {/* Тень от шнурка на язычке */}
            <path
              d={`M ${lace.x1} ${lace.y1 + 3} Q ${(lace.x1 + lace.x2) / 2} ${(lace.y1 + lace.y2) / 2 - 4} ${lace.x2} ${lace.y2 + 3}`}
              fill="none"
              stroke="#000000"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.22"
            />
            {/* Объемный плоский шнурок */}
            <path
              d={`M ${lace.x1} ${lace.y1} Q ${(lace.x1 + lace.x2) / 2} ${(lace.y1 + lace.y2) / 2 - 8} ${lace.x2} ${lace.y2}`}
              fill="none"
              stroke={laceColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={`M ${lace.x1} ${lace.y1} Q ${(lace.x1 + lace.x2) / 2} ${(lace.y1 + lace.y2) / 2 - 8} ${lace.x2} ${lace.y2}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.3"
            />
          </g>
        ))}
      </g>

      {/* 7. ОСНОВНОЙ БОКОВОЙ КАРКАС / БЕРЦЫ (Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 152 222 C 192 212, 224 182, 242 146 C 250 130, 264 128, 276 138 C 310 168, 352 200, 396 220 C 374 248, 360 275, 356 302 L 178 294 C 160 270, 152 246, 152 222 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 152 222 C 192 212, 224 182, 242 146 C 250 130, 264 128, 276 138 C 310 168, 352 200, 396 220 C 374 248, 360 275, 356 302 L 178 294 C 160 270, 152 246, 152 222 Z"
          fill="url(#r3d-mainVol)"
        />
        <path
          d="M 160 226 C 198 216, 228 186, 246 152 C 253 138, 263 137, 272 145 C 304 174, 344 204, 386 223 C 366 248, 353 274, 349 298"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.1"
          strokeDasharray="3.5 3.5"
        />
        {/* Ближние люверсы поверх планки */}
        {[
          { x: 258, y: 146, accent: true },
          { x: 284, y: 167, accent: true },
          { x: 310, y: 186, accent: false },
          { x: 336, y: 203, accent: false },
          { x: 362, y: 217, accent: false },
        ].map((eye, idx) => (
          <g key={idx}>
            <circle
              cx={eye.x}
              cy={eye.y}
              r="5.2"
              fill={eye.accent ? accentColor : tertiaryColor}
              stroke={strokeColor}
              strokeWidth="1.2"
            />
            <circle cx={eye.x} cy={eye.y} r="2.2" fill="#181818" />
          </g>
        ))}
      </g>

      {/* 8. ОБЪЕМНЫЙ ОБТЕКАТЕЛЬ МЫСКА В 3/4 (Mudguard — Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 336 302 C 344 260, 380 236, 432 240 C 482 244, 535 236, 562 232 C 578 245, 582 264, 572 280 C 512 304, 422 308, 336 302 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 336 302 C 344 260, 380 236, 432 240 C 482 244, 535 236, 562 232 C 578 245, 582 264, 572 280 C 512 304, 422 308, 336 302 Z"
          fill="url(#r3d-mainVol)"
        />
        <path
          d="M 344 296 C 352 262, 385 243, 432 247 C 480 250, 530 243, 558 239"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.1"
          strokeDasharray="3.5 3.5"
        />
      </g>

      {/* 9. ЗАДНИК И ФИКСАТОР ПЯТКИ (Heel Counter — Main 60% + Tertiary 15%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 56 286 C 52 240, 65 190, 88 152 C 110 180, 144 202, 188 216 C 202 244, 208 272, 204 296 C 145 295, 92 292, 56 286 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 56 286 C 52 240, 65 190, 88 152 C 110 180, 144 202, 188 216 C 202 244, 208 272, 204 296 C 145 295, 92 292, 56 286 Z"
          fill="url(#r3d-mainVol)"
        />
        {/* Внешний 3D-стабилизатор пятки (Heel Clip) */}
        <path
          d="M 56 286 C 54 264, 58 244, 68 230 C 100 245, 136 260, 162 295 C 122 294, 84 291, 56 286 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
        {/* Петля на пятке */}
        <path
          d="M 68 164 C 60 150, 64 132, 78 128 C 86 126, 90 138, 88 152 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 85 162 C 106 186, 138 206, 180 220 C 192 246, 198 272, 195 292"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.1"
          strokeDasharray="3.5 3.5"
        />
      </g>

      {/* 10. БОКОВОЙ Сoncept-ЛОГОТИП (Accent 10%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 166 228 C 208 262, 280 270, 375 236 C 315 280, 235 292, 152 258 C 142 252, 148 215, 166 228 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>

      {/* 11. 3D-ПОДОШВА В ПЕРСПЕКТИВЕ 3/4 (Midsole & Outsole) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        {/* Протектор (Outsole — Accent 10%) */}
        <path
          d="M 64 320 C 66 335, 98 342, 150 343 L 252 343 L 260 335 L 278 335 L 285 343 L 432 343 C 505 343, 566 326, 584 298 L 575 286 C 520 315, 420 326, 305 325 C 190 324, 102 322, 64 320 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Объемная межподошва (Midsole) */}
        <path
          d="M 56 286 C 50 304, 55 318, 64 324 C 142 330, 250 332, 360 332 C 472 332, 548 316, 584 298 C 590 282, 584 268, 572 266 C 508 294, 415 304, 305 300 C 195 296, 118 294, 56 286 Z"
          fill="url(#r3d-midsole)"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Амортизирующая капсула в пятке (Tertiary 15%) */}
        <path
          d="M 80 300 C 126 304, 185 306, 228 306 C 236 306, 240 311, 240 316 C 240 321, 234 324, 226 324 C 178 324, 120 321, 76 316 C 70 312, 74 302, 80 300 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.1"
        />

        {/* Грань 3D-пресса подошвы */}
        <path
          d="M 60 308 C 155 315, 278 317, 405 314 C 492 312, 550 298, 582 284"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1"
        />
      </g>
    </svg>
  )
}

/* ============================================================================
   2. КЛАССИЧЕСКИЕ ДЕРБИ БРОГИ В РАКУРСЕ 3/4 (3D DERBY SILHOUETTE)
   ============================================================================ */
function DerbySvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0] // 60%/55% — Берцы, крыловидный мысок с медальоном, задник
  const secondaryColor = colors[1] // 30%/20% — Верх союзки и язычок
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Внутренняя кожаная подкладка, стелька и рант Гудьир
  const accentColor = colors[colors.length - 1] // 10% — Набойка, профилактика, тиснение на стельке, шнурки

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.32)' : 'rgba(28, 24, 22, 0.28)'
  const stitchColor = isDark ? 'rgba(244, 240, 232, 0.52)' : 'rgba(28, 24, 22, 0.45)'
  const soleLeather = isDark ? '#261F1B' : '#DAC8B5'
  const soleEdge = isDark ? '#15110E' : '#B2997E'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 400"
      className="w-full h-auto max-h-[250px] md:max-h-[320px] select-none overflow-visible"
      style={{
        filter: isDark
          ? 'drop-shadow(0 28px 36px rgba(0,0,0,0.65))'
          : 'drop-shadow(0 22px 30px rgba(0,0,0,0.1))',
      }}
    >
      <defs>
        <radialGradient id="d3d-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.8' : '0.22'} />
          <stop offset="65%" stopColor="#000000" stopOpacity={isDark ? '0.25' : '0.06'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="d3d-calf" x1="10%" y1="0%" x2="35%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.26' : '0.4'} />
          <stop offset="38%" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.52' : '0.3'} />
        </linearGradient>

        <linearGradient id="d3d-topVamp" x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.25' : '0.38'} />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
        </linearGradient>

        {/* Глубокая 3D-тень внутри кожаной горловины Дерби */}
        <linearGradient id="d3d-lining" x1="0%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="45%" stopColor="#000000" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
        </linearGradient>

        <linearGradient id="d3d-insole" x1="0%" y1="0%" x2="100%" y2="85%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="45%" stopColor="#000000" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.82" />
        </linearGradient>

        <linearGradient id="d3d-sole" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={soleLeather} />
          <stop offset="100%" stopColor={soleEdge} />
        </linearGradient>
      </defs>

      <ellipse
        cx="330"
        cy="346"
        rx="260"
        ry="24"
        transform="rotate(2 330 346)"
        fill="url(#d3d-floor)"
      />

      {/* 1. ДАЛЬНЕЕ (МЕДИАЛЬНОЕ) КРЫЛО БЕРЦЕВ ОТКРЫТОЙ ШНУРОВКИ */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 228 122 C 250 105, 272 108, 298 132 C 334 162, 368 188, 398 205 L 348 228 L 215 168 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 228 122 C 250 105, 272 108, 298 132 C 334 162, 368 188, 398 205 L 348 228 L 215 168 Z"
          fill="#000000"
          fillOpacity="0.28"
        />
      </g>

      {/* 2. ОТКРЫТАЯ 3D-ГОРЛОВИНА: КОЖАНАЯ ПОДКЛАДКА И СТЕЛЬКА (Tertiary 15%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        {/* Петля на пятке */}
        <path
          d="M 80 166 C 70 154, 72 138, 84 134 C 92 132, 95 144, 92 160 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />

        {/* Дальняя внутренняя стенка кожаной подкладки (без зазоров, уходит глубоко под берцы) */}
        <path
          d="M 86 158 C 102 124, 165 112, 232 126 C 255 132, 270 155, 272 185 L 235 235 L 90 225 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 86 158 C 102 124, 165 112, 232 126 C 255 132, 270 155, 272 185 L 235 235 L 90 225 Z"
          fill="url(#d3d-lining)"
        />
        {/* Задний внутренний шов пяточного кармана */}
        <path
          d="M 118 126 C 112 150, 112 175, 116 198"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Анатомическая кожаная стелька на дне горловины (Insole) */}
        <path
          d="M 98 184 C 138 168, 195 170, 255 190 L 225 232 L 96 218 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <path
          d="M 98 184 C 138 168, 195 170, 255 190 L 225 232 L 96 218 Z"
          fill="url(#d3d-insole)"
        />
        {/* Тисненый герб Cordwainer на подпятнике стельки (Акцент 10%) */}
        <path
          d="M 122 184 L 172 189 L 162 204 L 114 197 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="0.9"
        />
      </g>

      {/* 3. КОЖАНЫЙ ЯЗЫЧОК В РАКУРСЕ 3/4 (Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 218 175 C 222 135, 238 102, 262 96 C 284 92, 306 104, 318 128 C 338 162, 366 190, 396 208 L 288 228 C 255 210, 230 192, 218 175 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 218 175 C 222 135, 238 102, 262 96 C 284 92, 306 104, 318 128 C 338 162, 366 190, 396 208 L 288 228 C 255 210, 230 192, 218 175 Z"
          fill="url(#d3d-topVamp)"
        />
      </g>

      {/* 4. ОБЪЕМНАЯ СОЮЗКА В 3/4 (Vamp — Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 285 202 L 382 195 C 435 208, 488 222, 535 238 C 515 280, 425 304, 322 302 L 195 292 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 285 202 L 382 195 C 435 208, 488 222, 535 238 C 515 280, 425 304, 322 302 L 195 292 Z"
          fill="url(#d3d-topVamp)"
        />
      </g>

      {/* 5. ВОЩЕНАЯ ШНУРОВКА МЕЖДУ ДВУМЯ БЕРЦАМИ */}
      <g>
        {[
          { x1: 274, y1: 152, x2: 308, y2: 132 },
          { x1: 298, y1: 170, x2: 332, y2: 150 },
          { x1: 322, y1: 188, x2: 355, y2: 168 },
          { x1: 346, y1: 204, x2: 378, y2: 185 },
        ].map((lace, idx) => (
          <g key={idx}>
            <path
              d={`M ${lace.x1} ${lace.y1 + 2} Q ${(lace.x1 + lace.x2) / 2} ${(lace.y1 + lace.y2) / 2 - 4} ${lace.x2} ${lace.y2 + 2}`}
              fill="none"
              stroke="#000000"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.25"
            />
            <path
              d={`M ${lace.x1} ${lace.y1} Q ${(lace.x1 + lace.x2) / 2} ${(lace.y1 + lace.y2) / 2 - 6} ${lace.x2} ${lace.y2}`}
              fill="none"
              stroke={accentColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              style={{ transition: 'all 0.5s ease' }}
            />
          </g>
        ))}
      </g>

      {/* 6. ПЕРЕДНИЕ (ЛАТЕРАЛЬНЫЕ) БЕРЦЫ ОТКРЫТОЙ ШНУРОВКИ (Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 86 158 C 110 175, 146 196, 184 205 C 218 212, 242 182, 260 144 C 266 132, 278 132, 288 142 C 320 170, 355 198, 388 215 C 362 232, 346 256, 358 276 C 325 292, 295 300, 275 302 L 155 292 L 82 225 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 86 158 C 110 175, 146 196, 184 205 C 218 212, 242 182, 260 144 C 266 132, 278 132, 288 142 C 320 170, 355 198, 388 215 C 362 232, 346 256, 358 276 C 325 292, 295 300, 275 302 L 155 292 L 82 225 Z"
          fill="url(#d3d-calf)"
        />
        {/* Светлый кант по верхнему срезу кожи горловины для 3D-разделения с подкладкой */}
        <path
          d="M 86 158 C 110 175, 146 196, 184 205 C 218 212, 242 182, 260 144"
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.8)'}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Двойная строчка и брогирование берцев */}
        <path
          d="M 266 148 C 298 176, 332 202, 376 218 C 352 235, 338 256, 348 274"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.1"
          strokeDasharray="3 3"
        />
        <g fill={strokeColor} opacity="0.8">
          <circle cx="370" cy="225" r="2" />
          <circle cx="360" cy="234" r="2" />
          <circle cx="353" cy="245" r="2" />
          <circle cx="350" cy="257" r="2" />
          <circle cx="353" cy="269" r="2" />
        </g>
        {/* Металлические люверсы */}
        {[
          { x: 274, y: 152, accent: true },
          { x: 298, y: 170, accent: false },
          { x: 322, y: 188, accent: false },
          { x: 346, y: 204, accent: false },
        ].map((eye, idx) => (
          <g key={idx}>
            <circle
              cx={eye.x}
              cy={eye.y}
              r="4.5"
              fill={eye.accent ? accentColor : tertiaryColor}
              stroke={strokeColor}
              strokeWidth="1.2"
            />
            <circle cx={eye.x} cy={eye.y} r="1.8" fill="#141414" />
          </g>
        ))}
      </g>

      {/* 7. 3D КРЫЛОВИДНЫЙ МЫСОК С МЕДАЛЬОНОМ СВЕРХУ (Wingtip — Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 322 302 C 345 272, 382 246, 428 222 C 436 240, 462 245, 482 230 C 492 222, 485 212, 470 208 C 512 216, 558 232, 574 254 C 582 266, 580 278, 574 286 C 518 304, 428 306, 322 302 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 322 302 C 345 272, 382 246, 428 222 C 436 240, 462 245, 482 230 C 492 222, 485 212, 470 208 C 512 216, 558 232, 574 254 C 582 266, 580 278, 574 286 C 518 304, 428 306, 322 302 Z"
          fill="url(#d3d-calf)"
        />
        <path
          d="M 332 296 C 354 270, 388 248, 426 229 C 436 245, 462 250, 484 235 C 518 242, 550 252, 568 268"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {/* Перфорация крыла и 3D-медальон на верхней площадке мыска */}
        <g fill={strokeColor} opacity="0.82">
          <circle cx="345" cy="286" r="2.2" />
          <circle cx="360" cy="274" r="2.2" />
          <circle cx="376" cy="263" r="2.2" />
          <circle cx="393" cy="253" r="2.2" />
          <circle cx="410" cy="243" r="2.2" />
          <circle cx="425" cy="235" r="2.2" />
          <circle cx="442" cy="247" r="2.2" />
          <circle cx="460" cy="250" r="2.2" />
          <circle cx="478" cy="244" r="2.2" />
          <circle cx="496" cy="246" r="2.2" />
          <circle cx="514" cy="250" r="2.2" />
          <circle cx="532" cy="256" r="2.2" />
          {/* Розетка медальона в перспективе */}
          <ellipse cx="512" cy="268" rx="3.4" ry="2.2" transform="rotate(14 512 268)" />
          <ellipse cx="526" cy="271" rx="2.4" ry="1.6" transform="rotate(14 526 271)" />
          <ellipse cx="498" cy="265" rx="2.4" ry="1.6" transform="rotate(14 498 265)" />
          <ellipse cx="515" cy="259" rx="2.4" ry="1.6" transform="rotate(14 515 259)" />
          <ellipse cx="509" cy="277" rx="2.4" ry="1.6" transform="rotate(14 509 277)" />
          <ellipse cx="540" cy="274" rx="2.6" ry="1.7" transform="rotate(14 540 274)" />
        </g>
      </g>

      {/* 8. ЖЕСТКИЙ ЗАДНИК (Heel Counter — Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 62 284 C 58 242, 68 195, 86 158 C 122 184, 162 212, 195 250 C 204 265, 208 280, 206 292 C 148 291, 98 288, 62 284 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 62 284 C 58 242, 68 195, 86 158 C 122 184, 162 212, 195 250 C 204 265, 208 280, 206 292 C 148 291, 98 288, 62 284 Z"
          fill="url(#d3d-calf)"
        />
        <path
          d="M 84 166 C 118 190, 156 218, 188 254 C 196 266, 200 278, 198 288"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3.5 3.5"
        />
        <g fill={strokeColor} opacity="0.78">
          <circle cx="98" cy="182" r="2" />
          <circle cx="115" cy="195" r="2" />
          <circle cx="132" cy="208" r="2" />
          <circle cx="149" cy="222" r="2" />
          <circle cx="165" cy="238" r="2" />
          <circle cx="180" cy="254" r="2" />
          <circle cx="190" cy="272" r="2" />
        </g>
      </g>

      {/* 9. РАНТ ГУДЬИР, КОЖАНАЯ ПОДОШВА И НАБОРНЫЙ КАБЛУК В 3/4 */}
      <g style={{ transition: 'all 0.5s ease' }}>
        {/* Наборный каблук с 3D-разворотом */}
        <path
          d="M 64 294 L 190 298 L 190 328 C 142 332, 92 330, 64 325 Z"
          fill="url(#d3d-sole)"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Внутренняя теневая грань каблука (3D глубина) */}
        <path
          d="M 190 298 L 208 292 L 208 318 L 190 328 Z"
          fill="#000000"
          fillOpacity="0.35"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <line x1="64" y1="305" x2="190" y2="308" stroke={strokeColor} strokeWidth="1" />
        <line x1="64" y1="315" x2="190" y2="318" stroke={strokeColor} strokeWidth="1" />

        {/* Акцентная набойка каблука (Accent 10%) */}
        <path
          d="M 64 325 C 92 330, 142 332, 190 328 L 208 318 L 206 326 L 188 336 C 140 340, 90 338, 66 334 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Основная кожаная подошва */}
        <path
          d="M 190 298 C 228 298, 268 318, 318 324 L 522 324 C 554 324, 576 312, 584 296 L 578 286 C 532 304, 440 310, 318 308 C 258 308, 222 290, 190 290 Z"
          fill="url(#d3d-sole)"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Акцентная профилактика мыска (Accent 10%) */}
        <path
          d="M 308 324 L 522 324 C 550 324, 570 315, 580 302 L 560 330 C 540 337, 505 339, 465 339 L 325 338 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Выступающий 3D-рант Гудьир (Goodyear Welt — Tertiary 15%) */}
        <path
          d="M 60 282 C 132 288, 220 288, 318 302 C 438 304, 528 298, 578 282 L 582 290 C 530 306, 438 312, 318 310 C 220 296, 132 296, 60 292 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
        <path
          d="M 66 287 C 138 292, 222 292, 318 306 C 435 308, 524 302, 575 286"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1.3"
          strokeDasharray="4 3"
        />
      </g>
    </svg>
  )
}

/* ============================================================================
   3. ЖЕНСКИЕ ЛОДОЧКИ НА ШПИЛЬКЕ В РАКУРСЕ 3/4 (3D STILETTO PUMP SILHOUETTE)
   ============================================================================ */
function PumpSvg({ colors, isDark }: { colors: string[]; isDark: boolean }) {
  const mainColor = colors[0] // 60%/55% — Скульптурный внешний корпус лодочки
  const secondaryColor = colors[1] // 30%/20% — Шпилька, пяточная чашка и заостренный мысок-кап
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] // 15% — Полностью открытая 3D-поверхность внутренней подкладки и стельки
  const accentColor = colors[colors.length - 1] // 10% — Лакированная подошва, набойка, подпятник и пряжка

  const strokeColor = isDark ? 'rgba(244, 240, 232, 0.32)' : 'rgba(28, 24, 22, 0.28)'
  const stitchColor = isDark ? 'rgba(244, 240, 232, 0.5)' : 'rgba(28, 24, 22, 0.42)'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 400"
      className="w-full h-auto max-h-[250px] md:max-h-[320px] select-none overflow-visible"
      style={{
        filter: isDark
          ? 'drop-shadow(0 28px 36px rgba(0,0,0,0.65))'
          : 'drop-shadow(0 22px 30px rgba(0,0,0,0.1))',
      }}
    >
      <defs>
        <radialGradient id="p3d-floor" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity={isDark ? '0.8' : '0.22'} />
          <stop offset="65%" stopColor="#000000" stopOpacity={isDark ? '0.25' : '0.06'} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Атласный/кожаный 3D-блик для корпуса */}
        <linearGradient id="p3d-bodySheen" x1="15%" y1="0%" x2="40%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.28' : '0.45'} />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#000000" stopOpacity={isDark ? '0.52' : '0.28'} />
        </linearGradient>

        {/* Теневой градиент для дальней внутренней стенки подкладки */}
        <linearGradient id="p3d-medialWall" x1="0%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.12" />
          <stop offset="55%" stopColor="#000000" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.72" />
        </linearGradient>

        {/* Свет и глубина на открытой стельке (Footbed) */}
        <linearGradient id="p3d-footbed" x1="0%" y1="0%" x2="95%" y2="90%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="50%" stopColor="#000000" stopOpacity="0.08" />
          <stop offset="85%" stopColor="#000000" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.78" />
        </linearGradient>

        <linearGradient id="p3d-heel" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#000000" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.42" />
        </linearGradient>
      </defs>

      {/* Опорные тени на полу под шпилькой и мыском */}
      <ellipse
        cx="330"
        cy="346"
        rx="245"
        ry="18"
        transform="rotate(2 330 346)"
        fill="url(#p3d-floor)"
      />
      <ellipse cx="114" cy="342" rx="38" ry="8" fill="url(#p3d-floor)" />
      <ellipse cx="445" cy="342" rx="135" ry="12" fill="url(#p3d-floor)" />

      {/* 1. 3D КАБЛУК-ШПИЛЬКА С ВНУТРЕННЕЙ И ВНЕШНЕЙ ГРАНЬЮ (Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        {/* Внутренняя (теневая) грань шпильки, уходящая под свод */}
        <path
          d="M 118 192 L 154 206 C 134 238, 124 280, 120 330 L 112 330 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M 118 192 L 154 206 C 134 238, 124 280, 120 330 L 112 330 Z"
          fill="#000000"
          fillOpacity="0.42"
        />

        {/* Внешняя (лицевая) грань шпильки */}
        <path
          d="M 94 184 L 132 198 C 122 232, 116 278, 114 330 L 102 330 C 102 276, 100 225, 94 184 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M 94 184 L 132 198 C 122 232, 116 278, 114 330 L 102 330 C 102 276, 100 225, 94 184 Z"
          fill="url(#p3d-heel)"
        />

        {/* Набойка шпильки (Accent 10%) */}
        <path
          d="M 102 330 L 120 330 L 119 340 L 102 340 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
      </g>

      {/* 2. ОТКРЫТАЯ 3D-ПОЛОСТЬ ЛОДОЧКИ: ПОДКЛАДКА И СТЕЛЬКА (Tertiary 15%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        {/* Дальняя (медиальная) внутренняя стенка подкладки — видна благодаря ракурсу 3/4 */}
        <path
          d="M 102 76 C 145 64, 198 96, 258 150 C 318 204, 376 238, 434 246 L 408 288 L 106 168 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M 102 76 C 145 64, 198 96, 258 150 C 318 204, 376 238, 434 246 L 408 288 L 106 168 Z"
          fill="url(#p3d-medialWall)"
        />

        {/* Открытая анатомическая стелька во всю длину стопы (Insole / Footbed) */}
        <path
          d="M 112 132 C 148 122, 202 152, 265 205 C 322 252, 375 274, 422 268 L 385 304 C 295 282, 195 215, 112 168 Z"
          fill={tertiaryColor}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
        <path
          d="M 112 132 C 148 122, 202 152, 265 205 C 322 252, 375 274, 422 268 L 385 304 C 295 282, 195 215, 112 168 Z"
          fill="url(#p3d-footbed)"
        />

        {/* Простроченный кожаный подпятник с логотипом на стельке (Accent 10%) */}
        <path
          d="M 134 138 C 154 136, 182 152, 208 175 L 188 192 C 162 170, 138 154, 122 150 Z"
          fill={accentColor}
          fillOpacity="0.9"
          stroke={strokeColor}
          strokeWidth="1"
        />
      </g>

      {/* 3. КОНТРАСТНАЯ ЛАКИРОВАННАЯ ПОДОШВА ПОД СВОДОМ (Signature Outsole — Accent 10%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 98 182 C 154 194, 218 242, 290 302 C 324 330, 355 340, 395 340 L 495 340 C 534 340, 566 326, 582 306 L 574 298 C 546 318, 512 328, 478 328 L 392 328 C 355 328, 326 318, 294 292 C 222 232, 158 184, 98 174 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </g>

      {/* 4. БЛИЖНИЙ (ЛАТЕРАЛЬНЫЙ) КОРПУС ЛОДОЧКИ С ГЛУБОКИМ ВЫРЕЗОМ ДЕКОЛЬТЕ (Main 60%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 102 76 C 82 108, 80 148, 94 180 C 152 192, 216 240, 290 298 C 325 324, 354 330, 392 330 L 482 330 C 522 330, 558 318, 578 298 C 562 272, 505 248, 434 246 C 415 268, 378 278, 332 266 C 275 250, 218 206, 168 152 C 136 116, 114 86, 102 76 Z"
          fill={mainColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M 102 76 C 82 108, 80 148, 94 180 C 152 192, 216 240, 290 298 C 325 324, 354 330, 392 330 L 482 330 C 522 330, 558 318, 578 298 C 562 272, 505 248, 434 246 C 415 268, 378 278, 332 266 C 275 250, 218 206, 168 152 C 136 116, 114 86, 102 76 Z"
          fill="url(#p3d-bodySheen)"
        />
        {/* 3D-кант по ближнему вырезу лодочки (четко отделяет внешний корпус от стельки внутри) */}
        <path
          d="M 102 76 C 114 86, 136 116, 168 152 C 218 206, 275 250, 332 266 C 378 278, 415 268, 434 246"
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)'}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>

      {/* 5. СКУЛЬПТУРНАЯ ПЯТОЧНАЯ ЧАШКА И 3D МЫСОК-КАП (Secondary 30%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        {/* Пяточная деталь */}
        <path
          d="M 102 76 C 82 108, 80 148, 94 180 C 124 186, 155 202, 186 225 C 178 190, 152 142, 102 76 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 102 76 C 82 108, 80 148, 94 180 C 124 186, 155 202, 186 225 C 178 190, 152 142, 102 76 Z"
          fill="url(#p3d-bodySheen)"
        />

        {/* Заостренный 3D-мысок (Pointed Toe Cap — видна вся верхняя плоскость) */}
        <path
          d="M 434 246 C 495 250, 554 272, 578 298 C 558 318, 522 330, 482 330 L 448 330 C 462 302, 456 270, 434 246 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M 434 246 C 495 250, 554 272, 578 298 C 558 318, 522 330, 482 330 L 448 330 C 462 302, 456 270, 434 246 Z"
          fill="url(#p3d-bodySheen)"
        />

        {/* Тонкая шелковая строчка */}
        <path
          d="M 106 88 C 122 104, 144 134, 174 166 C 224 218, 280 258, 335 272"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d="M 428 250 C 448 272, 454 302, 442 326"
          fill="none"
          stroke={stitchColor}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </g>

      {/* 6. ОБЪЕМНАЯ ПРЯЖКА В ПЕРСПЕКТИВЕ 3/4 НА МЫСКЕ (Accent 10%) */}
      <g style={{ transition: 'all 0.5s ease' }}>
        <path
          d="M 412 246 L 462 256 L 452 278 L 402 266 Z"
          fill={accentColor}
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 420 252 L 452 259 L 445 271 L 413 263 Z"
          fill={secondaryColor}
          stroke={strokeColor}
          strokeWidth="1"
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

          {/* СИЛУЭТЫ ОБУВИ В 3/4, ПЕРЕКЛЮЧАТЕЛЬ И СВОТЧИ */}
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

            {/* Визуализация выбранной 3D-модели */}
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
