// src/components/heel/HeelCanvas.tsx
import React, { useState, Suspense } from 'react'
import type { HeelEngineering, HeelAudit, SoleType, HeelType, Gender } from '../../lib/heelCalc'
import type { HeelGeometry } from '../../lib/heelGeometry'
import { HEEL_CONST } from '../../lib/heelCalc'

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
  massTitle?: string
  forefoot?: string
  rearfoot?: string
  entryAngle?: string
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
  heelType: HeelType
  heelHeight: number
  toeThickness: number
  rockerAngle?: number
  rockerStartPct?: number
  heelTipOffsetMm?: number
  tipWidthMm?: number
  pronationDeg?: number
  isDark?: boolean
  labels: Labels
  onFix?: () => void
}

const AUDIT_STYLES: Record<string, { color: string; bg: string; border: string; badge: string }> = {
  SUCCESS: {
    color: 'var(--color-ink)',
    bg: 'color-mix(in srgb, var(--color-surface) 90%, var(--color-ink) 4%)',
    border: 'var(--color-border)',
    badge: '✦ CERTIFIED ORTHO BALANCE',
  },
  WARNING: {
    color: 'var(--color-accent, #B46513)',
    bg: 'color-mix(in srgb, var(--color-surface) 88%, var(--color-accent) 8%)',
    border: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
    badge: '⚠ BIOMECHANIC WARNING',
  },
  ERROR: {
    color: '#E11D48',
    bg: 'color-mix(in srgb, var(--color-surface) 88%, #E11D48 8%)',
    border: 'color-mix(in srgb, #E11D48 30%, transparent)',
    badge: '✕ CRITICAL DEVIATION',
  },
  INFO: {
    color: 'var(--color-accent)',
    bg: 'color-mix(in srgb, var(--color-surface) 90%, var(--color-accent) 6%)',
    border: 'var(--color-border)',
    badge: 'ℹ ARCHIVAL NOTICE',
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
  heelType,
  heelHeight,
  toeThickness,
  rockerAngle = 12,
  rockerStartPct = 65,
  heelTipOffsetMm = 0,
  tipWidthMm = 10,
  pronationDeg = 0,
  isDark = true,
  labels: t,
  onFix,
}: Props) {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d')

  const isInfo = audit.titleKey === 'negDropTitle'
  const styleObj = isInfo ? AUDIT_STYLES.INFO : AUDIT_STYLES[audit.status] || AUDIT_STYLES.INFO
  const showEntry = soleType === 'flat' && (heelType === 'kitten' || heelType === 'flared')

  const rearLabel = t.rearfoot ?? t.heelLbl
  const foreLabel = t.forefoot ?? t.toeLbl
  const entryLabel = t.entryAngle ?? 'Угол скоса'
  const dropMm = heelHeight - toeThickness

  const offsetColor = eng.heelOffsetTooFarBack
    ? '#E11D48'
    : eng.heelOffsetTooFarForward
    ? 'var(--color-accent, #B46513)'
    : 'var(--color-ink)'

  return (
    <div
      className="flex flex-col rounded-[16px] border overflow-hidden transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      style={{
        backgroundColor: styleObj.bg,
        borderColor: styleObj.border,
      }}
    >
      {/* Статус-панель аудита + переключатель режима 3D / 2D */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[8px] uppercase tracking-[0.25em] opacity-60">
              {styleObj.badge}
            </span>
          </div>
          <div className="font-serif text-[15px] md:text-[17px] font-normal leading-snug tracking-tight">
            {auditTitle}
          </div>
          <div className="text-[11px] font-sans font-light mt-0.5 leading-relaxed opacity-75">
            {auditMessage}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center rounded-[9px] p-0.5 border border-[var(--color-border)] bg-[var(--color-surface)]">
            {(['3d', '2d'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-[7px] text-[8.5px] font-mono uppercase tracking-[0.18em] transition-all cursor-pointer outline-none border-none ${
                  viewMode === mode
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold shadow-sm'
                    : 'bg-transparent text-[var(--color-ink)] opacity-55 hover:opacity-100'
                }`}
              >
                {mode === '3d' ? '3D LAB' : '2D CAD'}
              </button>
            ))}
          </div>

          {audit.status === 'ERROR' && onFix && (
            <button
              type="button"
              onClick={onFix}
              className="shrink-0 text-[9px] font-sans uppercase tracking-[0.2em] py-1.5 px-3 rounded-[9px] active:scale-95 transition-transform cursor-pointer outline-none border border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-bg)] font-medium shadow-sm"
            >
              {t.fixBtn} 🪄
            </button>
          )}
        </div>
      </div>

      {/* ВИЗУАЛЬНАЯ СЦЕНА: 3D THREE.JS (LAZY CHUNK) ИЛИ 2D SVG ЧЕРТЕЖ */}
      {viewMode === '3d' ? (
        <Suspense
          fallback={
            <div className="w-full h-[245px] flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.25em] opacity-50">
              INITIALIZING 3D ORTHO ENGINE...
            </div>
          }
        >
          <HeelScene3D
            eng={eng}
            gender={gender}
            soleType={soleType}
            heelType={heelType}
            heelHeight={heelHeight}
            toeThickness={toeThickness}
            rockerAngle={rockerAngle}
            rockerStartPct={rockerStartPct}
            heelTipOffsetMm={heelTipOffsetMm}
            tipWidthMm={tipWidthMm}
            pronationDeg={pronationDeg}
            isDark={isDark}
          />
        </Suspense>
      ) : (
        <div className="relative w-full px-2 py-3" style={{ height: g.svgHeight + 10 }}>
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
                letterSpacing="0.1em"
              >
                {rearLabel.toUpperCase()}
              </text>
              <text
                x={Math.max(8, g.xHeel - 4)}
                y="23"
                fill="var(--color-ink)"
                fontSize="11"
                fontFamily="serif"
                fontWeight="bold"
              >
                {eng.heelLoad}%
              </text>

              <text
                x={g.xToe - 56}
                y="12"
                fill="var(--color-muted)"
                fontSize="7"
                fontFamily="monospace"
                letterSpacing="0.1em"
              >
                {foreLabel.toUpperCase()} (M1/M5)
              </text>
              <text
                x={g.xToe - 56}
                y="23"
                fill="#E11D48"
                fontSize="11"
                fontFamily="serif"
                fontWeight="bold"
              >
                {eng.forefootLoad}% ({eng.loadM1Pct}/{eng.loadM5Pct})
              </text>

              {showEntry && (
                <>
                  <text
                    x={(g.xHeel + g.xToe) / 2 - 32}
                    y="12"
                    fill="var(--color-muted)"
                    fontSize="7"
                    fontFamily="monospace"
                    letterSpacing="0.1em"
                  >
                    {entryLabel.toUpperCase()}
                  </text>
                  <text
                    x={(g.xHeel + g.xToe) / 2 - 16}
                    y="23"
                    fill="var(--color-accent)"
                    fontSize="11"
                    fontFamily="serif"
                    fontWeight="bold"
                  >
                    {eng.entryAngleDeg}°
                  </text>
                </>
              )}
            </g>

            {/* БАЗОВАЯ ЛИНИЯ ПОЛА */}
            <line
              x1="10"
              y1={g.yGround + 6}
              x2={g.svgWidth - 10}
              y2={g.yGround + 6}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.8"
            />
            <text
              x="14"
              y={g.yGround + 18}
              fill="var(--color-muted)"
              fontSize="6.5"
              fontFamily="monospace"
              letterSpacing="0.15em"
            >
              LINEA BASALIS // FLOOR
            </text>

            {/* СИЛУЭТ КОЛОДКИ И НАЛЕПКА ВЗЪЕМА */}
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
                  fillOpacity="0.28"
                  stroke="#10B981"
                  strokeWidth="1"
                />
              )}
              {/* Линия косого обхвата через пятку и взъем (45°) */}
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

            {/* КОНТУР КАБЛУКА И УДЛИНЕНИЯ ТОМАСА */}
            <path d={g.heelPath} fill="var(--color-ink)" opacity="0.9" transform="translate(0, 6)" />
            {soleType === 'thomas' && g.thomasExtensionPath && (
              <g transform="translate(0, 6)">
                <path
                  d={g.thomasExtensionPath}
                  fill="#10B981"
                  fillOpacity="0.35"
                  stroke="#10B981"
                  strokeWidth="1.25"
                />
                <text
                  x={g.xHeelCenter + 22}
                  y={g.yGround - 6}
                  fill="#10B981"
                  fontSize="6.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  THOMAS +{eng.rx.thomasExtensionMm}mm
                </text>
              </g>
            )}

            {/* КОНТУР ПОДОШВЫ / СТЕЛЬКИ */}
            <path
              d={g.solePath}
              fill="var(--color-surface-2)"
              stroke="var(--color-ink)"
              strokeWidth="1.25"
              strokeLinejoin="round"
              transform="translate(0, 6)"
            />

            {/* МЕТАТАРЗАЛЬНЫЙ ПЕЛОТ ЗЕЙЦА */}
            {eng.requiresMetatarsalPad && (
              <g transform="translate(0, 6)">
                <path
                  d={g.pelottePath}
                  fill="#E11D48"
                  fillOpacity="0.28"
                  stroke="#E11D48"
                  strokeWidth="1.2"
                />
                <text
                  x={g.xPelotte}
                  y={g.yFootPelotte - 10}
                  textAnchor="middle"
                  fill="#E11D48"
                  fontSize="6.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  PELOTTE
                </text>
              </g>
            )}

            {/* ДИАГОНАЛЬНЫЙ КОРИДОР АПЕКСА ПУЧКОВ M5 – M1 */}
            <g transform="translate(0, 6)">
              <line
                x1={g.xApexM5}
                y1={g.yFootBall - 4}
                x2={g.xApexM5}
                y2={g.yGround}
                stroke="var(--color-accent)"
                strokeWidth="0.9"
                strokeDasharray="2 2"
                opacity="0.75"
              />
              <circle cx={g.xApexM5} cy={g.yFootBall} r="2" fill="var(--color-accent)" />
              <text
                x={g.xApexM5 - 3}
                y={g.yGround + 9}
                textAnchor="end"
                fill="var(--color-muted)"
                fontSize="6"
                fontFamily="monospace"
              >
                M5
              </text>

              <line
                x1={g.xApexM1}
                y1={g.yFootBall - 4}
                x2={g.xApexM1}
                y2={g.yGround}
                stroke="#10B981"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.85"
              />
              <circle cx={g.xApexM1} cy={g.yFootBall} r="2.2" fill="#10B981" />
              <text
                x={g.xApexM1 + 3}
                y={g.yGround + 9}
                textAnchor="start"
                fill="#10B981"
                fontSize="6"
                fontFamily="monospace"
                fontWeight="bold"
              >
                M1
              </text>
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

      <div
        className="px-5 py-3 flex items-center justify-between text-[11px] font-mono tracking-wider"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
          color: 'var(--color-muted)',
        }}
      >
        <span>
          {t.internalSlope.toUpperCase()}{' '}
          <strong className="text-[12px] font-bold text-[var(--color-ink)] font-serif">
            {eng.internalSlope.toFixed(1)}°
          </strong>
        </span>
        <span>
          {t.loadLbl.toUpperCase()}{' '}
          <strong
            className="text-[12px] font-bold font-serif"
            style={{
              color: eng.forefootLoad >= HEEL_CONST.CRITICAL_LOAD ? '#E11D48' : 'var(--color-ink)',
            }}
          >
            {eng.forefootLoad}%
          </strong>
        </span>
      </div>
    </div>
  )
}
