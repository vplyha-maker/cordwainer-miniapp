import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import type { Lang } from '../App'

type ColorsPageProps = {
  onBack: () => void
  lang: Lang
  setLang: (lang: Lang) => void
}

type Scheme =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'rectangular'
  | 'split-complementary'
  | 'monochromatic'

type Silhouette = 'runner' | 'derby' | 'pump'

const LockIcon = ({ size = 10 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mb-[1px]"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0110 0v4"></path>
  </svg>
)

function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } })
      .Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

/* ============================================================================
   ПАРАМЕТРИЧЕСКИЙ ГЕНЕРАТОР 3D-МОДЕЛИ ОБУВИ (THREE.JS)
   Создает детализированную многослойную 3D-колодку и детали верха/подошвы
   ============================================================================ */
type ShoeMaterials = {
  main: THREE.MeshPhysicalMaterial
  secondary: THREE.MeshStandardMaterial
  tertiary: THREE.MeshStandardMaterial
  accent: THREE.MeshPhysicalMaterial
  midsole: THREE.MeshStandardMaterial
  lace: THREE.MeshStandardMaterial
  insole: THREE.MeshStandardMaterial
}

function sampleSilhouetteProfile(t: number, silhouette: Silhouette) {
  // t = 0 (пятка) ... t = 1 (мысок)
  const z = (t - 0.5) * 2.85

  // Асимметричный контур стопы (медиальная и латеральная стороны)
  let halfWidth = 0.36
  if (t < 0.22) {
    // Пятка
    const u = t / 0.22
    halfWidth = 0.14 + 0.22 * Math.sin(u * Math.PI * 0.5)
  } else if (t < 0.52) {
    // Геленочная часть (перешеек свода)
    const u = (t - 0.22) / 0.3
    halfWidth = 0.36 - 0.055 * Math.sin(u * Math.PI)
  } else if (t < 0.78) {
    // Пучки (самая широкая часть)
    const u = (t - 0.52) / 0.26
    halfWidth = 0.36 + 0.095 * Math.sin(u * Math.PI * 0.75)
  } else {
    // Сужение к мыску
    const u = (t - 0.78) / 0.22
    const tipPower = silhouette === 'pump' ? 1.65 : silhouette === 'derby' ? 1.35 : 1.15
    halfWidth = 0.425 * Math.cos(Math.pow(u, tipPower) * Math.PI * 0.485)
  }

  if (silhouette === 'pump') halfWidth *= 0.86
  if (silhouette === 'derby') halfWidth *= 0.93

  // Изгиб центральной оси стопы (банановидность колодки к большому пальцу)
  const centerShiftX =
    t < 0.3
      ? 0
      : t < 0.75
      ? Math.sin(((t - 0.3) / 0.45) * Math.PI) * 0.045
      : 0.035 * (1 - (t - 0.75) / 0.25)

  // Профиль подошвы (нижняя линия колодки + toe spring)
  let yBottom = 0
  if (silhouette === 'pump') {
    // Подъем каблука 105 мм
    const heelLift = t < 0.58 ? 0.72 * Math.pow(1 - t / 0.58, 1.45) : 0
    const toeSpring = t > 0.78 ? Math.pow((t - 0.78) / 0.22, 1.9) * 0.08 : 0
    yBottom = -0.34 + heelLift + toeSpring
  } else if (silhouette === 'derby') {
    const heelLift = t < 0.32 ? 0.11 : t < 0.5 ? 0.11 * (1 - (t - 0.32) / 0.18) : 0
    const toeSpring = t > 0.72 ? Math.pow((t - 0.72) / 0.28, 1.85) * 0.11 : 0
    yBottom = -0.22 + heelLift + toeSpring
  } else {
    // Runner: спортивный перекат (rocker + toe spring)
    const heelBevel = t < 0.1 ? Math.pow((0.1 - t) / 0.1, 1.8) * 0.065 : 0
    const drop = (1 - t) * 0.09
    const toeSpring = t > 0.68 ? Math.pow((t - 0.68) / 0.32, 1.85) * 0.17 : 0
    yBottom = -0.22 + drop + heelBevel + toeSpring
  }

  // Верхний профиль колодки (гребень подъема, союзка, мысок)
  let upperHeight = 0.48
  if (t < 0.14) {
    // Задник
    const u = t / 0.14
    upperHeight = 0.24 + 0.56 * Math.sin(u * Math.PI * 0.5)
  } else if (t < 0.44) {
    // Вырез горловины / язычок
    const u = (t - 0.14) / 0.3
    upperHeight = 0.78 + 0.08 * Math.sin(u * Math.PI)
  } else if (t < 0.76) {
    // Спуск по подъему (взъем)
    const u = (t - 0.44) / 0.32
    upperHeight = 0.82 - 0.44 * Math.pow(u, 0.92)
  } else {
    // Коробочка мыска
    const u = (t - 0.76) / 0.24
    const toeBoxH = silhouette === 'pump' ? 0.26 : silhouette === 'derby' ? 0.33 : 0.38
    upperHeight = toeBoxH * Math.cos(u * Math.PI * 0.46) + 0.04
  }

  if (silhouette === 'pump') upperHeight *= 0.84
  if (silhouette === 'derby') upperHeight *= 0.91

  return { z, halfWidth, centerShiftX, yBottom, upperHeight }
}

/**
 * Создает замкнутую или частичную 3D-оболочку детали обуви по диапазону длины [tStart, tEnd]
 * и угловому диапазону поперечного сечения [thetaStart, thetaEnd]
 */
