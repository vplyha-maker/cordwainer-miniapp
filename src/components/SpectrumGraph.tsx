import React, { useMemo } from 'react'
import { SpectrumPoint } from '../utils/colorScience'

interface SpectrumGraphProps {
  spectrum: SpectrumPoint[]
  className?: string
  lineColor?: string
}

export const SpectrumGraph: React.FC<SpectrumGraphProps> = ({ 
  spectrum, 
  className = '',
  lineColor = 'currentColor' 
}) => {
  // SVG viewBox dimensions
  const WIDTH = 300
  const HEIGHT = 100

  // Видимый диапазон длин волн (ось X) и максимум отражения (ось Y)
  const MIN_WL = 380
  const MAX_WL = 780
  const MAX_REFL = 100

  const { pathD, areaD } = useMemo(() => {
    if (!spectrum || spectrum.length === 0) return { pathD: '', areaD: '' }

    // Преобразуем точки спектра в координаты SVG
    const coordinates = spectrum
      .filter(p => p.wavelength >= MIN_WL && p.wavelength <= MAX_WL)
      .map(p => {
        const x = ((p.wavelength - MIN_WL) / (MAX_WL - MIN_WL)) * WIDTH
        // Инвертируем Y, так как в SVG координата 0 сверху
        const y = HEIGHT - (p.reflectance / MAX_REFL) * HEIGHT
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })

    if (coordinates.length === 0) return { pathD: '', areaD: '' }

    const line = `M ${coordinates.join(' L ')}`
    
    // Создаем путь для заливки (закрываем фигуру снизу)
    const firstX = coordinates[0].split(',')[0]
    const lastX = coordinates[coordinates.length - 1].split(',')[0]
    const area = `${line} L ${lastX},${HEIGHT} L ${firstX},${HEIGHT} Z`

    return { pathD: line, areaD: area }
  }, [spectrum])

  if (!pathD) return null

  return (
    <div className={`flex flex-col relative ${className}`}>
      {/* Сам график */}
      <svg 
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`} 
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Сетка (опционально, для красоты) */}
        <line x1="0" y1="25" x2={WIDTH} y2="25" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="0" y1="50" x2={WIDTH} y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
        <line x1="0" y1="75" x2={WIDTH} y2="75" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />

        {/* Градиентная заливка под линией */}
        <path 
          d={areaD} 
          fill={lineColor} 
          fillOpacity="0.15" 
        />
        
        {/* Сама кривая спектра */}
        <path 
          d={pathD} 
          fill="none" 
          stroke={lineColor} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>

      {/* Подписи оси X (длины волн) */}
      <div className="flex justify-between w-full mt-1 text-[10px] text-gray-400 font-medium">
        <span>380</span>
        <span>УФ</span>
        <span>Видимый свет</span>
        <span>ИК</span>
        <span>780 nm</span>
      </div>
    </div>
  )
}

