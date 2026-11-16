import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type * as THREE_TYPES from 'three'
import type { Lang } from '../App'

type ThreeLib = typeof THREE_TYPES

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

export type SneakerColors = {
  vamp: string
  quarters: string
  tongue: string
  lining: string
  toeBox: string
  heel: string
  collar: string
  midsole: string
  outsole: string
  laces: string
  eyestays: string
  swoosh: string
}

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
    const tg = (
      window as unknown as {
        Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } }
      }
    ).Telegram?.WebApp
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred(style)
  } catch {}
}

/* ============================================================================
   МАТЕМАТИЧЕСКАЯ МОДЕЛЬ 3D LOW-TOP SNEAKER (ПРОПОРЦИИ NIKE DUNK LOW / NB 550)
   Замкнутая 360° топология (phi, v) без сквозных туннелей и с раздельными
   3D-деталями: vamp, toeBox, quarters, eyestays, collar, heel, tongue, lining,
   laces, midsole, outsole, swoosh
   ============================================================================ */
type SneakerMaterials = {
  vamp: THREE_TYPES.MeshStandardMaterial
  quarters: THREE_TYPES.MeshStandardMaterial
  tongue: THREE_TYPES.MeshStandardMaterial
  lining: THREE_TYPES.MeshStandardMaterial
  toeBox: THREE_TYPES.MeshStandardMaterial
  heel: THREE_TYPES.MeshStandardMaterial
  collar: THREE_TYPES.MeshStandardMaterial
  midsole: THREE_TYPES.MeshStandardMaterial
  outsole: THREE_TYPES.MeshStandardMaterial
  laces: THREE_TYPES.MeshStandardMaterial
  eyestays: THREE_TYPES.MeshStandardMaterial
  swoosh: THREE_TYPES.MeshStandardMaterial
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 + 1e-9)))
  return t * t * (3 - 2 * t)
}

/**
 * 360-градусный внешний контур подошвы (phi in [-PI, PI]):
 * phi = 0 -> центр мыска (+Z = +1.34)
 * phi = +/-PI -> центр пятки (-Z = -1.34)
 */
function getFootprintPoint(phi: number) {
  const zNorm = Math.cos(phi)
  const z = 1.34 * zNorm
  const t = 0.5 * (zNorm + 1.0) // 0 = пятка, 1 = мысок

  const s = Math.sin(phi)
  const signS = s >= 0 ? 1 : -1
  const roundEnv = signS * Math.pow(Math.abs(s), 0.68)

  const wBase =
    0.40 -
    0.045 * Math.exp(-Math.pow((t - 0.36) / 0.15, 2)) +
    0.115 * Math.exp(-Math.pow((t - 0.66) / 0.21, 2)) -
    0.025 * Math.exp(-Math.pow((t - 0.96) / 0.07, 2))

  const asym =
    s >= 0
      ? -0.035 * Math.exp(-Math.pow((t - 0.38) / 0.14, 2)) +
        0.018 * Math.exp(-Math.pow((t - 0.70) / 0.16, 2))
      : 0.028 * Math.exp(-Math.pow((t - 0.58) / 0.20, 2))

  const centerX =
    0.025 * Math.exp(-Math.pow((t - 0.70) / 0.25, 2)) -
    0.014 * Math.exp(-Math.pow((t - 0.36) / 0.18, 2))

  const x = centerX + roundEnv * (wBase + asym)
  return { x, z, t }
}

/**
 * 360-градусный верхний контур горловины и U-образного выреза шнуровки (v = 1.0)
 */