function buildShellPatchGeometry(options: {
  silhouette: Silhouette
  tStart: number
  tEnd: number
  tSteps: number
  thetaStart: number
  thetaEnd: number
  thetaSteps: number
  radialOffset: number
  thickness: number
  collarCutout?: boolean
  topCurveMod?: (t: number, theta: number) => number
}): THREE.BufferGeometry {
  const {
    silhouette,
    tStart,
    tEnd,
    tSteps,
    thetaStart,
    thetaEnd,
    thetaSteps,
    radialOffset,
    thickness,
    collarCutout = false,
    topCurveMod,
  } = options

  const positions: number[] = []
  const indices: number[] = []

  const getPoint = (i: number, j: number, isInner: boolean) => {
    const t = tStart + (i / tSteps) * (tEnd - tStart)
    const theta = thetaStart + (j / thetaSteps) * (thetaEnd - thetaStart)
    const prof = sampleSilhouetteProfile(t, silhouette)

    // theta = 0 (подошва латерально) -> PI/2 (верх гребня) -> PI (подошва медиально)
    const cosT = Math.cos(theta)
    const sinT = Math.sin(theta)

    // Асимметрия свода
    const sideScale = cosT < 0 ? 1.0 : 1.04
    const rOffset = isInner ? radialOffset - thickness : radialOffset

    const x = prof.centerShiftX - cosT * (prof.halfWidth * sideScale + rOffset)

    // Профиль высоты сечения с учетом выреза горловины (ankle opening)
    let localH = prof.upperHeight
    if (collarCutout && t > 0.07 && t < 0.43) {
      const uCollar = (t - 0.07) / 0.36
      const dip =
        silhouette === 'pump'
          ? 0.56 * Math.sin(uCollar * Math.PI)
          : 0.24 * Math.sin(Math.min(1, uCollar * 1.15) * Math.PI)
      localH = Math.max(0.24, localH - dip)
    }

    if (topCurveMod) {
      localH += topCurveMod(t, theta)
    }

    // Приплюснутая у подошвы и объемная сверху форма колодки
    const verticalCurve = Math.pow(Math.max(0, sinT), 0.78)
    const y = prof.yBottom + verticalCurve * (localH + rOffset)
    const z = prof.z

    return [x, y, z] as const
  }

  const stride = thetaSteps + 1

  // Наружная поверхность
  for (let i = 0; i <= tSteps; i++) {
    for (let j = 0; j <= thetaSteps; j++) {
      const [x, y, z] = getPoint(i, j, false)
      positions.push(x, y, z)
    }
  }

  // Внутренняя поверхность (для реальной толщины кожи)
  const innerBaseIdx = (tSteps + 1) * stride
  for (let i = 0; i <= tSteps; i++) {
    for (let j = 0; j <= thetaSteps; j++) {
      const [x, y, z] = getPoint(i, j, true)
      positions.push(x, y, z)
    }
  }

  // Индексы наружной и внутренней поверхностей
  for (let i = 0; i < tSteps; i++) {
    for (let j = 0; j < thetaSteps; j++) {
      const a = i * stride + j
      const b = (i + 1) * stride + j
      const c = (i + 1) * stride + (j + 1)
      const d = i * stride + (j + 1)
      indices.push(a, b, d, b, c, d)

      const ai = innerBaseIdx + a
      const bi = innerBaseIdx + b
      const ci = innerBaseIdx + c
      const di = innerBaseIdx + d
      indices.push(ai, di, bi, bi, di, ci)
    }
  }

  // Зашиваем торцы (бортики толщины кожи)
  for (let i = 0; i < tSteps; i++) {
    // Край j = 0
    const a0 = i * stride
    const b0 = (i + 1) * stride
    const ai0 = innerBaseIdx + a0
    const bi0 = innerBaseIdx + b0
    indices.push(a0, ai0, b0, b0, ai0, bi0)

    // Край j = thetaSteps
    const a1 = i * stride + thetaSteps
    const b1 = (i + 1) * stride + thetaSteps
    const ai1 = innerBaseIdx + a1
    const bi1 = innerBaseIdx + b1
    indices.push(a1, b1, ai1, b1, bi1, ai1)
  }

  for (let j = 0; j < thetaSteps; j++) {
    // Край i = 0
    const a0 = j
    const d0 = j + 1
    const ai0 = innerBaseIdx + a0
    const di0 = innerBaseIdx + d0
    indices.push(a0, d0, ai0, d0, di0, ai0)

    // Край i = tSteps
    const a1 = tSteps * stride + j
    const d1 = tSteps * stride + j + 1
    const ai1 = innerBaseIdx + a1
    const di1 = innerBaseIdx + d1
    indices.push(a1, ai1, d1, d1, ai1, di1)
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

/**
 * Создает сплошное 3D-тело подошвы/межподошвы по диапазону длины [tStart, tEnd]
 */
function buildSoleSlabGeometry(options: {
  silhouette: Silhouette
  tStart: number
  tEnd: number
  tSteps: number
  flareWidth: number
  topOffset: number
  bottomThickness: number
}): THREE.BufferGeometry {
  const { silhouette, tStart, tEnd, tSteps, flareWidth, topOffset, bottomThickness } = options
  const radialSegs = 36
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= tSteps; i++) {
    const t = tStart + (i / tSteps) * (tEnd - tStart)
    const prof = sampleSilhouetteProfile(t, silhouette)

    // Плавное скругление носка и пятки в плане
    const endTapering =
      t < tStart + 0.04
        ? Math.sin(((t - tStart) / 0.04) * Math.PI * 0.5)
        : t > tEnd - 0.04
        ? Math.sin(((tEnd - t) / 0.04) * Math.PI * 0.5)
        : 1

    const w = (prof.halfWidth + flareWidth) * (0.25 + 0.75 * endTapering)
    const yTop = prof.yBottom + topOffset
    const yBot = yTop - bottomThickness

    for (let j = 0; j <= radialSegs; j++) {
      const angle = (j / radialSegs) * Math.PI * 2
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)

      const x = prof.centerShiftX + cosA * w
      const y = sinA >= 0 ? yTop + sinA * 0.025 : yBot + (1 + sinA) * bottomThickness * 0.15
      positions.push(x, y, prof.z)
    }
  }

  const stride = radialSegs + 1
  for (let i = 0; i < tSteps; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * stride + j
      const b = (i + 1) * stride + j
      const c = (i + 1) * stride + (j + 1)
      const d = i * stride + (j + 1)
      indices.push(a, b, d, b, c, d)
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

function buildFootwearMeshGroup(silhouette: Silhouette, mats: ShoeMaterials): THREE.Group {
  const group = new THREE.Group()

  if (silhouette === 'runner') {
    // 1. Внутренняя подкладка и анатомическая стелька (Tertiary / 15-30%)
    const liningGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.04,
      tEnd: 0.85,
      tSteps: 36,
      thetaStart: 0.08,
      thetaEnd: Math.PI - 0.08,
      thetaSteps: 28,
      radialOffset: -0.008,
      thickness: 0.022,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(liningGeom, mats.tertiary))

    // Мягкий валик воротника голенища (Tertiary)
    const collarRollGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.05,
      tEnd: 0.41,
      tSteps: 28,
      thetaStart: 0.52,
      thetaEnd: Math.PI - 0.52,
      thetaSteps: 20,
      radialOffset: 0.016,
      thickness: 0.032,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(collarRollGeom, mats.tertiary))

    // 2. Замшевая база союзки и берцев (Secondary / 30%)
    const suedeBaseGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.12,
      tEnd: 0.94,
      tSteps: 44,
      thetaStart: 0.04,
      thetaEnd: Math.PI - 0.04,
      thetaSteps: 32,
      radialOffset: 0.006,
      thickness: 0.016,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(suedeBaseGeom, mats.secondary))

    // Пухлый язычок кроссовка (Secondary / 30%)
    const tongueGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.31,
      tEnd: 0.66,
      tSteps: 22,
      thetaStart: Math.PI * 0.33,
      thetaEnd: Math.PI * 0.67,
      thetaSteps: 16,
      radialOffset: 0.022,
      thickness: 0.026,
      collarCutout: false,
      topCurveMod: (t) => (t < 0.45 ? (0.45 - t) * 0.35 : 0),
    })
    group.add(new THREE.Mesh(tongueGeom, mats.secondary))

    // Жаккардовый ярлык на язычке (Accent / 10%)
    const tongueTagGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.33,
      tEnd: 0.41,
      tSteps: 8,
      thetaStart: Math.PI * 0.42,
      thetaEnd: Math.PI * 0.58,
      thetaSteps: 8,
      radialOffset: 0.032,
      thickness: 0.012,
      collarCutout: false,
      topCurveMod: (t) => (t < 0.45 ? (0.45 - t) * 0.35 : 0),
    })
    group.add(new THREE.Mesh(tongueTagGeom, mats.accent))

    // 3. Кожаный мысок / Mudguard (Main / 60%)
    const mudguardGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.66,
      tEnd: 0.995,
      tSteps: 28,
      thetaStart: 0.02,
      thetaEnd: Math.PI - 0.02,
      thetaSteps: 30,
      radialOffset: 0.022,
      thickness: 0.018,
      collarCutout: false,
      topCurveMod: (t, theta) => {
        // Вырез на союзке, чтобы сверху читалась замшевая вставка
        const centerDist = Math.abs(theta - Math.PI * 0.5)
        if (t < 0.86 && centerDist < 0.52) {
          return -0.09 * Math.cos((centerDist / 0.52) * Math.PI * 0.5)
        }
        return 0
      },
    })
    group.add(new THREE.Mesh(mudguardGeom, mats.main))

    // Кожаный пяточный стакан / Heel Counter (Main / 60%)
    const heelCounterGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.005,
      tEnd: 0.29,
      tSteps: 24,
      thetaStart: 0.02,
      thetaEnd: Math.PI - 0.02,
      thetaSteps: 28,
      radialOffset: 0.024,
      thickness: 0.02,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(heelCounterGeom, mats.main))

    // Пяточный хлястик / Heel Tab (Accent / 10%)
    const heelTabGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.01,
      tEnd: 0.09,
      tSteps: 8,
      thetaStart: 0.38,
      thetaEnd: Math.PI - 0.38,
      thetaSteps: 14,
      radialOffset: 0.034,
      thickness: 0.016,
      collarCutout: false,
      topCurveMod: () => 0.03,
    })
    group.add(new THREE.Mesh(heelTabGeom, mats.accent))

    // Кожаная планка шнуровки / Eyestay (Main / 60%) — латеральная и медиальная
    const eyestayLatGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.37,
      tEnd: 0.69,
      tSteps: 20,
      thetaStart: Math.PI * 0.22,
      thetaEnd: Math.PI * 0.41,
      thetaSteps: 10,
      radialOffset: 0.026,
      thickness: 0.018,
      collarCutout: false,
    })
    const eyestayMedGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.37,
      tEnd: 0.69,
      tSteps: 20,
      thetaStart: Math.PI * 0.59,
      thetaEnd: Math.PI * 0.78,
      thetaSteps: 10,
      radialOffset: 0.026,
      thickness: 0.018,
      collarCutout: false,
    })
    group.add(new THREE.Mesh(eyestayLatGeom, mats.main))
    group.add(new THREE.Mesh(eyestayMedGeom, mats.main))

    // 4. Фирменные боковые шевроны / полосы (Accent / 10%)
    const stripe1Lat = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.41,
      tEnd: 0.52,
      tSteps: 12,
      thetaStart: 0.05,
      thetaEnd: Math.PI * 0.32,
      thetaSteps: 12,
      radialOffset: 0.021,
      thickness: 0.012,
      collarCutout: true,
    })
    const stripe2Lat = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.54,
      tEnd: 0.6,
      tSteps: 8,
      thetaStart: 0.05,
      thetaEnd: Math.PI * 0.31,
      thetaSteps: 10,
      radialOffset: 0.021,
      thickness: 0.012,
      collarCutout: true,
    })
    const stripe1Med = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.41,
      tEnd: 0.52,
      tSteps: 12,
      thetaStart: Math.PI * 0.68,
      thetaEnd: Math.PI - 0.05,
      thetaSteps: 12,
      radialOffset: 0.021,
      thickness: 0.012,
      collarCutout: true,
    })
    const stripe2Med = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.54,
      tEnd: 0.6,
      tSteps: 8,
      thetaStart: Math.PI * 0.69,
      thetaEnd: Math.PI - 0.05,
      thetaSteps: 10,
      radialOffset: 0.021,
      thickness: 0.012,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(stripe1Lat, mats.accent))
    group.add(new THREE.Mesh(stripe2Lat, mats.accent))
    group.add(new THREE.Mesh(stripe1Med, mats.accent))
    group.add(new THREE.Mesh(stripe2Med, mats.accent))

    // 5. Объемные 3D-шнурки и люверсы (5 рядов перекрестной шнуровки)
    const laceTValues = [0.41, 0.47, 0.53, 0.59, 0.65]
    laceTValues.forEach((lt, idx) => {
      const prof = sampleSilhouetteProfile(lt, 'runner')
      const yLace = prof.yBottom + prof.upperHeight * 0.91
      const xLat = prof.centerShiftX - prof.halfWidth * 0.46
      const xMed = prof.centerShiftX + prof.halfWidth * 0.48

      // Люверсы
      const eyeletGeom = new THREE.TorusGeometry(0.024, 0.008, 10, 18)
      const isAccentEyelet = idx === 0 || idx === laceTValues.length - 1
      const eyeMat = isAccentEyelet ? mats.accent : mats.tertiary

      const eyeLat = new THREE.Mesh(eyeletGeom, eyeMat)
      eyeLat.position.set(xLat, yLace, prof.z)
      eyeLat.rotation.y = Math.PI * 0.35
      group.add(eyeLat)

      const eyeMed = new THREE.Mesh(eyeletGeom, eyeMat)
      eyeMed.position.set(xMed, yLace, prof.z)
      eyeMed.rotation.y = -Math.PI * 0.35
      group.add(eyeMed)

      // Дуга шнурка
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(xLat, yLace, prof.z),
        new THREE.Vector3(prof.centerShiftX, yLace + 0.075, prof.z + 0.015),
        new THREE.Vector3(xMed, yLace, prof.z)
      )
      const tubeGeom = new THREE.TubeGeometry(curve, 16, 0.016, 8, false)
      group.add(new THREE.Mesh(tubeGeom, mats.lace))
    })

    // 6. Массивная скульптурная межподошва EVA (Midsole)
    const midsoleGeom = buildSoleSlabGeometry({
      silhouette: 'runner',
      tStart: 0.0,
      tEnd: 0.99,
      tSteps: 48,
      flareWidth: 0.048,
      topOffset: 0.015,
      bottomThickness: 0.145,
    })
    group.add(new THREE.Mesh(midsoleGeom, mats.midsole))

    // Пяточный стабилизатор / спойлер в межподошве (Tertiary)
    const stabilizerGeom = buildSoleSlabGeometry({
      silhouette: 'runner',
      tStart: 0.0,
      tEnd: 0.34,
      tSteps: 20,
      flareWidth: 0.056,
      topOffset: -0.025,
      bottomThickness: 0.068,
    })
    group.add(new THREE.Mesh(stabilizerGeom, mats.tertiary))

    // 7. Протектор / Подметка с захлестом на мысок (Accent / 10%)
    const outsoleGeom = buildSoleSlabGeometry({
      silhouette: 'runner',
      tStart: 0.0,
      tEnd: 1.0,
      tSteps: 48,
      flareWidth: 0.052,
      topOffset: -0.115,
      bottomThickness: 0.048,
    })
    group.add(new THREE.Mesh(outsoleGeom, mats.accent))

    // Передний защитный бампер мыска (характерная деталь Loro Piana / Loewe)
    const toeBumperGeom = buildShellPatchGeometry({
      silhouette: 'runner',
      tStart: 0.93,
      tEnd: 1.0,
      tSteps: 10,
      thetaStart: 0.02,
      thetaEnd: Math.PI - 0.02,
      thetaSteps: 20,
      radialOffset: 0.036,
      thickness: 0.022,
      collarCutout: false,
      topCurveMod: () => -0.16,
    })
    group.add(new THREE.Mesh(toeBumperGeom, mats.accent))
  } else if (silhouette === 'derby') {
    // 3D DERBY — Классический брог с рантом Goodyear и наборным каблуком
    const liningGeom = buildShellPatchGeometry({
      silhouette: 'derby',
      tStart: 0.04,
      tEnd: 0.85,
      tSteps: 34,
      thetaStart: 0.08,
      thetaEnd: Math.PI - 0.08,
      thetaSteps: 26,
      radialOffset: -0.006,
      thickness: 0.018,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(liningGeom, mats.tertiary))

    // Союзка и язычок (Secondary / 30%)
    const vampGeom = buildShellPatchGeometry({
      silhouette: 'derby',
      tStart: 0.14,
      tEnd: 0.92,
      tSteps: 40,
      thetaStart: 0.04,
      thetaEnd: Math.PI - 0.04,
      thetaSteps: 30,
      radialOffset: 0.006,
      thickness: 0.015,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(vampGeom, mats.secondary))

    // Отрезной мысок Wingtip и берцы Дерби (Main / 60%)
    const wingtipGeom = buildShellPatchGeometry({
      silhouette: 'derby',
      tStart: 0.64,
      tEnd: 0.998,
      tSteps: 26,
      thetaStart: 0.02,
      thetaEnd: Math.PI - 0.02,
      thetaSteps: 28,
      radialOffset: 0.02,
      thickness: 0.016,
      collarCutout: false,
    })
    const quartersGeom = buildShellPatchGeometry({
      silhouette: 'derby',
      tStart: 0.01,
      tEnd: 0.58,
      tSteps: 30,
      thetaStart: 0.02,
      thetaEnd: Math.PI - 0.02,
      thetaSteps: 28,
      radialOffset: 0.02,
      thickness: 0.017,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(wingtipGeom, mats.main))
    group.add(new THREE.Mesh(quartersGeom, mats.main))

    // Рант (Tertiary) + Подошва (Midsole) + Набойки (Accent)
    const weltGeom = buildSoleSlabGeometry({
      silhouette: 'derby',
      tStart: 0.0,
      tEnd: 1.0,
      tSteps: 44,
      flareWidth: 0.036,
      topOffset: 0.01,
      bottomThickness: 0.032,
    })
    group.add(new THREE.Mesh(weltGeom, mats.tertiary))

    const leatherSoleGeom = buildSoleSlabGeometry({
      silhouette: 'derby',
      tStart: 0.0,
      tEnd: 0.995,
      tSteps: 44,
      flareWidth: 0.028,
      topOffset: -0.02,
      bottomThickness: 0.048,
    })
    group.add(new THREE.Mesh(leatherSoleGeom, mats.midsole))

    const heelBlockGeom = buildSoleSlabGeometry({
      silhouette: 'derby',
      tStart: 0.0,
      tEnd: 0.28,
      tSteps: 18,
      flareWidth: 0.025,
      topOffset: -0.065,
      bottomThickness: 0.11,
    })
    group.add(new THREE.Mesh(heelBlockGeom, mats.midsole))

    const heelTopPieceGeom = buildSoleSlabGeometry({
      silhouette: 'derby',
      tStart: 0.0,
      tEnd: 0.28,
      tSteps: 18,
      flareWidth: 0.025,
      topOffset: -0.17,
      bottomThickness: 0.032,
    })
    const soleProtectorGeom = buildSoleSlabGeometry({
      silhouette: 'derby',
      tStart: 0.48,
      tEnd: 0.98,
      tSteps: 24,
      flareWidth: 0.024,
      topOffset: -0.064,
      bottomThickness: 0.024,
    })
    group.add(new THREE.Mesh(heelTopPieceGeom, mats.accent))
    group.add(new THREE.Mesh(soleProtectorGeom, mats.accent))

    // Вощеные тонкие шнурки (Accent)
    ;[0.43, 0.48, 0.53, 0.58].forEach((lt) => {
      const prof = sampleSilhouetteProfile(lt, 'derby')
      const yLace = prof.yBottom + prof.upperHeight * 0.92
      const xLat = prof.centerShiftX - prof.halfWidth * 0.38
      const xMed = prof.centerShiftX + prof.halfWidth * 0.4
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(xLat, yLace, prof.z),
        new THREE.Vector3(prof.centerShiftX, yLace + 0.05, prof.z),
        new THREE.Vector3(xMed, yLace, prof.z)
      )
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.011, 8, false), mats.accent))
    })
  } else {
    // 3D PUMP — Лодочки на шпильке 105 мм
    const liningGeom = buildShellPatchGeometry({
      silhouette: 'pump',
      tStart: 0.03,
      tEnd: 0.88,
      tSteps: 36,
      thetaStart: 0.06,
      thetaEnd: Math.PI - 0.06,
      thetaSteps: 28,
      radialOffset: -0.005,
      thickness: 0.016,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(liningGeom, mats.tertiary))

    // Основной корпус лодочки (Main / 60%)
    const pumpBodyGeom = buildShellPatchGeometry({
      silhouette: 'pump',
      tStart: 0.02,
      tEnd: 0.998,
      tSteps: 46,
      thetaStart: 0.02,
      thetaEnd: Math.PI - 0.02,
      thetaSteps: 32,
      radialOffset: 0.01,
      thickness: 0.016,
      collarCutout: true,
    })
    group.add(new THREE.Mesh(pumpBodyGeom, mats.main))

    // Пяточный контрфорс и декоративный мысок (Secondary / 30%)
    const pumpHeelCapGeom = buildShellPatchGeometry({
      silhouette: 'pump',
      tStart: 0.01,
      tEnd: 0.22,
      tSteps: 18,
      thetaStart: 0.02,
      thetaEnd: Math.PI - 0.02,
      thetaSteps: 26,
      radialOffset: 0.02,
      thickness: 0.015,
      collarCutout: true,
    })
    const pumpToeCapGeom = buildShellPatchGeometry({
      silhouette: 'pump',
      tStart: 0.78,
      tEnd: 1.0,
      tSteps: 20,
      thetaStart: 0.02,
      thetaEnd: Math.PI - 0.02,
      thetaSteps: 26,
      radialOffset: 0.02,
      thickness: 0.015,
      collarCutout: false,
    })
    group.add(new THREE.Mesh(pumpHeelCapGeom, mats.secondary))
    group.add(new THREE.Mesh(pumpToeCapGeom, mats.secondary))

    // Изящная пряжка на декольте мыска (Accent / 10%)
    const buckleProf = sampleSilhouetteProfile(0.73, 'pump')
    const buckleGeom = new THREE.BoxGeometry(0.32, 0.045, 0.14)
    const buckleMesh = new THREE.Mesh(buckleGeom, mats.accent)
    buckleMesh.position.set(
      buckleProf.centerShiftX,
      buckleProf.yBottom + buckleProf.upperHeight * 0.95,
      buckleProf.z
    )
    buckleMesh.rotation.x = 0.35
    group.add(buckleMesh)

    // Лакированная тонкая подошва (Accent / 10%)
    const pumpSoleGeom = buildSoleSlabGeometry({
      silhouette: 'pump',
      tStart: 0.02,
      tEnd: 0.998,
      tSteps: 46,
      flareWidth: 0.01,
      topOffset: 0.005,
      bottomThickness: 0.028,
    })
    group.add(new THREE.Mesh(pumpSoleGeom, mats.accent))

    // Шпилька 105 мм (Secondary + набойка Accent)
    const heelProf = sampleSilhouetteProfile(0.08, 'pump')
    const stilettoHeight = 0.68
    const stilettoGeom = new THREE.CylinderGeometry(0.068, 0.024, stilettoHeight, 20)
    const stilettoMesh = new THREE.Mesh(stilettoGeom, mats.secondary)
    stilettoMesh.position.set(
      heelProf.centerShiftX,
      heelProf.yBottom - stilettoHeight * 0.5,
      heelProf.z
    )
    group.add(stilettoMesh)

    const tipGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.045, 16)
    const tipMesh = new THREE.Mesh(tipGeom, mats.accent)
    tipMesh.position.set(
      heelProf.centerShiftX,
      heelProf.yBottom - stilettoHeight - 0.02,
      heelProf.z
    )
    group.add(tipMesh)
  }

  // Разворачиваем обувь в классический профильный 3/4 ракурс (мыском вправо)
  group.rotation.y = Math.PI * 0.5
  return group
}

