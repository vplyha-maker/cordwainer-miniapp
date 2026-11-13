import React from 'react'
import { BrandDossier, DossierLang } from './brandHeritageData'

interface BrandDossierViewProps {
  dossier: BrandDossier
  lang: DossierLang
  isDark: boolean
  themeColors: Record<string, string>
  totalModelsCount: number | null
  onSelectModelQuery: (modelQuery: string) => void
  onBackToCollection: () => void
}

const UI_LABELS: Record<DossierLang, Record<string, string>> = {
  ru: {
    founded: 'Год основания',
    hq: 'Штаб-квартира',
    direction: 'Основатели и креативный код',
    archiveVolume: 'В каталоге',
    modelsUnit: 'моделей',
    iconicHeader: 'Культовые силуэты Дома (нажмите для поиска в каталоге)',
    techSpecHeader: 'Материаловедение и технологии подошвы',
    backToShoes: 'Смотреть коллекцию',
  },
  uk: {
    founded: 'Рік заснування',
    hq: 'Штаб-квартира',
    direction: 'Засновники та креативний код',
    archiveVolume: 'У каталозі',
    modelsUnit: 'моделей',
    iconicHeader: 'Культові силуети Дому (натисніть для пошуку в каталозі)',
    techSpecHeader: 'Матеріалознавство та технології підошви',
    backToShoes: 'Дивитися колекцію',
  },
  de: {
    founded: 'Gründungsjahr',
    hq: 'Stammhaus',
    direction: 'Gründer & Kreativcode',
    archiveVolume: 'Im Katalog',
    modelsUnit: 'Modelle',
    iconicHeader: 'Ikonische Silhouetten (zum Filtern antippen)',
    techSpecHeader: 'Materialkunde & Sohlentechnologie',
    backToShoes: 'Kollektion ansehen',
  },
}

/**
 * Высокотехнологичный анимированный векторный SVG-стенд с 16 типами эмблем для всех 63 брендов
 */
