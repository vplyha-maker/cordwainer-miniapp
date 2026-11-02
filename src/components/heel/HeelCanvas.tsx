import React from 'react'
import type { HeelEngineering, HeelAudit, SoleType, HeelType } from '../../lib/heelCalc'
import type { HeelGeometry } from '../../lib/heelGeometry'
import { HEEL_CONST } from '../../lib/heelCalc'

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
  soleType: SoleType
  heelType: HeelType
  heelHeight: number
  toeThickness: number
  labels: Labels
  onFix?: () => void
}

const AUDIT_STYLES: Record<string, { color: string; bg: string; border: string; badge: string }> = {
  SUCCESS: {
    color: 'var(--color-ink)',
    bg: 'color-mix(in srgb, var(--color-surface) 90%, var(--color-ink) 4%)',
    border: 'var(--color-border)',
    badge: '✦ CERTIFIED BALANCE',
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
  soleType,
  heelType,
  heelHeight,
  toeThickness,
  labels: t,
  onFix,
}: Props) {
  const isInfo = audit.titleKey === 'negDropTitle'
  const styleObj = isInfo ? AUDIT_STYLES.INFO : AUDIT_STYLES[audit.status] || AUDIT_STYLES.INFO
  const showEntry = soleType === 'flat' && (heelType === 'kitten' || heelType === 'flared')

  const massTitle = t.massTitle ?? 'Распределение массы'
  const rearLabel = t.rearfoot ?? t.heelLbl
  const foreLabel = t.forefoot ?? t.toeLbl
  const entryLabel = t.entryAngle ?? 'Угол въезда'
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
      {/* Статус-панель аудита в стиле кутюрного паспорта изделия */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--color-border)]">
        <div className="min-w-0">
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
        {audit.status === 'ERROR' && onFix && (
          <button
            type="button"
            onClick={onFix}
            className="shrink-0 text-[9px] font-sans uppercase tracking-[0.2em] py-2 px-3.5 rounded-[10px] active:scale-95 transition-transform cursor-pointer outline-none border border-[var(--color-border)] bg-[var(--color-ink)] text-[var(--color-bg)] font-medium shadow-sm"
          >
            {t.fixBtn} 🪄
          </button>
        )}
      </div>

      {/* Архитектурный чертеж (SVG Blueprint) */}
      <div className="relative w-full px-2 py-3" style={{ height: g.svgHeight + 10 }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${g.svgWidth} ${g.svgHeight + 10}`}
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible"
        >
          {/* Сетка чертежа (миллиметровка ателье) */}
          <defs>
            <pattern id="atelier-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.04" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#atelier-grid)" />

          {/* МЕТРИКИ МАССЫ И ВЕКТОРЫ ВЫШЕ ЧЕРТЕЖА */}
          <g transform="translate(0, 4)">
            <text x={Math.max(8, g.xHeel - 4)} y="12" fill="var(--color-muted)" fontSize="7" fontFamily="monospace" letterSpacing="0.1em">
              {rearLabel.toUpperCase()}
            </text>
            <text x={Math.max(8, g.xHeel - 4)} y="23" fill="var(--color-ink)" fontSize="11" fontFamily="serif" fontWeight="bold">
              {eng.heelLoad}%
            </text>

            <text x={g.xToe - 42} y="12" fill="var(--color-muted)" fontSize="7" fontFamily="monospace" letterSpacing="0.1em">
              {foreLabel.toUpperCase()}
            </text>
            <text x={g.xToe - 42} y="23" fill="#E11D48" fontSize="11" fontFamily="serif" fontWeight="bold">
              {eng.forefootLoad}%
            </text>

            {showEntry && (
              <>
                <text x={(g.xHeel + g.xToe) / 2 - 32} y="12" fill="var(--color-muted)" fontSize="7" fontFamily="monospace" letterSpacing="0.1em">
                  {entryLabel.toUpperCase()}
                </text>
                <text x={(g.xHeel + g.xToe) / 2 - 16} y="23" fill="var(--color-accent)" fontSize="11" fontFamily="serif" fontWeight="bold">
                  {eng.entryAngleDeg}°
                </text>
              </>
            )}
          </g>

          {/* БАЗОВАЯ ЛИНИЯ ПОЛА (GROUND LINE) */}
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
          <text x="14" y={g.yGround + 18} fill="var(--color-muted)" fontSize="6.5" fontFamily="monospace" letterSpacing="0.15em">
            LINEA BASALIS // FLOOR
          </text>
          
          {/* ЛИНИЯ СТОПЫ */}
          <line
            x1={g.xHeel - 8}
            y1={g.yFootBall + 6}
            x2={g.xToe + 8}
            y2={g.yFootBall + 6}
            stroke="var(--color-accent)"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.4"
          />

          {/* ОСЬ ЦЕНТРА ПЯТКИ */}
          {soleType === 'flat' && (
            <>
              <line
                x1={g.xHeelCenter}
                y1={g.yFootHeel - 4}
                x2={g.xHeelCenter}
                y2={g.yGround + 6}
                stroke={offsetColor}
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={g.xTipCenter}
                cy={g.yGround + 6}
                r="2.5"
                fill={offsetColor}
              />
            </>
          )}

          {/* ПОКАЗАТЕЛЬ ПЕРЕПАДА (DROP) */}
          <g transform="translate(0, 6)">
            {soleType === 'rocker' ? (
              <text
                x={g.xBall + 8}
                y={Math.min(g.yFootBall - 8, g.yGround - 10)}
                fill="var(--color-accent)"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {t.dropLbl.toUpperCase()}: {dropMm} {t.mm || 'mm'}
              </text>
            ) : (
              <text
                x={g.xHeelCenter + 12}
                y={g.yGround - 6}
                fill="var(--color-accent)"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {t.dropLbl.toUpperCase()}: {dropMm} {t.mm || 'mm'}
              </text>
            )}
          </g>

          {/* КОНТУР КАБЛУКА */}
          <path 
            d={g.heelPath} 
            fill="var(--color-ink)" 
            opacity="0.9"
            transform="translate(0, 6)"
          />
          
          {/* КОНТУР ПОДОШВЫ / КОЛОДКИ */}
          <path
            d={g.solePath}
            fill="var(--color-surface-2)"
            stroke="var(--color-ink)"
            strokeWidth="1.25"
            strokeLinejoin="round"
            transform="translate(0, 6)"
          />

          {/* СУПИНАТОР (STEEL SHANK) */}
          {soleType === 'flat' && (
            <path
              d={g.shankCurve}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={Math.max(2, eng.steelThickness * (g.scale * 0.8))}
              strokeLinecap="round"
              transform="translate(0, 6)"
            />
          )}

          {/* ТОЧКА РОКЕРА */}
          {soleType === 'rocker' && (
            <g transform="translate(0, 6)">
              <circle cx={g.xBall} cy={g.yFootBall} r="3" fill="#E11D48" />
              <line
                x1={g.xBall}
                y1={g.yFootBall}
                x2={g.xBall}
                y2={g.yGround}
                stroke="#E11D48"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* ТЕХНИЧЕСКИЙ ФУТЕР ЧЕРТЕЖА */}
      <div 
        className="px-5 py-3 flex items-center justify-between text-[11px] font-mono tracking-wider"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-surface) 60%, transparent)',
          color: 'var(--color-muted)'
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
              color: eng.forefootLoad >= HEEL_CONST.CRITICAL_LOAD ? '#E11D48' : 'var(--color-ink)'
            }}
          >
            {eng.forefootLoad}%
          </strong>
        </span>
      </div>
    </div>
  )
}