function getToplineRim(phi: number) {
  const a = Math.abs(phi)
  const sign = phi >= 0 ? 1 : -1

  const u1 = Math.max(0, Math.min(1, a / 0.35))
  const ue = Math.max(0, Math.min(1, (a - 0.35) / (1.48 - 0.35)))
  const uc = Math.max(0, Math.min(1, (a - 1.48) / (Math.PI - 1.48)))

  const zSeg1 = 0.44 - 0.03 * (u1 * u1)
  const zSeg2 = 0.41 - 0.63 * ue
  const zSeg3 = -0.22 - 0.98 * Math.pow(Math.sin(uc * (Math.PI * 0.5)), 1.1)

  const w12 = smoothstep(0.28, 0.42, a)
  const w23 = smoothstep(1.40, 1.56, a)
  const zRim = (1 - w12) * zSeg1 + w12 * ((1 - w23) * zSeg2 + w23 * zSeg3)

  const xSeg1 = 0.13 * Math.sin(u1 * (Math.PI * 0.5))
  const xSeg2 = 0.13 + 0.05 * ue
  const xSeg3 =
    (0.18 + 0.12 * Math.sin(uc * Math.PI)) * Math.pow(Math.cos(uc * (Math.PI * 0.5)), 0.7)

  const xAbs = (1 - w12) * xSeg1 + w12 * ((1 - w23) * xSeg2 + w23 * xSeg3)
  const xRim = sign * xAbs

  const ySeg1 = 0.22
  const ySeg2 = 0.22 + 0.42 * Math.pow(ue, 0.92)
  const ySeg3 = 0.64 * (1 - uc) + 0.58 * uc - 0.21 * Math.pow(Math.sin(uc * Math.PI), 1.15)
  const yRim = (1 - w12) * ySeg1 + w12 * ((1 - w23) * ySeg2 + w23 * ySeg3)

  return { x: xRim, y: yRim, z: zRim }
}

/**
 * Вычисляет 3D-координату (x, y, z) на поверхности колодки кроссовка
 * phi in [-PI, PI], v in [0, 1], radialOffset — высота накладки кожи
 */
function sampleUpperSurface(phi: number, v: number, radialOffset = 0) {
  const fp = getFootprintPoint(phi)
  const rim = getToplineRim(phi)

  const toeSpring = Math.pow(Math.max(0, (fp.t - 0.65) / 0.35), 1.8) * 0.075
  const heelLift = (1 - fp.t) * 0.035
  const y0 = -0.12 + heelLift + toeSpring

  const toeWeight = 1 - smoothstep(0.35, 0.92, Math.abs(phi))
  const heelWeight = smoothstep(2.0, Math.PI, Math.abs(phi))

  const vClamped = Math.max(0, Math.min(1, v))
  const uSide = 1 - Math.pow(1 - vClamped, 1.35)

  const uToe =
    vClamped < 0.36
      ? 0.12 * Math.pow(vClamped / 0.36, 1.45)
      : 0.12 + 0.88 * Math.pow((vClamped - 0.36) / 0.64, 1.02)

  const uH = (1 - toeWeight) * uSide + toeWeight * uToe
  const heelBulbZ = -0.045 * Math.sin(vClamped * Math.PI) * heelWeight

  let x = (1 - uH) * fp.x + uH * rim.x
  let z = (1 - uH) * fp.z + uH * rim.z + heelBulbZ

  const ySide = y0 + (rim.y - y0) * Math.pow(vClamped, 0.82) + 0.038 * Math.sin(vClamped * Math.PI)
  const yNoseTop = y0 + 0.21
  const yToe =
    vClamped < 0.36
      ? y0 + (yNoseTop - y0) * Math.sin((vClamped / 0.36) * (Math.PI * 0.5))
      : yNoseTop +
        (rim.y - yNoseTop) * ((vClamped - 0.36) / 0.64) +
        0.015 * Math.sin(((vClamped - 0.36) / 0.64) * Math.PI)

  let y = (1 - toeWeight) * ySide + toeWeight * yToe

  if (radialOffset !== 0) {
    const dx = x
    const dz = z - -0.3
    const dy = Math.max(0.18, y - -0.1)
    const norm = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6
    x += radialOffset * (dx / norm)
    y += radialOffset * (dy / norm) * 0.75
    z += radialOffset * (dz / norm)
  }

  return [x, y, z] as const
}

/**
 * Создает 3D-геометрию кожаной панели с закрытыми торцами (реальной толщиной слоя кожи)
 */
