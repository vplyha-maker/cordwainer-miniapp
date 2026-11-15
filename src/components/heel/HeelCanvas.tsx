// src/components/heel/HeelCanvas.tsx
import React, { useState, Suspense } from 'react'
import type { HeelEngineering, HeelAudit, SoleType, Gender } from '../../lib/heelCalc'
import type { HeelGeometry } from '../../lib/heelGeometry'

const HeelScene3D = React.lazy(() =>
  import('./HeelScene3D').then((m) => ({ default: m.HeelScene3D }))
)

type Labels = {
  heelLbl: string
  toeLbl: string
  dropLbl: string
  internalSlope: string
  loadLbl: string
  fixBtn: string
  forefoot?: string
  rearfoot?: string
  mm?: string
}

type Props = {
  geometry: HeelGeometry
  eng: HeelEngineering
  audit: HeelAudit
  auditTitle: string
  auditMessage: string
  gender?: Gender
  soleType: SoleType
  heelHeight: number
  toeThickness: number
  rockerAngle?: number
  rockerStartPct?: number
  heelTipOffsetMm?: number
  pronationDeg?: number
  isDark?: boolean
  labels: Labels
  onFix?: () => void
}

const AUDIT_STYLES: Record<string, { color: string; bg: string; border: string; badge: string }> = {
  SUCCESS: {
    color: 'var(--color-ink)',
    bg: 'color-mix(in srgb, var(--color-surface) 92%, var(--color-ink) 4%)',
    border: 'var(--color-border)',
    badge: '✦ ОРТО-БАЛАНС В НОРМЕ',
  },
  WARNING: {
    color: 'var(--color-accent, #B46513)',
    bg: 'color-mix(in srgb, var(--color-surface) 88%, var(--color-accent) 8%)',
    border: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
    badge: '⚠ ТРЕБУЕТСЯ ВНИМАНИЕ',
  },
  ERROR: {
    color: '#E11D48',
    bg: 'color-mix(in srgb, var(--color-surface) 88%, #E11D48 8%)',
    border: 'color-mix(in srgb, #E11D48 30%, transparent)',
    badge: '✕ БИОМЕХАНИЧЕСКАЯ ПЕРЕГРУЗКА',
  },
}

