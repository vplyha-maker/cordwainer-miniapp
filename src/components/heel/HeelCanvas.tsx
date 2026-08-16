// src/components/heel/HeelCanvas.tsx
import React from 'react'
import type { HeelEngineering, HeelAudit, SoleType } from '../../lib/heelCalc'
import type { HeelGeometry } from '../../lib/heelGeometry'
import { HEEL_CONST } from '../../lib/heelCalc'

type Labels = {
  heelLbl: string
  toeLbl: string
  dropLbl: string
  internalSlope: string
  loadLbl: string
  fixBtn: string
}

type Props = {
  geometry: HeelGeometry
  eng: HeelEngineering
  audit: HeelAudit
  auditTitle: string
  auditMessage: string
  soleType: SoleType
  heelHeight: number
  toeThickness: number
  labels: Labels
  onFix?: () => void
}

const AUDIT_STYLES = {
  SUCCESS: {
    colors: 'text-green-400',
    box: 'border-green-500/20 bg-[#1C1816]',
  },
  WARNING: {
    colors: 'text-amber-400',
    box: 'border-amber-500/40 bg-amber-950/20',
  },
  ERROR: {
    colors: 'text-red-400',
    box: 'border-red-500/40 bg-red-950/20',
  },
} as const

export function HeelCanvas({
  geometry: g,
  eng,
  audit,
  auditTitle,
  auditMessage,
  soleType,
  heelHeight,
  toeThickness,
  labels: t,
  onFix,
}: Props) {
  const style = AUDIT_STYLES[audit.status]
  const boxColors =
    audit.titleKey === 'negDropTitle' ? 'border-blue-500/40 bg-blue-950/20' : style.box
  const textColor =
    audit.titleKey === 'negDropTitle' ? 'text-blue-400' : style.colors

  return (
    <div className={`flex flex-col rounded-[14px] border overflow-hidden ${boxColors}`}>
      {/* Алерт — компактно */}
      <div className="flex items-start justify-between gap-2 px-2.5 pt-2 pb-1">
        <div className="min-w-0">
          <div className={`text-[11px] font-bold leading-tight ${textColor}`}>{auditTitle}</div>
          <div className="text-[9px] opacity-75 mt-0.5 leading-snug line-clamp-2">{auditMessage}</div>
        </div>
        {audit.status === 'ERROR' && onFix && (
          <button
            onClick={onFix}
            className="shrink-0 bg-[#8B5CF6] text-white text-[10px] font-bold py-1 px-2 rounded-md active:scale-95"
          >
            🪄 {t.fixBtn}
          </button>
        )}
      </div>

      {/* SVG */}
      <div className="relative w-full" style={{ height: g.svgHeight }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${g.svgWidth} ${g.svgHeight}`}
          preserveAspectRatio="xMidYMax meet"
          className="overflow-visible"
        >
          <text x={g.xHeel - 6} y="16" fill="#8B5CF6" fontSize="9" fontWeight="bold" opacity="0.75">
            {t.heelLbl}
          </text>
          <text x={g.xToe - 24} y="16" fill="#8B5CF6" fontSize="9" fontWeight="bold" opacity="0.75">
            {t.toeLbl}
          </text>

          <line x1="0" y1={g.yGround} x2={g.svgWidth} y2={g.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="2 2" />
          <line
            x1={g.xHeel - 8}
            y1={g.yFootBall}
            x2={g.xToe + 8}
            y2={g.yFootBall}
            stroke="#3B82F6"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.4"
          />

          {soleType === 'flat' && (
            <>
              <line
                x1={g.xHeelCenter}
                y1={g.yFootHeel - 8}
                x2={g.xHeelCenter}
                y2={g.yGround + 4}
                stroke={eng.heelOffsetTooFarBack ? '#EF4444' : eng.heelOffsetTooFarForward ? '#F59E0B' : '#22C55E'}
                strokeWidth="1.4"
                strokeDasharray="4 3"
                opacity="0.95"
              />
              <circle
                cx={g.xTipCenter}
                cy={g.yGround}
                r="2.8"
                fill={eng.heelOffsetTooFarBack ? '#EF4444' : eng.heelOffsetTooFarForward ? '#F59E0B' : '#22C55E'}
              />
            </>
          )}

          <text x={g.xHeelCenter + 6} y={g.yFootBall - 4} fill="#3B82F6" fontSize="8" fontWeight="600">
            {t.dropLbl}: {heelHeight - toeThickness} мм
          </text>

          <path d={g.heelPath} fill="#D49A5C" opacity="0.9" />
          <path d={g.solePath} fill="#2A2421" stroke="#D49A5C" strokeWidth="1.4" strokeLinejoin="round" />
          <path
            d={g.shankCurve}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={Math.max(1.1, eng.steelThickness * g.scale)}
            strokeLinecap="round"
          />

          {soleType === 'rocker' && (
            <>
              <circle cx={g.xBall} cy={g.yFootBall} r="2.8" fill="#EF4444" />
              <line
                x1={g.xBall}
                y1={g.yFootBall}
                x2={g.xBall}
                y2={g.yGround}
                stroke="#EF4444"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </>
          )}
        </svg>
      </div>

      {/* Низ: угол + нагрузка */}
      <div className="px-2.5 py-1.5 border-t border-white/5 flex justify-between text-[9px] bg-black/20">
        <span>
          {t.internalSlope}{' '}
          <strong className="text-[10px]">{eng.internalSlope.toFixed(1)}°</strong>
        </span>
        <span>
          {t.loadLbl}{' '}
          <strong className={`text-[10px] ${eng.forefootLoad >= HEEL_CONST.CRITICAL_LOAD ? 'text-red-400' : ''}`}>
            {eng.forefootLoad}%
          </strong>
        </span>
      </div>
    </div>
  )
}
