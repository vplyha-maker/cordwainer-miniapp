// src/components/heel/HeelScene3D.tsx
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { HeelEngineering, SoleType, Gender, LastApexType } from '../../lib/heelCalc'

type CameraPreset = 'iso' | 'side' | 'bottom' | 'rear'

export interface HeelScene3DProps {
  eng: HeelEngineering
  gender?: Gender
  soleType: SoleType
  heelHeight: number
  toeThickness: number
  rockerAngle: number
  rockerStartPct: number
  heelTipOffsetMm: number
  pronationDeg?: number
  isDark?: boolean
}

type Pts = ReadonlyArray<readonly [number, number]>

/**
 * Рекурсивно освобождает GPU-ресурсы (BufferGeometry и Material) всех вложенных объектов Three.js,
 * включая дочерние группы (например, achillesPivot), предотвращая утечки видеопамяти WebGL.
 */
function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const meshOrLine = obj as THREE.Mesh | THREE.LineSegments | THREE.Line
    if (meshOrLine.geometry) {
      meshOrLine.geometry.dispose()
    }
    if (meshOrLine.material) {
      if (Array.isArray(meshOrLine.material)) {
        meshOrLine.material.forEach((mat) => mat.dispose())
      } else {
        meshOrLine.material.dispose()
      }
    }
  })
}

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

const LAST_WIDTH_PTS: Pts = [
  [0.0, 0.56],
  [0.08, 0.62],
  [0.2, 0.55],
  [0.32, 0.51],
  [0.46, 0.68],
  [0.58, 0.94],
  [0.68, 1.0],
  [0.78, 0.88],
  [0.88, 0.60],
  [0.96, 0.35],
  [1.0, 0.12],
]

/**
 * Модифицирует поперечный профиль мыска колодки с учётом морфологии пальцев (египетская / греческая / римская)
 */
const getAnatomicWidthForApex = (u: number, apexType: LastApexType) => {
  const base = hermiteProfile(LAST_WIDTH_PTS, u)
  if (u <= 0.72) return base
  const t = (u - 0.72) / 0.28
  if (apexType === 'wide_square') {
    // Римская стопа — более широкий трапециевидный контур носочной части для I–III лучей
    return base + 0.12 * Math.sin(t * Math.PI)
  }
  if (apexType === 'oblique_anatomical') {
    // Греческая стопа — центрированный косой контур под удлинённый II луч
    return base + 0.04 * Math.sin(t * Math.PI)
  }
  return base
}

const getMedialShift = (u: number) => {
  if (u > 0.15 && u < 0.85) {
    return 0.055 * Math.sin(((u - 0.15) / 0.7) * Math.PI)
  }
  return 0
}

function createBezierHeelGeometry(params: {
  xHeelBack: number
  xFrontBase: number
  thomasExtScene: number
  thomasType: 'none' | 'medial' | 'lateral'
  heelHScene: number
  tipOffsetScene: number
  getArchYAtX: (x: number) => number
  getHalfWidthAtX: (x: number) => number
  getMedialAtX: (x: number) => number
}): THREE.BufferGeometry {
  const {
    xHeelBack,
    xFrontBase,
    thomasExtScene,
    thomasType,
    heelHScene,
    tipOffsetScene,
    getArchYAtX,
    getHalfWidthAtX,
    getMedialAtX,
  } = params

  const shape = new THREE.Shape()
  const rBack = getHalfWidthAtX(xHeelBack + 0.18) * 0.96
  const xCenterBack = xHeelBack + rBack

  const extMedial = thomasType === 'medial' ? thomasExtScene : 0
  const extLateral = thomasType === 'lateral' ? thomasExtScene : 0

  const xMedFront = xFrontBase + extMedial
  const xLatFront = xFrontBase + extLateral

  shape.moveTo(xHeelBack, 0)
  shape.bezierCurveTo(
    xHeelBack,
    -rBack * 0.65,
    xCenterBack - rBack * 0.45,
    -rBack,
    xCenterBack,
    -rBack
  )
  shape.lineTo(xLatFront, -rBack * 0.94)

  if (thomasType === 'none' || thomasExtScene <= 0.001) {
    shape.lineTo(xMedFront, rBack * 0.94)
  } else {
    shape.bezierCurveTo(
      xLatFront + (xMedFront - xLatFront) * 0.15,
      -rBack * 0.15,
      xMedFront - (xMedFront - xLatFront) * 0.15,
      rBack * 0.15,
      xMedFront,
      rBack * 0.96
    )
  }

  shape.lineTo(xCenterBack, rBack)
  shape.bezierCurveTo(
    xCenterBack - rBack * 0.45,
    rBack,
    xHeelBack,
    rBack * 0.65,
    xHeelBack,
    0
  )

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 14,
    depth: heelHScene,
    bevelEnabled: false,
  }

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  geom.rotateX(-Math.PI / 2)

  const pos = geom.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i)
    const vz = pos.getZ(i)
    const zMedial = -vz + getMedialAtX(vx)

    const heightRatio = Math.max(0, Math.min(1, vy / Math.max(0.02, heelHScene)))
    const soleUndersideY = Math.max(0.02, getArchYAtX(vx) - 0.005)
    const adjustedY = heightRatio * soleUndersideY
    const bottomShift = (1 - heightRatio) * tipOffsetScene

    pos.setX(i, vx + bottomShift)
    pos.setY(i, adjustedY)
    pos.setZ(i, zMedial)
  }

  geom.computeVertexNormals()
  return geom
}

