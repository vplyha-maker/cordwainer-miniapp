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

const AUDIT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  SUCCESS: {
    color: 'var(--pigment-malachite, #047857)',
    bg: 'color-mix(in srgb, var(--pigment-malachite, #047857) 12%, var(--color-surface))',
    border: 'color-mix(in srgb, var(--pigment-malachite, #047857) 30%, transparent)',
  },
  WARNING: {
    color: 'var(--color-accent, #B46513)',
    bg: 'color-mix(in srgb, var(--color-accent, #B46513) 12%, var(--color-surface))',
    border: 'color-mix(in srgb, var(--color-accent, #B46513) 30%, transparent)',
  },
  ERROR: {
    color: 'var(--pigment-lac-dye, #E11D48)',
    bg: 'color-mix(in srgb, var(--pigment-lac-dye, #E11D48) 12%, var(--color-surface))',
    border: 'color-mix(in srgb, var(--pigment-lac-dye, #E11D48) 30%, transparent)',
  },
  INFO: {
    color: 'var(--pigment-azurite, #1D4ED8)',
    bg: 'color-mix(in srgb, var(--pigment-azurite, #1D4ED8) 12%, var(--color-surface))',
    border: 'color-mix(in srgb, var(--pigment-azurite, #1D4ED8) 30%, transparent)',
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

  const showEntry =
    soleType === 'flat' && (heelType === 'kitten' || heelType === 'flared')

  const massTitle = t.massTitle ?? 'Распределение массы'
  const rearLabel = t.rearfoot ?? t.heelLbl
  const foreLabel = t.forefoot ?? t.toeLbl
  const entryLabel = t.entryAngle ?? 'Угол въезда'
  const dropMm = heelHeight - toeThickness

  const offsetColor = eng.heelOffsetTooFarBack
    ? 'var(--pigment-lac-dye, #E11D48)'
    : eng.heelOffsetTooFarForward
    ? 'var(--color-accent, #B46513)'
    : 'var(--pigment-malachite, #047857)'

  return (
    <div 
      className="flex flex-col rounded-[20px] border overflow-hidden shadow-sm transition-colors"
      style={{
        backgroundColor: styleObj.bg,
        borderColor: styleObj.border,
      }}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <div className="text-[13px] font-bold leading-tight" style={{ color: styleObj.color }}>
            {auditTitle}
          </div>
          <div className="text-[11px] font-medium mt-1 leading-snug line-clamp-2 text-[var(--color-ink)] opacity-80">
            {auditMessage}
          </div>
        </div>
        {audit.status === 'ERROR' && onFix && (
          <button
            onClick={onFix}
            className="shrink-0 text-[11px] font-bold py-1.5 px-3 rounded-[10px] active:scale-95 transition-transform shadow-sm whitespace-nowrap"
            style={{
              background: 'var(--color-ink)',
              color: 'var(--color-bg)',
            }}
          >
            🪄 {t.fixBtn}
          </button>
        )}
      </div>

      <div className="relative w-full" style={{ height: g.svgHeight }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${g.svgWidth} ${g.svgHeight}`}
          preserveAspectRatio="xMidYMax meet"
          className="overflow-visible"
        >
          <text
            x={(g.xHeel + g.xToe) / 2 - 42}
            y="8"
            fill="var(--color-muted)"
            fontSize="7"
            fontWeight="bold"
          >
            {massTitle}
          </text>

          <text x={Math.max(2, g.xHeel - 2)} y="18" fill="var(--color-muted)" fontSize="7" fontWeight="bold">
            {rearLabel}
          </text>
          <text x={Math.max(2, g.xHeel - 2)} y="30" fill="var(--pigment-malachite, #047857)" fontSize="12" fontWeight="bold">
            {eng.heelLoad}%
          </text>

          <text x={g.xToe - 32} y="18" fill="var(--color-muted)" fontSize="7" fontWeight="bold">
            {foreLabel}
          </text>
          <text x={g.xToe - 32} y="30" fill="var(--pigment-lac-dye, #E11D48)" fontSize="12" fontWeight="bold">
            {eng.forefootLoad}%
          </text>

          {showEntry && (
            <>
              <text
                x={(g.xHeel + g.xToe) / 2 - 28}
                y="18"
                fill="var(--color-muted)"
                fontSize="7"
                fontWeight="bold"
              >
                {entryLabel}
              </text>
              <text
                x={(g.xHeel + g.xToe) / 2 - 14}
                y="30"
                fill="var(--color-accent, #B46513)"
                fontSize="12"
                fontWeight="bold"
              >
                {eng.entryAngleDeg}°
              </text>
            </>
          )}

          <line
            x1="0"
            y1={g.yGround}
            x2={g.svgWidth}
            y2={g.yGround}
            stroke="var(--color-border)"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          
          <line
            x1={g.xHeel - 8}
            y1={g.yFootBall}
            x2={g.xToe + 8}
            y2={g.yFootBall}
            stroke="var(--pigment-azurite, #1D4ED8)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.6"
          />

          {soleType === 'flat' && (
            <>
              <line
                x1={g.xHeelCenter}
                y1={g.yFootHeel - 8}
                x2={g.xHeelCenter}
                y2={g.yGround + 4}
                stroke={offsetColor}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <circle
                cx={g.xTipCenter}
                cy={g.yGround}
                r="3"
                fill={offsetColor}
              />
            </>
          )}

          {soleType === 'rocker' ? (
            <text
              x={g.xBall + 8}
              y={Math.min(g.yFootBall - 10, g.yGround - 14)}
              fill="var(--pigment-azurite, #1D4ED8)"
              fontSize="8"
              fontWeight="bold"
            >
              {t.dropLbl}: {dropMm} {t.mm || 'мм'}
            </text>
          ) : (
            <text
              x={g.xHeelCenter + 12}
              y={g.yGround - 8}
              fill="var(--pigment-azurite, #1D4ED8)"
              fontSize="8"
              fontWeight="bold"
            >
              {t.dropLbl}: {dropMm} {t.mm || 'мм'}
            </text>
          )}

          <path 
            d={g.heelPath} 
            fill="color-mix(in srgb, var(--color-accent, #B46513) 90%, transparent)" 
          />
          <path
            d={g.solePath}
            fill="var(--color-ink)"
            stroke="var(--color-accent, #B46513)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {soleType === 'flat' && (
            <path
              d={g.shankCurve}
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth={Math.max(1.5, eng.steelThickness * g.scale)}
              strokeLinecap="round"
            />
          )}

          {soleType === 'rocker' && (
            <>
              <circle cx={g.xBall} cy={g.yFootBall} r="3" fill="var(--pigment-lac-dye, #E11D48)" />
              <line
                x1={g.xBall}
                y1={g.yFootBall}
                x2={g.xBall}
                y2={g.yGround}
                stroke="var(--pigment-lac-dye, #E11D48)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            </>
          )}
        </svg>
      </div>

      <div 
        className="px-4 py-2.5 flex justify-between text-[11px] font-medium"
        style={{
          borderTop: '1px solid var(--color-border)',
          background: 'color-mix(in srgb, var(--color-ink) 4%, transparent)',
          color: 'var(--color-muted)'
        }}
      >
        <span>
          {t.internalSlope}{' '}
          <strong className="text-[12px] font-bold text-[var(--color-ink)]">
            {eng.internalSlope.toFixed(1)}°
          </strong>
        </span>
        <span>
          {t.loadLbl}{' '}
          <strong
            className="text-[12px] font-bold"
            style={{
              color: eng.forefootLoad >= HEEL_CONST.CRITICAL_LOAD 
                ? 'var(--pigment-lac-dye, #E11D48)' 
                : 'var(--color-ink)'
            }}
          >
            {eng.forefootLoad}%
          </strong>
        </span>
      </div>
    </div>
  )
}