/* ============================================================================
   ИНТЕРАКТИВНАЯ 3D-СЦЕНА THREE.JS (ВРАЩЕНИЕ ПАЛЬЦЕМ 360° + PBR МАТЕРИАЛЫ)
   ============================================================================ */
function Footwear3DStage({
  colors,
  silhouette,
  isDark,
}: {
  colors: string[]
  silhouette: Silhouette
  isDark: boolean
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const matsRef = useRef<ShoeMaterials | null>(null)
  const shoeRootRef = useRef<THREE.Group | null>(null)
  const rotTarget = useRef({ yaw: -0.22, pitch: 0.14 })
  const rotCurrent = useRef({ yaw: -0.22, pitch: 0.14 })
  const isInteracting = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  const mainColor = colors[0] || '#20B286'
  const secondaryColor = colors[1] || '#4E9A86'
  const tertiaryColor = colors.length > 3 ? colors[2] : colors[1] || '#4E9A86'
  const accentColor = colors[colors.length - 1] || '#D91E49'

  // Инициализация WebGL-сцены
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 340
    const height = container.clientHeight || 210

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 50)
    camera.position.set(0, 0.42, 5.25)
    camera.lookAt(0, -0.02, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // Студийный трехточечный свет (Key + Fill + Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.85 : 1.05)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xfffcf5, 2.2)
    keyLight.position.set(3.5, 5.5, 4.2)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xdbe6ff, 1.05)
    fillLight.position.set(-4.0, 2.0, 2.5)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.35)
    rimLight.position.set(0, 3.8, -4.5)
    scene.add(rimLight)

    const bottomBounce = new THREE.DirectionalLight(0xffffff, 0.45)
    bottomBounce.position.set(0, -3.5, 1.5)
    scene.add(bottomBounce)

    // Инициализация материалов PBR (кожа, замша, резина, EVA)
    const mats: ShoeMaterials = {
      main: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(mainColor),
        roughness: 0.34,
        metalness: 0.04,
        clearcoat: 0.28,
        clearcoatRoughness: 0.25,
      }),
      secondary: new THREE.MeshStandardMaterial({
        color: new THREE.Color(secondaryColor),
        roughness: 0.82,
        metalness: 0.02,
      }),
      tertiary: new THREE.MeshStandardMaterial({
        color: new THREE.Color(tertiaryColor),
        roughness: 0.52,
        metalness: 0.05,
      }),
      accent: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(accentColor),
        roughness: 0.38,
        metalness: 0.08,
        clearcoat: 0.2,
      }),
      midsole: new THREE.MeshStandardMaterial({
        color: new THREE.Color(isDark ? '#262421' : '#FAF7F0'),
        roughness: 0.65,
        metalness: 0.02,
      }),
      lace: new THREE.MeshStandardMaterial({
        color: new THREE.Color(isDark ? '#F4F0E8' : '#FFFFFF'),
        roughness: 0.75,
        metalness: 0.0,
      }),
      insole: new THREE.MeshStandardMaterial({
        color: new THREE.Color(tertiaryColor),
        roughness: 0.65,
      }),
    }
    matsRef.current = mats

    const pivotGroup = new THREE.Group()
    scene.add(pivotGroup)
    shoeRootRef.current = pivotGroup

    // Мягкая контактная тень под подошвой
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = 256
    shadowCanvas.height = 128
    const sCtx = shadowCanvas.getContext('2d')
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 64, 8, 128, 64, 118)
      grad.addColorStop(0, 'rgba(0,0,0,0.42)')
      grad.addColorStop(0.55, 'rgba(0,0,0,0.14)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      sCtx.fillStyle = grad
      sCtx.fillRect(0, 0, 256, 128)
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas)
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.35),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    )
    shadowPlane.rotation.x = -Math.PI / 2
    shadowPlane.position.y = -0.39
    scene.add(shadowPlane)

    let frameId = 0
    const clock = new THREE.Clock()

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      if (!isInteracting.current) {
        // Плавное живое покачивание модели, когда пользователь не крутит ее пальцем
        rotTarget.current.yaw += Math.sin(elapsed * 0.7) * 0.0008
      }

      rotCurrent.current.yaw += (rotTarget.current.yaw - rotCurrent.current.yaw) * 0.12
      rotCurrent.current.pitch += (rotTarget.current.pitch - rotCurrent.current.pitch) * 0.12

      if (shoeRootRef.current) {
        shoeRootRef.current.rotation.y = rotCurrent.current.yaw
        shoeRootRef.current.rotation.x = rotCurrent.current.pitch
        shoeRootRef.current.position.y = Math.sin(elapsed * 1.6) * 0.018
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!container) return
      const w = container.clientWidth || 340
      const h = container.clientHeight || 210
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      shadowTex.dispose()
      Object.values(mats).forEach((m) => m.dispose())
      renderer.dispose()
    }
  }, [])

  // Перестроение 3D-геометрии при смене силуэта (Runner / Derby / Pump)
  useEffect(() => {
    const root = shoeRootRef.current
    const mats = matsRef.current
    if (!root || !mats) return

    while (root.children.length > 0) {
      const child = root.children[0]
      root.remove(child)
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          ;(obj as THREE.Mesh).geometry.dispose()
        }
      })
    }

    const meshGroup = buildFootwearMeshGroup(silhouette, mats)
    root.add(meshGroup)
  }, [silhouette])

  // Мгновенное обновление цветов материалов по выбранной схеме Иттена (без пересборки геометрии!)
  useEffect(() => {
    const mats = matsRef.current
    if (!mats) return
    mats.main.color.set(mainColor)
    mats.secondary.color.set(secondaryColor)
    mats.tertiary.color.set(tertiaryColor)
    mats.accent.color.set(accentColor)
    mats.midsole.color.set(
      silhouette === 'derby'
        ? isDark
          ? '#32251E'
          : '#CBB396'
        : isDark
        ? '#262421'
        : '#FAF7F0'
    )
    mats.lace.color.set(isDark ? '#F4F0E8' : '#FFFFFF')
  }, [mainColor, secondaryColor, tertiaryColor, accentColor, isDark, silhouette])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isInteracting.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteracting.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }

    rotTarget.current.yaw += dx * 0.012
    rotTarget.current.pitch = Math.max(-0.35, Math.min(0.55, rotTarget.current.pitch + dy * 0.009))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isInteracting.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const resetCamera = () => {
    haptic('light')
    rotTarget.current = { yaw: -0.22, pitch: 0.14 }
  }

  return (
    <div className="relative w-full h-[185px] sm:h-[220px] md:h-[290px] select-none">
      <div
        ref={mountRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        style={{ touchAction: 'none' }}
      />
      <button
        type="button"
        onClick={resetCamera}
        className={`absolute bottom-1 right-2 px-2 py-0.5 text-[8px] font-sans uppercase tracking-[0.2em] border rounded-full backdrop-blur-sm transition-opacity opacity-60 hover:opacity-100 cursor-pointer bg-transparent ${
          isDark ? 'border-white/20 text-[#F4F0E8]' : 'border-black/20 text-[#1C1816]'
        }`}
      >
        360° 3D • Reset
      </button>
    </div>
  )
}

