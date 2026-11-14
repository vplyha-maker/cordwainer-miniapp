// src/components/heel/HeelScene3D.tsx
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { HeelEngineering, SoleType, HeelType, Gender } from '../../lib/heelCalc'

type CameraPreset = 'iso' | 'side' | 'top' | 'rear'
type ViewLevel = 'design' | 'engineering' | 'biomechanics'

type Props = {
  eng: HeelEngineering
  gender?: Gender
  soleType: SoleType
  heelType: HeelType
  heelHeight: number
  toeThickness: number
  rockerAngle: number
  rockerStartPct: number
  heelTipOffsetMm: number
  tipWidthMm: number
  pronationDeg?: number
  isDark?: boolean
}

/* ──────────────────────────────────────────────────────────────────────────
 * Профили колодки (u: 0 = пятка, 1 = носок).
 * Все кривые — кубические Эрмитовы сплайны (Catmull-Rom тангенты) → C1-гладкость,
 * без ступенек и пиков; концы закрыты эллиптическими «колпачками».
 * ────────────────────────────────────────────────────────────────────────── */
type Pts = ReadonlyArray<readonly [number, number]>

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
// C1-гладкий «колокол» на отрезке [a, b]
const bump = (u: number, a: number, b: number) => {
  const s = clamp01((u - a) / (b - a))
  const v = Math.sin(Math.PI * s)
  return v * v
}
const roundCap = (t: number) => Math.sqrt(Math.max(0, 1 - t * t))

const hermiteProfile = (pts: Pts, u: number) => {
  const n = pts.length
  if (u <= pts[0][0]) return pts[0][1]
  if (u >= pts[n - 1][0]) return pts[n - 1][1]
  let i = 0
  while (i < n - 2 && u > pts[i + 1][0]) i++
  const tangent = (k: number) => {
    const a = pts[Math.max(0, k - 1)]
    const b = pts[Math.min(n - 1, k + 1)]
    return (b[1] - a[1]) / Math.max(1e-6, b[0] - a[0])
  }
  const [x0, y0] = pts[i]
  const [x1, y1] = pts[i + 1]
  const h = x1 - x0
  const t = (u - x0) / h
  const t2 = t * t
  const t3 = t2 * t
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * h * tangent(i) +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * h * tangent(i + 1)
  )
}

// Относительная полуширина: пятка → талия (свод) → пучки (max) → сужение к носку
const WIDTH_PTS: Pts = [
  [0.0, 0.62],
  [0.08, 0.64],
  [0.2, 0.62],
  [0.32, 0.56],
  [0.45, 0.68],
  [0.58, 0.92],
  [0.66, 1.0],
  [0.76, 0.96],
  [0.86, 0.74],
  [0.94, 0.46],
  [1.0, 0.3],
]
const widthFactor = (u: number) =>
  hermiteProfile(WIDTH_PTS, u) *
  (u < 0.07 ? roundCap((0.07 - u) / 0.07) : 1) *
  (u > 0.93 ? roundCap((u - 0.93) / 0.07) : 1)

// Высота гребня верха: задник → мягкий спуск → подъём → пучки → носок
const HEIGHT_PTS: Pts = [
  [0.0, 0.4],
  [0.03, 0.5],
  [0.08, 0.62],
  [0.18, 0.62],
  [0.3, 0.52],
  [0.45, 0.46],
  [0.56, 0.42],
  [0.66, 0.31],
  [0.78, 0.22],
  [0.9, 0.15],
  [1.0, 0.08],
]
const heightCaps = (u: number) =>
  (u < 0.04 ? roundCap((0.04 - u) / 0.04) : 1) * (u > 0.9 ? roundCap((u - 0.9) / 0.1) : 1)

// Полуугол выреза горловины (рад) — гладкая дуга от задника до союзки
const COLLAR_PHI_MAX = 0.88
const collarPhi = (u: number) => COLLAR_PHI_MAX * sstep(0.04, 0.15, u) * (1 - sstep(0.46, 0.58, u))

type Sec = {
  u: number
  x: number
  ySole: number
  hw: number
  mShift: number
  hT: number
  phi: number
  taper: number
  egg: number
}

// Шейдер-«ножницы»: вершинный атрибут cut < 0 → фрагмент отбрасывается.
// Даёт идеально гладкую кромку выреза горловины при любой плотности сетки.
const makeLeatherMaterial = (opacity: number, transparent: boolean) => {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.44,
    metalness: 0.05,
    transparent,
    opacity,
    depthWrite: !transparent,
    side: THREE.DoubleSide,
  })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float cut;\nvarying float vCut;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCut = cut;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCut;')
      .replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nif (vCut < 0.0) discard;'
      )
  }
  m.customProgramCacheKey = () => 'heel-leather-cut'
  return m
}

