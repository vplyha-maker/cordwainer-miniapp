import React from 'react'
import { BrandDossier, DossierLang } from './brandHeritageData'

interface BrandDossierViewProps {
  dossier: BrandDossier
  lang: DossierLang
  isDark: boolean
  themeColors: Record<string, string>
  totalModelsCount: number | null
  activeIconicModel?: string | null
  onSelectModelQuery: (modelName: string) => void
  onBackToCollection: () => void
}

const UI_LABELS: Record<DossierLang, Record<string, string>> = {
  ru: {
    founded: 'Год основания',
    hq: 'Штаб-квартира',
    direction: 'Основатели и креативный код',
    archiveVolume: 'В каталоге',
    modelsUnit: 'моделей',
    officialSiteLabel: 'Официальный цифровой бутик Дома',
    openOfficialSite: 'Перейти на официальный сайт',
    iconicHeader: 'Культовые силуэты Дома',
    iconicSub: 'Нажмите на силуэт, чтобы отфильтровать коллекцию (с быстрым возвратом в паспорт)',
    techSpecHeader: 'Материаловедение и инженерия подошвы',
    techSpecSub: 'Ключевые конструктивные узлы, кожи и запатентованные полимеры',
    backToShoes: 'Смотреть коллекцию',
    quickBackShoes: '← К коллекции обуви',
  },
  uk: {
    founded: 'Рік заснування',
    hq: 'Штаб-квартира',
    direction: 'Засновники та креативний код',
    archiveVolume: 'У каталозі',
    modelsUnit: 'моделей',
    officialSiteLabel: 'Офіційний цифровий бутік Дому',
    openOfficialSite: 'Перейти на офіційний сайт',
    iconicHeader: 'Культові силуети Дому',
    iconicSub: 'Натисніть на силует для фільтрації колекції (зі швидким поверненням у паспорт)',
    techSpecHeader: 'Матеріалознавство та інженерія підошви',
    techSpecSub: 'Ключові конструктивні вузли, шкіри та запатентовані полімери',
    backToShoes: 'Дивитися колекцію',
    quickBackShoes: '← До колекції взуття',
  },
  de: {
    founded: 'Gründungsjahr',
    hq: 'Stammhaus',
    direction: 'Gründer & Kreativcode',
    archiveVolume: 'Im Katalog',
    modelsUnit: 'Modelle',
    officialSiteLabel: 'Offizielle digitale Boutique',
    openOfficialSite: 'Offizielle Website öffnen',
    iconicHeader: 'Ikonische Silhouetten des Hauses',
    iconicSub: 'Tippen Sie auf eine Silhouette, um die Kollektion zu filtern',
    techSpecHeader: 'Materialkunde & Sohlentechnologie',
    techSpecSub: 'Konstruktionsmerkmale, Lederarten und Sohlensysteme',
    backToShoes: 'Kollektion ansehen',
    quickBackShoes: '← Zur Schuhkollektion',
  },
}

function openExternalUrl(url: string) {
  try {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.openLink) {
      tg.openLink(url)
      return
    }
  } catch {}
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Ювелирная обсидиановая витрина с анимированными векторными гербами и монограммами 25 типов
 */
