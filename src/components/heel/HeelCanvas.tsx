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
    colors: 'border-green-500/30 bg-green-500/10 text-green-400',
    box: 'border-green-500/20 bg-[#1C1816]',
  },
  WARNING: {
    colors: 'border-amber-500/30 bg-amber-500/20 text-amber-400',
    box: 'border-amber-500/40 bg-amber-950/20',
  },
  ERROR: {
    colors: 'border-red-500/30 bg-red-500/20 text-red-400',
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
  // WARNING blue for reverse slope handled by title keys — keep simple styles
  const boxColors =
    audit.titleKey === 'negDropTitle'
      ? 'border-blue-500/40 bg-blue-950/20'
      : style.box
  const textColors =
    audit.titleKey === 'negDropTitle'
      ? 'border-blue-500/30 bg-blue-500/20 text-blue-400'
      : style.colors

  return (
    <div className={`flex flex-col rounded-[16px] border transition-colors duration-500 overflow-hidden relative ${boxColors}`}>
      <div className="flex flex-col p-2.5 pb-0 z-10 min-h-[45px]">
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col">
            <span className={`text-[11px] font-bold ${textColors.split(' ').pop()}`}>
              {auditTitle}
            </span>
            <span className="text-[10px] opacity-80 mt-0.5">{auditMessage}</span>
          </div>
          {audit.status === 'ERROR' && onFix && (
            <button
              onClick={onFix}
              className="shrink-0 bg-[#8B5CF6] text-white text-[11px] font-bold py-1 px-2.5 rounded-md shadow-lg active:scale-95"
            >
              🪄 {t.fixBtn}
            </button>
          )}
        </div>
      </div>

      <div className="relative flex justify-center items-center w-full" style={{ height: g.svgHeight }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${g.svgWidth} ${g.svgHeight}`}
          preserveAspectRatio="xMidYMax meet"
          className="overflow-visible"
        >
          <text x={g.xHeel - 10} y="22" fill="#8B5CF6" fontSize="10" fontWeight="bold" opacity="0.8">
            {t.heelLbl}
          </text>
          <text x={g.xToe - 28} y="22" fill="#8B5CF6" fontSize="10" fontWeight="bold" opacity="0.8">
            {t.toeLbl}
          </text>

          <line x1="0" y1={g.yGround} x2={g.svgWidth} y2={g.yGround} stroke="#4A423C" strokeWidth="1" strokeDasharray="2 2" />
          <line
            x1={g.xHeel - 10}
            y1={g.yFootBall}
            x2={g.xToe + 10}
            y2={g.yFootBall}
            stroke="#3B82F6"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.45"
          />

          {soleType === 'flat' && (
            <>
              <line
                x1={g.xHeelCenter}
                y1={g.yFootHeel - 12}
                x2={g.xHeelCenter}
                y2={g.yGround + 6}
                stroke={eng.heelOffsetTooFarBack ? '#EF4444' : '#22C55E'}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.95"
              />
              <circle
                cx={g.xTipCenter}
                cy={g.yGround}
                r="3"
                fill={eng.heelOffsetTooFarBack ? '#EF4444' : '#22C55E'}
              />
            </>
          )}

          <text x={g.xHeelCenter + 8} y={g.yFootBall - 5} fill="#3B82F6" fontSize="9" fontWeight="600">
            {t.dropLbl}: {heelHeight - toeThickness} мм
          </text>

          <path d={g.heelPath} fill="#D49A5C" opacity="0.9" />
          <path d={g.solePath} fill="#2A2421" stroke="#D49A5C" strokeWidth="1.5" strokeLinejoin="round" />
          <path
            d={g.shankCurve}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={Math.max(1.2, eng.steelThickness * g.scale)}
            strokeLinecap="round"
          />

          {soleType === 'rocker' && (
            <>
              <circle cx={g.xBall} cy={g.yFootBall} r="3" fill="#EF4444" />
              <line x1={g.xBall} y1={g.yFootBall} x2={g.xBall} y2={g.yGround} stroke="#EF4444" strokeWidth="1" strokeDasharray="2 2" />
            </>
          )}
        </svg>
      </div>

      <div className="px-3 pb-2 pt-1 border-t border-white/5 flex justify-between text-[10px] opacity-90 z-10 bg-black/20">
        <span>
          {t.internalSlope}{' '}
          <strong className="text-[11px]">{eng.internalSlope.toFixed(1)}°</strong>
        </span>
        <span>
          {t.loadLbl}{' '}
          <strong className={`text-[11px] ${eng.forefootLoad >= HEEL_CONST.CRITICAL_LOAD ? 'text-red-400' : ''}`}>
            {eng.forefootLoad}%
          </strong>
        </span>
      </div>
    </div>
  )
}