export function HeelScene3D({
  eng,
  gender = 'female',
  soleType,
  heelType,
  heelHeight,
  toeThickness,
  rockerAngle,
  rockerStartPct,
  heelTipOffsetMm,
  tipWidthMm,
  pronationDeg = 0,
  isDark = true,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [camPreset, setCamPreset] = useState<CameraPreset>('iso')
  const [viewLevel, setViewLevel] = useState<ViewLevel>('design')

  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    assembly: THREE.Group
    dynamicGroup: THREE.Group
    padHeel: THREE.Mesh
    padM1: THREE.Mesh
    padM5: THREE.Mesh
    pelotteMesh: THREE.Mesh
    copRing: THREE.Mesh
    copStem: THREE.Mesh
    grid: THREE.GridHelper
    targetSpherical: { theta: number; phi: number; radius: number; lookAtY: number }
    currentSpherical: { theta: number; phi: number; radius: number; lookAtY: number }
  } | null>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 340
    const height = container.clientHeight || 255

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.78))
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.25)
    keyLight.position.set(5, 8, 5.5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.55)
    fillLight.position.set(-5, 4, -4)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.45)
    rimLight.position.set(0, -3, 5)
    scene.add(rimLight)

    const gridColor = isDark ? 0x3a3632 : 0xc8c2b8
    const grid = new THREE.GridHelper(4.2, 12, gridColor, gridColor)
    const gridMat = grid.material as THREE.Material
    gridMat.opacity = 0.2
    gridMat.transparent = true
    scene.add(grid)

    const assembly = new THREE.Group()
    scene.add(assembly)

    const dynamicGroup = new THREE.Group()
    assembly.add(dynamicGroup)

    const padHeel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32),
      new THREE.MeshStandardMaterial({ color: 0xb46513, transparent: true, opacity: 0.75, roughness: 0.35 })
    )
    const padM1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.03, 32),
      new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.8, roughness: 0.35 })
    )
    const padM5 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32),
      new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.8, roughness: 0.35 })
    )
    assembly.add(padHeel, padM1, padM5)

    const pelotteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.88, roughness: 0.3 })
    )
    pelotteMesh.scale.set(1.2, 0.35, 0.9)
    assembly.add(pelotteMesh)

    const copRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.016, 16, 36),
      new THREE.MeshBasicMaterial({ color: 0xe11d48 })
    )
    copRing.rotation.x = Math.PI / 2
    assembly.add(copRing)

    const copStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.85, 14),
      new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85 })
    )
    assembly.add(copStem)

    const targetSpherical = { theta: 0.78, phi: 1.05, radius: 4.2, lookAtY: 0.42 }
    const currentSpherical = { ...targetSpherical }

    sceneRef.current = {
      scene,
      camera,
      renderer,
      assembly,
      dynamicGroup,
      padHeel,
      padM1,
      padM5,
      pelotteMesh,
      copRing,
      copStem,
      grid,
      targetSpherical,
      currentSpherical,
    }

    let isDragging = false
    let prevX = 0
    let prevY = 0
    const dom = renderer.domElement
    dom.style.touchAction = 'none'

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true
      prevX = e.clientX
      prevY = e.clientY
      dom.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || !sceneRef.current) return
      const dx = e.clientX - prevX
      const dy = e.clientY - prevY
      prevX = e.clientX
      prevY = e.clientY

      sceneRef.current.targetSpherical.theta -= dx * 0.0085
      sceneRef.current.targetSpherical.phi = Math.max(
        0.15,
        Math.min(Math.PI * 0.48, sceneRef.current.targetSpherical.phi - dy * 0.0075)
      )
    }

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false
      try {
        dom.releasePointerCapture(e.pointerId)
      } catch {}
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!sceneRef.current) return
      sceneRef.current.targetSpherical.radius = Math.max(
        2.4,
        Math.min(6.2, sceneRef.current.targetSpherical.radius + e.deltaY * 0.0025)
      )
    }

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    const onResize = () => {
      if (!mountRef.current || !sceneRef.current) return
      const w = mountRef.current.clientWidth || 340
      const h = mountRef.current.clientHeight || 255
      sceneRef.current.camera.aspect = w / h
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    let reqId = 0
    const animate = () => {
      reqId = requestAnimationFrame(animate)
      const st = sceneRef.current
      if (!st) return

      st.currentSpherical.theta += (st.targetSpherical.theta - st.currentSpherical.theta) * 0.14
      st.currentSpherical.phi += (st.targetSpherical.phi - st.currentSpherical.phi) * 0.14
      st.currentSpherical.radius += (st.targetSpherical.radius - st.currentSpherical.radius) * 0.14
      st.currentSpherical.lookAtY += (st.targetSpherical.lookAtY - st.currentSpherical.lookAtY) * 0.14

      const { theta, phi, radius, lookAtY } = st.currentSpherical
      st.camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) + lookAtY * 0.25,
        radius * Math.sin(phi) * Math.cos(theta)
      )
      st.camera.lookAt(0, lookAtY, 0)
      st.renderer.render(st.scene, st.camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(reqId)
      window.removeEventListener('resize', onResize)
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerUp)
      dom.removeEventListener('wheel', onWheel)

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => m.dispose())
            } else {
              object.material.dispose()
            }
          }
        }
      })

      renderer.dispose()
    }
  }, [])

  // Автоматическая адаптация камеры при смене уровня визуализации
  useEffect(() => {
    const st = sceneRef.current
    if (!st) return

    if (viewLevel === 'biomechanics') {
      // Для биомеханики удобнее верхне-боковой ракурс для анализа стельки и COP
      st.targetSpherical = { theta: 0.5, phi: 0.65, radius: 4.4, lookAtY: 0.3 }
    } else if (camPreset === 'iso') {
      st.targetSpherical = { theta: 0.78, phi: 1.05, radius: 4.2, lookAtY: 0.42 }
    }
  }, [viewLevel])

  useEffect(() => {
    const st = sceneRef.current
    if (!st) return
    if (camPreset === 'iso') {
      st.targetSpherical = { theta: 0.78, phi: 1.05, radius: 4.2, lookAtY: 0.42 }
    } else if (camPreset === 'side') {
      st.targetSpherical = { theta: 0.0, phi: 1.48, radius: 4.0, lookAtY: 0.42 }
    } else if (camPreset === 'top') {
      st.targetSpherical = { theta: 0.0, phi: 0.18, radius: 4.5, lookAtY: 0.2 }
    } else if (camPreset === 'rear') {
      st.targetSpherical = { theta: -Math.PI / 2, phi: 1.38, radius: 3.8, lookAtY: 0.38 }
    }
  }, [camPreset])

  useEffect(() => {
    const st = sceneRef.current
    if (!st) return

    const { assembly, dynamicGroup, padHeel, padM1, padM5, pelotteMesh, copRing, copStem, grid } = st

    const gridHex = isDark ? 0x48423c : 0xb8b0a4
    ;(grid.material as THREE.LineBasicMaterial).color.setHex(gridHex)

    while (dynamicGroup.children.length > 0) {
      const child = dynamicGroup.children[0] as THREE.Mesh
      dynamicGroup.remove(child)
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
        else child.material.dispose()
      }
    }

    const mmToUnit = 2.5 / Math.max(220, eng.lastLengthMm)
    const h = heelHeight * mmToUnit
    const t = toeThickness * mmToUnit
    const ballRatio = Math.max(0.52, Math.min(0.78, rockerStartPct / 100))
    const activeRockerRad = soleType === 'rocker' ? (rockerAngle * Math.PI) / 180 : 0
    const baseSoleW = (gender === 'male' ? 0.94 : 0.82) + eng.rx.ballBuildUpMm * 0.01

    const getSoleProfileY = (u: number) => {
      if (u <= 0.18) {
        const heelCup = 0.016 * (1 - Math.cos((u / 0.18) * Math.PI))
        return h - heelCup
      }
      if (u <= ballRatio) {
        const s = (u - 0.18) / Math.max(0.05, ballRatio - 0.18)
        const smoothStep = s * s * (3 - 2 * s)
        const archDip = 0.075 * Math.sin(s * Math.PI)
        return h * (1 - smoothStep) + t * smoothStep - archDip * (1 - smoothStep)
      }
      const r = (u - ballRatio) / Math.max(0.05, 1 - ballRatio)
      const rockerLift = soleType === 'rocker' ? Math.sin(activeRockerRad) * 0.55 * r * r : 0.055 * r * r
      return t + rockerLift + 0.022 * Math.pow(r, 2.2)
    }

    // Полуширина контура: единый гладкий профиль для подошвы, стельки и верха
    const getHalfWidth = (u: number) => Math.max(0.05, baseSoleW * 0.5 * widthFactor(u))

    const getMedialCurve = (u: number) => {
      if (u > 0.22 && u < 0.85) {
        return 0.045 * Math.sin(((u - 0.22) / 0.63) * Math.PI)
      }
      return 0
    }

    // 1. ПОДОШВА И РАНТ
    const soleGeom = new THREE.BoxGeometry(2.52, 0.038, baseSoleW * 1.12, 110, 1, 16)
    const sPos = soleGeom.attributes.position
    for (let i = 0; i < sPos.count; i++) {
      const x = sPos.getX(i)
      const z = sPos.getZ(i)
      const originalY = sPos.getY(i)
      const u = (x + 1.26) / 2.52
      const hw = getHalfWidth(u)
      const zNorm = z / (baseSoleW * 0.56)

      sPos.setZ(i, zNorm * hw + getMedialCurve(u))
      sPos.setY(i, getSoleProfileY(u) - 0.016 + originalY)
    }
    soleGeom.computeVertexNormals()

    const outsoleMesh = new THREE.Mesh(
      soleGeom,
      new THREE.MeshStandardMaterial({
        color: isDark ? 0x221c16 : 0xd2c4b0,
        roughness: 0.42,
        metalness: 0.12,
        transparent: viewLevel === 'engineering',
        opacity: viewLevel === 'engineering' ? 0.45 : 1.0,
      })
    )
    dynamicGroup.add(outsoleMesh)

    // 2. ОРТОПЕДИЧЕСКАЯ СТЕЛЬКА (активна всегда, в биомеханике — с тепловой картой)
    const segsX = 110
    const segsZ = 16
    const insoleGeom = new THREE.PlaneGeometry(2.48, baseSoleW, segsX, segsZ)
    insoleGeom.rotateX(-Math.PI / 2)

    const pos = insoleGeom.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const baseColor = new THREE.Color(isDark ? 0xd4c9bc : 0x2a2420)
    const archColor = new THREE.Color(0x10b981)
    const warnColor = new THREE.Color(0xd97706)
    const critColor = new THREE.Color(0xe11d48)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const zNorm = pos.getZ(i) / (baseSoleW * 0.5)
      const u = (x + 1.24) / 2.48

      const finalZ = zNorm * getHalfWidth(u) + getMedialCurve(u)
      pos.setZ(i, finalZ)

      let y = getSoleProfileY(u)

      let orthoLift = 0
      if (u > 0.22 && u < 0.6 && zNorm > 0) {
        const archWave = Math.sin(((u - 0.22) / 0.38) * Math.PI)
        orthoLift += archWave * zNorm * (eng.rx.archSupportHeightMm * mmToUnit * 1.15)
      }
      if (u < 0.28) {
        if (eng.rx.medialHeelWedgeMm > 0 && zNorm > 0) {
          orthoLift += zNorm * (eng.rx.medialHeelWedgeMm * mmToUnit * 1.4)
        } else if (eng.rx.lateralWedgeMm > 0 && zNorm < 0) {
          orthoLift += -zNorm * (eng.rx.lateralWedgeMm * mmToUnit * 1.4)
        }
      }

      pos.setY(i, y + orthoLift + 0.012)

      const distForefoot = Math.hypot(u - ballRatio, (finalZ - (pronationDeg < 0 ? 0.12 : -0.12)) * 0.8)
      const foreIntensity = Math.max(0, 1 - distForefoot * 3.4) * (eng.forefootLoad / 100)
      const vColor = baseColor.clone()

      // Тепловая карта активна в режиме биомеханики или инженерии
      if (viewLevel === 'biomechanics' || viewLevel === 'engineering') {
        if (orthoLift > 0.03) {
          vColor.lerp(archColor, Math.min(0.85, orthoLift * 8))
        }
        if (foreIntensity > 0.4) {
          vColor.lerp(eng.forefootLoad >= 78 ? critColor : warnColor, Math.min(1, (foreIntensity - 0.35) * 1.8))
        }
      }
      colors[i * 3] = vColor.r
      colors[i * 3 + 1] = vColor.g
      colors[i * 3 + 2] = vColor.b
    }

    insoleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    insoleGeom.computeVertexNormals()

    const insoleMesh = new THREE.Mesh(
      insoleGeom,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.38,
        metalness: 0.1,
        transparent: true,
        opacity: viewLevel === 'biomechanics' ? 1.0 : viewLevel === 'engineering' ? 0.85 : 0.65,
        side: THREE.DoubleSide,
      })
    )
    dynamicGroup.add(insoleMesh)

    // 3. ВЕРХ ОБУВИ
    // Скрыт в биомеханике, полупрозрачный каркас в инженерии, плотная кожа в дизайне.
    // Детали кроя: задник/берцы (quarters), союзка (vamp), язычок (tongue),
    // кант горловины (collar piping), рант (welt). Каждая деталь — оболочка с толщиной.
    if (viewLevel !== 'biomechanics') {
      const isEng = viewLevel === 'engineering'
      const instepAdd = Math.max(0, eng.rx.instepBuildUpMm)
      const ballAdd = Math.max(0, eng.rx.ballBuildUpMm)
      const hasBuildUp = instepAdd > 0 || eng.rx.ballBuildUpMm > 0

      const THK = 0.014 // толщина кожи
      const BASE_LIFT = 0.016 // посадка верха на стельку (как в исходной модели)
      const NV = 72 // плотность по периметру сечения

      const leatherColor = new THREE.Color(
        gender === 'male' ? (isDark ? 0x4a3222 : 0x362214) : isDark ? 0xbaab96 : 0x2b2320
      )
      const liningColor = leatherColor.clone().multiplyScalar(0.58)
      const wallColor = leatherColor.clone().multiplyScalar(0.36)
      const pipingColor = leatherColor.clone().multiplyScalar(0.78)
      const xrayHighlight = new THREE.Color(0x3186ff)

      // Параметры продольного сечения в точке u
      const getSec = (u: number): Sec => {
        const hT =
          (hermiteProfile(HEIGHT_PTS, u) +
            instepAdd * 0.012 * bump(u, 0.2, 0.6) +
            ballAdd * 0.005 * bump(u, 0.5, 0.85)) *
          heightCaps(u)
        return {
          u,
          x: -1.24 + u * 2.48,
          ySole: getSoleProfileY(u),
          hw: getHalfWidth(u),
          mShift: getMedialCurve(u),
          hT: Math.max(0.05, hT),
          phi: collarPhi(u),
          taper: 0.18 + 0.14 * (1 - sstep(0.1, 0.4, u)),
          egg: bump(u, 0.28, 0.82),
        }
      }

      // Поперечное сечение: яйцевидное, шире с медиальной стороны (c > 0), сужается кверху.
      // a: 0 → латеральный край у подошвы, π/2 → гребень, π → медиальный край.
      const surf = (s: Sec, a: number, inset: number): [number, number, number] => {
        const sa = Math.max(0, Math.sin(a))
        const c = -Math.cos(a)
        const halfW = s.hw * 0.95 * (1 + s.egg * (0.02 + 0.04 * c))
        const z = c * Math.max(0.02, halfW - inset) * (1 - s.taper * sa * sa)
        const y = Math.max(0.012, s.hT - inset * 0.6) * Math.pow(sa, 0.72)
        return [s.x, s.ySole + BASE_LIFT + y, s.mShift + z]
      }
      const cutOf = (s: Sec, a: number) => Math.abs(a - Math.PI / 2) - s.phi

      const outerColor = (s: Sec, a: number, py: number) => {
        const sa = Math.sin(a)
        // Ambient-occlusion «на вершинах»: затемнение у подошвы/ранта
        const ao = 1 - 0.42 * Math.exp(-(py - (s.ySole + BASE_LIFT)) / 0.05)
        const c = leatherColor.clone().multiplyScalar(ao * (0.9 + 0.12 * sa))
        if (isEng && hasBuildUp) {
          const w = sstep(0.28, 0.34, s.u) * (1 - sstep(0.62, 0.68, s.u)) * sstep(0.38, 0.5, sa)
          if (w > 0) c.lerp(xrayHighlight, 0.72 * w)
        }
        return c
      }
      const innerColor = (s: Sec, py: number) => {
        const ao = 1 - 0.35 * Math.exp(-(py - (s.ySole + BASE_LIFT)) / 0.06)
        return liningColor.clone().multiplyScalar(ao)
      }

      const leatherMat = makeLeatherMaterial(isEng ? 0.24 : 1.0, isEng)

      // Деталь кроя: наружная + внутренняя оболочка + торцевые стенки
      const buildPiece = (u0: number, u1: number, nu: number) => {
        const P: number[] = []
        const C: number[] = []
        const K: number[] = []
        const I: number[] = []
        const secs: Sec[] = []
        for (let i = 0; i <= nu; i++) secs.push(getSec(u0 + ((u1 - u0) * i) / nu))

        const push = (p: [number, number, number], c: THREE.Color, k: number) => {
          P.push(p[0], p[1], p[2])
          C.push(c.r, c.g, c.b)
          K.push(k)
        }
        const link = (base: number, rows: number, cols: number) => {
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
              const a = base + i * (cols + 1) + j
              const b = a + (cols + 1)
              I.push(a, b, a + 1, b, b + 1, a + 1)
            }
          }
        }

        // наружная
        let base = P.length / 3
        for (let i = 0; i <= nu; i++) {
          const s = secs[i]
          for (let j = 0; j <= NV; j++) {
            const a = (j / NV) * Math.PI
            const p = surf(s, a, 0)
            push(p, outerColor(s, a, p[1]), cutOf(s, a))
          }
        }
        link(base, nu, NV)

        // внутренняя (подкладка)
        base = P.length / 3
        for (let i = 0; i <= nu; i++) {
          const s = secs[i]
          for (let j = 0; j <= NV; j++) {
            const a = (j / NV) * Math.PI
            const p = surf(s, a, THK)
            push(p, innerColor(s, p[1]), cutOf(s, a))
          }
        }
        link(base, nu, NV)

        // торцы (видимая толщина кожи на стыках деталей)
        for (const s of [secs[0], secs[nu]]) {
          base = P.length / 3
          for (const inset of [0, THK]) {
            for (let j = 0; j <= NV; j++) {
              const a = (j / NV) * Math.PI
              push(surf(s, a, inset), wallColor, cutOf(s, a))
            }
          }
          link(base, 1, NV)
        }

        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
        g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3))
        g.setAttribute('cut', new THREE.Float32BufferAttribute(K, 1))
        g.setIndex(I)
        g.computeVertexNormals()
        return g
      }

      // Задник + берцы и союзка с узким зазором-швом между ними
      const SEAM_A = 0.385
      const SEAM_B = 0.395
      dynamicGroup.add(new THREE.Mesh(buildPiece(0.0, SEAM_A, 64), leatherMat))
      dynamicGroup.add(new THREE.Mesh(buildPiece(SEAM_B, 1.0, 110), leatherMat))

      // Язычок: низкая подкладочная деталь под вырезом, выходит из-под союзки
      {
        const nu = 28
        const nvT = 36
        const u0 = 0.34
        const u1 = 0.6
        const P: number[] = []
        const C: number[] = []
        const K: number[] = []
        const I: number[] = []
        const tongueColor = leatherColor.clone().multiplyScalar(0.82)
        for (let i = 0; i <= nu; i++) {
          const s = getSec(u0 + ((u1 - u0) * i) / nu)
          const psi = (s.phi + 0.06) * sstep(0.34, 0.44, s.u)
          const tf = 0.55 + 0.45 * sstep(0.36, 0.58, s.u)
          for (let j = 0; j <= nvT; j++) {
            const a = Math.PI / 2 - COLLAR_PHI_MAX - 0.1 + (j / nvT) * 2 * (COLLAR_PHI_MAX + 0.1)
            const p = surf(s, a, 0.02)
            const baseY = s.ySole + BASE_LIFT
            const y = baseY + (p[1] - baseY) * tf
            P.push(p[0], y, p[2])
            const ao = 1 - 0.3 * Math.exp(-(y - baseY) / 0.06)
            C.push(tongueColor.r * ao, tongueColor.g * ao, tongueColor.b * ao)
            K.push(psi - Math.abs(a - Math.PI / 2))
          }
        }
        for (let i = 0; i < nu; i++) {
          for (let j = 0; j < nvT; j++) {
            const a = i * (nvT + 1) + j
            const b = a + (nvT + 1)
            I.push(a, b, a + 1, b, b + 1, a + 1)
          }
        }
        const tg = new THREE.BufferGeometry()
        tg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
        tg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3))
        tg.setAttribute('cut', new THREE.Float32BufferAttribute(K, 1))
        tg.setIndex(I)
        tg.computeVertexNormals()
        dynamicGroup.add(new THREE.Mesh(tg, makeLeatherMaterial(isEng ? 0.24 : 1.0, isEng)))
      }

      // Кант горловины: замкнутая трубка по линии выреза (скрывает срез и даёт «край кожи»)
      {
        const us: number[] = []
        for (let u = 0.03; u <= 0.62; u += 0.004) if (collarPhi(u) > 0.05) us.push(u)
        if (us.length > 6) {
          const side = (sign: number) =>
            us.map((u) => {
              const s = getSec(u)
              const [x, y, z] = surf(s, Math.PI / 2 + sign * s.phi, THK * 0.5)
              return new THREE.Vector3(x, y, z)
            })
          const loop = [...side(-1), ...side(1).reverse()]
          const curve = new THREE.CatmullRomCurve3(loop, true, 'centripetal')
          dynamicGroup.add(
            new THREE.Mesh(
              new THREE.TubeGeometry(curve, 320, THK * 0.85, 8, true),
              new THREE.MeshStandardMaterial({
                color: pipingColor,
                roughness: 0.5,
                metalness: 0.04,
                transparent: isEng,
                opacity: isEng ? 0.5 : 1,
              })
            )
          )
        }
      }

      // Рант (welt): тонкая трубка по периметру подошвы — «вливает» верх в подошву
      {
        const N = 140
        const lat: THREE.Vector3[] = []
        const med: THREE.Vector3[] = []
        for (let k = 0; k <= N; k++) {
          const u = 0.5 - 0.5 * Math.cos((Math.PI * k) / N) // плотнее у концов
          const x = -1.24 + u * 2.48
          const y = getSoleProfileY(u) + 0.006
          const hw = getHalfWidth(u) * 0.985
          const m = getMedialCurve(u)
          lat.push(new THREE.Vector3(x, y, m - hw))
          med.push(new THREE.Vector3(x, y, m + hw))
        }
        const loop = [...lat, ...med.reverse()]
        dynamicGroup.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true, 'centripetal'), 420, 0.011, 8, true),
            new THREE.MeshStandardMaterial({
              color: isDark ? 0xc2a67e : 0x6b4a2c,
              roughness: 0.55,
              metalness: 0.05,
              transparent: isEng,
              opacity: isEng ? 0.6 : 1,
            })
          )
        )
      }

      // Инженерная сетка: редкие кольца и продольные линии вместо тяжёлого WireframeGeometry
      if (isEng) {
        const lp: number[] = []
        const seg = (s0: Sec, a0: number, s1: Sec, a1: number) => {
          if (cutOf(s0, a0) < 0 || cutOf(s1, a1) < 0) return
          lp.push(...surf(s0, a0, 0), ...surf(s1, a1, 0))
        }
        for (let r = 0; r <= 24; r++) {
          const s = getSec(Math.min(0.99, Math.max(0.01, r / 24)))
          for (let j = 0; j < 48; j++) seg(s, (j / 48) * Math.PI, s, ((j + 1) / 48) * Math.PI)
        }
        const stations = 120
        const sl: Sec[] = []
        for (let i = 0; i <= stations; i++) sl.push(getSec(Math.min(0.99, Math.max(0.01, i / stations))))
        for (let k = 1; k <= 9; k++) {
          const a = (k * Math.PI) / 10
          for (let i = 0; i < stations; i++) seg(sl[i], a, sl[i + 1], a)
        }
        const wg = new THREE.BufferGeometry()
        wg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3))
        dynamicGroup.add(
          new THREE.LineSegments(
            wg,
            new THREE.LineBasicMaterial({
              color: isDark ? 0xf4f0e8 : 0x1c1816,
              transparent: true,
              opacity: 0.16,
            })
          )
        )
      }
    }

    // 4. СТАЛЬНОЙ ГЕЛЕНОК (Виден в инженерии и биомеханике)
    if (viewLevel !== 'design') {
      const shankPts: THREE.Vector3[] = []
      const shankEndRatio = Math.min(ballRatio - 0.02, 0.15 + eng.shankLength / eng.lastLengthMm)
      for (let i = 0; i <= 20; i++) {
        const u = 0.14 + (i / 20) * Math.max(0.1, shankEndRatio - 0.14)
        shankPts.push(new THREE.Vector3(-1.24 + u * 2.48, getSoleProfileY(u) + 0.024, getMedialCurve(u)))
      }
      const shankRadius = 0.015 + (eng.steelThickness - 1.2) * 0.01
      const shankMesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shankPts), 24, shankRadius, 10, false),
        new THREE.MeshStandardMaterial({
          color: eng.heelOffsetTooFarBack ? 0xe11d48 : 0xd97706,
          roughness: 0.22,
          metalness: 0.85,
        })
      )
      dynamicGroup.add(shankMesh)
    }

    // 5. КАБЛУК И ТОМАС
    const xHeelCenter = -1.24 + 0.14 * 2.48
    const tipOffsetScene = soleType === 'flat' ? heelTipOffsetMm * mmToUnit : 0
    const heelHScene = Math.max(0.04, h)
    const tipRadius = Math.max(0.035, (tipWidthMm * mmToUnit) / 2)

    let topR = 0.21
    let botR = tipRadius
    if (soleType === 'rocker') {
      topR = 0.28
      botR = 0.26
    } else if (soleType === 'thomas') {
      topR = 0.24
      botR = 0.24
    } else if (heelType === 'stiletto') {
      topR = Math.max(0.15, tipRadius * 1.6)
    } else if (heelType === 'kitten') {
      topR = Math.max(0.18, tipRadius * 1.4)
    } else if (heelType === 'flared') {
      topR = Math.max(0.12, tipRadius * 0.65)
      botR = Math.max(0.17, tipRadius * 1.1)
    } else {
      topR = Math.max(0.23, tipRadius)
      botR = Math.max(0.21, tipRadius * 0.95)
    }

    const heelGeom = new THREE.CylinderGeometry(topR, botR, heelHScene, 32, 8)
    const hPos = heelGeom.attributes.position
    for (let i = 0; i < hPos.count; i++) {
      const py = hPos.getY(i)
      const factor = (heelHScene / 2 - py) / heelHScene
      hPos.setX(i, hPos.getX(i) + tipOffsetScene * factor)
    }
    heelGeom.computeVertexNormals()

    const heelMesh = new THREE.Mesh(
      heelGeom,
      new THREE.MeshStandardMaterial({
        color: isDark ? 0xe6dfd5 : 0x1c1816,
        roughness: 0.35,
        metalness: 0.2,
      })
    )
    heelMesh.position.set(xHeelCenter, heelHScene / 2, 0)
    dynamicGroup.add(heelMesh)

    if (soleType === 'thomas' || eng.rx.thomasHeelType !== 'none') {
      const extLen = Math.max(0.15, eng.rx.thomasExtensionMm * mmToUnit)
      const isLateral = eng.rx.thomasHeelType === 'lateral'
      const zSide = isLateral ? -0.1 : 0.1
      const thomasMesh = new THREE.Mesh(
        new THREE.BoxGeometry(extLen + 0.12, heelHScene * 0.95, 0.2),
        new THREE.MeshStandardMaterial({
          color: soleType === 'thomas' ? 0x10b981 : 0xd97706,
          transparent: true,
          opacity: soleType === 'thomas' ? 0.92 : 0.45,
          roughness: 0.35,
        })
      )
      thomasMesh.position.set(xHeelCenter + topR * 0.6 + extLen / 2, heelHScene * 0.48, zSide)
      dynamicGroup.add(thomasMesh)
    }

    // 6. ИНДИКАТОРЫ ДАВЛЕНИЯ И ПЕЛОТ (Активны в биомеханике и инженерии)
    const showBioMarkers = viewLevel === 'biomechanics' || viewLevel === 'engineering'
    padHeel.visible = showBioMarkers
    padM1.visible = showBioMarkers
    padM5.visible = showBioMarkers

    if (showBioMarkers) {
      const xM1 = -1.24 + ((eng.apexM1_Mm ?? eng.lastLengthMm * 0.6) / eng.lastLengthMm) * 2.48
      const xM5 = -1.24 + ((eng.apexM5_Mm ?? eng.lastLengthMm * 0.56) / eng.lastLengthMm) * 2.48

      padHeel.position.set(xHeelCenter, h + 0.032, 0)
      padM1.position.set(xM1, t + 0.032, 0.2)
      padM5.position.set(xM5, t + 0.032, -0.2)

      const sHeel = 0.65 + (eng.heelLoad / 60) * 0.65
      const sM1 = 0.65 + (eng.loadM1Pct / 50) * 0.75
      const sM5 = 0.65 + (eng.loadM5Pct / 50) * 0.75
      padHeel.scale.set(sHeel, 1, sHeel)
      padM1.scale.set(sM1, 1, sM1)
      padM5.scale.set(sM5, 1, sM5)

      ;(padM1.material as THREE.MeshStandardMaterial).color.setHex(
        eng.loadM1Pct >= 45 ? 0xe11d48 : 0x10b981
      )
      ;(padM5.material as THREE.MeshStandardMaterial).color.setHex(
        eng.loadM5Pct >= 40 ? 0xe11d48 : 0xd97706
      )
    }

    pelotteMesh.visible = eng.requiresMetatarsalPad && (viewLevel === 'biomechanics' || viewLevel === 'engineering')
    if (pelotteMesh.visible && eng.metatarsalPadPosMm != null) {
      const xPelotte = -1.24 + (eng.metatarsalPadPosMm / eng.lastLengthMm) * 2.48
      pelotteMesh.position.set(xPelotte, t + 0.052, 0.02)
    }

    // Пронационный крен сборки
    const rollRad = (pronationDeg * Math.PI) / 180
    assembly.rotation.x = rollRad

    // COP (Центр давления) виден в биомеханике
    const showCop = viewLevel === 'biomechanics'
    copRing.visible = showCop
    copStem.visible = showCop

    if (showCop) {
      const copX = -1.24 + (eng.copLongitudinalMm / eng.lastLengthMm) * 2.48
      const copZ = -(eng.copLateralMm * mmToUnit * 2.2)
      copRing.position.set(copX, 0.02, copZ)
      copStem.position.set(copX, 0.42, copZ)
      copRing.rotation.x = Math.PI / 2
    }
  }, [
    eng,
    gender,
    viewLevel,
    soleType,
    heelType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct,
    heelTipOffsetMm,
    tipWidthMm,
    pronationDeg,
    isDark,
  ])

  return (
    <div className="relative w-full h-[255px] select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Верхняя панель: переключатель уровней визуализации (Дизайн / Инженерия / Биомеханика) */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2 text-[9px] font-mono tracking-wider">
        <div className="flex items-center gap-1 rounded-[8px] p-0.5 border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm w-full justify-between">
          {(
            [
              { id: 'design', label: 'ДИЗАЙН' },
              { id: 'engineering', label: 'ИНЖЕНЕРИЯ' },
              { id: 'biomechanics', label: 'БИОМЕХАНИКА' },
            ] as const
          ).map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setViewLevel(lvl.id)}
              className={`px-2 py-1 rounded-[6px] text-[7.5px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none flex-1 text-center ${
                viewLevel === lvl.id
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold shadow-sm'
                  : 'bg-transparent text-[var(--color-ink)] opacity-60 hover:opacity-100'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Нижняя панель ракурсов камеры */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
        <span className="text-[7.5px] font-mono uppercase tracking-[0.2em] opacity-45 pointer-events-none">
          {eng.rx.widthCode.split(' ')[0]} // {viewLevel.toUpperCase()}
        </span>
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'iso', label: '3/4' },
              { id: 'side', label: 'ПРОФИЛЬ' },
              { id: 'top', label: 'СВЕРХУ' },
              { id: 'rear', label: 'ОСЬ ПЯТКИ' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setCamPreset(preset.id)}
              className={`px-2 py-1 rounded-[6px] text-[7.5px] font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                camPreset === preset.id
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent font-semibold'
                  : 'bg-[var(--color-surface)]/75 text-[var(--color-ink)] border-[var(--color-border)] opacity-65 hover:opacity-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
