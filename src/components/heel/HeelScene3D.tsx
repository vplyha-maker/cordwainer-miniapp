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
 * Анатомическая колодка (Last Geometry)
 * Асимметричные сплайны колодки с медиальным сдвигом и правильным объёмом пучков.
 * ────────────────────────────────────────────────────────────────────────── */
type Pts = ReadonlyArray<readonly [number, number]>

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
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

// Продольный анатомический профиль ширины колодки (u: 0 = пятка, 1 = носок)
const LAST_WIDTH_PTS: Pts = [
  [0.0, 0.58],
  [0.08, 0.62],
  [0.2, 0.56],
  [0.32, 0.52],
  [0.46, 0.68],
  [0.58, 0.94],
  [0.68, 1.0], // Пучки (Ball) - максимальная ширина
  [0.78, 0.88],
  [0.88, 0.60],
  [0.96, 0.35],
  [1.0, 0.12],
]

// Профиль высоты гребня колодки
const LAST_HEIGHT_PTS: Pts = [
  [0.0, 0.35],
  [0.05, 0.52],
  [0.12, 0.65],
  [0.25, 0.68], // Подъем (Instep)
  [0.42, 0.55],
  [0.58, 0.44],
  [0.72, 0.32],
  [0.88, 0.18],
  [1.0, 0.06],
]

const getAnatomicWidth = (u: number) => hermiteProfile(LAST_WIDTH_PTS, u)
const getAnatomicHeight = (u: number) => hermiteProfile(LAST_HEIGHT_PTS, u)