function buildPanelPatch(
  THREE: ThreeLib,
  options: {
    phiStart: number
    phiEnd: number
    phiSteps: number
    vStart: number
    vEnd: number
    vSteps: number
    outerOffset: number
    innerOffset?: number
  }
): THREE_TYPES.BufferGeometry {
  const {
    phiStart,
    phiEnd,
    phiSteps,
    vStart,
    vEnd,
    vSteps,
    outerOffset,
    innerOffset = outerOffset - 0.014,
  } = options

  const positions: number[] = []
  const indices: number[] = []
  const stride = vSteps + 1

  for (let i = 0; i <= phiSteps; i++) {
    const phi = phiStart + (i / phiSteps) * (phiEnd - phiStart)
    for (let j = 0; j <= vSteps; j++) {
      const v = vStart + (j / vSteps) * (vEnd - vStart)
      const [x, y, z] = sampleUpperSurface(phi, v, outerOffset)
      positions.push(x, y, z)
    }
  }

  const innerBase = (phiSteps + 1) * stride
  for (let i = 0; i <= phiSteps; i++) {
    const phi = phiStart + (i / phiSteps) * (phiEnd - phiStart)
    for (let j = 0; j <= vSteps; j++) {
      const v = vStart + (j / vSteps) * (vEnd - vStart)
      const [x, y, z] = sampleUpperSurface(phi, v, innerOffset)
      positions.push(x, y, z)
    }
  }

  for (let i = 0; i < phiSteps; i++) {
    for (let j = 0; j < vSteps; j++) {
      const a = i * stride + j
      const b = (i + 1) * stride + j
      const c = (i + 1) * stride + (j + 1)
      const d = i * stride + (j + 1)
      indices.push(a, d, b, b, d, c)

      const ai = innerBase + a
      const bi = innerBase + b
      const ci = innerBase + c
      const di = innerBase + d
      indices.push(ai, bi, di, bi, ci, di)
    }
  }

  // Закрываем торцы панели по периметру
  for (let i = 0; i < phiSteps; i++) {
    const a0 = i * stride
    const b0 = (i + 1) * stride
    indices.push(a0, b0, innerBase + a0, b0, innerBase + b0, innerBase + a0)

    const a1 = i * stride + vSteps
    const b1 = (i + 1) * stride + vSteps
    indices.push(a1, innerBase + a1, b1, b1, innerBase + a1, innerBase + b1)
  }

  for (let j = 0; j < vSteps; j++) {
    const a0 = j
    const d0 = j + 1
    indices.push(a0, innerBase + a0, d0, d0, innerBase + a0, innerBase + d0)

    const a1 = phiSteps * stride + j
    const d1 = phiSteps * stride + j + 1
    indices.push(a1, d1, innerBase + a1, d1, innerBase + d1, innerBase + a1)
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

/**
 * Создает 3D-геометрию по произвольной параметрической сетке (u, w)
 */
function buildParametricGridGeometry(
  THREE: ThreeLib,
  uSteps: number,
  wSteps: number,
  evalPoint: (u: number, w: number) => readonly [number, number, number]
): THREE_TYPES.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const stride = wSteps + 1

  for (let i = 0; i <= uSteps; i++) {
    const u = i / uSteps
    for (let j = 0; j <= wSteps; j++) {
      const w = j / wSteps
      const [x, y, z] = evalPoint(u, w)
      positions.push(x, y, z)
    }
  }

  for (let i = 0; i < uSteps; i++) {
    for (let j = 0; j < wSteps; j++) {
      const a = i * stride + j
      const b = (i + 1) * stride + j
      const c = (i + 1) * stride + (j + 1)
      const d = i * stride + (j + 1)
      indices.push(a, b, d, b, c, d)
      indices.push(a, d, b, b, d, c)
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

/**
 * Создает сплошное 360° кольцо подошвы (Midsole или Outsole) с закрытым дном и верхом
 */
function buildCupsoleRingGeometry(
  THREE: ThreeLib,
  options: {
    phiSteps: number
    topScale: number
    botScale: number
    yTopOffset: number
    yBotOffset: number
  }
): THREE_TYPES.BufferGeometry {
  const { phiSteps, topScale, botScale, yTopOffset, yBotOffset } = options
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i <= phiSteps; i++) {
    const phi = -Math.PI + (i / phiSteps) * Math.PI * 2
    const fp = getFootprintPoint(phi)
    const toeSpring = Math.pow(Math.max(0, (fp.t - 0.65) / 0.35), 1.8) * 0.075
    const y0 = -0.12 + (1 - fp.t) * 0.035 + toeSpring

    positions.push(fp.x * topScale, y0 + yTopOffset, fp.z * topScale)
    positions.push(fp.x * botScale, y0 + yBotOffset, fp.z * botScale)
  }

  const topCenterIdx = (phiSteps + 1) * 2
  positions.push(0, -0.11 + yTopOffset, 0)
  const botCenterIdx = topCenterIdx + 1
  positions.push(0, -0.11 + yBotOffset, 0)

  for (let i = 0; i < phiSteps; i++) {
    const t0 = i * 2
    const b0 = i * 2 + 1
    const t1 = (i + 1) * 2
    const b1 = (i + 1) * 2 + 1

    // Боковая стенка подошвы
    indices.push(t0, b0, t1, b0, b1, t1)
    // Верхняя крышка
    indices.push(topCenterIdx, t0, t1)
    // Нижняя крышка (протектор)
    indices.push(botCenterIdx, b1, b0)
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

function buildSneakerMeshGroup(THREE: ThreeLib, mats: SneakerMaterials): THREE_TYPES.Group {
  const group = new THREE.Group()

  // 1. TOE BOX (Перфорированное плато носка: |phi| <= 0.78, v in [0.36, 1.0])
  const toeBoxGeom = buildPanelPatch(THREE, {
    phiStart: -0.78,
    phiEnd: 0.78,
    phiSteps: 40,
    vStart: 0.36,
    vEnd: 1.0,
    vSteps: 18,
    outerOffset: 0.0,
    innerOffset: -0.012,
  })
  group.add(new THREE.Mesh(toeBoxGeom, mats.toeBox))

  // Веерная перфорация на Toe Box (как на Nike Dunk Low)
  const perfAngles = [-0.42, -0.26, -0.12, 0, 0.12, 0.26, 0.42]
  const perfVs = [0.52, 0.65, 0.78]
  const dotGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.008, 10)
  perfAngles.forEach((pAngle) => {
    perfVs.forEach((pv) => {
      const [px, py, pz] = sampleUpperSurface(pAngle, pv, 0.002)
      const dot = new THREE.Mesh(dotGeom, mats.lining)
      dot.position.set(px, py, pz)
      group.add(dot)
    })
  })

  // 2. VAMP (Передняя кожаная накладка мыска / Mudguard: |phi| <= 0.90, v in [0.0, 0.40])
  const vampFrontGeom = buildPanelPatch(THREE, {
    phiStart: -0.90,
    phiEnd: 0.90,
    phiSteps: 52,
    vStart: 0.0,
    vEnd: 0.40,
    vSteps: 14,
    outerOffset: 0.016,
    innerOffset: -0.002,
  })
  group.add(new THREE.Mesh(vampFrontGeom, mats.vamp))

  ;[-1, 1].forEach((sign) => {
    const pMin = sign > 0 ? 0.72 : -0.92
    const pMax = sign > 0 ? 0.92 : -0.72
    // Боковые крылья Vamp
    const vampWingGeom = buildPanelPatch(THREE, {
      phiStart: pMin,
      phiEnd: pMax,
      phiSteps: 10,
      vStart: 0.36,
      vEnd: 0.72,
      vSteps: 10,
      outerOffset: 0.016,
      innerOffset: -0.002,
    })
    group.add(new THREE.Mesh(vampWingGeom, mats.vamp))

    // 3. QUARTERS (Боковые панели берцев в средней части стопы)
    const qMin = sign > 0 ? 0.86 : -1.84
    const qMax = sign > 0 ? 1.84 : -0.86
    const quarterGeom = buildPanelPatch(THREE, {
      phiStart: qMin,
      phiEnd: qMax,
      phiSteps: 32,
      vStart: 0.0,
      vEnd: 0.72,
      vSteps: 18,
      outerOffset: 0.0,
      innerOffset: -0.012,
    })
    group.add(new THREE.Mesh(quarterGeom, mats.quarters))

    // 4. EYESTAYS (Кожаная планка шнуровки вдоль подъема)
    const eMin = sign > 0 ? 0.30 : -1.56
    const eMax = sign > 0 ? 1.56 : -0.30
    const eyestayGeom = buildPanelPatch(THREE, {
      phiStart: eMin,
      phiEnd: eMax,
      phiSteps: 32,
      vStart: 0.68,
      vEnd: 1.0,
      vSteps: 12,
      outerOffset: 0.02,
      innerOffset: -0.002,
    })
    group.add(new THREE.Mesh(eyestayGeom, mats.eyestays))

    // 5. COLLAR (Низкий вырез воротника лодыжки)
    const cMin = sign > 0 ? 1.52 : -2.44
    const cMax = sign > 0 ? 2.44 : -1.52
    const collarGeom = buildPanelPatch(THREE, {
      phiStart: cMin,
      phiEnd: cMax,
      phiSteps: 24,
      vStart: 0.64,
      vEnd: 1.0,
      vSteps: 12,
      outerOffset: 0.0,
      innerOffset: -0.012,
    })
    group.add(new THREE.Mesh(collarGeom, mats.collar))

    // 6. HEEL COUNTER & HEEL TAB (Пяточный стакан + задний хлястик)
    const hMin = sign > 0 ? 1.80 : -Math.PI
    const hMax = sign > 0 ? Math.PI : -1.80
    const heelCounterGeom = buildPanelPatch(THREE, {
      phiStart: hMin,
      phiEnd: hMax,
      phiSteps: 34,
      vStart: 0.0,
      vEnd: 0.68,
      vSteps: 18,
      outerOffset: 0.017,
      innerOffset: -0.002,
    })
    group.add(new THREE.Mesh(heelCounterGeom, mats.heel))

    const htMin = sign > 0 ? 2.36 : -Math.PI
    const htMax = sign > 0 ? Math.PI : -2.36
    const heelTabGeom = buildPanelPatch(THREE, {
      phiStart: htMin,
      phiEnd: htMax,
      phiSteps: 22,
      vStart: 0.68,
      vEnd: 1.0,
      vSteps: 10,
      outerOffset: 0.021,
      innerOffset: -0.002,
    })
    group.add(new THREE.Mesh(heelTabGeom, mats.swoosh))

    // Фирменный боковой свуш / шеврон от берца к пяточному хлястику
    const swooshGeom = buildParametricGridGeometry(THREE, 34, 8, (u, w) => {
      const wCentered = (w - 0.5) * 0.15
      const pSw = sign * (1.02 + u * (Math.PI - 1.02))
      const vSw = Math.max(
        0.06,
        Math.min(0.95, 0.34 + 0.48 * Math.pow(u, 0.78) + wCentered * (1.15 - 0.55 * u))
      )
      return sampleUpperSurface(pSw, vSw, 0.026)
    })
    group.add(new THREE.Mesh(swooshGeom, mats.swoosh))
  })

  // 7. LINING (Пухлый валик горловины + полностью закрытая внутренняя чаша и стелька)
  const liningGeom = buildParametricGridGeometry(THREE, 72, 16, (u, s) => {
    const phi = -Math.PI + u * Math.PI * 2
    const [xr, yr, zr] = sampleUpperSurface(phi, 0.98, 0.012)
    const sProgress = Math.max(0, (s - 0.14) / 0.86)
    const radialShrink = 1 - Math.pow(sProgress, 1.04)
    const lipArch = 0.032 * Math.sin(Math.min(1, s / 0.28) * Math.PI)
    const x = xr * radialShrink
    const z = -0.55 + (zr - -0.55) * radialShrink
    const y = yr + lipArch - 0.54 * Math.pow(sProgress, 0.75)
    return [x, y, z] as const
  })
  group.add(new THREE.Mesh(liningGeom, mats.lining))

  // 8. TONGUE (Мягкий анатомический язычок с тканым ярлыком на вершине)
  const tongueGeom = buildParametricGridGeometry(THREE, 26, 16, (u, w) => {
    const wCentered = (w - 0.5) * 2
    const z = 0.44 - u * 0.78
    const x = wCentered * (0.125 + 0.055 * u)
    const y = 0.21 + 0.5 * Math.pow(u, 0.88) + 0.045 * Math.cos(wCentered * (Math.PI * 0.5))
    return [x, y, z] as const
  })
  group.add(new THREE.Mesh(tongueGeom, mats.tongue))

  const tongueTagGeom = buildParametricGridGeometry(THREE, 8, 8, (u, w) => {
    const uTag = 0.8 + u * 0.17
    const wCentered = (w - 0.5) * 0.88
    const z = 0.44 - uTag * 0.78 + 0.01
    const x = wCentered * (0.125 + 0.055 * uTag)
    const y = 0.21 + 0.5 * Math.pow(uTag, 0.88) + 0.05 * Math.cos(wCentered * (Math.PI * 0.5))
    return [x, y, z] as const
  })
  group.add(new THREE.Mesh(tongueTagGeom, mats.swoosh))

  // 9. LACES (6 рядов плоских кроссовочных шнурков + люверсы)
  const laceSteps = [0.12, 0.27, 0.42, 0.57, 0.72, 0.87]
  const eyeletTorus = new THREE.TorusGeometry(0.02, 0.006, 8, 16)
  laceSteps.forEach((uL) => {
    const aL = 0.38 + uL * 1.02
    const rimPos = getToplineRim(aL)

    ;[-1, 1].forEach((side) => {
      const eyeMesh = new THREE.Mesh(eyeletTorus, mats.lining)
      eyeMesh.position.set(side * rimPos.x * 1.04, rimPos.y + 0.012, rimPos.z)
      eyeMesh.rotation.y = side * Math.PI * 0.35
      group.add(eyeMesh)
    })

    const laceStrapGeom = buildParametricGridGeometry(THREE, 16, 4, (u, w) => {
      const wCentered = (u - 0.5) * 2
      const sOffset = (w - 0.5) * 0.046
      const x = wCentered * (rimPos.x * 1.04)
      const z = rimPos.z + sOffset
      const y =
        rimPos.y +
        0.048 * Math.cos(wCentered * (Math.PI * 0.5)) +
        0.018 +
        0.006 * Math.sin(w * Math.PI)
      return [x, y, z] as const
    })
    group.add(new THREE.Mesh(laceStrapGeom, mats.laces))
  })

  // 10. MIDSOLE (Массивная прошитая чашеобразная межподошва Cupsole)
  const midsoleGeom = buildCupsoleRingGeometry(THREE, {
    phiSteps: 96,
    topScale: 1.005,
    botScale: 1.036,
    yTopOffset: 0.005,
    yBotOffset: -0.175,
  })
  group.add(new THREE.Mesh(midsoleGeom, mats.midsole))

  // 11. OUTSOLE (Резиновый протектор с контрастной подметкой)
  const outsoleGeom = buildCupsoleRingGeometry(THREE, {
    phiSteps: 96,
    topScale: 1.036,
    botScale: 1.024,
    yTopOffset: -0.175,
    yBotOffset: -0.24,
  })
  group.add(new THREE.Mesh(outsoleGeom, mats.outsole))

  // Разворачиваем кроссовок в классический профильный ракурс (мыском вправо)
  group.rotation.y = Math.PI * 0.5
  return group
}

/* ============================================================================
   ИНТЕРАКТИВНЫЙ 3D-КОМПОНЕНТ КРОССОВКА (THREE.JS + ORBIT TOUCH ROTATION)
   ============================================================================ */
export function Sneaker3D({
  sneakerColors,
  isDark,
}: {
  sneakerColors: SneakerColors
  isDark: boolean
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const matsRef = useRef<SneakerMaterials | null>(null)
  const shoeRootRef = useRef<THREE_TYPES.Group | null>(null)

  const rotTarget = useRef({ yaw: -0.26, pitch: 0.16 })
  const rotCurrent = useRef({ yaw: -0.26, pitch: 0.16 })
  const isInteracting = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    let disposed = false
    let frameId = 0
    let cleanupFn: (() => void) | undefined

    import('three').then((THREE) => {
      if (disposed) return

      const container = mountRef.current
      if (!container) return

      const width = container.clientWidth || 340
      const height = container.clientHeight || 205

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(29, width / height, 0.1, 50)
      camera.position.set(0, 0.44, 5.15)
      camera.lookAt(0, 0.04, 0)

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1
      container.innerHTML = ''
      container.appendChild(renderer.domElement)

      // Мягкий студийный свет (аналог Environment + направленные источники)
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd8d0c5, isDark ? 1.05 : 1.25)
      hemiLight.position.set(0, 6, 0)
      scene.add(hemiLight)

      const keyLight = new THREE.DirectionalLight(0xfffdf8, 1.95)
      keyLight.position.set(3.6, 5.2, 4.4)
      scene.add(keyLight)

      const fillLight = new THREE.DirectionalLight(0xe2ecff, 0.95)
      fillLight.position.set(-4.2, 2.2, 2.8)
      scene.add(fillLight)

      const rimLight = new THREE.DirectionalLight(0xffffff, 1.15)
      rimLight.position.set(0, 3.8, -4.5)
      scene.add(rimLight)

      // MeshStandardMaterial для каждой из 11 деталей кроссовка
      const mats: SneakerMaterials = {
        vamp: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.vamp),
          roughness: 0.38,
          metalness: 0.04,
        }),
        quarters: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.quarters),
          roughness: 0.55,
          metalness: 0.02,
        }),
        tongue: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.tongue),
          roughness: 0.72,
          metalness: 0.02,
        }),
        lining: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.lining),
          roughness: 0.68,
          metalness: 0.03,
        }),
        toeBox: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.toeBox),
          roughness: 0.48,
          metalness: 0.02,
        }),
        heel: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.heel),
          roughness: 0.38,
          metalness: 0.04,
        }),
        collar: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.collar),
          roughness: 0.62,
          metalness: 0.02,
        }),
        midsole: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.midsole),
          roughness: 0.68,
          metalness: 0.02,
        }),
        outsole: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.outsole),
          roughness: 0.5,
          metalness: 0.05,
        }),
        laces: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.laces),
          roughness: 0.78,
          metalness: 0.0,
        }),
        eyestays: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.eyestays),
          roughness: 0.38,
          metalness: 0.04,
        }),
        swoosh: new THREE.MeshStandardMaterial({
          color: new THREE.Color(sneakerColors.swoosh),
          roughness: 0.34,
          metalness: 0.06,
        }),
      }
      matsRef.current = mats

      const pivotGroup = new THREE.Group()
      const sneakerMesh = buildSneakerMeshGroup(THREE, mats)
      pivotGroup.add(sneakerMesh)
      scene.add(pivotGroup)
      shoeRootRef.current = pivotGroup

      // Мягкая контактная тень под подошвой (ContactShadows)
      const shadowCanvas = document.createElement('canvas')
      shadowCanvas.width = 256
      shadowCanvas.height = 128
      const sCtx = shadowCanvas.getContext('2d')
      if (sCtx) {
        const grad = sCtx.createRadialGradient(128, 64, 10, 128, 64, 118)
        grad.addColorStop(0, isDark ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.34)')
        grad.addColorStop(0.55, isDark ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.11)')
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        sCtx.fillStyle = grad
        sCtx.fillRect(0, 0, 256, 128)
      }
      const shadowTex = new THREE.CanvasTexture(shadowCanvas)
      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.3, 1.35),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
      )
      shadowPlane.rotation.x = -Math.PI / 2
      shadowPlane.position.y = -0.39
      scene.add(shadowPlane)

      const clock = new THREE.Clock()

      const animate = () => {
        frameId = requestAnimationFrame(animate)
        const elapsed = clock.getElapsedTime()

        if (!isInteracting.current) {
          rotTarget.current.yaw += Math.sin(elapsed * 0.65) * 0.0007
        }

        rotCurrent.current.yaw += (rotTarget.current.yaw - rotCurrent.current.yaw) * 0.14
        rotCurrent.current.pitch += (rotTarget.current.pitch - rotCurrent.current.pitch) * 0.14

        if (shoeRootRef.current) {
          shoeRootRef.current.rotation.y = rotCurrent.current.yaw
          shoeRootRef.current.rotation.x = rotCurrent.current.pitch
          shoeRootRef.current.position.y = Math.sin(elapsed * 1.5) * 0.015
        }

        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        if (!container) return
        const w = container.clientWidth || 340
        const h = container.clientHeight || 205
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      cleanupFn = () => {
        window.removeEventListener('resize', onResize)
        shadowTex.dispose()
        Object.values(mats).forEach((m) => m.dispose())
        renderer.dispose()
      }
    })

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      if (cleanupFn) cleanupFn()
    }
  }, [])

  // Мгновенное обновление цветов каждой из 11 деталей без пересоздания 3D-сцены
  useEffect(() => {
    const mats = matsRef.current
    if (!mats) return
    mats.vamp.color.set(sneakerColors.vamp)
    mats.quarters.color.set(sneakerColors.quarters)
    mats.tongue.color.set(sneakerColors.tongue)
    mats.lining.color.set(sneakerColors.lining)
    mats.toeBox.color.set(sneakerColors.toeBox)
    mats.heel.color.set(sneakerColors.heel)
    mats.collar.color.set(sneakerColors.collar)
    mats.midsole.color.set(sneakerColors.midsole)
    mats.outsole.color.set(sneakerColors.outsole)
    mats.laces.color.set(sneakerColors.laces)
    mats.eyestays.color.set(sneakerColors.eyestays)
    mats.swoosh.color.set(sneakerColors.swoosh)
  }, [sneakerColors])

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
    rotTarget.current.pitch = Math.max(-0.35, Math.min(0.6, rotTarget.current.pitch + dy * 0.009))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isInteracting.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const resetCamera = () => {
    haptic('light')
    rotTarget.current = { yaw: -0.26, pitch: 0.16 }
  }

  return (
    <div className="relative w-full h-[200px] sm:h-[235px] md:h-[295px] select-none">
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
        className={`absolute bottom-1 right-2 px-2.5 py-0.5 text-[8px] font-sans uppercase tracking-[0.2em] border rounded-full backdrop-blur-sm transition-opacity opacity-60 hover:opacity-100 cursor-pointer bg-transparent ${
          isDark ? 'border-white/20 text-[#F4F0E8]' : 'border-black/20 text-[#1C1816]'
        }`}
      >
        360° 3D • Reset
      </button>
    </div>
  )
}