/* ============================================================================
   ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ ЦВЕТОВ (КОМПАКТНЫЙ MOBILE-FIRST LAYOUT БЕЗ СКРОЛЛА)
   ============================================================================ */
export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [silhouette, setSilhouette] = useState<Silhouette>('runner')
  const [baseHue, setBaseHue] = useState(165)
  const [whiteAmount, setWhiteAmount] = useState(0.05)
  const [blackAmount, setBlackAmount] = useState(0.05)
  const [showGuide, setShowGuide] = useState(false)

  const [isProPurchased, setIsProPurchased] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return true
  })

  const wheelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const lastHapticHue = useRef(0)

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'))
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } } })
      .Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return

    fetch(`/api/check-purchase?userId=${userId}&productId=pro_colors`)
      .then((res) => res.json())
      .then((data) => {
        if (data.purchased) setIsProPurchased(true)
      })
      .catch((err) => console.error('Ошибка проверки покупки:', err))
  }, [])

  const handleProClick = async () => {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            initDataUnsafe?: { user?: { id?: number } }
            openInvoice: (link: string, cb: (status: string) => void) => void
          }
        }
      }
    ).Telegram?.WebApp
    const userId = tg?.initDataUnsafe?.user?.id

    if (!userId || !tg) {
      alert('Ошибка: Откройте приложение через Telegram.')
      return
    }

    setIsPurchasing(true)
    haptic('light')

    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: 'pro_colors' }),
      })

      const data = await response.json()
      if (!response.ok || !data.invoiceLink) throw new Error(data.error)

      tg.openInvoice(data.invoiceLink, (status: string) => {
        if (status === 'paid') {
          haptic('heavy')
          setIsProPurchased(true)
          setShowProModal(false)
        } else if (status === 'failed') {
          alert('Оплата была отменена или произошла ошибка.')
        }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(error)
      alert(`Сбой сервера: ${message}`)
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleLangChange = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang)
    setLang(newLang)
  }

  const handleSchemeClick = (s: Scheme) => {
    const isFree = s === 'complementary' || s === 'analogous'
    if (!isFree && !isProPurchased) {
      haptic('medium')
      setShowProModal(true)
      return
    }
    haptic('light')
    setScheme(s)
  }

  const handleSilhouetteChange = (next: Silhouette) => {
    if (next === silhouette) return
    haptic('light')
    setSilhouette(next)
  }

  const t = {
    ru: {
      title: 'Цвета',
      complementary: 'Комплементарная',
      analogous: 'Аналогичная',
      triadic: 'Триадная',
      tetradic: 'Тетрада (квадрат)',
      rectangular: 'Тетрада (прямоуг.)',
      'split-complementary': 'Контрастная триада',
      monochromatic: 'Монохромная',
      silhouetteRunner: 'Сникер 3D',
      silhouetteDerby: 'Дерби 3D',
      silhouettePump: 'Лодочки 3D',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Верх • Каркас',
      roleDetailsLining: 'Замша • Язычок',
      roleDetails: 'Детали верха',
      roleLining: 'Подкладка • Спойлер',
      roleAccent: 'Протектор • Акцент',
      quote: '«Цвет — это душа обуви.»',
      white: 'К белому',
      black: 'К чёрному',
      pure: 'Чистый',
      ittenLabel: 'Круг Иттена',
      guideBtn: 'Гид',
      guideTitle: 'Цвет в дизайне',
      guideClose: 'Закрыть',
      paywallTitle: 'PRO: Палитры',
      paywallDesc:
        'Откройте доступ ко всем профессиональным цветовым схемам: триады, тетрады и благородный монохром.',
      paywallBtn: 'ОТКРЫТЬ ДОСТУП • 1 ⭐️',
      loading: 'ОБРАБОТКА...',
      guideIntro:
        'Круг Иттена — классический инструмент гармонизации цвета. В обуви он особенно важен: основная палитра почти всегда строится вокруг нейтралей (чёрный, белый, бежевый, серый), а цвет появляется точечно — в коже верха, подкладке, строчке, подошве или фурнитуре.',
      guideBalanceTitle: 'Правило баланса',
      guideBalance:
        '60 % — основной цвет (обычно нейтраль или доминирующий тон кожи).\n30 % — поддерживающий цвет (подкладка, язычок, задник).\n10 % — акцент (строчка, логотип, металлическая фурнитура, подошва).',
      guideSchemesTitle: 'Схемы и применение',
      guideComplementary:
        'Комплементарная — два противоположных цвета. Даёт сильный, энергичный контраст. Хороша для спортивной и fashion-обуви, где нужен яркий акцент на нейтральном фоне.',
      guideAnalogous:
        'Аналогичная — соседние цвета на круге. Создаёт мягкий, спокойный переход. Идеальна для классической и повседневной обуви, когда хочется богатства тона без резкости.',
      guideTriadic:
        'Триадная — три цвета через 120°. Живая и сбалансированная. Подходит для капсульных коллекций и сезонных цветовых историй.',
      guideTetradic:
        'Тетрада (квадрат) — четыре цвета через 90°. Самая яркая схема. Используйте один доминирующий тон, два поддерживающих и один чистый акцент, иначе композиция станет пёстрой.',
      guideRectangular:
        'Тетрада (прямоугольник) — две комплементарные пары со сдвигом. Мягче квадрата, даёт больше пространства для нюансов. Отлично работает в премиальной и дизайнерской обуви.',
      guideSplit:
        'Контрастная триада — основной цвет + два соседних к его комплементу. Контраст есть, но мягче чистой комплементарной. Универсальный выбор для большинства моделей.',
      guideMono:
        'Монохромная — один цвет в разных тонах и насыщенностях. Самая элегантная и «дорогая» схема. Идеальна для минимализма, вечерней обуви и когда кожа сама по себе выразительна.',
      guideFootwearTitle: 'Специфика обуви',
      guideFootwear:
        '• Верх: основной цвет (60–70 %).\n• Подкладка и стелька: поддерживающий или более светлый тон.\n• Подошва и каблук: часто нейтраль или акцент.\n• Фурнитура и строчка: самый чистый и яркий акцент (5–10 %).\n• Чёрный и белый — не «отсутствие цвета», а мощные инструменты контраста и формы.',
      guideTip:
        'Совет: всегда проверяйте сочетание при разном освещении — дневном, тёплом искусственном и холодном. Кожа и замша меняют оттенок сильнее, чем кажется.',
    },
    uk: {
      title: 'Кольори',
      complementary: 'Комплементарна',
      analogous: 'Аналогічна',
      triadic: 'Тріадна',
      tetradic: 'Тетрада (квадрат)',
      rectangular: 'Тетрада (прямокут.)',
      'split-complementary': 'Контрастна тріада',
      monochromatic: 'Монохромна',
      silhouetteRunner: 'Снікер 3D',
      silhouetteDerby: 'Дербі 3D',
      silhouettePump: 'Човники 3D',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Верх • Каркас',
      roleDetailsLining: 'Замша • Язичок',
      roleDetails: 'Деталі верху',
      roleLining: 'Підкладка • Спойлер',
      roleAccent: 'Протектор • Акцент',
      quote: '«Колір — це душа взуття.»',
      white: 'До білого',
      black: 'До чорного',
      pure: 'Чистий',
      ittenLabel: 'Коло Іттена',
      guideBtn: 'Гід',
      guideTitle: 'Колір у дизайні',
      guideClose: 'Закрити',
      paywallTitle: 'PRO: Палітри',
      paywallDesc:
        'Відкрийте доступ до всіх професійних колірних схем: тріади, тетради та шляхетний монохром.',
      paywallBtn: 'ВІДКРИТИ ДОСТУП • 1 ⭐️',
      loading: 'ОБРОБКА...',
      guideIntro:
        'Коло Іттена — класичний інструмент гармонізації кольору. У взутті він особливо важливий: основна палітра майже завжди будується навколо нейтралей (чорний, білий, бежевий, сірий), а колір з’являється точково — у шкірі верху, підкладці, рядку, підошві чи фурнітурі.',
      guideBalanceTitle: 'Правило балансу',
      guideBalance:
        '60 % — основний колір (зазвичай нейтраль або домінуючий тон шкіри).\n30 % — підтримуючий колір (підкладка, язичок, задник).\n10 % — акцент (рядок, логотип, металева фурнітура, підошва).',
      guideSchemesTitle: 'Схеми і застосування',
      guideComplementary:
        'Комплементарна — два протилежні кольори. Дає сильний, енергійний контраст. Добре працює у спортивному та fashion-взутті, де потрібен яскравий акцент на нейтральному тлі.',
      guideAnalogous:
        'Аналогічна — сусідні кольори на колі. Створює м’який, спокійний перехід. Ідеальна для класичного та повсякденного взуття, коли хочеться багатства тону без різкості.',
      guideTriadic:
        'Тріадна — три кольори через 120°. Жива і збалансована. Підходить для капсульних колекцій і сезонних кольорових історій.',
      guideTetradic:
        'Тетрада (квадрат) — чотири кольори через 90°. Найяскравіша схема. Використовуйте один домінуючий тон, два підтримуючих і один чистий акцент, інакше композиція стане строкатою.',
      guideRectangular:
        'Тетрада (прямокутник) — дві комплементарні пари зі зсувом. М’якша за квадрат, дає більше простору для нюансів. Відмінно працює в преміальному та дизайнерському взутті.',
      guideSplit:
        'Контрастна тріада — основний колір + два сусідні до його комплементу. Контраст є, але м’якший за чисту комплементарну. Універсальний вибір для більшості моделей.',
      guideMono:
        'Монохромна — один колір у різних тонах і насиченостях. Найелегантніша і «дорога» схема. Ідеальна для мінімалізму, вечірнього взуття і коли шкіра сама по собі виразна.',
      guideFootwearTitle: 'Специфіка взуття',
      guideFootwear:
        '• Верх: основний колір (60–70 %).\n• Підкладка і устілка: підтримуючий або світліший тон.\n• Підошва і підбор: часто нейтраль або акцент.\n• Фурнитура і рядок: найчистіший і найяскравіший акцент (5–10 %).\n• Чорний і білий — не «відсутність кольору», а потужні інструменти контрасту і форми.',
      guideTip:
        'Порада: завжди перевіряйте поєднання при різному освітленні — денному, теплому штучному і холодному. Шкіра і замша змінюють відтінок сильніше, ніж здається.',
    },
    de: {
      title: 'Farben',
      complementary: 'Komplementär',
      analogous: 'Analog',
      triadic: 'Triadisch',
      tetradic: 'Tetradisch (Quadrat)',
      rectangular: 'Tetradisch (Rechteck)',
      'split-complementary': 'Split-Komplementär',
      monochromatic: 'Monochromatisch',
      silhouetteRunner: 'Sneaker 3D',
      silhouetteDerby: 'Derby 3D',
      silhouettePump: 'Pumps 3D',
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Oberleder',
      roleDetailsLining: 'Wildleder • Zunge',
      roleDetails: 'Details',
      roleLining: 'Futter • Sohle',
      roleAccent: 'Laufsohle • Akzent',
      quote: '«Farbe ist die Seele des Schuhs.»',
      white: 'Zu Weiß',
      black: 'Zu Schwarz',
      pure: 'Rein',
      ittenLabel: 'Farbkreis',
      guideBtn: 'Guide',
      guideTitle: 'Farbe im Design',
      guideClose: 'Schließen',
      paywallTitle: 'PRO: Paletten',
      paywallDesc:
        'Schalten Sie alle professionellen Farbschemata frei: Triaden, Tetraden und edles Monochrom.',
      paywallBtn: 'FREISCHALTEN FÜR 1 ⭐️',
      loading: 'LÄDT...',
      guideIntro:
        'Der Itten-Farbkreis ist ein klassisches Werkzeug zur Farbharmonisierung. Bei Schuhen ist er besonders wichtig: Die Grundpalette ist fast immer um neutrale Farben (Schwarz, Weiß, Beige, Grau) herum aufgebaut, und Farbe taucht punktuell auf — im Oberleder, im Futter, in den Nähten, der Sohle oder den Beschlägen.',
      guideBalanceTitle: 'Die Balance-Regel',
      guideBalance:
        '60 % — Hauptfarbe (meist neutral oder der dominierende Lederton).\n30 % — Unterstützende Farbe (Futter, Zunge, Fersenkappe).\n10 % — Akzent (Nähte, Logo, Metallbeschläge, Sohle).',
      guideSchemesTitle: 'Farbschemata & Anwendung',
      guideComplementary:
        'Komplementär — zwei gegenüberliegende Farben. Ergibt einen starken, energetischen Kontrast. Gut für Sport- und Fashion-Schuhe, bei denen ein leuchtender Akzent auf neutralem Grund benötigt wird.',
      guideAnalogous:
        'Analog — benachbarte Farben auf dem Kreis. Schafft einen weichen, ruhigen Übergang. Ideal für klassische und Freizeitschuhe, wenn man eine reiche Tonalität ohne Härte wünscht.',
      guideTriadic:
        'Triadisch — drei Farben im 120°-Abstand. Lebendig und ausgewogen. Geeignet für Capsule-Kollektionen und saisonale Farbgeschichten.',
      guideTetradic:
        'Tetradisch (Quadrat) — vier Farben im 90°-Abstand. Das lebhafteste Schema. Verwenden Sie einen dominierenden Ton, zwei unterstützende und einen reinen Akzent, sonst wird die Komposition zu bunt.',
      guideRectangular:
        'Tetradisch (Rechteck) — zwei komplementäre Paare mit Verschiebung. Weicher als das Quadrat, bietet mehr Raum für Nuancen. Funktioniert hervorragend bei Premium- und Designerschuhen.',
      guideSplit:
        'Split-Komplementär — Hauptfarbe + die zwei Nachbarn ihrer Komplementärfarbe. Kontrast ist vorhanden, aber weicher als rein komplementär. Eine universelle Wahl für die meisten Modelle.',
      guideMono:
        'Monochromatisch — eine Farbe in verschiedenen Tönen und Sättigungen. Das eleganteste und „teuerste“ Schema. Ideal für Minimalismus, Abendschuhe und wenn das Leder an sich schon ausdrucksstark ist.',
      guideFootwearTitle: 'Besonderheiten bei Schuhen',
      guideFootwear:
        '• Obermaterial: Hauptfarbe (60–70 %).\n• Futter und Innensohle: unterstützender oder hellerer Ton.\n• Sohle und Absatz: oft neutral oder Akzent.\n• Beschläge und Nähte: der reinste und hellste Akzent (5–10 %).\n• Schwarz und Weiß sind keine „Farblosigkeit“, sondern mächtige Werkzeuge für Kontrast und Form.',
      guideTip:
        'Tipp: Überprüfen Sie Farbkombinationen immer bei unterschiedlichen Lichtverhältnissen — Tageslicht, warmes Kunstlicht und kaltes Licht. Leder und Wildleder verändern ihren Farbton stärker als es scheint.',
    },
  }[lang]

  // Точная колористическая формула Иттена с корректным откликом на ползунки Белого и Черного
  const makeIttenColor = useCallback(
    (hue: number, white: number, black: number, satBase = 85): string => {
      const normHue = ((hue % 360) + 360) % 360
      const w = Math.max(0, Math.min(1, white))
      const b = Math.max(0, Math.min(1, black))

      const sat = Math.max(8, Math.min(95, satBase * (1 - w * 0.72) * (1 - b * 0.65)))
      const baseLight = 50 + w * 38 - b * 36 - w * b * 12
      const light = Math.max(12, Math.min(90, baseLight))

      return `hsl(${normHue}, ${sat.toFixed(1)}%, ${light.toFixed(1)}%)`
    },
    []
  )

  const getSchemeHues = useCallback((): number[] => {
    const h = ((baseHue % 360) + 360) % 360
    switch (scheme) {
      case 'monochromatic':
        return [h]
      case 'complementary':
        return [h, (h + 180) % 360]
      case 'analogous':
        return [h, (h + 30) % 360, (h + 330) % 360]
      case 'triadic':
        return [h, (h + 120) % 360, (h + 240) % 360]
      case 'split-complementary':
        return [h, (h + 150) % 360, (h + 210) % 360]
      case 'tetradic':
        return [h, (h + 90) % 360, (h + 180) % 360, (h + 270) % 360]
      case 'rectangular':
        return [h, (h + 60) % 360, (h + 180) % 360, (h + 240) % 360]
      default:
        return [h, (h + 180) % 360]
    }
  }, [baseHue, scheme])

  const getColors = useCallback((): string[] => {
    const h = ((baseHue % 360) + 360) % 360

    switch (scheme) {
      case 'monochromatic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 84),
          makeIttenColor(h, Math.min(1, whiteAmount + 0.38), blackAmount * 0.4, 52),
          makeIttenColor(h, whiteAmount * 0.3, Math.min(1, blackAmount + 0.42), 76),
        ]

      case 'complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor(
            h,
            Math.min(1, whiteAmount * 0.7 + 0.25),
            Math.min(1, blackAmount * 0.7 + 0.15),
            55
          ),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.45, blackAmount * 0.45, 90),
        ]

      case 'analogous':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 30) % 360, Math.min(1, whiteAmount * 0.85 + 0.1), blackAmount * 0.85, 76),
          makeIttenColor((h + 330) % 360, whiteAmount * 0.5, blackAmount * 0.5, 88),
        ]

      case 'triadic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 120) % 360, Math.min(1, whiteAmount * 0.8 + 0.12), blackAmount * 0.8, 72),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.45, blackAmount * 0.45, 88),
        ]

      case 'split-complementary':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 150) % 360, Math.min(1, whiteAmount * 0.8 + 0.12), blackAmount * 0.8, 74),
          makeIttenColor((h + 210) % 360, whiteAmount * 0.45, blackAmount * 0.45, 88),
        ]

      case 'tetradic':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 90) % 360, Math.min(1, whiteAmount * 0.8 + 0.1), blackAmount * 0.8, 72),
          makeIttenColor((h + 180) % 360, Math.min(1, whiteAmount * 0.75 + 0.15), blackAmount * 0.75, 68),
          makeIttenColor((h + 270) % 360, whiteAmount * 0.4, blackAmount * 0.4, 90),
        ]

      case 'rectangular':
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor((h + 60) % 360, Math.min(1, whiteAmount * 0.8 + 0.1), blackAmount * 0.8, 74),
          makeIttenColor((h + 180) % 360, Math.min(1, whiteAmount * 0.75 + 0.15), blackAmount * 0.75, 70),
          makeIttenColor((h + 240) % 360, whiteAmount * 0.4, blackAmount * 0.4, 90),
        ]

      default:
        return [
          makeIttenColor(h, whiteAmount, blackAmount, 85),
          makeIttenColor(h, Math.min(1, whiteAmount + 0.25), Math.min(1, blackAmount + 0.15), 55),
          makeIttenColor((h + 180) % 360, whiteAmount * 0.45, blackAmount * 0.45, 90),
        ]
    }
  }, [baseHue, whiteAmount, blackAmount, scheme, makeIttenColor])

  const colors = getColors()
  const schemeHues = getSchemeHues()
  const isTetrad = scheme === 'tetradic' || scheme === 'rectangular'

  const wheelBackground = `conic-gradient(
    from 0deg,
    hsl(0, 90%, 50%),
    hsl(30, 90%, 50%),
    hsl(60, 90%, 50%),
    hsl(90, 90%, 50%),
    hsl(120, 90%, 50%),
    hsl(150, 90%, 50%),
    hsl(180, 90%, 50%),
    hsl(210, 90%, 50%),
    hsl(240, 90%, 50%),
    hsl(270, 90%, 50%),
    hsl(300, 90%, 50%),
    hsl(330, 90%, 50%),
    hsl(360, 90%, 50%)
  )`

  const updateFromClientXY = useCallback((clientX: number, clientY: number) => {
    const el = wheelRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    angle = Math.round((angle + 90 + 360) % 360)

    if (Math.abs(angle - lastHapticHue.current) >= 15) {
      haptic('light')
      lastHapticHue.current = angle
    }

    setBaseHue(angle)
  }, [])

  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      updateFromClientXY(e.clientX, e.clientY)
    }

    const onWindowTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !e.touches[0]) return
      if (e.cancelable) e.preventDefault()
      updateFromClientXY(e.touches[0].clientX, e.touches[0].clientY)
    }

    const onWindowEnd = () => {
      isDragging.current = false
    }

    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowEnd)
    window.addEventListener('pointercancel', onWindowEnd)
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false })
    window.addEventListener('touchend', onWindowEnd)
    window.addEventListener('touchcancel', onWindowEnd)

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowEnd)
      window.removeEventListener('pointercancel', onWindowEnd)
      window.removeEventListener('touchmove', onWindowTouchMove)
      window.removeEventListener('touchend', onWindowEnd)
      window.removeEventListener('touchcancel', onWindowEnd)
    }
  }, [updateFromClientXY])

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    updateFromClientXY(e.clientX, e.clientY)
  }

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    updateFromClientXY(e.clientX, e.clientY)
  }

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleWheelTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isDragging.current = true
    if (e.touches[0]) {
      updateFromClientXY(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const ratioLabels = isTetrad
    ? [t.main55, t.secondary20, t.secondary15, t.accent10]
    : [t.main60, t.secondary30, t.accent10]

  const roleLabels = isTetrad
    ? [t.roleUpper, t.roleDetails, t.roleLining, t.roleAccent]
    : [t.roleUpper, t.roleDetailsLining, t.roleAccent]

  const SCHEMES: Scheme[] = [
    'complementary',
    'analogous',
    'triadic',
    'tetradic',
    'rectangular',
    'split-complementary',
    'monochromatic',
  ]

  const SILHOUETTES: { id: Silhouette; label: string }[] = [
    { id: 'runner', label: t.silhouetteRunner },
    { id: 'derby', label: t.silhouetteDerby },
    { id: 'pump', label: t.silhouettePump },
  ]

  const cBg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F2EFE9]'
  const cText = isDark ? 'text-[#F4F0E8]' : 'text-[#1C1816]'
  const cTextMuted = isDark ? 'text-[#F4F0E8]/55' : 'text-[#1C1816]/55'
  const cLine = isDark ? 'border-[#F4F0E8]/15' : 'border-[#1C1816]/15'
  const cHover = isDark ? 'hover:text-white' : 'hover:text-black'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`relative min-h-[100dvh] w-full flex flex-col justify-between transition-colors duration-700 ${cBg} ${cText}`}
    >
      <style>{`
        * {
          -webkit-tap-highlight-color: transparent !important;
          -webkit-touch-callout: none;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
          touch-action: pan-x;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 2px;
          background: ${isDark ? 'rgba(244,240,232,0.22)' : 'rgba(28,24,22,0.22)'};
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 15px;
          width: 15px;
          border-radius: 50%;
          background: ${isDark ? '#F4F0E8' : '#1C1816'};
          margin-top: -6.5px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        }
      `}</style>

      {/* КОМПАКТНЫЙ ВЕРХНИЙ ХЕДЕР (ЗАГОЛОВОК + ЯЗЫКИ + ГИД В ОДНУ СТРОКУ) */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`group flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.18em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors`}
          >
            <span className="transform transition-transform group-hover:-translate-x-0.5">←</span>
            <span>Back</span>
          </button>
          <span className={`h-3 w-px ${isDark ? 'bg-white/15' : 'bg-black/15'}`} />
          <h1 className="font-serif text-xl sm:text-2xl tracking-[-0.02em] leading-none">
            {t.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {(['ru', 'uk', 'de'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l)}
                className={`text-[9px] font-sans uppercase tracking-[0.2em] outline-none border-0 bg-transparent cursor-pointer transition-colors ${
                  lang === l ? `${cText} font-semibold` : cTextMuted
                } ${cHover}`}
              >
                {l === 'uk' ? 'UKR' : l}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowGuide(true)}
            className={`px-2 py-0.5 border ${cLine} text-[9px] font-sans uppercase tracking-[0.18em] outline-none bg-transparent cursor-pointer ${cText} transition-colors`}
          >
            {t.guideBtn}
          </button>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ (ОПТИМИЗИРОВАН ПОД ОДИН МОБИЛЬНЫЙ ЭКРАН) */}
      <div className="flex-1 flex flex-col justify-between px-4 pb-3 max-w-2xl mx-auto w-full">
        {/* 1. ПОЛОСА СХЕМ ГАРМОНИИ */}
        <div className={`flex overflow-x-auto gap-5 py-2 border-y ${cLine} scrollbar-hide`}>
          {SCHEMES.map((s) => {
            const isFree = s === 'complementary' || s === 'analogous'
            const isLocked = !isFree && !isProPurchased

            return (
              <button
                key={s}
                onClick={() => handleSchemeClick(s)}
                className={`flex items-center gap-1 text-[9px] font-sans uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-200 outline-none border-none bg-transparent cursor-pointer ${
                  scheme === s
                    ? `italic font-semibold ${cText} opacity-100`
                    : `${cTextMuted} opacity-65 hover:opacity-100`
                }`}
              >
                {isLocked && (
                  <span className="text-[#FFB020]">
                    <LockIcon size={8} />
                  </span>
                )}
                {t[s]}
              </button>
            )
          })}
        </div>

        {/* 2. ПЕРЕКЛЮЧАТЕЛЬ СИЛУЭТОВ + ИНТЕРАКТИВНАЯ 3D-МОДЕЛЬ */}
        <div className="my-1">
          <div className="flex justify-center items-center gap-6 pt-1.5 pb-0.5">
            {SILHOUETTES.map((item) => {
              const active = silhouette === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleSilhouetteChange(item.id)}
                  className={`relative pb-1 text-[9px] font-sans uppercase tracking-[0.24em] outline-none border-none bg-transparent cursor-pointer transition-all duration-200 ${
                    active ? `${cText} opacity-100` : `${cTextMuted} opacity-50 hover:opacity-85`
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="silhouetteIndicator"
                      className={`absolute bottom-0 left-0 right-0 h-[1.5px] ${
                        isDark ? 'bg-[#F4F0E8]' : 'bg-[#1C1816]'
                      }`}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <Footwear3DStage colors={colors} silhouette={silhouette} isDark={isDark} />
        </div>

        {/* 3. КОМПАКТНЫЙ ПУЛЬТ УПРАВЛЕНИЯ: КРУГ ИТТЕНА СЛЕВА + ПОЛЗУНКИ ТОНА СПРАВА */}
        <div className={`grid grid-cols-[118px_1fr] sm:grid-cols-[140px_1fr] gap-4 items-center py-2.5 border-t ${cLine}`}>
          {/* Круг Иттена */}
          <div className="flex flex-col items-center">
            <div
              ref={wheelRef}
              className="relative w-[104px] h-[104px] sm:w-[124px] sm:h-[124px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                background: wheelBackground,
                touchAction: 'none',
                boxShadow: `0 0 0 1px ${
                  isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
                }, 0 6px 18px rgba(0,0,0,0.16)`,
              }}
              onPointerDown={handleWheelPointerDown}
              onPointerMove={handleWheelPointerMove}
              onPointerUp={handleWheelPointerUp}
              onPointerCancel={handleWheelPointerUp}
              onTouchStart={handleWheelTouchStart}
            >
              <div
                className="absolute inset-[24%] rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 35% 32%, white 0%, ${colors[0]} 42%, #111 95%)`,
                  boxShadow:
                    'inset -3px -3px 8px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.25)',
                }}
              />

              {schemeHues.slice(1).map((hAngle, idx) => (
                <div
                  key={idx}
                  className="absolute inset-0 pointer-events-none"
                  style={{ transform: `rotate(${hAngle}deg)` }}
                >
                  <div
                    className="absolute top-[4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-white/90 shadow-sm"
                    style={{ backgroundColor: `hsl(${hAngle}, 85%, 50%)` }}
                  />
                </div>
              ))}

              <div
                className="absolute inset-0 pointer-events-none"
                style={{ transform: `rotate(${baseHue}deg)` }}
              >
                <div
                  className="absolute top-[2px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-[1.5px] border-white shadow-md"
                  style={{ backgroundColor: `hsl(${baseHue}, 85%, 50%)` }}
                />
              </div>
            </div>
            <span className={`mt-1.5 text-[8px] font-sans tracking-[0.22em] uppercase ${cTextMuted}`}>
              {t.ittenLabel} • {baseHue}°
            </span>
          </div>

          {/* Ползунки К белому / К чёрному */}
          <div className="flex flex-col justify-center gap-4 pr-1">
            <div>
              <div
                className={`flex justify-between text-[8px] font-sans uppercase tracking-[0.18em] mb-2 ${cTextMuted}`}
              >
                <span>{t.pure}</span>
                <span>
                  {t.white} ({Math.round(whiteAmount * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={whiteAmount}
                onChange={(e) => setWhiteAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div
                className={`flex justify-between text-[8px] font-sans uppercase tracking-[0.18em] mb-2 ${cTextMuted}`}
              >
                <span>{t.pure}</span>
                <span>
                  {t.black} ({Math.round(blackAmount * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={blackAmount}
                onChange={(e) => setBlackAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* 4. КОМПАКТНЫЕ СВОТЧИ ПАЛИТРЫ ПО ЗОНАМ ОБУВИ */}
        <div className={`grid gap-2.5 pt-2 ${isTetrad ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {colors.map((c, i) => (
            <div key={i} className="flex flex-col">
              <div
                className={`w-full h-9 sm:h-12 mb-1.5 rounded-[2px] shadow-sm border transition-colors duration-150 ${
                  isDark ? 'border-white/15' : 'border-black/10'
                }`}
                style={{ backgroundColor: c }}
              />
              <div className="flex items-baseline justify-between gap-1">
                <span className={`text-[9px] font-sans font-semibold uppercase tracking-[0.15em] ${cText}`}>
                  {ratioLabels[i]}
                </span>
                <span
                  className={`text-[7.5px] font-sans uppercase tracking-[0.08em] truncate ${cTextMuted}`}
                >
                  {roleLabels[i]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 5. ТОНКАЯ РЕДАКЦИОННАЯ ПОДПИСЬ В ОДНУ СТРОКУ */}
        <div className={`mt-3 pt-2 border-t ${cLine} flex items-center justify-between`}>
          <p className={`font-serif text-[12px] italic ${cTextMuted}`}>{t.quote}</p>
          <span className={`text-[8px] font-sans font-bold uppercase tracking-[0.32em] ${cText}`}>
            Cordwainer
          </span>
        </div>
      </div>

      {/* МОДАЛКА PRO ДОСТУПА */}
      <AnimatePresence>
        {showProModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000000]/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-[340px] p-8 border ${cLine} ${
                isDark ? 'bg-[#111111]' : 'bg-[#EAE6DF]'
              } shadow-2xl flex flex-col overflow-hidden`}
            >
              <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${cLine}`} />
              <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${cLine}`} />
              <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${cLine}`} />
              <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${cLine}`} />

              <button
                onClick={() => setShowProModal(false)}
                className={`absolute top-4 right-4 ${cTextMuted} hover:text-current`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>

              <div className={`flex justify-center mb-5 ${cTextMuted} opacity-50`}>
                <LockIcon size={32} />
              </div>

              <h3 className={`font-serif text-2xl tracking-tight mb-4 text-center ${cText}`}>
                {t.paywallTitle}
              </h3>

              <p
                className={`text-[12px] font-sans font-light leading-relaxed mb-8 text-center ${cTextMuted}`}
              >
                {t.paywallDesc}
              </p>

              <button
                onClick={handleProClick}
                disabled={isPurchasing}
                className={`group flex items-center justify-center gap-3 w-full py-4 border ${cLine} ${cText} hover:bg-current/5 active:scale-95 transition-all outline-none bg-transparent`}
              >
                {isPurchasing ? (
                  <span className="text-[10px] font-sans uppercase tracking-[0.2em] animate-pulse">
                    {t.loading}
                  </span>
                ) : (
                  <>
                    <LockIcon size={14} />
                    <span className="text-[10px] font-sans uppercase tracking-[0.2em]">
                      {t.paywallBtn}
                    </span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: ГИД */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed inset-0 z-[90] flex flex-col ${cBg} ${cText} overflow-hidden`}
          >
            <div className="px-6 pt-10 pb-6 flex items-start justify-between shrink-0">
              <h2 className="font-serif text-[12vw] min-[400px]:text-5xl leading-none tracking-tight">
                {t.guideTitle}
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className={`text-[10px] font-sans uppercase tracking-[0.2em] outline-none border-none bg-transparent cursor-pointer ${cTextMuted} ${cHover} transition-colors mt-2`}
              >
                {t.guideClose}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide space-y-12">
              <p className="text-[14px] min-[400px]:text-[16px] leading-[1.8] font-light max-w-lg">
                {t.guideIntro}
              </p>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                  {t.guideBalanceTitle}
                </h3>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}
                >
                  {t.guideBalance}
                </p>
              </div>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-8 ${cTextMuted}`}>
                  {t.guideSchemesTitle}
                </h3>
                <div className="space-y-8 max-w-lg">
                  {[
                    { title: t.complementary, text: t.guideComplementary },
                    { title: t.analogous, text: t.guideAnalogous },
                    { title: t.triadic, text: t.guideTriadic },
                    { title: t.tetradic, text: t.guideTetradic },
                    { title: t.rectangular, text: t.guideRectangular },
                    { title: t['split-complementary'], text: t.guideSplit },
                    { title: t.monochromatic, text: t.guideMono },
                  ].map((item) => (
                    <div key={item.title}>
                      <div className="font-serif text-[22px] min-[400px]:text-[26px] leading-[1.2] mb-3">
                        {item.title}
                      </div>
                      <p
                        className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light ${cTextMuted}`}
                      >
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={`text-[9px] font-sans uppercase tracking-[0.3em] mb-6 ${cTextMuted}`}>
                  {t.guideFootwearTitle}
                </h3>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] whitespace-pre-line font-light border-l border-current/20 pl-5 max-w-lg`}
                >
                  {t.guideFootwear}
                </p>
              </div>

              <div className={`pt-8 border-t ${cLine} max-w-lg`}>
                <p
                  className={`text-[13px] min-[400px]:text-[14px] leading-[1.8] font-light italic ${cTextMuted}`}
                >
                  {t.guideTip}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