// Медиальный изгиб колодки (асимметрия стопы: внутренний свод шире, наружный круче)
const getMedialShift = (u: number) => {
  if (u > 0.15 && u < 0.85) {
    return 0.055 * Math.sin(((u - 0.15) / 0.7) * Math.PI)
  }
  return 0
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.3)
    keyLight.position.set(5, 8, 5.5)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.6)
    fillLight.position.set(-5, 4, -4)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5)
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

  useEffect(() => {
    const st = sceneRef.current
    if (!st) return
    if (viewLevel === 'biomechanics') {
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

    const getHalfWidth = (u: number) => Math.max(0.05, baseSoleW * 0.5 * getAnatomicWidth(u))
    const getMedialCurve = (u: number) => getMedialShift(u)

    // 1. ПОДОШВА
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

    // 2. СТЕЛЬКА
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
      pos.setY(i, y + orthoLift + 0.012)

      const distForefoot = Math.hypot(u - ballRatio, (finalZ - (pronationDeg < 0 ? 0.12 : -0.12)) * 0.8)
      const foreIntensity = Math.max(0, 1 - distForefoot * 3.4) * (eng.forefootLoad / 100)
      const vColor = baseColor.clone()

      if (viewLevel === 'biomechanics' || viewLevel === 'engineering') {
        if (orthoLift > 0.03) vColor.lerp(archColor, Math.min(0.85, orthoLift * 8))
        if (foreIntensity > 0.4) vColor.lerp(eng.forefootLoad >= 78 ? critColor : warnColor, Math.min(1, (foreIntensity - 0.35) * 1.8))
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

    // 3. НЕЗАВИСИМЫЕ ДЕТЕРИ ВЕРХА (Без эффекта трубы!)
    if (viewLevel !== 'biomechanics') {
      const isEng = viewLevel === 'engineering'
      const leatherColor = new THREE.Color(gender === 'male' ? (isDark ? 0x4a3222 : 0x362214) : isDark ? 0xbaab96 : 0x2b2320)
      const liningColor = leatherColor.clone().multiplyScalar(0.55)

      // Функция построения анатомической детали верха по диапазону [uStart, uEnd] с уникальной высотой и сужением
      const buildUpperPiece = (uStart: number, uEnd: number, steps: number, heightMult: number, flare: number) => {
        const P: number[] = []
        const C: number[] = []
        const I: number[] = []
        const nv = 36

        for (let i = 0; i <= steps; i++) {
          const u = uStart + ((uEnd - uStart) * i) / steps
          const x = -1.24 + u * 2.48
          const ySole = getSoleProfileY(u) + 0.018
          const hw = getHalfWidth(u) * 0.96
          const med = getMedialCurve(u)
          const hTop = getAnatomicHeight(u) * heightMult

          for (let j = 0; j <= nv; j++) {
            const angle = (j / nv) * Math.PI // полуцилиндр от латеральной до медиальной стороны
            const sa = Math.sin(angle)
            const ca = -Math.cos(angle)

            // Анатомическое сечение: плоское дно, крутые бока и сужение к щиколотке
            const px = x
            const py = ySole + hTop * Math.pow(sa, 0.75)
            const pz = med + ca * hw * (1 - flare * (1 - sa))

            P.push(px, py, pz)
            const ao = 0.75 + 0.25 * sa
            C.push(leatherColor.r * ao, leatherColor.g * ao, leatherColor.b * ao)
          }
        }

        for (let i = 0; i < steps; i++) {
          for (let j = 0; j < nv; j++) {
            const a = i * (nv + 1) + j
            const b = a + (nv + 1)
            I.push(a, b, a + 1, b, b + 1, a + 1)
          }
        }

        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
        g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3))
        g.computeVertexNormals()
        return g
      }

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.44,
        metalness: 0.05,
        transparent: isEng,
        opacity: isEng ? 0.35 : 1.0,
        side: THREE.DoubleSide,
      })

      // Отдельная деталь А: Задник и берцы (Quarters) [0.0 - 0.38]
      dynamicGroup.add(new THREE.Mesh(buildUpperPiece(0.0, 0.38, 36, 1.15, 0.25), mat))

      // Отдельная деталь Б: Союзка (Vamp) [0.42 - 0.92] с пониженным профилем носка
      dynamicGroup.add(new THREE.Mesh(buildUpperPiece(0.42, 0.92, 48, 0.75, 0.4), mat))

      // Отдельная деталь В: Мягкий язычок (Tongue) под вырезом
      {
        const tg = new THREE.PlaneGeometry(0.55, 0.45, 16, 12)
        tg.rotateY(Math.PI / 2)
        const tp = tg.attributes.position
        for (let i = 0; i < tp.count; i++) {
          const z = tp.getZ(i)
          const y = tp.getY(i)
          tp.setX(i, -0.25 + (y + 0.225) * 0.8)
          tp.setY(i, 0.38 + z * 0.4)
        }
        tg.computeVertexNormals()
        dynamicGroup.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: liningColor, roughness: 0.5 }))
      }

      // Канты и ранты для подчеркивания конструктива
      const weltGeom = new THREE.BoxGeometry(2.48, 0.012, baseSoleW * 1.02)
      weltGeom.translate(0, 0.022, 0)
      dynamicGroup.add(new THREE.Mesh(weltGeom, new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.5 })))
    }

    // 4. СТАЛЬНОЙ ГЕЛЕНОК
    if (viewLevel !== 'design') {
      const shankPts: THREE.Vector3[] = []
      const shankEndRatio = Math.min(ballRatio - 0.02, 0.15 + eng.shankLength / eng.lastLengthMm)
      for (let i = 0; i <= 20; i++) {
        const u = 0.14 + (i / 20) * Math.max(0.1, shankEndRatio - 0.14)
        shankPts.push(new THREE.Vector3(-1.24 + u * 2.48, getSoleProfileY(u) + 0.024, getMedialCurve(u)))
      }
      const shankMesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shankPts), 24, 0.018, 10, false),
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

    let topR = soleType === 'rocker' ? 0.28 : 0.22
    let botR = tipRadius

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
      const thomasMesh = new THREE.Mesh(
        new THREE.BoxGeometry(extLen + 0.12, heelHScene * 0.95, 0.2),
        new THREE.MeshStandardMaterial({
          color: soleType === 'thomas' ? 0x10b981 : 0xd97706,
          transparent: true,
          opacity: soleType === 'thomas' ? 0.92 : 0.45,
          roughness: 0.35,
        })
      )
      thomasMesh.position.set(xHeelCenter + topR * 0.6 + extLen / 2, heelHScene * 0.48, isLateral ? -0.1 : 0.1)
      dynamicGroup.add(thomasMesh)
    }

    // 6. БИОМЕХАНИЧЕСКИЕ ИНДИКАТОРЫ
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
    }

    pelotteMesh.visible = eng.requiresMetatarsalPad && (viewLevel === 'biomechanics' || viewLevel === 'engineering')
    if (pelotteMesh.visible && eng.metatarsalPadPosMm != null) {
      const xPelotte = -1.24 + (eng.metatarsalPadPosMm / eng.lastLengthMm) * 2.48
      pelotteMesh.position.set(xPelotte, t + 0.052, 0.02)
    }

    assembly.rotation.x = (pronationDeg * Math.PI) / 180

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

      {/* Верхняя панель переключения режимов */}
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