/**
 * Строит 3D рокерную подошву-танкетку со скруглённой пяточной чашкой и мыском
 */
function createFullRockerWedgeGeometry(params: {
  baseSoleW: number
  ballRatio: number
  activeRockerRad: number
  getSoleProfileY: (u: number) => number
  getHalfWidth: (u: number) => number
  getMedialCurve: (u: number) => number
  getBunionBulge: (u: number, zNorm: number) => number
}): THREE.BufferGeometry {
  const {
    baseSoleW,
    ballRatio,
    activeRockerRad,
    getSoleProfileY,
    getHalfWidth,
    getMedialCurve,
    getBunionBulge,
  } = params

  const geom = new THREE.BoxGeometry(2.48, 1.0, baseSoleW, 96, 8, 20)
  const pos = geom.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const yNorm = pos.getY(i) + 0.5
    const z = pos.getZ(i)

    const u = Math.max(0, Math.min(1, (x + 1.24) / 2.48))
    const zNorm = z / (baseSoleW * 0.5)

    let endRoundX = x
    if (u < 0.08) {
      endRoundX += zNorm * zNorm * 0.065 * (1 - u / 0.08)
    } else if (u > 0.92) {
      endRoundX -= zNorm * zNorm * 0.065 * ((u - 0.92) / 0.08)
    }

    const hw = getHalfWidth(u) * (1.03 - yNorm * 0.03)
    const finalZ = zNorm * hw + getMedialCurve(u) + getBunionBulge(u, zNorm) * 0.5

    const yTop = Math.max(0.04, getSoleProfileY(u) - 0.004)

    let yBottom = 0
    if (u < 0.14) {
      const heelRockerRatio = (0.14 - u) / 0.14
      yBottom = 0.085 * Math.pow(heelRockerRatio, 1.8)
    } else if (u > ballRatio) {
      const r = (u - ballRatio) / Math.max(0.05, 1 - ballRatio)
      yBottom = Math.sin(activeRockerRad) * 0.62 * Math.pow(r, 1.65)
    }

    const finalY = yBottom + yNorm * Math.max(0.03, yTop - yBottom)
    pos.setX(i, endRoundX)
    pos.setY(i, finalY)
    pos.setZ(i, finalZ)
  }

  geom.computeVertexNormals()
  return geom
}

