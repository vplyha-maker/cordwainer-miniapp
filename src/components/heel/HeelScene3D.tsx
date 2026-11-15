// src/components/heel/HeelScene3D.tsx
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { HeelEngineering, SoleType, Gender } from '../../lib/heelCalc'

type CameraPreset = 'iso' | 'side' | 'bottom' | 'rear'

type Props = {
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

const getAnatomicWidth = (u: number) => hermiteProfile(LAST_WIDTH_PTS, u)

const getMedialShift = (u: number) => {
  if (u > 0.15 && u < 0.85) {
    return 0.055 * Math.sin(((u - 0.15) / 0.7) * Math.PI)
  }
  return 0
}

/**
 * Строит монолитный 3D-каблук (Стандарт или Г-образный Томас на кривых Безье),
 * верхняя грань которого плотно (без воздушного зазора!) входит в подошву,
 * а ширина точно совпадает с пяточной частью подошвы.
 */
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

  // Отключаем bevel, чтобы каблук не раздувался шире подошвы и не создавал ступеньку под сводом
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
    // ИСПРАВЛЕНО: Верхняя плоскость каблука поднимается вплотную в тело подошвы (без воздушной щели!)
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

function createFullRockerWedgeGeometry(params: {
  baseSoleW: number
  ballRatio: number
  activeRockerRad: number
  getSoleProfileY: (u: number) => number
  getHalfWidth: (u: number) => number
  getMedialCurve: (u: number) => number
}): THREE.BufferGeometry {
  const { baseSoleW, ballRatio, activeRockerRad, getSoleProfileY, getHalfWidth, getMedialCurve } = params

  const geom = new THREE.BoxGeometry(2.48, 1.0, baseSoleW, 96, 8, 16)
  const pos = geom.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const yNorm = pos.getY(i) + 0.5
    const z = pos.getZ(i)

    const u = Math.max(0, Math.min(1, (x + 1.24) / 2.48))
    const hw = getHalfWidth(u) * (1.03 - yNorm * 0.03)
    const zNorm = z / (baseSoleW * 0.5)
    const finalZ = zNorm * hw + getMedialCurve(u)

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
}: Props) {
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
      new THREE.CylinderGeometry(0.19, 0.19, 0.024, 32),
      new THREE.MeshStandardMaterial({ color: 0xb46513, transparent: true, opacity: 0.8, roughness: 0.35 })
    )
    const padM1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.024, 32),
      new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.85, roughness: 0.35 })
    )
    const padM5 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.024, 32),
      new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.85, roughness: 0.35 })
    )
    scene.add(padHeel, padM1, padM5)

    const pelotteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.9, roughness: 0.3 })
    )
    pelotteMesh.scale.set(1.25, 0.34, 0.9)
    scene.add(pelotteMesh)

    const copRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.015, 16, 36),
      new THREE.MeshBasicMaterial({ color: 0xe11d48 })
    )
    copRing.rotation.x = Math.PI / 2
    scene.add(copRing)

    const copStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.55, 14),
      new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85 })
    )
    scene.add(copStem)

    // Настоящий изометрический ракурс 3/4 сверху-сбоку (а не плоский профиль)
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

    const onResize = () => {
      if (!mountRef.current || !sceneRef.current) return
      const w = mountRef.current.clientWidth || 340
      const h = mountRef.current.clientHeight || 195
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
      renderer.dispose()
    }
  }, [])

  useEffect(() => {
    const st = sceneRef.current
    if (!st) return
    if (camPreset === 'iso') {
      st.targetSpherical = { theta: 0.58, phi: 0.95, radius: 4.05, lookAtY: 0.3 }
    } else if (camPreset === 'side') {
      st.targetSpherical = { theta: 0.0, phi: 1.48, radius: 3.85, lookAtY: 0.3 }
    } else if (camPreset === 'bottom') {
      st.targetSpherical = { theta: 0.0, phi: 0.18, radius: 4.2, lookAtY: 0.18 }
    } else if (camPreset === 'rear') {
      st.targetSpherical = { theta: -Math.PI / 2, phi: 1.42, radius: 3.5, lookAtY: 0.32 }
    }
  }, [camPreset])

  useEffect(() => {
    const st = sceneRef.current
    if (!st) return

    const { dynamicGroup, padHeel, padM1, padM5, pelotteMesh, copRing, copStem, grid } = st

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

    const mmToUnit = 2.48 / Math.max(220, eng.lastLengthMm)
    const h = heelHeight * mmToUnit
    const t = toeThickness * mmToUnit
    const ballRatio = Math.max(0.52, Math.min(0.78, rockerStartPct / 100))
    const activeRockerRad = soleType === 'rocker' ? (rockerAngle * Math.PI) / 180 : 0
    const baseSoleW = (gender === 'male' ? 0.94 : 0.82) + eng.rx.ballBuildUpMm * 0.01

    const getSoleProfileY = (u: number) => {
      const clampedU = Math.max(0, Math.min(1, u))
      if (clampedU <= 0.18) {
        const heelCup = 0.01 * (1 - Math.cos((clampedU / 0.18) * Math.PI))
        return h - heelCup
      }
      if (clampedU <= ballRatio) {
        const s = (clampedU - 0.18) / Math.max(0.05, ballRatio - 0.18)
        const smoothStep = s * s * (3 - 2 * s)
        return h * (1 - smoothStep) + t * smoothStep
      }
      const r = (clampedU - ballRatio) / Math.max(0.05, 1 - ballRatio)
      const rockerLift =
        soleType === 'rocker' ? Math.sin(activeRockerRad) * 0.62 * Math.pow(r, 1.65) : 0.055 * r * r
      return t + rockerLift
    }

    const getArchYAtX = (x: number) => getSoleProfileY((x + 1.24) / 2.48)
    const getHalfWidth = (u: number) => Math.max(0.05, baseSoleW * 0.5 * getAnatomicWidth(u))
    const getHalfWidthAtX = (x: number) => getHalfWidth(Math.max(0, Math.min(1, (x + 1.24) / 2.48)))
    const getMedialCurve = (u: number) => getMedialShift(u)
    const getMedialAtX = (x: number) => getMedialCurve(Math.max(0, Math.min(1, (x + 1.24) / 2.48)))

    // 1. ОРТОПЕДИЧЕСКАЯ СТЕЛЬКА (КРАЯ ПЛОТНО ЛЕЖАТ НА ПОДОШВЕ, А СВОД И КЛИН ОТФОРМОВАНЫ ПЛАВНЫМ РЕЛЬЕФОМ!)
    const segsX = 96
    const segsZ = 24
    const insoleGeom = new THREE.PlaneGeometry(2.48, baseSoleW, segsX, segsZ)
    insoleGeom.rotateX(-Math.PI / 2)

    const pos = insoleGeom.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const baseColor = new THREE.Color(isDark ? 0xd4c9bc : 0x332b26)
    const archColor = new THREE.Color(0x10b981)
    const wedgeColor = new THREE.Color(0x3186ff)
    const warnColor = new THREE.Color(0xd97706)
    const critColor = new THREE.Color(0xe11d48)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const zNorm = pos.getZ(i) / (baseSoleW * 0.5) // от -1 (наружный край) до +1 (внутренний край)
      const u = (x + 1.24) / 2.48

      const finalZ = zNorm * getHalfWidth(u) + getMedialCurve(u)
      pos.setZ(i, finalZ)

      const y = getSoleProfileY(u)
      // Мягкая привязка самого бортика стельки к подошве, чтобы край не задирался в воздух!
      const edgeTaper = Math.max(0, 1 - Math.pow(Math.abs(zNorm), 3.5))

      let orthoLift = 0
      let wedgeIntensity = 0
      let archIntensity = 0

      // Выкладка продольного свода (плавный купол с максимумом на zNorm ~ 0.65 и сведением в 0 на самом краю)
      if (u > 0.18 && u < 0.62 && zNorm > 0) {
        const archWave = Math.sin(((u - 0.18) / 0.44) * Math.PI)
        const medialDome = Math.sin(Math.min(1, zNorm) * (Math.PI * 0.82))
        const lift = archWave * medialDome * (eng.rx.archSupportHeightMm * mmToUnit * 0.72)
        orthoLift += lift
        archIntensity = archWave * medialDome
      }

      // Пяточный клин (плавный внутренний или наружный уклон ложа пятки без задирания кромки)
      if (u < 0.36) {
        const smoothFade = 0.5 * (1 + Math.cos((u / 0.36) * Math.PI))
        const rimFade = 0.25 + 0.75 * edgeTaper
        if (eng.rx.medialHeelWedgeMm > 0 && zNorm > -0.1) {
          const medFactor = Math.max(0, Math.min(1, (zNorm + 0.1) / 1.1))
          const lift = smoothFade * medFactor * rimFade * (eng.rx.medialHeelWedgeMm * mmToUnit * 0.75)
          orthoLift += lift
          wedgeIntensity = smoothFade * medFactor
        } else if (eng.rx.lateralWedgeMm > 0 && zNorm < 0.1) {
          const latFactor = Math.max(0, Math.min(1, (-zNorm + 0.1) / 1.1))
          const lift = smoothFade * latFactor * rimFade * (eng.rx.lateralWedgeMm * mmToUnit * 0.75)
          orthoLift += lift
          wedgeIntensity = smoothFade * latFactor
        }
      }

      pos.setY(i, y + orthoLift + 0.012)

      const distForefoot = Math.hypot(u - ballRatio, (finalZ - (pronationDeg < 0 ? 0.12 : -0.12)) * 0.8)
      const foreIntensity = Math.max(0, 1 - distForefoot * 3.4) * (eng.forefootLoad / 100)
      const vColor = baseColor.clone()

      if (wedgeIntensity > 0.15) vColor.lerp(wedgeColor, Math.min(0.8, wedgeIntensity * 1.1))
      if (archIntensity > 0.2) vColor.lerp(archColor, Math.min(0.85, archIntensity * 0.95))
      if (foreIntensity > 0.4) {
        vColor.lerp(
          eng.peakForefootPressureKpa >= 245 ? critColor : warnColor,
          Math.min(1, (foreIntensity - 0.35) * 1.8)
        )
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
        new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.12 })
      )
    )

    // 2. ПОДОШВА И КАБЛУК (ПЛОТНОЕ СОПРЯЖЕНИЕ БЕЗ ВОЗДУШНОЙ ЩЕЛИ)
    if (soleType === 'rocker') {
      const rockerWedgeGeom = createFullRockerWedgeGeometry({
        baseSoleW,
        ballRatio,
        activeRockerRad,
        getSoleProfileY,
        getHalfWidth,
        getMedialCurve,
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

      const carbonPts: THREE.Vector3[] = []
      for (let i = 0; i <= 28; i++) {
        const u = 0.08 + (i / 28) * 0.88
        carbonPts.push(
          new THREE.Vector3(-1.24 + u * 2.48, getSoleProfileY(u) - 0.004, getMedialCurve(u))
        )
      }
      dynamicGroup.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(carbonPts), 28, 0.016, 10, false),
          new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, metalness: 0.8 })
        )
      )
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
        sPos.setZ(i, zNorm * hw + getMedialCurve(u))
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
      const xFrontBase = -1.24 + 0.25 * 2.48
      const heelHScene = Math.max(0.04, h)
      const tipOffsetScene = heelTipOffsetMm * mmToUnit


      const isThomasMode = soleType === 'thomas'
      const activeThomasType = isThomasMode ? eng.rx.thomasHeelType : 'none'
      const thomasExtScene = isThomasMode
        ? Math.max(0.2, eng.rx.thomasExtensionMm * mmToUnit * 1.15)
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

      // Стальной геленок 65Г
      const shankPts: THREE.Vector3[] = []
      const shankEndRatio = Math.min(ballRatio - 0.02, 0.15 + eng.shankLength / eng.lastLengthMm)
      for (let i = 0; i <= 20; i++) {
        const u = 0.14 + (i / 20) * Math.max(0.1, shankEndRatio - 0.14)
        shankPts.push(
          new THREE.Vector3(-1.24 + u * 2.48, getSoleProfileY(u) + 0.022, getMedialCurve(u))
        )
      }
      const shankRadius = 0.015 + (eng.steelThickness - 1.2) * 0.012
      dynamicGroup.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shankPts), 24, shankRadius, 10, false),
          new THREE.MeshStandardMaterial({
            color: eng.heelOffsetTooFarBack || eng.shankOverloaded ? 0xe11d48 : 0xd97706,
            roughness: 0.22,
            metalness: 0.85,
          })
        )
      )
    }

    // 3. ОСЬ ЗАВАЛА ПЯТКИ (АХИЛЛОВО СУХОЖИЛИЕ)
    const xHeelCenter = -1.24 + 0.15 * 2.48
    const achillesPivot = new THREE.Group()
    achillesPivot.position.set(xHeelCenter, h + 0.025, 0)
    const residualRollDeg =
      soleType === 'thomas' ? pronationDeg * 0.45 : soleType === 'rocker' ? pronationDeg * 0.55 : pronationDeg
    achillesPivot.rotation.x = (residualRollDeg * Math.PI) / 180

    const achillesAxis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.46, 12),
      new THREE.MeshBasicMaterial({
        color: Math.abs(residualRollDeg) >= 5.5 ? 0xe11d48 : 0x10b981,
      })
    )
    achillesAxis.position.y = 0.23
    achillesPivot.add(achillesAxis)
    dynamicGroup.add(achillesPivot)

    // 4. ЗОНЫ ДАВЛЕНИЯ M1 / M5 / ПЯТКА, ПЕЛОТ ЗЕЙЦА И ВЕКТОР CoP
    const xM1 = -1.24 + (eng.apexM1_Mm / eng.lastLengthMm) * 2.48
    const xM5 = -1.24 + (eng.apexM5_Mm / eng.lastLengthMm) * 2.48

    padHeel.position.set(xHeelCenter, h + 0.024, 0)
    padM1.position.set(xM1, t + 0.024, 0.2)
    padM5.position.set(xM5, t + 0.024, -0.2)

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

    pelotteMesh.visible = eng.requiresMetatarsalPad
    if (pelotteMesh.visible && eng.metatarsalPadPosMm != null) {
      const xPelotte = -1.24 + (eng.metatarsalPadPosMm / eng.lastLengthMm) * 2.48
      pelotteMesh.position.set(xPelotte, t + 0.042, 0.02)
    }

    const copX = -1.24 + (eng.copLongitudinalMm / eng.lastLengthMm) * 2.48
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
    isDark,
  ])

  return (
    <div className="flex flex-col w-full select-none overflow-hidden">
      <div className="relative w-full h-[195px]">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Верхние плашки */}
        <div className="pointer-events-none absolute top-2 left-2.5 right-2.5 flex items-center justify-between gap-1 text-[8.5px] font-mono">
          <div className="px-2 py-1 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
            <span className="opacity-65">M1/M5: </span>
            <strong style={{ color: eng.loadM1Pct >= 45 ? '#E11D48' : '#10B981' }}>
              {eng.loadM1Pct}%
            </strong>
            <span className="opacity-40"> / </span>
            <strong style={{ color: eng.loadM5Pct >= 40 ? '#E11D48' : '#D97706' }}>
              {eng.loadM5Pct}%
            </strong>
            <span className="mx-1.5 opacity-30">|</span>
            <span className="opacity-65">ПИК: </span>
            <strong style={{ color: eng.peakForefootPressureKpa >= 245 ? '#E11D48' : 'inherit' }}>
              {eng.peakForefootPressureKpa} кПа
            </strong>
          </div>

          <div className="px-2 py-1 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
            {soleType === 'thomas' ? (
              <strong className="text-[#10B981]">
                ТОМАС +{eng.rx.thomasExtensionMm}мм ({eng.rx.thomasHeelType === 'medial' ? 'Внутр' : 'Наруж'})
              </strong>
            ) : soleType === 'rocker' ? (
              <strong className="text-[#10B981]">
                РОКЕР {rockerAngle}° (Карбон {eng.carbonInsertThicknessMm}мм)
              </strong>
            ) : (
              <strong className={eng.rx.recommendThomasHeel ? 'text-[#E11D48]' : ''}>
                КАБЛУК: СТАНДАРТ
              </strong>
            )}
          </div>
        </div>

        {/* Ракурсы камеры */}
        <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between">
          <span className="text-[8px] font-mono uppercase tracking-wider opacity-65 pointer-events-none">
            {eng.rx.widthCode}
          </span>
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'iso', label: '3/4' },
                { id: 'side', label: 'ПРОФИЛЬ' },
                { id: 'bottom', label: 'СВЕРХУ' },
                { id: 'rear', label: 'ПЯТКА' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCamPreset(preset.id)}
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

      {/* НАГЛЯДНАЯ ЦВЕТОВАЯ ЛЕГЕНДА */}
      <div className="px-3 py-1.5 flex items-center justify-between flex-wrap gap-x-2 gap-y-1 text-[8px] font-mono border-t border-[var(--color-border)] bg-[var(--color-surface)]/40">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
          M1/Свод/Томас
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#D97706] inline-block" />
          M5/Геленок 65Г
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3186FF] inline-block" />
          Клин пятки
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#E11D48] inline-block" />
          Пелот/Ось CoP
        </span>
      </div>
    </div>
  )
}
