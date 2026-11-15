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
 * Строит 2D-контур подошвы каблука (или Г-образного каблука Томаса) на кривых Безье
 * и выдавливает его в 3D, подрезая верхнюю грань точно под кривую свода стопы!
 */
function createBezierHeelGeometry(params: {
  xHeelBack: number
  xFrontBase: number
  thomasExtScene: number
  thomasType: 'none' | 'medial' | 'lateral'
  halfW: number
  heelHScene: number
  tipOffsetScene: number
  getArchYAtX: (x: number) => number
}): THREE.BufferGeometry {
  const {
    xHeelBack,
    xFrontBase,
    thomasExtScene,
    thomasType,
    halfW,
    heelHScene,
    tipOffsetScene,
    getArchYAtX,
  } = params

  const shape = new THREE.Shape()
  const rBack = halfW
  const xCenterBack = xHeelBack + rBack

  // Точки передней груди каблука: медиальная (+Z) и латеральная (-Z)
  const extMedial = thomasType === 'medial' ? thomasExtScene : 0
  const extLateral = thomasType === 'lateral' ? thomasExtScene : 0

  const xMedFront = xFrontBase + extMedial
  const xLatFront = xFrontBase + extLateral

  // Начинаем с задней центральной точки пятки и идем по латеральной дуге к груди каблука
  shape.moveTo(xHeelBack, 0)
  shape.bezierCurveTo(
    xHeelBack,
    -rBack * 0.65,
    xCenterBack - rBack * 0.45,
    -rBack,
    xCenterBack,
    -rBack
  )
  // Латеральный борт к латеральному углу груди каблука
  shape.lineTo(xLatFront, -rBack * 0.95)

  // S-образная кривая Безье передней груди каблука Томаса!
  // Если каблук Томаса медиальный — грудь плавно изгибается вперед к внутреннему своду (+Z)
  shape.bezierCurveTo(
    xLatFront + (xMedFront - xLatFront) * 0.15,
    -rBack * 0.25,
    xMedFront - (xMedFront - xLatFront) * 0.15,
    rBack * 0.25,
    xMedFront,
    rBack * 0.98
  )

  // Медиальный борт обратно к пятке
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
    steps: 10,
    depth: heelHScene,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
  }

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  // Поворачиваем так, чтобы ось выдавливания стала вертикальной осью Y, а контур лежал в плоскости XZ
  geom.rotateX(-Math.PI / 2)

  // Подгоняем верхнюю поверхность каблука точно под изгиб свода колодки и наклон задника
  const pos = geom.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i)
    const vy = pos.getY(i)
    const vz = pos.getZ(i)
    // Инвертируем Z после поворота X на -90°, чтобы +Z соответствовал медиальной стороне
    const zMedial = -vz
    const heightRatio = Math.max(0, Math.min(1, vy / Math.max(0.02, heelHScene)))
    const archTopY = Math.max(0.03, getArchYAtX(vx) - 0.012)

    // Нижняя площадка стоит ровно на полу (y = 0), а верхняя повторяет свод стопы
    const adjustedY = heightRatio * archTopY
    // Скос набойки у пола
    const bottomShift = (1 - heightRatio) * tipOffsetScene

    pos.setX(i, vx + bottomShift)
    pos.setY(i, adjustedY)
    pos.setZ(i, zMedial)
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
    const height = container.clientHeight || 215

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100)

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

    scene.add(new THREE.AmbientLight(0xffffff, 0.82))
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

    const assembly = new THREE.Group()
    scene.add(assembly)

    const dynamicGroup = new THREE.Group()
    assembly.add(dynamicGroup)

    const padHeel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.028, 32),
      new THREE.MeshStandardMaterial({ color: 0xb46513, transparent: true, opacity: 0.78, roughness: 0.35 })
    )
    const padM1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.028, 32),
      new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.82, roughness: 0.35 })
    )
    const padM5 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.028, 32),
      new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.82, roughness: 0.35 })
    )
    assembly.add(padHeel, padM1, padM5)

    const pelotteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.9, roughness: 0.3 })
    )
    pelotteMesh.scale.set(1.25, 0.36, 0.92)
    assembly.add(pelotteMesh)

    const copRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.016, 16, 36),
      new THREE.MeshBasicMaterial({ color: 0xe11d48 })
    )
    copRing.rotation.x = Math.PI / 2
    assembly.add(copRing)

    const copStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.78, 14),
      new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85 })
    )
    assembly.add(copStem)

    const targetSpherical = { theta: 0.68, phi: 1.02, radius: 4.1, lookAtY: 0.34 }
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
      const h = mountRef.current.clientHeight || 215
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

  // Ракурсы камеры (включая вид СНИЗУ на подошву и Г-образный каблук Томаса!)
  useEffect(() => {
    const st = sceneRef.current
    if (!st) return
    if (camPreset === 'iso') {
      st.targetSpherical = { theta: 0.68, phi: 1.02, radius: 4.1, lookAtY: 0.34 }
    } else if (camPreset === 'side') {
      st.targetSpherical = { theta: 0.0, phi: 1.46, radius: 3.9, lookAtY: 0.34 }
    } else if (camPreset === 'bottom') {
      // Вид со стороны подошвы / сверху-вниз на профиль каблука Томаса и стельки
      st.targetSpherical = { theta: 0.25, phi: 0.22, radius: 4.3, lookAtY: 0.2 }
    } else if (camPreset === 'rear') {
      st.targetSpherical = { theta: -Math.PI / 2, phi: 1.38, radius: 3.7, lookAtY: 0.34 }
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

    const mmToUnit = 2.48 / Math.max(220, eng.lastLengthMm)
    const h = heelHeight * mmToUnit
    const t = toeThickness * mmToUnit
    const ballRatio = Math.max(0.52, Math.min(0.78, rockerStartPct / 100))
    const activeRockerRad = soleType === 'rocker' ? (rockerAngle * Math.PI) / 180 : 0
    const baseSoleW = (gender === 'male' ? 0.94 : 0.82) + eng.rx.ballBuildUpMm * 0.01

    const getSoleProfileY = (u: number) => {
      const clampedU = Math.max(0, Math.min(1, u))
      if (clampedU <= 0.18) {
        const heelCup = 0.014 * (1 - Math.cos((clampedU / 0.18) * Math.PI))
        return h - heelCup
      }
      if (clampedU <= ballRatio) {
        const s = (clampedU - 0.18) / Math.max(0.05, ballRatio - 0.18)
        const smoothStep = s * s * (3 - 2 * s)
        return h * (1 - smoothStep) + t * smoothStep
      }
      const r = (clampedU - ballRatio) / Math.max(0.05, 1 - ballRatio)
      const rockerLift =
        soleType === 'rocker' ? Math.sin(activeRockerRad) * 0.62 * Math.pow(r, 1.7) : 0.055 * r * r
      return t + rockerLift
    }

    const getArchYAtX = (x: number) => {
      const u = (x + 1.24) / 2.48
      return getSoleProfileY(u)
    }

    const getHalfWidth = (u: number) => Math.max(0.05, baseSoleW * 0.5 * getAnatomicWidth(u))
    const getMedialCurve = (u: number) => getMedialShift(u)

    // 1. ОРТОПЕДИЧЕСКАЯ СТЕЛЬКА (С ВЫКЛАДКОЙ СВОДА И ПЯТОЧНЫМ КЛИНОМ)
    const segsX = 88
    const segsZ = 18
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
      const zNorm = pos.getZ(i) / (baseSoleW * 0.5)
      const u = (x + 1.24) / 2.48

      const finalZ = zNorm * getHalfWidth(u) + getMedialCurve(u)
      pos.setZ(i, finalZ)

      const y = getSoleProfileY(u)
      let orthoLift = 0
      let isWedge = false

      // Выкладка продольного свода (супинатор)
      if (u > 0.2 && u < 0.6 && zNorm > 0) {
        const archWave = Math.sin(((u - 0.2) / 0.4) * Math.PI)
        orthoLift += archWave * zNorm * (eng.rx.archSupportHeightMm * mmToUnit * 1.15)
      }
      // Медиальный или латеральный клин пятки
      if (u < 0.28) {
        if (eng.rx.medialHeelWedgeMm > 0 && zNorm > 0) {
          orthoLift += zNorm * (eng.rx.medialHeelWedgeMm * mmToUnit * 1.5)
          isWedge = true
        } else if (eng.rx.lateralWedgeMm > 0 && zNorm < 0) {
          orthoLift += -zNorm * (eng.rx.lateralWedgeMm * mmToUnit * 1.5)
          isWedge = true
        }
      }

      pos.setY(i, y + orthoLift + 0.012)

      const distForefoot = Math.hypot(u - ballRatio, (finalZ - (pronationDeg < 0 ? 0.12 : -0.12)) * 0.8)
      const foreIntensity = Math.max(0, 1 - distForefoot * 3.4) * (eng.forefootLoad / 100)
      const vColor = baseColor.clone()

      if (isWedge) vColor.lerp(wedgeColor, 0.65)
      if (orthoLift > 0.025) vColor.lerp(archColor, Math.min(0.85, orthoLift * 8))
      if (foreIntensity > 0.4) {
        vColor.lerp(
          eng.peakForefootPressureKpa >= 240 ? critColor : warnColor,
          Math.min(1, (foreIntensity - 0.35) * 1.8)
        )
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
        opacity: 0.88,
        side: THREE.DoubleSide,
      })
    )
    dynamicGroup.add(insoleMesh)

    const wireColor = isDark ? 0xf4f0e8 : 0x1c1816
    dynamicGroup.add(
      new THREE.LineSegments(
        new THREE.WireframeGeometry(insoleGeom),
        new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.14 })
      )
    )

    // 2. ОБЪЕМНАЯ ПОДОШВА ПОД СТЕЛЬКОЙ
    const outsoleGeom = new THREE.BoxGeometry(2.48, 0.032, baseSoleW * 1.06, 80, 1, 14)
    const sPos = outsoleGeom.attributes.position
    for (let i = 0; i < sPos.count; i++) {
      const x = sPos.getX(i)
      const z = sPos.getZ(i)
      const origY = sPos.getY(i)
      const u = (x + 1.24) / 2.48
      const hw = getHalfWidth(u)
      const zNorm = z / (baseSoleW * 0.53)
      sPos.setZ(i, zNorm * hw + getMedialCurve(u))
      sPos.setY(i, getSoleProfileY(u) - 0.012 + origY)
    }
    outsoleGeom.computeVertexNormals()
    dynamicGroup.add(
      new THREE.Mesh(
        outsoleGeom,
        new THREE.MeshStandardMaterial({
          color: isDark ? 0x26201a : 0xc4b5a0,
          roughness: 0.5,
          transparent: true,
          opacity: 0.72,
        })
      )
    )

    // 3. МОНОЛИТНЫЙ 3D-КАБЛУК И КАБЛУК ТОМАСА НА КРИВЫХ БЕЗЬЕ (THREE.Shape + ExtrudeGeometry)
    const xHeelBack = -1.24
    const heelHalfW = getHalfWidth(0.14) * 0.96
    const xFrontBase = -1.24 + 0.25 * 2.48
    const heelHScene = Math.max(0.04, h)
    const tipOffsetScene = soleType === 'flat' ? heelTipOffsetMm * mmToUnit : 0

    const activeThomasType =
      soleType === 'thomas'
        ? eng.rx.thomasHeelType === 'none'
          ? 'medial'
          : eng.rx.thomasHeelType
        : eng.rx.thomasHeelType

    const thomasExtScene =
      soleType === 'thomas' || eng.rx.recommendThomasHeel
        ? Math.max(0.18, eng.rx.thomasExtensionMm * mmToUnit * 1.15)
        : 0

    const bezierHeelGeom = createBezierHeelGeometry({
      xHeelBack,
      xFrontBase,
      thomasExtScene,
      thomasType: activeThomasType,
      halfW: heelHalfW,
      heelHScene,
      tipOffsetScene,
      getArchYAtX,
    })

    const isThomasActive = soleType === 'thomas' || thomasExtScene > 0
    const heelMat = new THREE.MeshStandardMaterial({
      color: isThomasActive ? 0x0d9488 : isDark ? 0xdfd7cb : 0x241e1a,
      roughness: 0.32,
      metalness: 0.2,
      transparent: true,
      opacity: 0.92,
    })
    const heelMesh = new THREE.Mesh(bezierHeelGeom, heelMat)
    dynamicGroup.add(heelMesh)

    // Контурная подсветка кривой Безье каблука Томаса на полу
    const heelEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(bezierHeelGeom, 25),
      new THREE.LineBasicMaterial({
        color: isThomasActive ? 0x10b981 : wireColor,
        transparent: true,
        opacity: 0.55,
      })
    )
    dynamicGroup.add(heelEdges)

    // 4. СТАЛЬНОЙ ГЕЛЕНОК (СУПИНАТОР 65Г) И АНТРОПОМЕТРИЧЕСКИЕ ДУГИ СТОПЫ (ВЗЪЕМ И ПУЧКИ)
    const shankPts: THREE.Vector3[] = []
    const shankEndRatio = Math.min(ballRatio - 0.02, 0.15 + eng.shankLength / eng.lastLengthMm)
    for (let i = 0; i <= 20; i++) {
      const u = 0.14 + (i / 20) * Math.max(0.1, shankEndRatio - 0.14)
      shankPts.push(new THREE.Vector3(-1.24 + u * 2.48, getSoleProfileY(u) + 0.024, getMedialCurve(u)))
    }
    const shankRadius = 0.015 + (eng.steelThickness - 1.2) * 0.012
    dynamicGroup.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shankPts), 24, shankRadius, 10, false),
        new THREE.MeshStandardMaterial({
          color: eng.heelOffsetTooFarBack ? 0xe11d48 : 0xd97706,
          roughness: 0.22,
          metalness: 0.85,
        })
      )
    )

    // Дуги обхватов стопы (Пучки O_п и Прямой взъем O_в)
    const createGirthArc = (uPos: number, heightAddMm: number, colorHex: number) => {
      const xArc = -1.24 + uPos * 2.48
      const yBase = getSoleProfileY(uPos) + 0.02
      const hw = getHalfWidth(uPos)
      const med = getMedialCurve(uPos)
      const hArc = (uPos < 0.56 ? 0.44 : 0.24) + Math.max(0, heightAddMm) * 0.012
      const pts: THREE.Vector3[] = []
      for (let k = 0; k <= 24; k++) {
        const ang = (k / 24) * Math.PI
        pts.push(
          new THREE.Vector3(
            xArc,
            yBase + Math.sin(ang) * hArc,
            med - Math.cos(ang) * hw
          )
        )
      }
      return new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.009, 8, false),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.55 })
      )
    }

    // Дуга пучков (O_п) и дуга прямого взъема (O_в)
    dynamicGroup.add(
      createGirthArc(ballRatio, eng.rx.ballBuildUpMm, eng.rx.ballBuildUpMm !== 0 ? 0xd97706 : wireColor)
    )
    dynamicGroup.add(
      createGirthArc(0.48, eng.rx.instepBuildUpMm, eng.rx.instepBuildUpMm > 0 ? 0x10b981 : wireColor)
    )

    // 5. ЗОНЫ ДАВЛЕНИЯ M1 / M5 / ПЯТКА, ПЕЛОТ ЗЕЙЦА И ВЕКТОР CoP
    const xHeelCenter = -1.24 + 0.15 * 2.48
    const xM1 = -1.24 + (eng.apexM1_Mm / eng.lastLengthMm) * 2.48
    const xM5 = -1.24 + (eng.apexM5_Mm / eng.lastLengthMm) * 2.48

    padHeel.position.set(xHeelCenter, h + 0.028, 0)
    padM1.position.set(xM1, t + 0.028, 0.2)
    padM5.position.set(xM5, t + 0.028, -0.2)

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
      pelotteMesh.position.set(xPelotte, t + 0.048, 0.02)
    }

    const rollRad = (pronationDeg * Math.PI) / 180
    assembly.rotation.x = rollRad

    const copX = -1.24 + (eng.copLongitudinalMm / eng.lastLengthMm) * 2.48
    const copZ = -(eng.copLateralMm * mmToUnit * 2.2)
    copRing.position.set(copX, 0.015, copZ)
    copStem.position.set(copX, 0.39, copZ)
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
    <div className="relative w-full h-[215px] select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Телеметрия в реальном времени поверх 3D */}
      <div className="pointer-events-none absolute top-2 left-2.5 right-2.5 flex items-center justify-between gap-1 text-[8.5px] font-mono">
        <div className="px-2 py-1 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
          <span className="opacity-60">M1/M5: </span>
          <strong style={{ color: eng.loadM1Pct >= 45 ? '#E11D48' : '#10B981' }}>
            {eng.loadM1Pct}%
          </strong>
          <span className="opacity-40"> / </span>
          <strong style={{ color: eng.loadM5Pct >= 40 ? '#E11D48' : '#D97706' }}>
            {eng.loadM5Pct}%
          </strong>
          <span className="mx-1.5 opacity-30">|</span>
          <span className="opacity-60">ПИК: </span>
          <strong style={{ color: eng.peakForefootPressureKpa >= 240 ? '#E11D48' : 'inherit' }}>
            {eng.peakForefootPressureKpa} кПа
          </strong>
        </div>

        <div className="px-2 py-1 rounded-[7px] border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
          <span className="opacity-60">ТОМАС: </span>
          <strong className="text-[#10B981]">
            {eng.rx.thomasHeelType === 'none'
              ? 'НЕТ'
              : `+${eng.rx.thomasExtensionMm}мм (${eng.rx.thomasHeelType === 'medial' ? 'Внутр' : 'Наруж'})`}
          </strong>
        </div>
      </div>

      {/* Кнопки ракурсов камеры */}
      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
        <span className="text-[7.5px] font-mono uppercase tracking-[0.15em] opacity-50 pointer-events-none">
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
                  : 'bg-[var(--color-surface)]/80 text-[var(--color-ink)] border-[var(--color-border)] opacity-70'
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