export function HeelScene3D({
  eng,
  gender = 'female',
  soleType,
  heelHeight,
  toeThickness,
  rockerAngle,
  rockerStartPct,
  heelTipOffsetMm,
  pronationDeg = 0,
  isDark = true,
}: HeelScene3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [camPreset, setCamPreset] = useState<CameraPreset>('iso')

  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    dynamicGroup: THREE.Group
    padHeel: THREE.Mesh
    padM1: THREE.Mesh
    padM5: THREE.Mesh
    pelotteMesh: THREE.Mesh
    bunionPocketMesh: THREE.Mesh
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
    const height = container.clientHeight || 195

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(33, width / height, 0.1, 100)

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

    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.25)
    keyLight.position.set(4, 8, 5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.55)
    fillLight.position.set(-5, 3, -4)
    scene.add(fillLight)

    const gridColor = isDark ? 0x3a3632 : 0xc8c2b8
    const grid = new THREE.GridHelper(4.0, 12, gridColor, gridColor)
    ;(grid.material as THREE.Material).opacity = 0.22
    ;(grid.material as THREE.Material).transparent = true
    scene.add(grid)

    const dynamicGroup = new THREE.Group()
    scene.add(dynamicGroup)

    const padHeel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32),
      new THREE.MeshStandardMaterial({
        color: 0x3186ff,
        transparent: true,
        opacity: 0.78,
        roughness: 0.35,
      })
    )
    const padM1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32),
      new THREE.MeshStandardMaterial({
        color: 0x3186ff,
        transparent: true,
        opacity: 0.82,
        roughness: 0.35,
      })
    )
    const padM5 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32),
      new THREE.MeshStandardMaterial({
        color: 0x3186ff,
        transparent: true,
        opacity: 0.82,
        roughness: 0.35,
      })
    )
    scene.add(padHeel, padM1, padM5)

    const pelotteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 24, 16),
      new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        transparent: true,
        opacity: 0.9,
        roughness: 0.3,
      })
    )
    pelotteMesh.scale.set(1.2, 0.3, 0.88)
    scene.add(pelotteMesh)

    // 3D-индикатор разгрузочного кармана под головку M1 (Hallux Valgus)
    const bunionPocketMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 20, 16),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.65,
        roughness: 0.28,
      })
    )
    bunionPocketMesh.visible = false
    scene.add(bunionPocketMesh)

    const copRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.014, 16, 36),
      new THREE.MeshBasicMaterial({ color: 0xe11d48 })
    )
    copRing.rotation.x = Math.PI / 2
    scene.add(copRing)

    const copStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.52, 14),
      new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85 })
    )
    scene.add(copStem)

    const targetSpherical = { theta: 0.58, phi: 0.95, radius: 4.05, lookAtY: 0.3 }
    const currentSpherical = { ...targetSpherical }

    sceneRef.current = {
      scene,
      camera,
      renderer,
      dynamicGroup,
      padHeel,
      padM1,
      padM5,
      pelotteMesh,
      bunionPocketMesh,
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

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setCamPreset((prev) => (prev === 'rear' ? 'iso' : prev))
      }

      sceneRef.current.targetSpherical.theta -= dx * 0.0085
      sceneRef.current.targetSpherical.phi = Math.max(
        0.15,
        Math.min(Math.PI * 0.82, sceneRef.current.targetSpherical.phi - dy * 0.0075)
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
        Math.min(6.0, sceneRef.current.targetSpherical.radius + e.deltaY * 0.0025)
      )
    }

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    const updateViewportSize = (w: number, h: number) => {
      if (!sceneRef.current) return
      const safeW = Math.max(100, w)
      const safeH = Math.max(80, h)
      sceneRef.current.camera.aspect = safeW / safeH
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(safeW, safeH)
    }

    const onWindowResize = () => {
      if (!mountRef.current) return
      updateViewportSize(
        mountRef.current.clientWidth || 340,
        mountRef.current.clientHeight || 195
      )
    }

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: cw, height: ch } = entry.contentRect
          updateViewportSize(cw || 340, ch || 195)
        }
      })
      resizeObserver.observe(container)
    } else {
      window.addEventListener('resize', onWindowResize)
    }

    let reqId = 0
    const animate = () => {
      reqId = requestAnimationFrame(animate)
      const st = sceneRef.current
      if (!st) return

      st.currentSpherical.theta +=
        (st.targetSpherical.theta - st.currentSpherical.theta) * 0.14
      st.currentSpherical.phi += (st.targetSpherical.phi - st.currentSpherical.phi) * 0.14
      st.currentSpherical.radius +=
        (st.targetSpherical.radius - st.currentSpherical.radius) * 0.14
      st.currentSpherical.lookAtY +=
        (st.targetSpherical.lookAtY - st.currentSpherical.lookAtY) * 0.14

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
      if (resizeObserver) {
        resizeObserver.disconnect()
      } else {
        window.removeEventListener('resize', onWindowResize)
      }
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerUp)
      dom.removeEventListener('wheel', onWheel)

      // Полная рекурсивная очистка всех геометрий и материалов при размонтировании
      disposeObject3D(dynamicGroup)
      disposeObject3D(padHeel)
      disposeObject3D(padM1)
      disposeObject3D(padM5)
      disposeObject3D(pelotteMesh)
      disposeObject3D(bunionPocketMesh)
      disposeObject3D(copRing)
      disposeObject3D(copStem)
      disposeObject3D(grid)
      renderer.dispose()
      sceneRef.current = null
    }
  }, [])

  const applyCameraPreset = (preset: CameraPreset) => {
    setCamPreset(preset)
    const st = sceneRef.current
    if (!st) return
    if (preset === 'iso') {
      st.targetSpherical = { theta: 0.58, phi: 0.95, radius: 4.05, lookAtY: 0.3 }
    } else if (preset === 'side') {
      st.targetSpherical = { theta: 0.0, phi: 1.48, radius: 3.85, lookAtY: 0.3 }
    } else if (preset === 'bottom') {
      st.targetSpherical = { theta: 0.0, phi: 0.18, radius: 4.2, lookAtY: 0.18 }
    } else if (preset === 'rear') {
      st.targetSpherical = { theta: -Math.PI / 2, phi: 1.44, radius: 3.4, lookAtY: 0.28 }
    }
  }

  useEffect(() => {
    const st = sceneRef.current
    if (!st) return

    const {
      dynamicGroup,
      padHeel,
      padM1,
      padM5,
      pelotteMesh,
      bunionPocketMesh,
      copRing,
      copStem,
      grid,
    } = st

    const gridHex = isDark ? 0x48423c : 0xb8b0a4
    ;(grid.material as THREE.LineBasicMaterial).color.setHex(gridHex)

    // Полная рекурсивная очистка старых мешей dynamicGroup перед перестроением
    disposeObject3D(dynamicGroup)
    dynamicGroup.clear()

    const isRearView = camPreset === 'rear'

    // ВСЕ КООРДИНАТЫ БЕРУТСЯ ИЗ ЕДИНОГО ИСТОЧНИКА ПРАВДЫ: eng.geometryModel
    const gm = eng.geometryModel
    const mmToUnit = 2.48 / Math.max(220, gm.lastLengthMm)
    const h = gm.heelHeightMm * mmToUnit
    const t = gm.toeThicknessMm * mmToUnit
    const ballRatio = gm.uBall
    const activeRockerRad =
      gm.soleType === 'rocker' ? (gm.rockerAngleDeg * Math.PI) / 180 : 0
    const baseSoleW =
      (gender === 'male' ? 0.94 : 0.82) + gm.ballBuildUpMm * 0.01

    const apexToeZShift = gm.toeBoxShiftMedialMm * 0.012
    const bunionBulgeMax = gm.medialBunionPocketMm * mmToUnit * 1.35
    const bunionSpanU = Math.max(0.055, gm.bunionPocketRadiusMm / gm.lastLengthMm)

    const getSoleProfileY = (u: number) => {
      const clampedU = Math.max(0, Math.min(1, u))
      if (clampedU <= 0.18) {
        const heelCup = 0.008 * (1 - Math.cos((clampedU / 0.18) * Math.PI))
        return h - heelCup
      }
      if (clampedU <= ballRatio) {
        const s = (clampedU - 0.18) / Math.max(0.05, ballRatio - 0.18)
        const smoothStep = s * s * (3 - 2 * s)
        return h * (1 - smoothStep) + t * smoothStep
      }
      const r = (clampedU - ballRatio) / Math.max(0.05, 1 - ballRatio)
      const rockerLift =
        gm.soleType === 'rocker'
          ? Math.sin(activeRockerRad) * 0.62 * Math.pow(r, 1.65)
          : 0.055 * r * r
      return t + rockerLift
    }

    const getArchYAtX = (x: number) => getSoleProfileY((x + 1.24) / 2.48)
    const getHalfWidth = (u: number) =>
      Math.max(0.05, baseSoleW * 0.5 * getAnatomicWidthForApex(u, gm.lastApexType))
    const getHalfWidthAtX = (x: number) =>
      getHalfWidth(Math.max(0, Math.min(1, (x + 1.24) / 2.48)))
    const getMedialCurve = (u: number) => {
      const baseShift = getMedialShift(u)
      const toeShift = u > 0.7 ? Math.pow((u - 0.7) / 0.3, 1.4) * apexToeZShift : 0
      return baseShift + toeShift
    }
    const getMedialAtX = (x: number) =>
      getMedialCurve(Math.max(0, Math.min(1, (x + 1.24) / 2.48)))

    // Локальное медиальное расширение следа/колодки под карман Hallux Valgus (на уровне M1)
    const getBunionBulge = (u: number, zNorm: number) => {
      if (bunionBulgeMax <= 0 || zNorm <= 0.15) return 0
      const du = Math.abs(u - gm.uApexM1)
      if (du >= bunionSpanU) return 0
      const longitudinalWave = 0.5 * (1 + Math.cos((du / bunionSpanU) * Math.PI))
      const medialFactor = Math.pow(Math.min(1, (zNorm - 0.15) / 0.85), 1.4)
      return bunionBulgeMax * longitudinalWave * medialFactor
    }

    // 1. ОРТОПЕДИЧЕСКАЯ СТЕЛЬКА
    const segsX = 96
    const segsZ = 24
    const insoleGeom = new THREE.PlaneGeometry(2.48, baseSoleW, segsX, segsZ)
    insoleGeom.rotateX(-Math.PI / 2)

    const pos = insoleGeom.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const baseColor = new THREE.Color(isDark ? 0xd4c9bc : 0x332b26)
    const greenFreeZone = new THREE.Color(0x10b981)
    const blueAnatomy = new THREE.Color(0x3186ff)
    const yellowModify = new THREE.Color(0xf59e0b)
    const redPressure = new THREE.Color(0xe11d48)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const zNorm = pos.getZ(i) / (baseSoleW * 0.5)
      const u = (x + 1.24) / 2.48

      const bunionExtraZ = getBunionBulge(u, zNorm)
      const finalZ = zNorm * getHalfWidth(u) + getMedialCurve(u) + bunionExtraZ
      pos.setZ(i, finalZ)

      const y = getSoleProfileY(u)
      const edgeTaper = Math.max(0, 1 - Math.pow(Math.abs(zNorm), 2.8))

      let orthoLift = 0
      let wedgeIntensity = 0
      let archIntensity = 0

      if (u > 0.22 && u < 0.58 && zNorm > 0 && eng.rx.archSupportHeightMm > 0) {
        const archWave = Math.sin(((u - 0.22) / 0.36) * Math.PI)
        const medialDome = Math.sin(Math.min(1, zNorm) * Math.PI) * edgeTaper
        const lift =
          archWave * medialDome * (eng.rx.archSupportHeightMm * mmToUnit * 0.55)
        orthoLift += lift
        archIntensity = archWave * medialDome
      }

      if (u < 0.34) {
        const smoothFade = 0.5 * (1 + Math.cos((u / 0.34) * Math.PI))
        const rimFade = 0.2 + 0.8 * edgeTaper
        if (eng.rx.medialHeelWedgeMm > 0 && zNorm > 0) {
          const medFactor = Math.min(1, zNorm)
          const lift =
            smoothFade *
            medFactor *
            rimFade *
            (eng.rx.medialHeelWedgeMm * mmToUnit * 0.65)
          orthoLift += lift
          wedgeIntensity = smoothFade * medFactor
        } else if (eng.rx.lateralWedgeMm > 0 && zNorm < 0) {
          const latFactor = Math.min(1, -zNorm)
          const lift =
            smoothFade *
            latFactor *
            rimFade *
            (eng.rx.lateralWedgeMm * mmToUnit * 0.65)
          orthoLift += lift
          wedgeIntensity = smoothFade * latFactor
        }
      }

      pos.setY(i, y + orthoLift + 0.01)

      const distForefoot = Math.hypot(
        u - ballRatio,
        (finalZ - (pronationDeg < 0 ? 0.12 : -0.12)) * 0.8
      )
      const foreIntensity =
        Math.max(0, 1 - distForefoot * 3.4) * (eng.forefootLoad / 100)
      const vColor = baseColor.clone()

      if (wedgeIntensity > 0.15) {
        vColor.lerp(yellowModify, Math.min(0.85, wedgeIntensity * 1.1))
      }
      if (bunionExtraZ > 0.002) {
        vColor.lerp(yellowModify, Math.min(0.85, (bunionExtraZ / Math.max(0.01, bunionBulgeMax)) * 0.9))
      }
      if (archIntensity > 0.2) {
        vColor.lerp(blueAnatomy, Math.min(0.75, archIntensity * 0.9))
      }
      if (foreIntensity > 0.45 && eng.peakForefootPressureKpa >= 215) {
        vColor.lerp(redPressure, Math.min(0.85, (foreIntensity - 0.4) * 1.6))
      }
      if (u > 0.88) {
        vColor.lerp(greenFreeZone, Math.min(0.8, ((u - 0.88) / 0.12) * 0.85))
      }

      colors[i * 3] = vColor.r
      colors[i * 3 + 1] = vColor.g
      colors[i * 3 + 2] = vColor.b
    }

    insoleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    insoleGeom.computeVertexNormals()

    dynamicGroup.add(
      new THREE.Mesh(
        insoleGeom,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.38,
          metalness: 0.1,
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
        })
      )
    )

    const wireColor = isDark ? 0xf4f0e8 : 0x1c1816
    dynamicGroup.add(
      new THREE.LineSegments(
        new THREE.WireframeGeometry(insoleGeom),
        new THREE.LineBasicMaterial({
          color: wireColor,
          transparent: true,
          opacity: 0.12,
        })
      )
    )

    // 2. ПОДОШВА И КАБЛУК (из координат LastGeometryModel)
    if (gm.soleType === 'rocker') {
      const rockerWedgeGeom = createFullRockerWedgeGeometry({
        baseSoleW,
        ballRatio,
        activeRockerRad,
        getSoleProfileY,
        getHalfWidth,
        getMedialCurve,
        getBunionBulge,
      })

      dynamicGroup.add(
        new THREE.Mesh(
          rockerWedgeGeom,
          new THREE.MeshStandardMaterial({
            color: isDark ? 0x3b4d5e : 0x475569,
            roughness: 0.4,
            metalness: 0.15,
            transparent: true,
            opacity: 0.86,
          })
        )
      )

      if (!isRearView) {
        const carbonPts: THREE.Vector3[] = []
        for (let i = 0; i <= 26; i++) {
          const u = gm.uHeelCenter + (i / 26) * (0.92 - gm.uHeelCenter)
          carbonPts.push(
            new THREE.Vector3(
              -1.24 + u * 2.48,
              Math.max(0.02, getSoleProfileY(u) - 0.024),
              getMedialCurve(u)
            )
          )
        }
        dynamicGroup.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(carbonPts),
              24,
              0.011,
              8,
              false
            ),
            new THREE.MeshStandardMaterial({
              color: 0xf59e0b,
              roughness: 0.2,
              metalness: 0.8,
            })
          )
        )
      }
    } else {
      const outsoleGeom = new THREE.BoxGeometry(2.48, 0.026, baseSoleW, 80, 1, 14)
      const sPos = outsoleGeom.attributes.position
      for (let i = 0; i < sPos.count; i++) {
        const x = sPos.getX(i)
        const z = sPos.getZ(i)
        const origY = sPos.getY(i)
        const u = (x + 1.24) / 2.48
        const hw = getHalfWidth(u)
        const zNorm = z / (baseSoleW * 0.5)
        sPos.setZ(i, zNorm * hw + getMedialCurve(u) + getBunionBulge(u, zNorm) * 0.5)
        sPos.setY(i, getSoleProfileY(u) - 0.008 + origY)
      }
      outsoleGeom.computeVertexNormals()
      dynamicGroup.add(
        new THREE.Mesh(
          outsoleGeom,
          new THREE.MeshStandardMaterial({
            color: isDark ? 0x26201a : 0xb8a894,
            roughness: 0.5,
            transparent: true,
            opacity: 0.85,
          })
        )
      )

      const xHeelBack = -1.24
      // Базовый срез каблука и удлинение Томаса из LastGeometryModel
      const xFrontBase = -1.24 + (0.25 * 2.48)
      const heelHScene = Math.max(0.04, h)
      const tipOffsetScene = gm.effectiveHeelTipOffsetMm * mmToUnit

      const isThomasMode = gm.soleType === 'thomas'
      const activeThomasType = isThomasMode ? gm.thomasHeelType : 'none'
      const thomasExtScene = isThomasMode
        ? Math.max(0.18, gm.thomasExtensionMm * mmToUnit * 1.15)
        : 0

      const bezierHeelGeom = createBezierHeelGeometry({
        xHeelBack,
        xFrontBase,
        thomasExtScene,
        thomasType: activeThomasType,
        heelHScene,
        tipOffsetScene,
        getArchYAtX,
        getHalfWidthAtX,
        getMedialAtX,
      })

      dynamicGroup.add(
        new THREE.Mesh(
          bezierHeelGeom,
          new THREE.MeshStandardMaterial({
            color: isThomasMode ? 0x0d9488 : isDark ? 0x8c7a6b : 0x3d312a,
            roughness: 0.35,
            metalness: 0.2,
            transparent: true,
            opacity: 0.94,
          })
        )
      )

      dynamicGroup.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(bezierHeelGeom, 25),
          new THREE.LineBasicMaterial({
            color: isThomasMode ? 0x10b981 : wireColor,
            transparent: true,
            opacity: 0.6,
          })
        )
      )

      if (!isRearView) {
        const shankPts: THREE.Vector3[] = []
        const shankStartRatio = gm.uHeelCenter
        const shankEndRatio = Math.min(ballRatio - 0.02, gm.uShankEnd)
        for (let i = 0; i <= 20; i++) {
          const u =
            shankStartRatio +
            (i / 20) * Math.max(0.08, shankEndRatio - shankStartRatio)
          shankPts.push(
            new THREE.Vector3(
              -1.24 + u * 2.48,
              getSoleProfileY(u) - 0.015,
              getMedialCurve(u)
            )
          )
        }
        const shankRadius = 0.013 + (gm.steelThicknessMm - 1.2) * 0.01
        dynamicGroup.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(shankPts),
              24,
              shankRadius,
              10,
              false
            ),
            new THREE.MeshStandardMaterial({
              color:
                eng.heelOffsetTooFarBack || eng.shankOverloaded
                  ? 0xe11d48
                  : 0xf59e0b,
              roughness: 0.22,
              metalness: 0.85,
            })
          )
        )
      }
    }

    // 3. СИНИЕ АНАТОМИЧЕСКИЕ ОСИ, АПЕКС И ПРОФИЛЬ ВЗЪЁМА ИЗ LastGeometryModel
    const xHeelCenter = -1.24 + gm.uHeelCenter * 2.48
    const uM1 = gm.uApexM1
    const uM5 = gm.uApexM5
    const xM1 = -1.24 + uM1 * 2.48
    const xM5 = -1.24 + uM5 * 2.48
    const zM1 =
      getHalfWidth(uM1) * 0.78 + getMedialCurve(uM1) + getBunionBulge(uM1, 0.9)
    const zM5 = -getHalfWidth(uM5) * 0.78 + getMedialCurve(uM5)

    if (!isRearView) {
      const metBreakPts = [
        new THREE.Vector3(xM5, getSoleProfileY(uM5) + 0.032, zM5),
        new THREE.Vector3(xM1, getSoleProfileY(uM1) + 0.032, zM1),
      ]
      dynamicGroup.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(metBreakPts),
            8,
            0.009,
            8,
            false
          ),
          new THREE.MeshBasicMaterial({ color: 0x3186ff })
        )
      )

      const apexToeMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      )
      apexToeMarker.position.set(
        1.22,
        getSoleProfileY(0.99) + 0.025,
        getMedialCurve(0.99)
      )
      dynamicGroup.add(apexToeMarker)

      // Дуга модификации прямого взъёма в 3D (показывает +наращивание зелёным или -снятие жёлтым)
      if (gm.instepBuildUpMm !== 0) {
        const uInstep = gm.uInstep
        const xInstep = -1.24 + uInstep * 2.48
        const baseCrestY =
          getSoleProfileY(uInstep) + gm.instepBaseHeightMm * mmToUnit * 0.52
        const deltaCrestY = gm.instepBuildUpMm * mmToUnit * 1.2
        const hwInstep = getHalfWidth(uInstep) * 0.85
        const zMed = getMedialCurve(uInstep)
        const instepArcPts = [
          new THREE.Vector3(xInstep, getSoleProfileY(uInstep) + 0.03, -hwInstep + zMed),
          new THREE.Vector3(xInstep, baseCrestY + deltaCrestY, zMed),
          new THREE.Vector3(xInstep, getSoleProfileY(uInstep) + 0.03, hwInstep + zMed),
        ]
        dynamicGroup.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(instepArcPts),
              16,
              0.007,
              8,
              false
            ),
            new THREE.MeshBasicMaterial({
              color: gm.instepModAction === 'build_up' ? 0x10b981 : 0xf59e0b,
            })
          )
        )
      }
    }

    const achillesPivot = new THREE.Group()
    achillesPivot.position.set(xHeelCenter, h + 0.025, 0)
    const residualRollDeg =
      gm.soleType === 'thomas'
        ? pronationDeg * 0.45
        : gm.soleType === 'rocker'
          ? pronationDeg * 0.55
          : pronationDeg
    achillesPivot.rotation.x = (residualRollDeg * Math.PI) / 180

    const achillesAxis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.48, 12),
      new THREE.MeshBasicMaterial({
        color: Math.abs(residualRollDeg) >= 3.5 ? 0xe11d48 : 0x10b981,
      })
    )
    achillesAxis.position.y = 0.24
    achillesPivot.add(achillesAxis)
    dynamicGroup.add(achillesPivot)

    // 4. ЗОНЫ ДАВЛЕНИЯ, КАРМАН HV И ПЕЛОТ ЗЕЙЦА (строго по координатам LastGeometryModel)
    padHeel.visible = !isRearView
    padM1.visible = !isRearView
    padM5.visible = !isRearView

    padHeel.position.set(xHeelCenter, h + 0.022, 0)
    padM1.position.set(xM1, getSoleProfileY(uM1) + 0.022, zM1 * 0.85)
    padM5.position.set(xM5, getSoleProfileY(uM5) + 0.022, zM5 * 0.85)

    const sHeel = 0.65 + (eng.heelLoad / 60) * 0.65
    const sM1 = 0.65 + (eng.loadM1Pct / 50) * 0.75
    const sM5 = 0.65 + (eng.loadM5Pct / 50) * 0.75
    padHeel.scale.set(sHeel, 1, sHeel)
    padM1.scale.set(sM1, 1, sM1)
    padM5.scale.set(sM5, 1, sM5)

    ;(padM1.material as THREE.MeshStandardMaterial).color.setHex(
      eng.loadM1Pct >= 42 ? 0xe11d48 : 0x3186ff
    )
    ;(padM5.material as THREE.MeshStandardMaterial).color.setHex(
      eng.loadM5Pct >= 38 ? 0xe11d48 : 0x3186ff
    )

    // Визуализация кармана под Hallux Valgus на медиальной грани M1
    bunionPocketMesh.visible = gm.medialBunionPocketMm > 0 && !isRearView
    if (bunionPocketMesh.visible) {
      const zMedEdgeM1 =
        getHalfWidth(uM1) + getMedialCurve(uM1) + bunionBulgeMax * 0.55
      bunionPocketMesh.position.set(xM1, getSoleProfileY(uM1) + 0.045, zMedEdgeM1)
      const pocketScale = 0.75 + gm.medialBunionPocketMm * 0.12
      bunionPocketMesh.scale.set(pocketScale * 1.25, 0.55, pocketScale * 0.7)
    }

    pelotteMesh.visible = gm.requiresMetatarsalPad && !isRearView
    if (pelotteMesh.visible) {
      const xPelotte = -1.24 + gm.uPelotte * 2.48
      const pelotteScaleY = 0.25 + ((gm.metatarsalPadHeightMm ?? 4) / 6) * 0.15
      pelotteMesh.scale.set(1.2, pelotteScaleY, 0.88)
      pelotteMesh.position.set(
        xPelotte,
        getSoleProfileY(gm.uPelotte) + 0.028,
        getMedialCurve(gm.uPelotte) + 0.015
      )
    }

    copRing.visible = !isRearView
    copStem.visible = !isRearView
    const copX = -1.24 + (eng.copLongitudinalMm / gm.lastLengthMm) * 2.48
    const copZ = -(eng.copLateralMm * mmToUnit * 2.2)
    copRing.position.set(copX, 0.015, copZ)
    copStem.position.set(copX, 0.29, copZ)
    copRing.rotation.x = Math.PI / 2
  }, [
    eng,
    gender,
    soleType,
    heelHeight,
    toeThickness,
    rockerAngle,
    rockerStartPct,
    heelTipOffsetMm,
    pronationDeg,
    camPreset,
    isDark,
  ])

  const gm = eng.geometryModel

  return (
    <div className="flex flex-col w-full select-none overflow-hidden">
      <div className="relative w-full h-[195px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        <div className="pointer-events-none absolute top-2 left-2.5 right-2.5 flex items-center justify-between gap-1 text-[8.5px] font-mono">
          <div className="px-2 py-1 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
            <span className="opacity-65">M1/M5: </span>
            <strong style={{ color: eng.loadM1Pct >= 42 ? '#E11D48' : '#3186FF' }}>
              {eng.loadM1Pct}%
            </strong>
            <span className="opacity-40"> / </span>
            <strong style={{ color: eng.loadM5Pct >= 38 ? '#E11D48' : '#3186FF' }}>
              {eng.loadM5Pct}%
            </strong>
            <span className="mx-1.5 opacity-30">|</span>
            <span className="opacity-65">ПИК (МОД.): </span>
            <strong style={{ color: eng.peakForefootPressureKpa >= 245 ? '#E11D48' : 'inherit' }}>
              {eng.peakForefootPressureKpa} кПа
            </strong>
          </div>

          <div className="px-2 py-1 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
            {soleType === 'thomas' ? (
              <strong className="text-[#10B981]">
                ТОМАС +{gm.thomasExtensionMm}мм ({gm.thomasHeelType === 'medial' ? 'Внутр' : 'Наруж'})
              </strong>
            ) : soleType === 'rocker' ? (
              <strong className="text-[#F59E0B]">
                РОКЕР {rockerAngle}° (Карбон {gm.carbonInsertThicknessMm}мм)
              </strong>
            ) : (
              <strong className={eng.rx.recommendThomasHeel ? 'text-[#E11D48]' : ''}>
                КАБЛУК: СТАНДАРТ
              </strong>
            )}
          </div>
        </div>

        <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between">
          <span className="text-[8px] font-mono uppercase tracking-wider opacity-65 pointer-events-none">
            {eng.rx.widthCode} // Сгиб {gm.metatarsalObliqueAngleDeg}°
            {gm.medialBunionPocketMm > 0 ? ` // HV +${gm.medialBunionPocketMm}мм` : ''}
          </span>
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'iso', label: '3/4' },
                { id: 'side', label: 'СБОКУ' },
                { id: 'bottom', label: 'СВЕРХУ' },
                { id: 'rear', label: 'ПЯТКА' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyCameraPreset(preset.id)}
                className={`px-2 py-0.5 rounded-[5px] text-[7.5px] font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                  camPreset === preset.id
                    ? 'bg-[var(--color-ink)] text-[var(--color-bg)] border-transparent font-semibold'
                    : 'bg-[var(--color-surface)]/85 text-[var(--color-ink)] border-[var(--color-border)] opacity-75'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 flex items-center justify-between flex-wrap gap-x-2 gap-y-1 text-[8px] font-mono border-t border-[var(--color-border)] bg-[var(--color-surface)]/40">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#E11D48] inline-block" />
          Давление/Пелот
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
          Припуск/Томас
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3186FF] inline-block" />
          Оси M1–M5/Свод
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block" />
          Доработка/HV/Апекс
        </span>
      </div>
    </div>
  )
}