function AnimatedBrandEmblem({
  dossier,
  isDark,
}: {
  dossier: BrandDossier
  isDark: boolean
}) {
  const strokeMain = isDark ? '#F5F2EB' : '#111111'
  const strokeAccent = dossier.accentHex || (isDark ? '#D4C3A3' : '#7A684B')

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center overflow-hidden select-none">
      <style>{`
        @keyframes cadOrbitSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes cadOrbitReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes cadDrawPath {
          0% { stroke-dashoffset: 600; opacity: 0.35; }
          50% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.92; }
        }
        @keyframes cadPulseGlow {
          0%, 100% { opacity: 0.2; transform: scale(0.97); }
          50% { opacity: 0.55; transform: scale(1.04); }
        }
        @keyframes cadScanLine {
          0% { transform: translateY(-100%); opacity: 0; }
          40% { opacity: 0.35; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>

      {/* Лазерный сканирующий луч */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${
            isDark ? 'rgba(212, 195, 163, 0.08)' : 'rgba(17, 17, 17, 0.04)'
          } 50%, transparent 100%)`,
          animation: 'cadScanLine 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }}
      />

      {/* Инженерные телеметрические метки по углам */}
      <div className="absolute top-3 left-4 text-[8px] font-sans uppercase tracking-[0.26em] opacity-35">
        CAD // {dossier.id.toUpperCase()}
      </div>
      <div className="absolute top-3 right-4 text-[8px] font-sans uppercase tracking-[0.26em] opacity-35">
        EST. {dossier.founded}
      </div>
      <div className="absolute bottom-3 left-4 text-[8px] font-sans uppercase tracking-[0.26em] opacity-35">
        HERITAGE ARCHIVE SPEC
      </div>
      <div className="absolute bottom-3 right-4 text-[8px] font-sans uppercase tracking-[0.26em] opacity-35">
        {dossier.monogram} · VECTOR 1:1
      </div>

      <svg
        viewBox="0 0 360 220"
        className="w-full h-full max-w-[360px] max-h-[220px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="luxuryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeMain} stopOpacity="1" />
            <stop offset="55%" stopColor={strokeAccent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={strokeMain} stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={strokeAccent} stopOpacity={isDark ? '0.24' : '0.14'} />
            <stop offset="100%" stopColor={strokeAccent} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx="180"
          cy="110"
          r="88"
          fill="url(#centerGlow)"
          style={{ animation: 'cadPulseGlow 4s ease-in-out infinite', transformOrigin: '180px 110px' }}
        />

        {/* Осевые координатные линии */}
        <line x1="20" y1="110" x2="75" y2="110" stroke={strokeMain} strokeOpacity="0.12" strokeWidth="0.75" />
        <line x1="285" y1="110" x2="340" y2="110" stroke={strokeMain} strokeOpacity="0.12" strokeWidth="0.75" />
        <line x1="180" y1="12" x2="180" y2="32" stroke={strokeMain} strokeOpacity="0.12" strokeWidth="0.75" />
        <line x1="180" y1="188" x2="180" y2="208" stroke={strokeMain} strokeOpacity="0.12" strokeWidth="0.75" />

        {/* Внешнее вращающееся кольцо */}
        <g style={{ transformOrigin: '180px 110px', animation: 'cadOrbitSlow 28s linear infinite' }}>
          <circle
            cx="180"
            cy="110"
            r="84"
            stroke={strokeMain}
            strokeOpacity="0.18"
            strokeWidth="0.8"
            strokeDasharray="4 6"
          />
          <circle cx="180" cy="26" r="2" fill={strokeAccent} />
          <circle cx="180" cy="194" r="2" fill={strokeAccent} />
        </g>

        {/* Внутреннее встречное кольцо */}
        <g style={{ transformOrigin: '180px 110px', animation: 'cadOrbitReverse 20s linear infinite' }}>
          <circle
            cx="180"
            cy="110"
            r="68"
            stroke={strokeAccent}
            strokeOpacity="0.3"
            strokeWidth="0.9"
            strokeDasharray="18 10 2 10"
          />
        </g>

        {/* 1. Треугольный герб (Prada, Palace) */}
        {dossier.emblem === 'prada_triangle' && (
          <g>
            <polygon
              points="116,66 244,66 180,168"
              stroke="url(#luxuryGrad)"
              strokeWidth="2.2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3.2s ease-out infinite alternate' }}
            />
            <polygon points="126,72 234,72 180,158" stroke={strokeMain} strokeOpacity="0.35" strokeWidth="0.9" />
            <text x="180" y="99" textAnchor="middle" fill={strokeMain} fontFamily="Georgia, serif" fontSize="15" letterSpacing="4">
              {dossier.name.slice(0, 8)}
            </text>
            <text x="180" y="122" textAnchor="middle" fill={strokeAccent} fontFamily="sans-serif" fontSize="7" letterSpacing="3">
              EST. {dossier.founded}
            </text>
          </g>
        )}

        {/* 2. Переплетенные кольца Chanel CC */}
        {dossier.emblem === 'chanel_cc' && (
          <g>
            <path
              d="M 192 78 A 34 34 0 1 0 192 142"
              stroke="url(#luxuryGrad)"
              strokeWidth="5.2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3s ease-out infinite alternate' }}
            />
            <path
              d="M 168 78 A 34 34 0 1 1 168 142"
              stroke="url(#luxuryGrad)"
              strokeWidth="5.2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3s ease-out infinite alternate' }}
            />
            <text x="180" y="168" textAnchor="middle" fill={strokeMain} fontFamily="sans-serif" fontSize="7.5" letterSpacing="4.5" opacity="0.75">
              31 RUE CAMBON
            </text>
          </g>
        )}

        {/* 3. Архитектурная монограмма BB (Balenciaga) */}
        {dossier.emblem === 'balenciaga_bb' && (
          <g>
            <rect x="126" y="66" width="108" height="88" rx="2" stroke={strokeMain} strokeOpacity="0.22" strokeWidth="1" />
            <text x="180" y="118" textAnchor="middle" fill="url(#luxuryGrad)" fontFamily="Georgia, serif" fontSize="36" letterSpacing="6">
              BB
            </text>
            <text x="180" y="142" textAnchor="middle" fill={strokeMain} fontFamily="sans-serif" fontSize="7" letterSpacing="4" opacity="0.7">
              PARIS · 1917
            </text>
          </g>
        )}

        {/* 4. Литера V в ромбе/овале (Valentino, Veja) */}
        {dossier.emblem === 'valentino_v' && (
          <g>
            <polygon points="180,52 238,110 180,168 122,110" stroke={strokeAccent} strokeOpacity="0.4" strokeWidth="1" />
            <ellipse cx="180" cy="110" rx="42" ry="28" stroke="url(#luxuryGrad)" strokeWidth="2" />
            <polyline
              points="160,92 180,130 200,92"
              stroke="url(#luxuryGrad)"
              strokeWidth="3.2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3s ease-out infinite alternate' }}
            />
          </g>
        )}

        {/* 5. Двойные кольца GG (Gucci) */}
        {dossier.emblem === 'gucci_gg' && (
          <g>
            <circle cx="164" cy="110" r="28" stroke="url(#luxuryGrad)" strokeWidth="3.2" strokeDasharray="135 45" />
            <circle cx="196" cy="110" r="28" stroke="url(#luxuryGrad)" strokeWidth="3.2" strokeDasharray="135 45" transform="rotate(180 196 110)" />
            <line x1="164" y1="110" x2="182" y2="110" stroke={strokeAccent} strokeWidth="3" />
            <line x1="178" y1="110" x2="196" y2="110" stroke={strokeAccent} strokeWidth="3" />
            <text x="180" y="162" textAnchor="middle" fill={strokeMain} fontFamily="Georgia, serif" fontSize="7.5" letterSpacing="4.5" opacity="0.7">
              FIRENZE 1921
            </text>
          </g>
        )}

        {/* 6. Четырехлистная звезда Monogram (Louis Vuitton) */}
        {dossier.emblem === 'lv_fleur' && (
          <g>
            <polygon
              points="180,56 195,95 234,110 195,125 180,164 165,125 126,110 165,95"
              stroke="url(#luxuryGrad)"
              strokeWidth="2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3.2s ease-out infinite alternate' }}
            />
            <circle cx="180" cy="110" r="12" stroke={strokeAccent} strokeWidth="1.4" />
            <text x="180" y="113" textAnchor="middle" fill={strokeMain} fontFamily="Georgia, serif" fontSize="9" letterSpacing="1">
              LV
            </text>
          </g>
        )}

        {/* 7. Архитектурный медальон Oblique (Dior) */}
        {dossier.emblem === 'dior_oblique' && (
          <g>
            <ellipse
              cx="180"
              cy="110"
              rx="52"
              ry="38"
              stroke="url(#luxuryGrad)"
              strokeWidth="2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3.2s ease-out infinite alternate' }}
            />
            <ellipse cx="180" cy="110" rx="46" ry="32" stroke={strokeAccent} strokeOpacity="0.4" strokeWidth="0.9" />
            <text x="180" y="117" textAnchor="middle" fill={strokeMain} fontFamily="Georgia, serif" fontSize="24" letterSpacing="5">
              DIOR
            </text>
            <text x="180" y="134" textAnchor="middle" fill={strokeAccent} fontFamily="sans-serif" fontSize="6" letterSpacing="3">
              30 MONTAIGNE
            </text>
          </g>
        )}

        {/* 8. Числовая матрица 0–23 (Maison Margiela) */}
        {dossier.emblem === 'margiela_numbers' && (
          <g fontFamily="Georgia, serif" fontSize="9.5" fill={strokeMain} opacity="0.8">
            <text x="180" y="78" textAnchor="middle" letterSpacing="4">0 1 2 3 4 5 6 7</text>
            <text x="180" y="102" textAnchor="middle" letterSpacing="4">8 9 10 11 12 13 14</text>
            <text x="180" y="126" textAnchor="middle" letterSpacing="4">15 16 17 18 19 20 21</text>
            <circle cx="213" cy="146" r="11" stroke={strokeAccent} strokeWidth="1.8" />
            <text x="180" y="150" textAnchor="middle" letterSpacing="5">22 23</text>
          </g>
        )}

        {/* 9. Геометрическая звезда (Rick Owens, Converse) */}
        {dossier.emblem === 'rick_star' && (
          <g>
            <polygon
              points="180,54 196,158 130,88 230,88 164,158"
              stroke="url(#luxuryGrad)"
              strokeWidth="1.9"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3.2s ease-out infinite alternate' }}
            />
            <text x="180" y="172" textAnchor="middle" fill={strokeAccent} fontFamily="sans-serif" fontSize="6.5" letterSpacing="4">
              {dossier.name}
            </text>
          </g>
        )}

        {/* 10. Векторное крыло Swoosh (Nike) */}
        {dossier.emblem === 'nike_swoosh' && (
          <g>
            <path
              d="M 130 122 C 144 144, 178 136, 240 86 C 194 114, 158 118, 144 96 C 137 104, 131 114, 130 122 Z"
              stroke="url(#luxuryGrad)"
              strokeWidth="2.3"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 2.8s ease-out infinite alternate' }}
            />
            <text x="180" y="156" textAnchor="middle" fill={strokeMain} fontFamily="sans-serif" fontSize="7.5" letterSpacing="5" opacity="0.65">
              BEAVERTON · 1964
            </text>
          </g>
        )}

        {/* 11. Три диагональные полосы (Adidas, Yeezy) */}
        {dossier.emblem === 'adidas_bars' && (
          <g>
            <polygon
              points="142,138 154,138 168,98 156,98"
              stroke="url(#luxuryGrad)"
              strokeWidth="1.8"
            />
            <polygon
              points="166,138 178,138 196,82 184,82"
              stroke="url(#luxuryGrad)"
              strokeWidth="1.8"
            />
            <polygon
              points="190,138 202,138 224,66 212,66"
              stroke="url(#luxuryGrad)"
              strokeWidth="1.8"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3s ease-out infinite alternate' }}
            />
            <text x="180" y="158" textAnchor="middle" fill={strokeMain} fontFamily="sans-serif" fontSize="8" letterSpacing="4.5" opacity="0.8">
              {dossier.name}
            </text>
          </g>
        )}

        {/* 12. Горные вершины Альп (Salomon, Arc'teryx, Hoka, Timberland, Merrell) */}
        {dossier.emblem === 'mountain_peak' && (
          <g>
            <polyline
              points="122,140 162,72 188,112 208,82 238,140"
              stroke="url(#luxuryGrad)"
              strokeWidth="2.2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3.2s ease-out infinite alternate' }}
            />
            <line x1="116" y1="140" x2="244" y2="140" stroke={strokeAccent} strokeWidth="1.2" />
            <text x="180" y="158" textAnchor="middle" fill={strokeMain} fontFamily="sans-serif" fontSize="8" letterSpacing="4" opacity="0.85">
              {dossier.name}
            </text>
          </g>
        )}

        {/* 13. Геральдический щит мастерских (Hermès, Loro Piana, Birkenstock, Dr. Martens, Clarks, Fila, Reebok) */}
        {dossier.emblem === 'heritage_shield' && (
          <g>
            <path
              d="M 136 64 L 224 64 L 224 114 C 224 142, 180 164, 180 164 C 180 164, 136 142, 136 114 Z"
              stroke="url(#luxuryGrad)"
              strokeWidth="2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3.4s ease-out infinite alternate' }}
            />
            <text
              x="180"
              y="112"
              textAnchor="middle"
              fill={strokeMain}
              fontFamily="Georgia, serif"
              fontSize={dossier.monogram.length > 3 ? '17' : '24'}
              letterSpacing="3"
            >
              {dossier.monogram}
            </text>
            <text x="180" y="132" textAnchor="middle" fill={strokeAccent} fontFamily="sans-serif" fontSize="6.5" letterSpacing="3">
              EST. {dossier.founded}
            </text>
          </g>
        )}

        {/* 14. Индустриальный гексагон стритвира (Off-White, BAPE, Supreme, Vans, Oakley, DC, Osiris, Etnies, Crocs) */}
        {dossier.emblem === 'skate_hexagon' && (
          <g>
            <polygon
              points="180,54 228,82 228,138 180,166 132,138 132,82"
              stroke="url(#luxuryGrad)"
              strokeWidth="2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3.2s ease-out infinite alternate' }}
            />
            <line x1="132" y1="82" x2="228" y2="138" stroke={strokeAccent} strokeOpacity="0.22" strokeWidth="0.9" />
            <line x1="228" y1="82" x2="132" y2="138" stroke={strokeAccent} strokeOpacity="0.22" strokeWidth="0.9" />
            <text
              x="180"
              y="116"
              textAnchor="middle"
              fill={strokeMain}
              fontFamily="sans-serif"
              fontWeight="600"
              fontSize={dossier.monogram.length > 3 ? '16' : '22'}
              letterSpacing="4"
            >
              {dossier.monogram}
            </text>
            <text x="180" y="136" textAnchor="middle" fill={strokeAccent} fontFamily="sans-serif" fontSize="6" letterSpacing="3">
              {dossier.founded}
            </text>
          </g>
        )}

        {/* 15. Динамический аэродинамический ромб спорта (New Balance, Asics, On, Puma, Saucony, Mizuno, Autry, Lacoste) */}
        {dossier.emblem === 'sport_vector' && (
          <g>
            <polygon
              points="134,142 156,74 226,74 204,142"
              stroke="url(#luxuryGrad)"
              strokeWidth="2"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3s ease-out infinite alternate' }}
            />
            <text
              x="180"
              y="115"
              textAnchor="middle"
              fill={strokeMain}
              fontFamily="Georgia, serif"
              fontStyle="italic"
              fontSize={dossier.monogram.length > 2 ? '20' : '26'}
              letterSpacing="3"
            >
              {dossier.monogram}
            </text>
            <text x="180" y="158" textAnchor="middle" fill={strokeAccent} fontFamily="sans-serif" fontSize="6.5" letterSpacing="3.5">
              {dossier.name}
            </text>
          </g>
        )}

        {/* 16. Восьмиугольный кутюрный картуш Вандомской площади (Saint Laurent, Bottega Veneta, Miu Miu, Celine, Loewe, McQueen, Lanvin, Versace, Givenchy, Fear of God, Kith, Jordan, UGG) */}
        {dossier.emblem === 'couture_crest' && (
          <g>
            <polygon
              points="154,56 206,56 238,88 238,132 206,164 154,164 122,132 122,88"
              stroke="url(#luxuryGrad)"
              strokeWidth="1.9"
              strokeDasharray="600"
              style={{ animation: 'cadDrawPath 3.4s ease-out infinite alternate' }}
            />
            <polygon
              points="158,62 202,62 232,92 232,128 202,158 158,158 128,128 128,92"
              stroke={strokeMain}
              strokeOpacity="0.25"
              strokeWidth="0.8"
            />
            <text
              x="180"
              y="116"
              textAnchor="middle"
              fill={strokeMain}
              fontFamily="Georgia, serif"
              fontSize={dossier.monogram.length > 2 ? '20' : '28'}
              letterSpacing="4"
            >
              {dossier.monogram}
            </text>
            <text x="180" y="142" textAnchor="middle" fill={strokeAccent} fontFamily="sans-serif" fontSize="6" letterSpacing="3">
              {dossier.name.slice(0, 16)}
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
  onSelectModelQuery,
  onBackToCollection,
}: BrandDossierViewProps) {
  const l = UI_LABELS[lang]
  const ch = dossier.chapters[lang]

  return (
    <section className="w-full max-w-3xl mx-auto pb-16">
      {/* 1. АНИМИРОВАННЫЙ ВЕКТОРНЫЙ СТЕНД С ЭМБЛЕМОЙ МОДНОГО ДОМА */}
      <div
        className="w-full mb-8 relative overflow-hidden"
        style={{
          backgroundColor: themeColors.studioCanvas,
          border: `1px solid ${themeColors.border}`,
        }}
      >
        <AnimatedBrandEmblem dossier={dossier} isDark={isDark} />
      </div>

      {/* 2. ЦИТАТА-МАНИФЕСТ ДОМА */}
      <blockquote
        className="text-center px-4 sm:px-10 mb-9 font-serif italic text-lg sm:text-xl leading-relaxed"
        style={{ color: themeColors.text }}
      >
        {dossier.quote[lang]}
      </blockquote>

      {/* 3. ТЕХНИЧЕСКИЙ ПАСПОРТ ДОМА */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 mb-9"
        style={{
          backgroundColor: themeColors.studioCanvas,
          border: `1px solid ${themeColors.borderFaint}`,
        }}
      >
        <div>
          <span
            className="block text-[8px] font-sans uppercase tracking-[0.22em] mb-1"
            style={{ color: themeColors.textMuted }}
          >
            {l.founded}
          </span>
          <span className="font-serif text-[17px]">{dossier.founded}</span>
        </div>

        <div>
          <span
            className="block text-[8px] font-sans uppercase tracking-[0.22em] mb-1"
            style={{ color: themeColors.textMuted }}
          >
            {l.hq}
          </span>
          <span className="text-[11px] font-sans leading-snug block">
            {dossier.headquarters[lang]}
          </span>
        </div>

        <div>
          <span
            className="block text-[8px] font-sans uppercase tracking-[0.22em] mb-1"
            style={{ color: themeColors.textMuted }}
          >
            {l.direction}
          </span>
          <span className="text-[11px] font-sans leading-snug block">
            {dossier.creativeCode[lang]}
          </span>
        </div>

        <div>
          <span
            className="block text-[8px] font-sans uppercase tracking-[0.22em] mb-1"
            style={{ color: themeColors.textMuted }}
          >
            {l.archiveVolume}
          </span>
          <span className="font-serif text-[17px]">
            {totalModelsCount !== null ? `${totalModelsCount} ${l.modelsUnit}` : 'Archive'}
          </span>
        </div>
      </div>

      {/* 4. ИНТЕРАКТИВНЫЕ ТЕГИ ЗНАКОВЫХ СИЛУЭТОВ */}
      <div className="mb-10">
        <span
          className="block text-[9px] font-sans uppercase tracking-[0.24em] mb-3"
          style={{ color: themeColors.textMuted }}
        >
          {l.iconicHeader}
        </span>
        <div className="flex flex-wrap gap-2">
          {dossier.iconicModels.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => onSelectModelQuery(`${dossier.name} ${model}`)}
              className="px-3.5 py-2 text-[10px] font-sans uppercase tracking-[0.18em] cursor-pointer bg-transparent transition-all hover:opacity-100 opacity-85"
              style={{
                color: themeColors.text,
                border: `1px solid ${themeColors.border}`,
                backgroundColor: themeColors.studioCanvas,
              }}
            >
              {model} ↗
            </button>
          ))}
        </div>
      </div>

      {/* 5. РЕДАКЦИОННАЯ СТАТЬЯ О ДОМЕ МОДЫ (3 ГЛАВЫ) */}
      <div className="space-y-6 mb-10">
        <article
          className="p-6 sm:p-8"
          style={{
            backgroundColor: themeColors.studioCanvas,
            borderLeft: `2px solid ${themeColors.text}`,
          }}
        >
          <h3 className="font-serif text-lg sm:text-xl mb-2.5">{ch.originsTitle}</h3>
          <p
            className="text-[13px] sm:text-[14px] font-sans font-light leading-relaxed"
            style={{ color: isDark ? 'rgba(245,242,235,0.82)' : 'rgba(17,17,17,0.82)' }}
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
          <h3 className="font-serif text-lg sm:text-xl mb-2.5">{ch.craftTitle}</h3>
          <p
            className="text-[13px] sm:text-[14px] font-sans font-light leading-relaxed mb-4"
            style={{ color: isDark ? 'rgba(245,242,235,0.82)' : 'rgba(17,17,17,0.82)' }}
          >
            {ch.craftText}
          </p>
          <div
            className="pt-3 mt-3 text-[12px] font-serif italic leading-relaxed"
            style={{
              borderTop: `1px solid ${themeColors.borderFaint}`,
              color: themeColors.textMuted,
            }}
          >
            <strong className="not-italic font-sans uppercase text-[9px] tracking-[0.2em] mr-2">
              {l.techSpecHeader}:
            </strong>
            {dossier.materialsTech[lang]}
          </div>
        </article>

        <article
          className="p-6 sm:p-8"
          style={{
            backgroundColor: themeColors.studioCanvas,
            borderLeft: `2px solid ${themeColors.border}`,
          }}
        >
          <h3 className="font-serif text-lg sm:text-xl mb-2.5">{ch.legacyTitle}</h3>
          <p
            className="text-[13px] sm:text-[14px] font-sans font-light leading-relaxed"
            style={{ color: isDark ? 'rgba(245,242,235,0.82)' : 'rgba(17,17,17,0.82)' }}
          >
            {ch.legacyText}
          </p>
        </article>
      </div>

      {/* 6. КНОПКА ПЕРЕХОДА К КОЛЛЕКЦИИ ОБУВИ */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackToCollection}
          className="px-9 py-4 text-[10px] font-sans uppercase tracking-[0.28em] cursor-pointer border-none transition-opacity hover:opacity-90"
          style={{
            backgroundColor: themeColors.text,
            color: themeColors.bg,
          }}
        >
          {l.backToShoes} {dossier.name} →
        </button>
      </div>
    </section>
  )
}

