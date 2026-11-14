// src/components/heel/HeelScene3D.tsx
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { HeelEngineering, SoleType, HeelType, Gender } from '../../lib/heelCalc'

type CameraPreset = 'iso' | 'side' | 'top' | 'rear'
type LayerMode = 'shoe' | 'xray' | 'insole'

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
  const [layerMode, setLayerMode] = useState<LayerMode>('xray')

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
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)

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
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.05)
    keyLight.position.set(4, 7, 5)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x9dd2ff, 0.45)
    rimLight.position.set(-4, 3, -4)
    scene.add(rimLight)

    const gridColor = isDark ? 0x3a3632 : 0xc8c2b8
    const grid = new THREE.GridHelper(4.2, 12, gridColor, gridColor)
    const gridMat = grid.material as THREE.Material
    gridMat.opacity = 0.22
    gridMat.transparent = true
    scene.add(grid)

    const assembly = new THREE.Group()
    scene.add(assembly)

    const dynamicGroup = new THREE.Group()
    assembly.add(dynamicGroup)

    const padHeel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.03, 28),
      new THREE.MeshStandardMaterial({ color: 0xb46513, transparent: true, opacity: 0.75, roughness: 0.35 })
    )
    const padM1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.03, 28),
      new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.8, roughness: 0.35 })
    )
    const padM5 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.20, 0.03, 28),
      new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.8, roughness: 0.35 })
    )
    assembly.add(padHeel, padM1, padM5)

    const pelotteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.88, roughness: 0.3 })
    )
    pelotteMesh.scale.set(1.2, 0.38, 0.9)
    assembly.add(pelotteMesh)

    const copRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.018, 16, 36),
      new THREE.MeshBasicMaterial({ color: 0xe11d48 })
    )
    copRing.rotation.x = Math.PI / 2
    copRing.position.y = 0.015
    scene.add(copRing)

    const copStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.85, 14),
      new THREE.MeshBasicMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85 })
    )
    scene.add(copStem)

    const targetSpherical = { theta: 0.72, phi: 1.12, radius: 4.35, lookAtY: 0.46 }
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
        0.18,
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
        2.6,
        Math.min(6.4, sceneRef.current.targetSpherical.radius + e.deltaY * 0.0025)
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
        radius * Math.cos(phi) + lookAtY * 0.3,
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
      st.targetSpherical = { theta: 0.72, phi: 1.12, radius: 4.35, lookAtY: 0.46 }
    } else if (camPreset === 'side') {
      st.targetSpherical = { theta: 0.0, phi: 1.44, radius: 4.2, lookAtY: 0.46 }
    } else if (camPreset === 'top') {
      st.targetSpherical = { theta: 0.0, phi: 0.22, radius: 4.6, lookAtY: 0.25 }
    } else if (camPreset === 'rear') {
      st.targetSpherical = { theta: -Math.PI / 2, phi: 1.38, radius: 3.9, lookAtY: 0.4 }
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

    const mmToUnit = 2.6 / Math.max(220, eng.lastLengthMm)
    const h = heelHeight * mmToUnit
    const t = toeThickness * mmToUnit
    const ballRatio = Math.max(0.52, Math.min(0.78, rockerStartPct / 100))
    const activeRockerRad = soleType === 'rocker' ? (rockerAngle * Math.PI) / 180 : 0
    const baseSoleW = (gender === 'male' ? 0.96 : 0.86) + eng.rx.ballBuildUpMm * 0.012
    const isPump = gender === 'female' && heelHeight >= 50 && soleType === 'flat'

    const getFootProfile = (u: number) => {
      if (u <= 0.17) {
        const cup = 0.012 * (1 - Math.cos((u / 0.17) * Math.PI))
        return h - cup
      }
      if (u <= ballRatio) {
        const s = (u - 0.17) / Math.max(0.05, ballRatio - 0.17)
        const ease = s * s * (3 - 2 * s)
        return h * (1 - ease) + t * ease
      }
      const r = (u - ballRatio) / Math.max(0.05, 1 - ballRatio)
      const rockerLift =
        soleType === 'rocker' ? Math.sin(activeRockerRad) * 0.65 * r * r : 0.07 * r * r
      return t + rockerLift
    }

    const getHalfWidth = (u: number) => {
      const factor =
        u < 0.32
          ? 0.58 + 0.14 * Math.sin((u / 0.32) * Math.PI)
          : u < 0.72
          ? 0.54 + 0.48 * Math.sin(((u - 0.22) / 0.58) * Math.PI)
          : 0.98 * Math.cos(((u - 0.72) / 0.28) * (Math.PI * 0.44))
      return Math.max(0.1, baseSoleW * 0.5 * factor)
    }

    const getMedialCurve = (u: number) =>
      u > 0.25 && u < 0.8 ? 0.055 * Math.sin(((u - 0.25) / 0.55) * Math.PI) : 0

    // 1. ОРТОПЕДИЧЕСКАЯ СТЕЛЬКА С ТЕПЛОВОЙ КАРТОЙ И КЛИНОМ
    const segsX = 40
    const segsZ = 16
    const soleGeom = new THREE.PlaneGeometry(2.6, baseSoleW, segsX, segsZ)
    soleGeom.rotateX(-Math.PI / 2)

    const pos = soleGeom.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const baseColor = new THREE.Color(isDark ? 0xd8cfc2 : 0x2c2520)
    const archColor = new THREE.Color(0x10b981)
    const warnColor = new THREE.Color(0xd97706)
    const critColor = new THREE.Color(0xe11d48)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const zNorm = pos.getZ(i) / (baseSoleW * 0.5)
      const u = (x + 1.3) / 2.6

      const finalZ = zNorm * getHalfWidth(u) + getMedialCurve(u)
      pos.setZ(i, finalZ)

      let y = getFootProfile(u)

      let orthoLift = 0
      if (u > 0.2 && u < 0.58 && zNorm > 0) {
        const archWave = Math.sin(((u - 0.2) / 0.38) * Math.PI)
        orthoLift += archWave * zNorm * (eng.rx.archSupportHeightMm * mmToUnit * 1.1)
      }
      if (u < 0.28) {
        if (eng.rx.medialHeelWedgeMm > 0 && zNorm > 0) {
          orthoLift += zNorm * (eng.rx.medialHeelWedgeMm * mmToUnit * 1.4)
        } else if (eng.rx.lateralWedgeMm > 0 && zNorm < 0) {
          orthoLift += -zNorm * (eng.rx.lateralWedgeMm * mmToUnit * 1.4)
        }
      }

      pos.setY(i, y + orthoLift)

      const distForefoot = Math.hypot(u - ballRatio, (finalZ - (pronationDeg < 0 ? 0.14 : -0.14)) * 0.8)
      const foreIntensity = Math.max(0, 1 - distForefoot * 3.2) * (eng.forefootLoad / 100)
      const vColor = baseColor.clone()
      if (orthoLift > 0.03) {
        vColor.lerp(archColor, Math.min(0.85, orthoLift * 8))
      }
      if (foreIntensity > 0.42) {
        vColor.lerp(eng.forefootLoad >= 78 ? critColor : warnColor, Math.min(1, (foreIntensity - 0.35) * 1.8))
      }
      colors[i * 3] = vColor.r
      colors[i * 3 + 1] = vColor.g
      colors[i * 3 + 2] = vColor.b
    }

    soleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    soleGeom.computeVertexNormals()

    const soleMesh = new THREE.Mesh(
      soleGeom,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.42,
        metalness: 0.12,
        transparent: true,
        opacity: layerMode === 'shoe' ? 0.9 : 0.72,
        side: THREE.DoubleSide,
      })
    )
    dynamicGroup.add(soleMesh)

    // 2. ОБЪЕМНЫЙ 3D-ВЕРХ ГОТОВОГО ИЗДЕЛИЯ (КОЖАНЫЙ ВЕРХ / РЕНТГЕН КОЛОДКИ)
    if (layerMode !== 'insole') {
      const upperGeom = new THREE.BufferGeometry()
      const uSegs = 44
      const vSegs = 24
      const verts: number[] = []
      const uColors: number[] = []
      const indices: number[] = []

      const leatherColor = new THREE.Color(
        gender === 'male' ? (isDark ? 0x523422 : 0x3b2316) : isDark ? 0xc8b59e : 0x261f1d
      )
      const buildUpHighlight = new THREE.Color(0x3186ff)
      const instepAdd = Math.max(0, eng.rx.instepBuildUpMm)

      for (let iu = 0; iu <= uSegs; iu++) {
        const u = iu / uSegs
        const x = -1.3 + u * 2.6
        const ySole = getFootProfile(u)
        const hw = getHalfWidth(u)
        const mShift = getMedialCurve(u)

        let hTop = 0.38
        if (u < 0.24) {
          hTop = (isPump ? 0.48 : 0.62) - (u / 0.24) * 0.06
        } else if (u < 0.56) {
          const tInstep = (u - 0.24) / 0.32
          if (isPump) {
            hTop = 0.15 * (1 - Math.sin(tInstep * Math.PI * 0.85)) + 0.08
          } else {
            hTop = 0.56 * (1 - tInstep * 0.48) + instepAdd * 0.012 * Math.sin(tInstep * Math.PI)
          }
        } else {
          const tToe = (u - 0.56) / 0.44
          const baseToeH = isPump ? 0.19 : 0.28
          hTop =
            baseToeH * Math.pow(Math.max(0, 1 - tToe * 0.96), 0.58) +
            Math.max(0, eng.rx.ballBuildUpMm) * 0.005 * (1 - tToe)
        }

        const isCollarZone = isPump ? u > 0.06 && u < 0.6 : u > 0.06 && u < 0.34

        for (let iv = 0; iv <= vSegs; iv++) {
          const v = iv / vSegs
          const angle = v * Math.PI
          let zLocal = -Math.cos(angle) * hw
          let yLocal = Math.sin(angle) * hTop

          if (isCollarZone && Math.sin(angle) > 0.72) {
            yLocal = hTop * 0.72
            zLocal *= 0.82
          }

          verts.push(x, ySole + yLocal, zLocal + mShift)

          const isBuildUpArea =
            u > 0.32 && u < 0.68 && Math.sin(angle) > 0.45 && (instepAdd > 0 || eng.rx.ballBuildUpMm > 0)
          const c = leatherColor.clone()
          if (layerMode === 'xray' && isBuildUpArea) {
            c.lerp(buildUpHighlight, 0.75)
          }
          uColors.push(c.r, c.g, c.b)
        }
      }

      for (let iu = 0; iu < uSegs; iu++) {
        for (let iv = 0; iv < vSegs; iv++) {
          const a = iu * (vSegs + 1) + iv
          const b = (iu + 1) * (vSegs + 1) + iv
          const c = (iu + 1) * (vSegs + 1) + (iv + 1)
          const d = iu * (vSegs + 1) + (iv + 1)
          indices.push(a, b, d, b, c, d)
        }
      }

      upperGeom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
      upperGeom.setAttribute('color', new THREE.Float32BufferAttribute(uColors, 3))
      upperGeom.setIndex(indices)
      upperGeom.computeVertexNormals()

      const upperMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: isPump ? 0.25 : 0.36,
        metalness: 0.16,
        transparent: layerMode === 'xray',
        opacity: layerMode === 'xray' ? 0.32 : 0.96,
        side: THREE.DoubleSide,
      })
      dynamicGroup.add(new THREE.Mesh(upperGeom, upperMat))

      if (layerMode === 'xray') {
        const wireColor = isDark ? 0xf4f0e8 : 0x1c1816
        dynamicGroup.add(
          new THREE.LineSegments(
            new THREE.WireframeGeometry(upperGeom),
            new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.15 })
          )
        )
      }
    }

    // 3. Стальной геленок (супинатор 65Г)
    const shankPts: THREE.Vector3[] = []
    const shankEndRatio = Math.min(ballRatio - 0.02, 0.15 + eng.shankLength / eng.lastLengthMm)
    for (let i = 0; i <= 20; i++) {
      const u = 0.15 + (i / 20) * Math.max(0.1, shankEndRatio - 0.15)
      shankPts.push(new THREE.Vector3(-1.3 + u * 2.6, getFootProfile(u) + 0.015, getMedialCurve(u)))
    }
    const shankRadius = 0.016 + (eng.steelThickness - 1.2) * 0.012
    const shankMesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shankPts), 24, shankRadius, 10, false),
      new THREE.MeshStandardMaterial({
        color: eng.heelOffsetTooFarBack ? 0xe11d48 : 0xd97706,
        roughness: 0.25,
        metalness: 0.75,
      })
    )
    dynamicGroup.add(shankMesh)

    // 4. Каблук и Г-образный выступ Томаса
    const xHeelCenter = -1.3 + 0.15 * 2.6
    const tipOffsetScene = soleType === 'flat' ? heelTipOffsetMm * mmToUnit : 0
    const heelHScene = Math.max(0.04, h)
    const tipRadius = Math.max(0.035, (tipWidthMm * mmToUnit) / 2)

    let topR = 0.22
    let botR = tipRadius
    if (soleType === 'rocker') {
      topR = 0.29
      botR = 0.27
    } else if (soleType === 'thomas') {
      topR = 0.25
      botR = 0.25
    } else if (heelType === 'stiletto') {
      topR = Math.max(0.16, tipRadius * 1.7)
    } else if (heelType === 'kitten') {
      topR = Math.max(0.19, tipRadius * 1.45)
    } else if (heelType === 'flared') {
      topR = Math.max(0.13, tipRadius * 0.68)
      botR = Math.max(0.18, tipRadius * 1.15)
    } else {
      topR = Math.max(0.24, tipRadius)
      botR = Math.max(0.22, tipRadius * 0.95)
    }

    const heelGeom = new THREE.CylinderGeometry(topR, botR, heelHScene, 28, 8)
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
      const extLen = Math.max(0.16, eng.rx.thomasExtensionMm * mmToUnit)
      const isLateral = eng.rx.thomasHeelType === 'lateral'
      const zSide = isLateral ? -0.11 : 0.11
      const thomasMesh = new THREE.Mesh(
        new THREE.BoxGeometry(extLen + 0.14, heelHScene * 0.96, 0.22),
        new THREE.MeshStandardMaterial({
          color: soleType === 'thomas' ? 0x10b981 : 0xd97706,
          transparent: true,
          opacity: soleType === 'thomas' ? 0.92 : 0.45,
          roughness: 0.35,
        })
      )
      thomasMesh.position.set(xHeelCenter + topR * 0.65 + extLen / 2, heelHScene * 0.48, zSide)
      dynamicGroup.add(thomasMesh)
    }

    // 5. Индикаторы давления и Пелот Зейца
    const xM1 = -1.3 + ((eng.apexM1_Mm ?? eng.lastLengthMm * 0.6) / eng.lastLengthMm) * 2.6
    const xM5 = -1.3 + ((eng.apexM5_Mm ?? eng.lastLengthMm * 0.56) / eng.lastLengthMm) * 2.6

    padHeel.position.set(xHeelCenter, h + 0.022, 0)
    padM1.position.set(xM1, t + 0.022, 0.21)
    padM5.position.set(xM5, t + 0.022, -0.21)

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
    if (eng.requiresMetatarsalPad && eng.metatarsalPadPosMm != null) {
      const xPelotte = -1.3 + (eng.metatarsalPadPosMm / eng.lastLengthMm) * 2.6
      pelotteMesh.position.set(xPelotte, t + 0.045, 0.02)
    }

    const rollRad = (pronationDeg * Math.PI) / 180
    assembly.rotation.x = rollRad

    const copX = -1.3 + (eng.copLongitudinalMm / eng.lastLengthMm) * 2.6
    const copZ = -(eng.copLateralMm * mmToUnit * 2.2)
    copRing.position.set(copX, 0.015, copZ)
    copStem.position.set(copX, 0.42, copZ)
    copStem.rotation.x = rollRad
  }, [
    eng,
    gender,
    layerMode,
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

      {/* Верхняя панель: телеметрия + переключатель слоев (Готовая обувь / Рентген / Стелька) */}
      <div className=" absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2 text-[9px] font-mono tracking-wider">
        <div className="pointer-events-none px-2.5 py-1 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <span className="opacity-60 mr-1">M1:</span>
          <strong
            className="font-serif text-[11px]"
            style={{ color: eng.loadM1Pct >= 45 ? '#E11D48' : '#10B981' }}
          >
            {eng.loadM1Pct}%
          </strong>
          <span className="mx-1 opacity-30">|</span>
          <span className="opacity-60 mr-1">M5:</span>
          <strong
            className="font-serif text-[11px]"
            style={{ color: eng.loadM5Pct >= 40 ? '#E11D48' : '#D97706' }}
          >
            {eng.loadM5Pct}%
          </strong>
        </div>

        {/* Переключатель слоев 3D-изделия */}
        <div className="flex items-center gap-1 rounded-[8px] p-0.5 border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-sm">
          {(
            [
              { id: 'shoe', label: 'ОБУВЬ' },
              { id: 'xray', label: 'РЕНТГЕН' },
              { id: 'insole', label: 'СТЕЛЬКА' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setLayerMode(m.id)}
              className={`px-2 py-0.5 rounded-[6px] text-[7.5px] font-mono uppercase tracking-wider transition-all cursor-pointer border-none ${
                layerMode === m.id
                  ? 'bg-[var(--color-ink)] text-[var(--color-bg)] font-semibold'
                  : 'bg-transparent text-[var(--color-ink)] opacity-60 hover:opacity-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Нижняя панель ракурсов камеры */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
        <span className="text-[7.5px] font-mono uppercase tracking-[0.2em] opacity-45 pointer-events-none">
          {eng.rx.widthCode.split(' ')[0]} // DRAG TO ORBIT
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
