import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  // Координаты мыши
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Настройки физики (делаем движение "маслянистым")
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  useEffect(() => {
    // Проверка на мобильные/сенсорные устройства
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true)
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    // Определяем, наведен ли курсор на кликабельный элемент
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.closest('button') ||
        target.closest('a')
      ) {
        setIsHovered(true)
      } else {
        setIsHovered(false)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseover', handleMouseOver)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseover', handleMouseOver)
    }
  }, [mouseX, mouseY])

  // Если это телефон — не рендерим кастомный курсор
  if (isTouchDevice) return null

  return (
    <motion.div
      className="fixed top-0 left-0 w-4 h-4 bg-white rounded-full pointer-events-none z-[9999]"
      style={{
        x: smoothX,
        y: smoothY,
        translateX: '-50%',
        translateY: '-50%',
        mixBlendMode: 'difference', // Главная фишка: инверсия цвета под курсором
      }}
      animate={{
        scale: isHovered ? 2.5 : 1, // Увеличивается при наведении на кнопки
        opacity: 1
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    />
  )
}