export function HeelCanvas({
  geometry: g,
  eng,
  audit,
  auditTitle,
  auditMessage,
  gender = 'female',
  soleType,
  heelHeight,
  toeThickness,
  rockerAngle = 14,
  rockerStartPct = 60,
  heelTipOffsetMm = 0,
  pronationDeg = 0,
  isDark = true,
  labels: t,
  onFix,
}: Props) {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')
  const styleObj = AUDIT_STYLES[audit.status] || AUDIT_STYLES.SUCCESS
  const rearLabel = t.rearfoot ?? t.heelLbl
  const foreLabel = t.forefoot ?? t.toeLbl

  return (
    <div
      className="flex flex-col rounded-[14px] border overflow-hidden transition-all duration-300 shadow-sm"
      style={{
        backgroundColor: styleObj.bg,
        borderColor: styleObj.border,
      }}
    >
      {/* Шапка статуса без обрезки заголовка */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--color-border)]">
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[13px] font-semibold leading-snug">
            {auditTitle}
          </div>
          <div className="text-[10px] font-sans leading-tight opacity-80">
            {auditMessage}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {audit.status === 'ERROR' && onFix && (
            <button
              type="button"
              onClick={onFix}
              className="text-[8.5px] font-mono uppercase tracking-wider py-1.5 px-2.5 rounded-[7px] active:scale-95 transition-transform cursor-pointer border-none bg-[#E11D48] text-white font-semibold shadow-sm"
            >
              {t.fixBtn} 🪄
            </button>
          )}

          <div className="flex items-center rounded-[8px] p-0.5 border border-[var(--color-border)] bg-[var(--color-surface)]">
            {(['3d', '2d'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 rounded-[6px] text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
                  viewMode === mode
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                    : 'bg-transparent text-[var(--color-ink)] opacity-55'
                }`}
              >
                {mode === '3d' ? '3D' : '2D'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* СЦЕНА: 3D ИЛИ 2D */}
      {viewMode === '3d' ? (
        <Suspense
          fallback={
            <div className="w-full h-[215px] flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.25em] opacity-50">
              ЗАГРУЗКА 3D БИОМЕХАНИКИ...
            </div>
          }
        >
          <HeelScene3D
            eng={eng}
            gender={gender}
            soleType={soleType}
            heelHeight={heelHeight}
            toeThickness={toeThickness}
            rockerAngle={rockerAngle}
            rockerStartPct={rockerStartPct}
            heelTipOffsetMm={heelTipOffsetMm}
            pronationDeg={pronationDeg}
            isDark={isDark}
          />
        </Suspense>
      ) : (
        <div className="relative w-full px-2 py-1.5" style={{ height: 215 }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${g.svgWidth} ${g.svgHeight + 10}`}
            preserveAspectRatio="xMidYMid meet"
            className="overflow-visible"
          >
            <defs>
              <pattern id="atelier-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.04"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#atelier-grid)" />

            <g transform="translate(0, 4)">
              <text
                x={Math.max(8, g.xHeel - 4)}
                y="12"
                fill="var(--color-muted)"
                fontSize="7"
                fontFamily="monospace"
              >
                {rearLabel.toUpperCase()}: {eng.heelLoad}% ({eng.peakHeelPressureKpa} кПа)
              </text>
              <text
                x={g.xToe - 85}
                y="12"
                fill="#E11D48"
                fontSize="7"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {foreLabel.toUpperCase()}: {eng.forefootLoad}% ({eng.peakForefootPressureKpa} кПа)
              </text>
            </g>

            <line
              x1="10"
              y1={g.yGround + 6}
              x2={g.svgWidth - 10}
              y2={g.yGround + 6}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            <g transform="translate(0, 6)">
              <path
                d={g.lastUpperPath}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="0.9"
                strokeDasharray="3 3"
                opacity="0.35"
              />
              {g.instepBuildUpPath && (
                <path
                  d={g.instepBuildUpPath}
                  fill="#10B981"
                  fillOpacity="0.3"
                  stroke="#10B981"
                  strokeWidth="1"
                />
              )}
              <line
                x1={g.xHeel + 2}
                y1={g.yFootHeel}
                x2={g.xInstep - 8}
                y2={g.yInstepTop}
                stroke="var(--color-accent)"
                strokeWidth="0.85"
                strokeDasharray="2 2"
                opacity="0.6"
              />
            </g>

            <path
              d={g.heelPath}
              fill={soleType === 'rocker' ? '#475569' : 'var(--color-ink)'}
              opacity="0.9"
              transform="translate(0, 6)"
            />

            {soleType === 'thomas' && g.thomasExtensionPath && (
              <g transform="translate(0, 6)">
                <path
                  d={g.thomasExtensionPath}
                  fill="#10B981"
                  fillOpacity="0.45"
                  stroke="#10B981"
                  strokeWidth="1.25"
                />
                <text
                  x={g.xHeelCenter + 18}
                  y={g.yGround - 5}
                  fill="#10B981"
                  fontSize="6.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  THOMAS +{eng.rx.thomasExtensionMm}mm
                </text>
              </g>
            )}

            <path
              d={g.solePath}
              fill="var(--color-surface-2)"
              stroke="var(--color-ink)"
              strokeWidth="1.25"
              strokeLinejoin="round"
              transform="translate(0, 6)"
            />

            {eng.requiresMetatarsalPad && (
              <g transform="translate(0, 6)">
                <path
                  d={g.pelottePath}
                  fill="#E11D48"
                  fillOpacity="0.32"
                  stroke="#E11D48"
                  strokeWidth="1.2"
                />
              </g>
            )}

            <g transform="translate(0, 6)">
              <line
                x1={g.xApexM5}
                y1={g.yFootBall - 4}
                x2={g.xApexM5}
                y2={g.yGround}
                stroke="var(--color-accent)"
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />
              <line
                x1={g.xApexM1}
                y1={g.yFootBall - 4}
                x2={g.xApexM1}
                y2={g.yGround}
                stroke="#10B981"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>

            {soleType !== 'rocker' ? (
              <path
                d={g.shankCurve}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={Math.max(2, eng.steelThickness * (g.scale * 0.8))}
                strokeLinecap="round"
                transform="translate(0, 6)"
              />
            ) : (
              <path
                d={g.carbonPath}
                fill="none"
                stroke="#10B981"
                strokeWidth={Math.max(1.8, eng.carbonInsertThicknessMm * (g.scale * 0.85))}
                strokeDasharray="6 2"
                strokeLinecap="round"
                transform="translate(0, 6)"
              />
            )}
          </svg>
        </div>
      )}

      {/* Компактный технический футер */}
      <div
        className="px-3 py-1.5 flex items-center justify-between text-[9.5px] font-mono"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-surface) 65%, transparent)',
          color: 'var(--color-muted)',
        }}
      >
        <span>
          {t.internalSlope}{' '}
          <strong className="text-[var(--color-ink)] font-serif">{eng.internalSlope.toFixed(1)}°</strong>
        </span>
        <span>
          СТЕЛЬКА: <strong className="text-[var(--color-ink)]">{eng.rx.shoreA.split(' ')[0]} Шор</strong>
        </span>
        <span>
          МОМЕНТ: <strong className="text-[var(--color-ink)] font-serif">{eng.shankBendingMomentNm} Н·м</strong>
        </span>
      </div>
    </div>
  )
}