function AnimatedBrandEmblem({
  dossier,
  onOpenOfficialSite,
}: {
  dossier: BrandDossier
  onOpenOfficialSite: () => void
}) {
  const goldLight = '#FFF3D1'
  const goldMid = dossier.accentHex || '#D4AF37'
  const goldDeep = '#9A7B3E'
  const platinum = '#F5F2EB'

  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[21/9] flex items-center justify-center overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(circle at 50% 48%, #1C1A24 0%, #0E0E14 62%, #07070A 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(212, 175, 55, 0.25), 0 16px 40px rgba(0,0,0,0.22)',
      }}
    >
      <style>{`
        @keyframes cadOrbitSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes cadOrbitReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes cadDrawLuxury {
          0% { stroke-dashoffset: 720; opacity: 0.55; }
          60% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.95; }
        }
        @keyframes cadPulseAura {
          0%, 100% { opacity: 0.28; transform: scale(0.96); }
          50% { opacity: 0.65; transform: scale(1.05); }
        }
        @keyframes cadLaserSweep {
          0% { transform: translateY(-110%); opacity: 0; }
          35% { opacity: 0.5; }
          100% { transform: translateY(110%); opacity: 0; }
        }
      `}</style>

      {/* Внутренняя тонкая ювелирная рамка */}
      <div
        className="absolute inset-2.5 pointer-events-none"
        style={{ border: '1px solid rgba(245, 242, 235, 0.08)' }}
      />

      {/* Лазерный сканирующий луч */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.11) 50%, transparent 100%)',
          animation: 'cadLaserSweep 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }}
      />

      {/* Верхние телеметрические метки */}
      <div
        className="absolute top-3.5 left-4 text-[8px] font-sans uppercase tracking-[0.28em]"
        style={{ color: 'rgba(245, 242, 235, 0.5)' }}
      >
        MAISON ARCHIVE // {dossier.id.toUpperCase()}
      </div>
      <div
        className="absolute top-3.5 right-4 text-[8px] font-sans uppercase tracking-[0.28em]"
        style={{ color: goldLight }}
      >
        EST. {dossier.founded}
      </div>

      {/* Нижние метки + интерактивная ссылка на официальный домен */}
      <div
        className="absolute bottom-3 left-4 text-[8px] font-sans uppercase tracking-[0.24em]"
        style={{ color: 'rgba(245, 242, 235, 0.45)' }}
      >
        BESPOKE VECTOR CREST
      </div>
      <button
        type="button"
        onClick={onOpenOfficialSite}
        className="absolute bottom-2.5 right-3.5 px-2.5 py-1 text-[8px] font-sans uppercase tracking-[0.22em] cursor-pointer bg-transparent transition-opacity hover:opacity-100 opacity-85"
        style={{
          color: goldLight,
          border: '1px solid rgba(212, 175, 55, 0.35)',
          backgroundColor: 'rgba(212, 175, 55, 0.08)',
        }}
      >
        {dossier.officialDomain.toUpperCase()} ↗
      </button>

      <svg
        viewBox="0 0 380 230"
        className="w-full h-full max-w-[380px] max-h-[230px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={goldLight} />
            <stop offset="45%" stopColor={goldMid} />
            <stop offset="80%" stopColor={goldDeep} />
            <stop offset="100%" stopColor={goldLight} />
          </linearGradient>

          <linearGradient id="platinumMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#D4D4D8" />
            <stop offset="100%" stopColor={goldLight} />
          </linearGradient>

          <radialGradient id="obsidianGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={goldMid} stopOpacity="0.34" />
            <stop offset="65%" stopColor={goldMid} stopOpacity="0.08" />
            <stop offset="100%" stopColor={goldMid} stopOpacity="0" />
          </radialGradient>

          <filter id="emblemGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Центральное золотое свечение */}
        <circle
          cx="190"
          cy="115"
          r="92"
          fill="url(#obsidianGlow)"
          style={{
            animation: 'cadPulseAura 4.2s ease-in-out infinite',
            transformOrigin: '190px 115px',
          }}
        />

        {/* Координатные линии */}
        <line x1="18" y1="115" x2="84" y2="115" stroke={goldLight} strokeOpacity="0.18" strokeWidth="0.8" />
        <line x1="296" y1="115" x2="362" y2="115" stroke={goldLight} strokeOpacity="0.18" strokeWidth="0.8" />
        <line x1="190" y1="10" x2="190" y2="30" stroke={goldLight} strokeOpacity="0.18" strokeWidth="0.8" />
        <line x1="190" y1="200" x2="190" y2="220" stroke={goldLight} strokeOpacity="0.18" strokeWidth="0.8" />

        {/* Внешний часовой гильошированный лимб */}
        <g style={{ transformOrigin: '190px 115px', animation: 'cadOrbitSlow 34s linear infinite' }}>
          <circle
            cx="190"
            cy="115"
            r="88"
            stroke="url(#goldMetallic)"
            strokeOpacity="0.32"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
          <circle
            cx="190"
            cy="115"
            r="82"
            stroke={platinum}
            strokeOpacity="0.14"
            strokeWidth="0.7"
          />
          <circle cx="190" cy="27" r="2.6" fill={goldLight} />
          <circle cx="190" cy="203" r="2.6" fill={goldLight} />
          <circle cx="102" cy="115" r="2" fill={goldMid} />
          <circle cx="278" cy="115" r="2" fill={goldMid} />
        </g>

        {/* Внутреннее встречное кольцо */}
        <g style={{ transformOrigin: '190px 115px', animation: 'cadOrbitReverse 24s linear infinite' }}>
          <circle
            cx="190"
            cy="115"
            r="72"
            stroke="url(#goldMetallic)"
            strokeOpacity="0.42"
            strokeWidth="1.1"
            strokeDasharray="22 10 3 10"
          />
        </g>

        {/* 1. PRADA / PALACE — Эмалированный Савойский треугольник с заклепками и гербом */}
        {dossier.emblem === 'prada_triangle' && (
          <g filter="url(#emblemGlow)">
            <polygon
              points="114,62 266,62 190,178"
              fill="rgba(12, 12, 18, 0.85)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
              strokeDasharray="720"
              style={{ animation: 'cadDrawLuxury 3.5s ease-out infinite alternate' }}
            />
            <polygon
              points="123,68 257,68 190,168"
              stroke={goldLight}
              strokeOpacity="0.55"
              strokeWidth="1.1"
            />
            {/* Три фирменные угловые заклепки */}
            <circle cx="123" cy="67" r="2.2" fill={goldLight} />
            <circle cx="257" cy="67" r="2.2" fill={goldLight} />
            <circle cx="190" cy="169" r="2.2" fill={goldLight} />
            {/* Савойский узел и корона над именем */}
            <path d="M 176 80 Q 190 73 204 80" stroke={goldMid} strokeWidth="1.3" />
            <circle cx="190" cy="77" r="2.5" stroke={goldLight} strokeWidth="1.2" />
            <text
              x="190"
              y="104"
              textAnchor="middle"
              fill={platinum}
              fontFamily="Georgia, serif"
              fontWeight="bold"
              fontSize="19"
              letterSpacing="5"
            >
              {dossier.name.slice(0, 8)}
            </text>
            <text
              x="190"
              y="120"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontSize="7.5"
              letterSpacing="4"
            >
              MILANO
            </text>
            <text
              x="190"
              y="136"
              textAnchor="middle"
              fill={goldMid}
              fontFamily="serif"
              fontSize="7"
              letterSpacing="2.5"
            >
              DAL {dossier.founded}
            </text>
          </g>
        )}

        {/* 2. SAINT LAURENT — Вертикальная переплетенная монограмма Cassandre YSL */}
        {dossier.emblem === 'ysl_cassandre' && (
          <g filter="url(#emblemGlow)">
            {/* Октагональная парижская кутюрная плакетка */}
            <polygon
              points="152,48 228,48 256,76 256,154 228,182 152,182 124,154 124,76"
              fill="rgba(12, 12, 18, 0.85)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.4"
            />
            <polygon
              points="156,54 224,54 250,80 250,150 224,176 156,176 130,150 130,80"
              stroke={goldLight}
              strokeOpacity="0.35"
              strokeWidth="0.9"
            />
            {/* Буква Y (вертикальная ось Cassandre) */}
            <path
              d="M 166 64 L 190 98 L 214 64 M 190 98 L 190 156 M 182 156 L 198 156"
              stroke="url(#platinumMetallic)"
              strokeWidth="3.6"
              strokeLinecap="square"
            />
            {/* Буква S, обвивающая вертикальную мачту Y */}
            <path
              d="M 206 82 C 206 68, 172 68, 172 86 C 172 104, 210 104, 210 124 C 210 142, 172 142, 172 128"
              stroke="url(#goldMetallic)"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray="720"
              style={{ animation: 'cadDrawLuxury 3.2s ease-out infinite alternate' }}
            />
            {/* Буква L у основания монограммы */}
            <path
              d="M 178 96 L 178 156 L 218 156 L 218 147"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
              strokeLinecap="square"
            />
            <text
              x="190"
              y="170"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontSize="6.5"
              letterSpacing="4"
            >
              SAINT LAURENT PARIS
            </text>
          </g>
        )}

        {/* 3. VALENTINO / VEJA — Архитектурный медальон VLogo Signature с шипами Rockstud */}
        {dossier.emblem === 'valentino_v' && (
          <g filter="url(#emblemGlow)">
            {/* Ромб с пирамидальными гранями Rockstud */}
            <polygon
              points="190,44 264,115 190,186 116,115"
              stroke={goldMid}
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
            <rect x="186" y="40" width="8" height="8" transform="rotate(45 190 44)" fill={goldLight} />
            <rect x="260" y="111" width="8" height="8" transform="rotate(45 264 115)" fill={goldLight} />
            <rect x="186" y="182" width="8" height="8" transform="rotate(45 190 186)" fill={goldLight} />
            <rect x="112" y="111" width="8" height="8" transform="rotate(45 116 115)" fill={goldLight} />

            {/* Овальный обод VLogo */}
            <ellipse
              cx="190"
              cy="115"
              rx="56"
              ry="38"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <ellipse
              cx="190"
              cy="115"
              rx="50"
              ry="32"
              stroke={goldLight}
              strokeOpacity="0.35"
              strokeWidth="0.9"
            />

            {/* Выразительная литера V с фирменной горизонтальной засечкой VLogo */}
            <path
              d="M 158 92 L 172 92 M 208 92 L 222 92 M 164 92 L 190 142 L 216 92"
              stroke="url(#goldMetallic)"
              strokeWidth="4.2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            <line x1="176" y1="115" x2="204" y2="115" stroke={platinum} strokeWidth="2.6" />
          </g>
        )}

        {/* 4. CHANEL — Переплетенные ювелирные кольца Double C */}
        {dossier.emblem === 'chanel_cc' && (
          <g filter="url(#emblemGlow)">
            <path
              d="M 206 80 A 36 36 0 1 0 206 150"
              stroke="url(#goldMetallic)"
              strokeWidth="6.5"
              strokeLinecap="butt"
            />
            <path
              d="M 174 80 A 36 36 0 1 1 174 150"
              stroke="url(#platinumMetallic)"
              strokeWidth="6.5"
              strokeLinecap="butt"
              strokeDasharray="720"
              style={{ animation: 'cadDrawLuxury 3.2s ease-out infinite alternate' }}
            />
            <text
              x="190"
              y="176"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontSize="8"
              letterSpacing="5"
            >
              CHANEL · PARIS
            </text>
          </g>
        )}

        {/* 5. BALENCIAGA — Скульптурная двойная монограмма BB */}
        {dossier.emblem === 'balenciaga_bb' && (
          <g filter="url(#emblemGlow)">
            <rect
              x="120"
              y="58"
              width="140"
              height="114"
              rx="4"
              fill="rgba(12, 12, 18, 0.86)"
              stroke="url(#platinumMetallic)"
              strokeWidth="2.2"
            />
            <rect
              x="126"
              y="64"
              width="128"
              height="102"
              rx="2"
              stroke={goldMid}
              strokeOpacity="0.4"
              strokeWidth="0.9"
            />
            <text
              x="190"
              y="124"
              textAnchor="middle"
              fill="url(#platinumMetallic)"
              fontFamily="Georgia, serif"
              fontWeight="bold"
              fontSize="48"
              letterSpacing="6"
            >
              BB
            </text>
            <line x1="144" y1="136" x2="236" y2="136" stroke="url(#goldMetallic)" strokeWidth="1.2" />
            <text
              x="190"
              y="152"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontWeight="bold"
              fontSize="8.5"
              letterSpacing="5"
            >
              BALENCIAGA
            </text>
          </g>
        )}

        {/* 6. GUCCI — Переплетенные кольца GG и трензель Horsebit */}
        {dossier.emblem === 'gucci_gg' && (
          <g filter="url(#emblemGlow)">
            <circle
              cx="170"
              cy="110"
              r="32"
              stroke="url(#goldMetallic)"
              strokeWidth="4.8"
              strokeDasharray="155 48"
            />
            <circle
              cx="210"
              cy="110"
              r="32"
              stroke="url(#platinumMetallic)"
              strokeWidth="4.8"
              strokeDasharray="155 48"
              transform="rotate(180 210 110)"
            />
            <line x1="170" y1="110" x2="192" y2="110" stroke={goldLight} strokeWidth="4.2" />
            <line x1="188" y1="110" x2="210" y2="110" stroke={platinum} strokeWidth="4.2" />
            <text
              x="190"
              y="168"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="Georgia, serif"
              fontSize="8.5"
              letterSpacing="5"
            >
              GUCCI · FIRENZE 1921
            </text>
          </g>
        )}

        {/* 7. LOUIS VUITTON — Четырехлистная звезда Monogram и инициал LV */}
        {dossier.emblem === 'lv_fleur' && (
          <g filter="url(#emblemGlow)">
            {/* Внешний вогнутый ромб Monogram */}
            <polygon
              points="190,46 212,93 258,115 212,137 190,184 168,137 122,115 168,93"
              fill="rgba(12, 12, 18, 0.85)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.6"
              strokeDasharray="720"
              style={{ animation: 'cadDrawLuxury 3.5s ease-out infinite alternate' }}
            />
            <circle cx="190" cy="115" r="24" stroke={goldLight} strokeOpacity="0.6" strokeWidth="1.3" />
            <text
              x="190"
              y="124"
              textAnchor="middle"
              fill="url(#platinumMetallic)"
              fontFamily="Georgia, serif"
              fontStyle="italic"
              fontWeight="bold"
              fontSize="24"
              letterSpacing="1"
            >
              LV
            </text>
          </g>
        )}

        {/* 8. DIOR — Решетка Cannage и овальный медальон Couture */}
        {dossier.emblem === 'dior_oblique' && (
          <g filter="url(#emblemGlow)">
            {/* Линии плетения Cannage */}
            <line x1="130" y1="65" x2="250" y2="165" stroke={goldMid} strokeOpacity="0.28" strokeWidth="1" />
            <line x1="250" y1="65" x2="130" y2="165" stroke={goldMid} strokeOpacity="0.28" strokeWidth="1" />
            <ellipse
              cx="190"
              cy="115"
              rx="60"
              ry="42"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <ellipse cx="190" cy="115" rx="53" ry="35" stroke={goldLight} strokeOpacity="0.45" strokeWidth="1" />
            {/* Верхний бант медальона Людовика XVI */}
            <path d="M 174 73 Q 190 62 206 73" stroke="url(#goldMetallic)" strokeWidth="2.2" />
            <text
              x="190"
              y="122"
              textAnchor="middle"
              fill={platinum}
              fontFamily="Georgia, serif"
              fontSize="27"
              letterSpacing="6"
            >
              DIOR
            </text>
            <text
              x="190"
              y="139"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontSize="6.5"
              letterSpacing="3.5"
            >
              30 AVENUE MONTAIGNE
            </text>
          </g>
        )}

        {/* 9. BOTTEGA VENETA — Диагональное плетение кожи Intrecciato */}
        {dossier.emblem === 'bottega_intrecciato' && (
          <g filter="url(#emblemGlow)">
            <polygon
              points="190,48 256,115 190,182 124,115"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.6"
            />
            {/* Сетка Intrecciato */}
            <line x1="157" y1="82" x2="223" y2="148" stroke={goldMid} strokeOpacity="0.45" strokeWidth="1.4" />
            <line x1="142" y1="97" x2="208" y2="163" stroke={goldMid} strokeOpacity="0.45" strokeWidth="1.4" />
            <line x1="172" y1="67" x2="238" y2="133" stroke={goldMid} strokeOpacity="0.45" strokeWidth="1.4" />
            <line x1="223" y1="82" x2="157" y2="148" stroke={goldMid} strokeOpacity="0.45" strokeWidth="1.4" />
            <line x1="208" y1="67" x2="142" y2="133" stroke={goldMid} strokeOpacity="0.45" strokeWidth="1.4" />
            <line x1="238" y1="97" x2="172" y2="163" stroke={goldMid} strokeOpacity="0.45" strokeWidth="1.4" />
            <rect
              x="156"
              y="93"
              width="68"
              height="44"
              fill="#0D0D12"
              stroke="url(#goldMetallic)"
              strokeWidth="1.8"
            />
            <text
              x="190"
              y="122"
              textAnchor="middle"
              fill={platinum}
              fontFamily="Georgia, serif"
              fontSize="22"
              letterSpacing="5"
            >
              BV
            </text>
          </g>
        )}

        {/* 10. CELINE — Двойная арка цепи Triomphe (1973) */}
        {dossier.emblem === 'celine_triomphe' && (
          <g filter="url(#emblemGlow)">
            {/* Левая и правая зеркальные дуги Triomphe */}
            <path
              d="M 184 76 C 142 72, 134 158, 184 154"
              stroke="url(#goldMetallic)"
              strokeWidth="5.2"
              strokeLinecap="round"
            />
            <path
              d="M 196 76 C 238 72, 246 158, 196 154"
              stroke="url(#goldMetallic)"
              strokeWidth="5.2"
              strokeLinecap="round"
            />
            <line x1="158" y1="115" x2="222" y2="115" stroke={platinum} strokeWidth="3.8" />
            <line x1="190" y1="68" x2="190" y2="162" stroke={goldLight} strokeWidth="2.2" />
            <text
              x="190"
              y="178"
              textAnchor="middle"
              fill={platinum}
              fontFamily="sans-serif"
              fontWeight="bold"
              fontSize="8.5"
              letterSpacing="6"
            >
              CELINE PARIS
            </text>
          </g>
        )}

        {/* 11. LOEWE — Четырехчастная каллиграфическая Анаграмма */}
        {dossier.emblem === 'loewe_anagram' && (
          <g filter="url(#emblemGlow)">
            <rect
              x="136"
              y="61"
              width="108"
              height="108"
              rx="14"
              fill="rgba(12, 12, 18, 0.85)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.4"
            />
            {/* Четыре симметричных завитка Anagram */}
            <path
              d="M 186 111 C 186 80, 150 72, 154 98 C 156 112, 178 111, 186 111 Z"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <path
              d="M 194 111 C 194 80, 230 72, 226 98 C 224 112, 202 111, 194 111 Z"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <path
              d="M 186 119 C 186 150, 150 158, 154 132 C 156 118, 178 119, 186 119 Z"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <path
              d="M 194 119 C 194 150, 230 158, 226 132 C 224 118, 202 119, 194 119 Z"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <circle cx="190" cy="115" r="4" fill={platinum} />
          </g>
        )}

        {/* 12. HERMÈS — Седельный шов Point Sellier и пряжка H */}
        {dossier.emblem === 'hermes_caleche' && (
          <g filter="url(#emblemGlow)">
            <polygon
              points="146,54 234,54 254,74 254,156 234,176 146,176 126,156 126,74"
              fill="rgba(18, 14, 12, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.5"
            />
            {/* Пунктир ручного седельного шва */}
            <polygon
              points="151,60 229,60 247,78 247,152 229,170 151,170 133,152 133,78"
              stroke={goldLight}
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />
            {/* Архитектурная пряжка H */}
            <path
              d="M 164 78 L 164 144 M 216 78 L 216 144 M 156 78 L 172 78 M 208 78 L 224 78 M 156 144 L 172 144 M 208 144 L 224 144 M 164 108 L 216 108 M 164 114 L 216 114"
              stroke="url(#goldMetallic)"
              strokeWidth="3.8"
              strokeLinecap="square"
            />
            <text
              x="190"
              y="162"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="Georgia, serif"
              fontSize="7"
              letterSpacing="3.5"
            >
              HERMÈS PARIS 1837
            </text>
          </g>
        )}

        {/* 13. VERSACE — Античный меандр Greca и золотой медальон */}
        {dossier.emblem === 'versace_greca' && (
          <g filter="url(#emblemGlow)">
            <circle
              cx="190"
              cy="115"
              r="58"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            {/* Геометрическое кольцо меандра Greca */}
            <circle
              cx="190"
              cy="115"
              r="49"
              stroke={goldLight}
              strokeWidth="4.5"
              strokeDasharray="8 4 2 4"
            />
            <circle cx="190" cy="115" r="41" stroke="url(#goldMetallic)" strokeWidth="1.5" />
            <polygon
              points="170,94 190,140 210,94"
              stroke="url(#platinumMetallic)"
              strokeWidth="4"
              fill="none"
            />
            <text
              x="190"
              y="110"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="Georgia, serif"
              fontSize="8"
              letterSpacing="3"
            >
              MILANO
            </text>
          </g>
        )}

        {/* 14. GIVENCHY — Геометрический лабиринт 4G */}
        {dossier.emblem === 'givenchy_4g' && (
          <g filter="url(#emblemGlow)">
            <rect
              x="134"
              y="59"
              width="112"
              height="112"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#platinumMetallic)"
              strokeWidth="2.6"
            />
            <line x1="190" y1="59" x2="190" y2="171" stroke={goldMid} strokeWidth="1.6" />
            <line x1="134" y1="115" x2="246" y2="115" stroke={goldMid} strokeWidth="1.6" />
            <rect x="144" y="69" width="36" height="36" stroke="url(#goldMetallic)" strokeWidth="3" />
            <rect x="200" y="69" width="36" height="36" stroke="url(#goldMetallic)" strokeWidth="3" />
            <rect x="144" y="125" width="36" height="36" stroke="url(#goldMetallic)" strokeWidth="3" />
            <rect x="200" y="125" width="36" height="36" stroke="url(#goldMetallic)" strokeWidth="3" />
            <circle cx="190" cy="115" r="6" fill={platinum} />
          </g>
        )}

        {/* 15. MAISON MARGIELA — Табличка с 4 белыми стежками и обведенной цифрой 22 */}
        {dossier.emblem === 'margiela_numbers' && (
          <g filter="url(#emblemGlow)">
            <rect
              x="110"
              y="56"
              width="160"
              height="118"
              fill="rgba(16, 16, 22, 0.94)"
              stroke="url(#platinumMetallic)"
              strokeWidth="2"
            />
            {/* Четыре фирменных угловых стежка Margiela */}
            <line x1="104" y1="66" x2="120" y2="50" stroke="#FFFFFF" strokeWidth="3" />
            <line x1="276" y1="66" x2="260" y2="50" stroke="#FFFFFF" strokeWidth="3" />
            <line x1="104" y1="164" x2="120" y2="180" stroke="#FFFFFF" strokeWidth="3" />
            <line x1="276" y1="164" x2="260" y2="180" stroke="#FFFFFF" strokeWidth="3" />

            <g fontFamily="Georgia, serif" fontSize="10.5" fill={platinum}>
              <text x="190" y="82" textAnchor="middle" letterSpacing="4.5">0 1 2 3 4 5 6 7</text>
              <text x="190" y="106" textAnchor="middle" letterSpacing="4.5">8 9 10 11 12 13 14</text>
              <text x="190" y="130" textAnchor="middle" letterSpacing="4.2">15 16 17 18 19 20 21</text>
              <text x="190" y="155" textAnchor="middle" letterSpacing="5.5">22 23</text>
            </g>
            {/* Золотое кольцо вокруг номера 22 (обувная линия) */}
            <circle cx="174" cy="151" r="12" stroke="url(#goldMetallic)" strokeWidth="2.4" />
          </g>
        )}

        {/* 16. RICK OWENS / CONVERSE — Архитектурная звезда в силовом кольце */}
        {dossier.emblem === 'rick_star' && (
          <g filter="url(#emblemGlow)">
            <circle
              cx="190"
              cy="115"
              r="56"
              fill="rgba(12, 12, 18, 0.88)"
              stroke="url(#platinumMetallic)"
              strokeWidth="2.4"
            />
            <polygon
              points="190,52 208,162 134,88 246,88 172,162"
              stroke="url(#goldMetallic)"
              strokeWidth="2.6"
              strokeLinejoin="miter"
              strokeDasharray="720"
              style={{ animation: 'cadDrawLuxury 3.2s ease-out infinite alternate' }}
            />
          </g>
        )}

        {/* 17. OFF-WHITE — Индустриальный перекрестный знак Arrows */}
        {dossier.emblem === 'offwhite_arrows' && (
          <g filter="url(#emblemGlow)">
            <rect
              x="132"
              y="57"
              width="116"
              height="116"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.4"
            />
            <line x1="150" y1="75" x2="230" y2="155" stroke="url(#platinumMetallic)" strokeWidth="5" />
            <line x1="230" y1="75" x2="150" y2="155" stroke="url(#platinumMetallic)" strokeWidth="5" />
            {/* Наконечники стрел */}
            <polyline points="150,92 150,75 167,75" stroke="url(#goldMetallic)" strokeWidth="3.5" />
            <polyline points="213,75 230,75 230,92" stroke="url(#goldMetallic)" strokeWidth="3.5" />
            <polyline points="150,138 150,155 167,155" stroke="url(#goldMetallic)" strokeWidth="3.5" />
            <polyline points="213,155 230,155 230,138" stroke="url(#goldMetallic)" strokeWidth="3.5" />
          </g>
        )}

        {/* 18. NIKE — Металлическое крыло Swoosh */}
        {dossier.emblem === 'nike_swoosh' && (
          <g filter="url(#emblemGlow)">
            <circle
              cx="190"
              cy="115"
              r="58"
              fill="rgba(12, 12, 18, 0.85)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.2"
            />
            <path
              d="M 136 126 C 150 150, 186 142, 252 88 C 204 118, 166 122, 150 98 C 143 106, 137 116, 136 126 Z"
              fill="url(#goldMetallic)"
              stroke={platinum}
              strokeWidth="1.5"
            />
            <text
              x="190"
              y="156"
              textAnchor="middle"
              fill={platinum}
              fontFamily="sans-serif"
              fontWeight="bold"
              fontSize="8.5"
              letterSpacing="5"
            >
              NIKE ARCHIVE
            </text>
          </g>
        )}

        {/* 19. JORDAN — Эмблема крыльев Wings */}
        {dossier.emblem === 'jordan_wings' && (
          <g filter="url(#emblemGlow)">
            <path
              d="M 112 92 L 164 92 L 174 115 L 164 138 L 126 138 Z M 268 92 L 216 92 L 206 115 L 216 138 L 254 138 Z"
              fill="rgba(12, 12, 18, 0.85)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.4"
            />
            <line x1="120" y1="104" x2="162" y2="104" stroke={goldLight} strokeWidth="1.5" />
            <line x1="124" y1="116" x2="166" y2="116" stroke={goldLight} strokeWidth="1.5" />
            <line x1="260" y1="104" x2="218" y2="104" stroke={goldLight} strokeWidth="1.5" />
            <line x1="256" y1="116" x2="214" y2="116" stroke={goldLight} strokeWidth="1.5" />
            <circle cx="190" cy="115" r="22" fill="#0E0E14" stroke="url(#platinumMetallic)" strokeWidth="2.6" />
            <text
              x="190"
              y="122"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="Georgia, serif"
              fontWeight="bold"
              fontSize="16"
              letterSpacing="2"
            >
              23
            </text>
          </g>
        )}

        {/* 20. ADIDAS / YEEZY — Три диагональных монолита */}
        {dossier.emblem === 'adidas_bars' && (
          <g filter="url(#emblemGlow)">
            <circle
              cx="190"
              cy="115"
              r="58"
              fill="rgba(12, 12, 18, 0.85)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.2"
            />
            <polygon points="148,140 162,140 176,100 162,100" fill="url(#goldMetallic)" />
            <polygon points="174,140 188,140 206,84 192,84" fill="url(#platinumMetallic)" />
            <polygon points="200,140 214,140 236,68 222,68" fill="url(#goldMetallic)" />
            <text
              x="190"
              y="158"
              textAnchor="middle"
              fill={platinum}
              fontFamily="sans-serif"
              fontWeight="bold"
              fontSize="8.5"
              letterSpacing="4.5"
            >
              {dossier.name.slice(0, 12)}
            </text>
          </g>
        )}

        {/* 21. MOUNTAIN PEAK — Альпийский рельеф (Salomon, Arc'teryx, Hoka, Timberland, Merrell) */}
        {dossier.emblem === 'mountain_peak' && (
          <g filter="url(#emblemGlow)">
            <polygon
              points="190,48 254,82 254,148 190,182 126,148 126,82"
              fill="rgba(12, 12, 18, 0.88)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.4"
            />
            <polyline
              points="138,140 172,78 196,114 214,86 242,140"
              stroke="url(#platinumMetallic)"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <line x1="136" y1="140" x2="244" y2="140" stroke="url(#goldMetallic)" strokeWidth="2" />
            <text
              x="190"
              y="160"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontWeight="bold"
              fontSize="8.5"
              letterSpacing="4"
            >
              {dossier.monogram}
            </text>
          </g>
        )}

        {/* 22. HERITAGE SHIELD — Королевский геральдический щит мастерских */}
        {dossier.emblem === 'heritage_shield' && (
          <g filter="url(#emblemGlow)">
            <path
              d="M 140 58 L 240 58 L 240 116 C 240 150, 190 176, 190 176 C 190 176, 140 150, 140 116 Z"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <path
              d="M 147 65 L 233 65 L 233 114 C 233 143, 190 166, 190 166 C 190 166, 147 143, 147 114 Z"
              stroke={goldLight}
              strokeOpacity="0.4"
              strokeWidth="1"
            />
            <text
              x="190"
              y="116"
              textAnchor="middle"
              fill="url(#platinumMetallic)"
              fontFamily="Georgia, serif"
              fontWeight="bold"
              fontSize={dossier.monogram.length > 3 ? '20' : '28'}
              letterSpacing="3"
            >
              {dossier.monogram}
            </text>
            <text
              x="190"
              y="138"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontSize="7"
              letterSpacing="3.5"
            >
              EST. {dossier.founded}
            </text>
          </g>
        )}

        {/* 23. SKATE HEXAGON — Индустриальный полигон */}
        {dossier.emblem === 'skate_hexagon' && (
          <g filter="url(#emblemGlow)">
            <polygon
              points="190,50 246,82 246,148 190,180 134,148 134,82"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <polygon
              points="190,58 238,86 238,144 190,172 142,144 142,86"
              stroke={platinum}
              strokeOpacity="0.3"
              strokeWidth="1"
            />
            <text
              x="190"
              y="121"
              textAnchor="middle"
              fill="url(#platinumMetallic)"
              fontFamily="sans-serif"
              fontWeight="bold"
              fontSize={dossier.monogram.length > 3 ? '19' : '26'}
              letterSpacing="4"
            >
              {dossier.monogram}
            </text>
            <text
              x="190"
              y="144"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontSize="7"
              letterSpacing="3.5"
            >
              ARCHIVE {dossier.founded}
            </text>
          </g>
        )}

        {/* 24. SPORT VECTOR — Аэродинамический крылатый картуш */}
        {dossier.emblem === 'sport_vector' && (
          <g filter="url(#emblemGlow)">
            <polygon
              points="126,148 152,70 254,70 228,148"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <polygon
              points="135,142 157,76 245,76 223,142"
              stroke={goldLight}
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            <text
              x="190"
              y="118"
              textAnchor="middle"
              fill="url(#platinumMetallic)"
              fontFamily="Georgia, serif"
              fontStyle="italic"
              fontWeight="bold"
              fontSize={dossier.monogram.length > 2 ? '23' : '30'}
              letterSpacing="3"
            >
              {dossier.monogram}
            </text>
            <text
              x="190"
              y="168"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontSize="7.5"
              letterSpacing="4"
            >
              {dossier.name}
            </text>
          </g>
        )}

        {/* 25. COUTURE CREST — Ювелирный восьмиугольник Вандомской площади */}
        {dossier.emblem === 'couture_crest' && (
          <g filter="url(#emblemGlow)">
            <polygon
              points="154,50 226,50 256,80 256,150 226,180 154,180 124,150 124,80"
              fill="rgba(12, 12, 18, 0.9)"
              stroke="url(#goldMetallic)"
              strokeWidth="2.8"
            />
            <polygon
              points="159,57 221,57 249,85 249,145 221,173 159,173 131,145 131,85"
              stroke={goldLight}
              strokeOpacity="0.45"
              strokeWidth="1.1"
            />
            <text
              x="190"
              y="120"
              textAnchor="middle"
              fill="url(#platinumMetallic)"
              fontFamily="Georgia, serif"
              fontWeight="bold"
              fontSize={dossier.monogram.length > 2 ? '22' : '32'}
              letterSpacing="5"
            >
              {dossier.monogram}
            </text>
            <line x1="154" y1="134" x2="226" y2="134" stroke="url(#goldMetallic)" strokeWidth="1" />
            <text
              x="190"
              y="150"
              textAnchor="middle"
              fill={goldLight}
              fontFamily="sans-serif"
              fontSize="7"
              letterSpacing="3.5"
            >
              {dossier.name.slice(0, 15)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

export default function BrandDossierView({
  dossier,
  lang,
  isDark,
  themeColors,
  totalModelsCount,
  activeIconicModel,
  onSelectModelQuery,
  onBackToCollection,
}: BrandDossierViewProps) {
  const l = UI_LABELS[lang]
  const ch = dossier.chapters[lang]

  // Разбиваем строку материаловедения на отдельные четкие инженерные пункты для идеальной читаемости на смартфоне
  const techPoints = dossier.materialsTech[lang]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <section className="w-full max-w-3xl mx-auto pb-16">
      {/* 0. ВЕРХНЯЯ ПАНЕЛЬ БЫСТРОЙ НАВИГАЦИИ И ОФИЦИАЛЬНОГО САЙТА */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={onBackToCollection}
          className="px-3.5 py-2 text-[10px] font-sans font-semibold uppercase tracking-[0.18em] cursor-pointer transition-opacity hover:opacity-90"
          style={{
            backgroundColor: themeColors.studioCanvas,
            color: themeColors.text,
            border: `1px solid ${themeColors.border}`,
          }}
        >
          {l.quickBackShoes} {totalModelsCount !== null ? `(${totalModelsCount})` : ''}
        </button>

        <button
          type="button"
          onClick={() => openExternalUrl(dossier.officialUrl)}
          className="px-3.5 py-2 text-[10px] font-sans font-semibold uppercase tracking-[0.18em] cursor-pointer transition-opacity hover:opacity-90"
          style={{
            backgroundColor: themeColors.text,
            color: themeColors.bg,
            border: `1px solid ${themeColors.text}`,
          }}
        >
          {dossier.officialDomain.toUpperCase()} ↗
        </button>
      </div>

      {/* 1. ОБСИДИАНОВЫЙ ЮВЕЛИРНЫЙ СТЕНД С АНИМИРОВАННЫМ ГЕРБОМ ДОМА */}
      <div className="w-full mb-7 relative overflow-hidden">
        <AnimatedBrandEmblem
          dossier={dossier}
          onOpenOfficialSite={() => openExternalUrl(dossier.officialUrl)}
        />
      </div>

      {/* 2. ЦИТАТА-МАНИФЕСТ ДОМА */}
      <blockquote
        className="text-center px-3 sm:px-10 mb-8 font-serif italic text-[18px] sm:text-[21px] leading-relaxed"
        style={{ color: themeColors.text }}
      >
        {dossier.quote[lang]}
      </blockquote>

      {/* 3. ТЕХНИЧЕСКИЙ ПАСПОРТ ДОМА + ОФИЦИАЛЬНЫЙ САЙТ */}
      <div
        className="mb-9 overflow-hidden"
        style={{
          backgroundColor: themeColors.studioCanvas,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
          <div>
            <span
              className="block text-[9px] font-sans uppercase tracking-[0.2em] mb-1"
              style={{ color: themeColors.textMuted }}
            >
              {l.founded}
            </span>
            <span className="font-serif text-[19px] font-normal">{dossier.founded}</span>
          </div>

          <div>
            <span
              className="block text-[9px] font-sans uppercase tracking-[0.2em] mb-1"
              style={{ color: themeColors.textMuted }}
            >
              {l.hq}
            </span>
            <span className="text-[13px] font-sans leading-snug block font-medium">
              {dossier.headquarters[lang]}
            </span>
          </div>

          <div>
            <span
              className="block text-[9px] font-sans uppercase tracking-[0.2em] mb-1"
              style={{ color: themeColors.textMuted }}
            >
              {l.direction}
            </span>
            <span className="text-[13px] font-sans leading-snug block font-medium">
              {dossier.creativeCode[lang]}
            </span>
          </div>

          <div>
            <span
              className="block text-[9px] font-sans uppercase tracking-[0.2em] mb-1"
              style={{ color: themeColors.textMuted }}
            >
              {l.archiveVolume}
            </span>
            <span className="font-serif text-[19px] font-normal">
              {totalModelsCount !== null ? `${totalModelsCount} ${l.modelsUnit}` : 'Archive'}
            </span>
          </div>
        </div>

        {/* Нижняя строка паспорта: прямой переход на официальный сайт бренда */}
        <div
          className="px-5 py-3.5 flex items-center justify-between gap-3"
          style={{
            borderTop: `1px solid ${themeColors.borderFaint}`,
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <span
            className="text-[10px] font-sans uppercase tracking-[0.18em]"
            style={{ color: themeColors.textMuted }}
          >
            {l.officialSiteLabel}
          </span>
          <button
            type="button"
            onClick={() => openExternalUrl(dossier.officialUrl)}
            className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] underline bg-transparent border-none cursor-pointer"
            style={{ color: themeColors.text }}
          >
            {dossier.officialDomain} ↗
          </button>
        </div>
      </div>

      {/* 4. КУЛЬТОВЫЕ СИЛУЭТЫ ДОМА (С СОХРАНЕНИЕМ БРЕНДА И ВОЗВРАТОМ В ПАСПОРТ) */}
      <div
        className="p-5 mb-9"
        style={{
          backgroundColor: themeColors.studioCanvas,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <div className="mb-3.5">
          <span
            className="block text-[11px] font-sans font-semibold uppercase tracking-[0.22em] mb-1"
            style={{ color: themeColors.text }}
          >
            {l.iconicHeader}
          </span>
          <span
            className="block text-[12px] font-sans leading-snug"
            style={{ color: themeColors.textMuted }}
          >
            {l.iconicSub}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {dossier.iconicModels.map((model) => {
            const isSelected = activeIconicModel === model
            return (
              <button
                key={model}
                type="button"
                onClick={() => onSelectModelQuery(model)}
                className="px-4 py-2.5 text-[11px] font-sans font-medium uppercase tracking-[0.16em] cursor-pointer transition-all active:scale-95"
                style={{
                  color: isSelected ? themeColors.bg : themeColors.text,
                  backgroundColor: isSelected ? themeColors.text : themeColors.bg,
                  border: `1px solid ${themeColors.text}`,
                }}
              >
                {model} →
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. ВЫСОКОКОНТРАСТНЫЙ ИНЖЕНЕРНЫЙ БЛОК: МАТЕРИАЛОВЕДЕНИЕ И ПОДОШВА */}
      <div
        className="p-5 sm:p-7 mb-9"
        style={{
          backgroundColor: themeColors.studioCanvas,
          border: `1px solid ${themeColors.border}`,
          borderLeft: `3px solid ${dossier.accentHex || themeColors.text}`,
        }}
      >
        <div className="mb-4">
          <span
            className="block text-[11px] font-sans font-bold uppercase tracking-[0.22em] mb-1"
            style={{ color: themeColors.text }}
          >
            {l.techSpecHeader}
          </span>
          <span
            className="block text-[12px] font-sans"
            style={{ color: themeColors.textMuted }}
          >
            {l.techSpecSub}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {techPoints.map((point, idx) => {
            const formattedPoint = point.charAt(0).toUpperCase() + point.slice(1).replace(/\.$/, '')
            return (
              <div
                key={idx}
                className="p-3.5 flex items-start gap-3"
                style={{
                  backgroundColor: themeColors.bg,
                  border: `1px solid ${themeColors.borderFaint}`,
                }}
              >
                <span
                  className="text-[10px] font-sans font-bold px-2 py-0.5 shrink-0 mt-0.5"
                  style={{
                    backgroundColor: themeColors.text,
                    color: themeColors.bg,
                  }}
                >
                  0{idx + 1}
                </span>
                <span
                  className="text-[14px] sm:text-[15px] font-sans font-normal leading-snug"
                  style={{ color: themeColors.text }}
                >
                  {formattedPoint}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 6. РЕДАКЦИОННАЯ СТАТЬЯ О ДОМЕ МОДЫ (3 ГЛАВЫ С КРУПНОЙ ТИПОГРАФИКОЙ) */}
      <div className="space-y-5 mb-10">
        <article
          className="p-6 sm:p-8"
          style={{
            backgroundColor: themeColors.studioCanvas,
            borderLeft: `2px solid ${themeColors.text}`,
          }}
        >
          <h3 className="font-serif text-[20px] sm:text-[22px] mb-3">{ch.originsTitle}</h3>
          <p
            className="text-[15px] sm:text-[16px] font-sans font-normal leading-relaxed"
            style={{ color: themeColors.text }}
          >
            {ch.originsText}
          </p>
        </article>

        <article
          className="p-6 sm:p-8"
          style={{
            backgroundColor: themeColors.studioCanvas,
            borderLeft: `2px solid ${themeColors.border}`,
          }}
        >
          <h3 className="font-serif text-[20px] sm:text-[22px] mb-3">{ch.craftTitle}</h3>
          <p
            className="text-[15px] sm:text-[16px] font-sans font-normal leading-relaxed"
            style={{ color: themeColors.text }}
          >
            {ch.craftText}
          </p>
        </article>

        <article
          className="p-6 sm:p-8"
          style={{
            backgroundColor: themeColors.studioCanvas,
            borderLeft: `2px solid ${themeColors.border}`,
          }}
        >
          <h3 className="font-serif text-[20px] sm:text-[22px] mb-3">{ch.legacyTitle}</h3>
          <p
            className="text-[15px] sm:text-[16px] font-sans font-normal leading-relaxed"
            style={{ color: themeColors.text }}
          >
            {ch.legacyText}
          </p>
        </article>
      </div>

      {/* 7. НИЖНИЙ БЛОК ДЕЙСТВИЙ: К КОЛЛЕКЦИИ + ОФИЦИАЛЬНЫЙ САЙТ */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBackToCollection}
          className="w-full sm:w-auto px-8 py-4 text-[10px] font-sans font-semibold uppercase tracking-[0.24em] cursor-pointer border-none transition-opacity hover:opacity-90"
          style={{
            backgroundColor: themeColors.text,
            color: themeColors.bg,
          }}
        >
          {l.backToShoes} {dossier.name} →
        </button>

        <button
          type="button"
          onClick={() => openExternalUrl(dossier.officialUrl)}
          className="w-full sm:w-auto px-8 py-4 text-[10px] font-sans font-semibold uppercase tracking-[0.24em] cursor-pointer bg-transparent transition-opacity hover:opacity-90"
          style={{
            color: themeColors.text,
            border: `1px solid ${themeColors.border}`,
            backgroundColor: themeColors.studioCanvas,
          }}
        >
          {l.openOfficialSite} ({dossier.officialDomain}) ↗
        </button>
      </div>
    </section>
  )
}