/* ============================================================================
   ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ ЦВЕТОВ (1 ЭКРАН НА МОБИЛЬНОМ • ТОЛЬКО КРОССОВОК)
   ============================================================================ */
export function ColorsPage({ onBack, lang, setLang }: ColorsPageProps) {
  const [scheme, setScheme] = useState<Scheme>('complementary')
  const [baseHue, setBaseHue] = useState(194)
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
    const tg = (
      window as unknown as {
        Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } }
      }
    ).Telegram?.WebApp
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
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Каркас • Мысок • Пятка',
      roleDetailsLining: 'Берцы • Носок • Язычок',
      roleDetails: 'Берцы • Носок',
      roleLining: 'Подкладка • Воротник',
      roleAccent: 'Протектор • Свуш',
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
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Каркас • Мисок • П’ята',
      roleDetailsLining: 'Берці • Носок • Язичок',
      roleDetails: 'Берці • Носок',
      roleLining: 'Підкладка • Комір',
      roleAccent: 'Протектор • Свуш',
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
        '• Верх: основний колір (60–70 %).\n• Підкладка і устілка: підтримуючий або світліший тон.\n• Підошва і підбор: часто нейтраль або акцент.\n• Фурнітура і рядок: найчистіший і найяскравіший акцент (5–10 %).\n• Чорний і білий — не «відсутність кольору», а потужні інструменти контрасту і форми.',
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
      main60: '60%',
      secondary30: '30%',
      accent10: '10%',
      main55: '55%',
      secondary20: '20%',
      secondary15: '15%',
      roleUpper: 'Rahmen • Kappe • Ferse',
      roleDetailsLining: 'Quartier • Blatt • Zunge',
      roleDetails: 'Quartier • Blatt',
      roleLining: 'Futter • Kragen',
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

  // Распределение цветов схемы Иттена по 11 деталям модульного 3D-кроссовка
  const mainColor = colors[0]
  const secondaryColor = colors[1]
  const tertiaryColor = colors.length > 3 ? colors[2] : makeIttenColor(baseHue, whiteAmount * 0.35, Math.min(1, blackAmount + 0.45), 45)
  const accentColor = colors[colors.length - 1]

  const sneakerColors: SneakerColors = {
    vamp: mainColor,
    heel: mainColor,
    eyestays: mainColor,
    quarters: secondaryColor,
    toeBox: secondaryColor,
    tongue: secondaryColor,
    collar: colors.length > 3 ? colors[2] : secondaryColor,
    lining: tertiaryColor,
    outsole: accentColor,
    swoosh: accentColor,
    midsole: isDark ? '#262421' : '#FAF8F4',
    laces: isDark ? '#F4F0E8' : '#FFFFFF',
  }

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

      {/* КОМПАКТНЫЙ ВЕРХНИЙ ХЕДЕР */}
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

      {/* ОСНОВНОЙ КОНТЕНТ БЕЗ ЛИШНЕГО СКРОЛЛА */}
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

        {/* 2. 3D-МОДЕЛЬ LOW-TOP КРОССОВКА */}
        <div className="my-0.5">
          <Sneaker3D sneakerColors={sneakerColors} isDark={isDark} />
        </div>

        {/* 3. КОМПАКТНЫЙ ПУЛЬТ: КРУГ ИТТЕНА СЛЕВА + ПОЛЗУНКИ СПРАВА */}
        <div
          className={`grid grid-cols-[118px_1fr] sm:grid-cols-[140px_1fr] gap-4 items-center py-2.5 border-t ${cLine}`}
        >
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
            <span
              className={`mt-1.5 text-[8px] font-sans tracking-[0.22em] uppercase ${cTextMuted}`}
            >
              {t.ittenLabel} • {baseHue}°
            </span>
          </div>

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

        {/* 4. СВОТЧИ ПАЛИТРЫ ПО ЗОНАМ КРОССОВКА */}
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
                <span
                  className={`text-[9px] font-sans font-semibold uppercase tracking-[0.15em] ${cText}`}
                >
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

        {/* 5. РЕДАКЦИОННАЯ ПОДПИСЬ */}
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
