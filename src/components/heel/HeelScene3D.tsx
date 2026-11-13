// src/components/heel/HeelScene3D.tsx
import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { HeelEngineering, SoleType, HeelType } from '../../lib/heelCalc'

type CameraPreset = 'iso' | 'side' | 'top' | 'rear'

type Props = {
  eng: HeelEngineering
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

  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    assembly: THREE.Group
    soleMesh: THREE.Mesh | null
    soleWire: THREE.LineSegments | null
    shankMesh: THREE.Mesh | null
    heelMesh: THREE.Mesh | null
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
    const height = container.clientHeight || 220

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

    const ambient = new THREE.AmbientLight(0xffffff, 0.78)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 0.95)
    keyLight.position.set(4, 7, 5)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x9dd2ff, 0.4)
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

    const padHeel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.03, 28),
      new THREE.MeshStandardMaterial({ color: 0xb46513, transparent: true, opacity: 0.72, roughness: 0.35 })
    )
    const padM1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.03, 28),
      new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.78, roughness: 0.35 })
    )
    const padM5 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.20, 0.03, 28),
      new THREE.MeshStandardMaterial({ color: 0xd97706, transparent: true, opacity: 0.78, roughness: 0.35 })
    )
    assembly.add(padHeel, padM1, padM5)

    const pelotteMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.85, roughness: 0.3 })
    )
    pelotteMesh.scale.set(1.2, 0.35, 0.9)
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

    const targetSpherical = { theta: 0.72, phi: 1.12, radius: 4.35, lookAtY: 0.42 }
    const currentSpherical = { ...targetSpherical }

    sceneRef.current = {
      scene,
      camera,
      renderer,
      assembly,
      soleMesh: null,
      soleWire: null,
      shankMesh: null,
      heelMesh: null,
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
      const h = mountRef.current.clientHeight || 220
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
      st.targetSpherical = { theta: 0.72, phi: 1.12, radius: 4.35, lookAtY: 0.42 }
    } else if (camPreset === 'side') {
      st.targetSpherical = { theta: 0.0, phi: 1.44, radius: 4.2, lookAtY: 0.42 }
    } else if (camPreset === 'top') {
      st.targetSpherical = { theta: 0.0, phi: 0.22, radius: 4.6, lookAtY: 0.25 }
    } else if (camPreset === 'rear') {
      st.targetSpherical = { theta: -Math.PI / 2, phi: 1.38, radius: 3.9, lookAtY: 0.4 }
    }
  }, [camPreset])

  useEffect(() => {
    const st = sceneRef.current
    if (!st) return

    const { assembly, padHeel, padM1, padM5, pelotteMesh, copRing, copStem, grid } = st

    const gridHex = isDark ? 0x48423c : 0xb8b0a4
    ;(grid.material as THREE.LineBasicMaterial).color.setHex(gridHex)

    if (st.soleMesh) {
      assembly.remove(st.soleMesh)
      st.soleMesh.geometry.dispose()
      ;(st.soleMesh.material as THREE.Material).dispose()
    }
    if (st.soleWire) {
      assembly.remove(st.soleWire)
      st.soleWire.geometry.dispose()
      ;(st.soleWire.material as THREE.Material).dispose()
    }
    if (st.shankMesh) {
      assembly.remove(st.shankMesh)
      st.shankMesh.geometry.dispose()
      ;(st.shankMesh.material as THREE.Material).dispose()
    }
    if (st.heelMesh) {
      assembly.remove(st.heelMesh)
      st.heelMesh.geometry.dispose()
      ;(st.heelMesh.material as THREE.Material).dispose()
    }

    const mmToUnit = 2.6 / Math.max(220, eng.lastLengthMm)
    const h = heelHeight * mmToUnit
    const t = toeThickness * mmToUnit
    const ballRatio = Math.max(0.52, Math.min(0.78, rockerStartPct / 100))
    const activeRockerRad = soleType === 'rocker' ? (rockerAngle * Math.PI) / 180 : 0

    const segsX = 40
    const segsZ = 16
    const soleGeom = new THREE.PlaneGeometry(2.6, 0.88, segsX, segsZ)
    soleGeom.rotateX(-Math.PI / 2)

    const pos = soleGeom.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const baseColor = new THREE.Color(isDark ? 0xd8cfc2 : 0x2c2520)
    const warnColor = new THREE.Color(0xd97706)
    const critColor = new THREE.Color(0xe11d48)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const u = (x + 1.3) / 2.6

      const widthFactor =
        u < 0.32
          ? 0.58 + 0.14 * Math.sin((u / 0.32) * Math.PI)
          : u < 0.72
          ? 0.54 + 0.48 * Math.sin(((u - 0.22) / 0.58) * Math.PI)
          : 0.98 * Math.cos(((u - 0.72) / 0.28) * (Math.PI * 0.44))

      const medialCurve = u > 0.25 && u < 0.8 ? 0.055 * Math.sin(((u - 0.25) / 0.55) * Math.PI) : 0
      const finalZ = z * Math.max(0.18, widthFactor) + medialCurve
      pos.setZ(i, finalZ)

      let y = 0
      if (u <= 0.17) {
        const cup = 0.012 * (1 - Math.cos((u / 0.17) * Math.PI))
        y = h - cup
      } else if (u <= ballRatio) {
        const s = (u - 0.17) / Math.max(0.05, ballRatio - 0.17)
        const ease = s * s * (3 - 2 * s)
        y = h * (1 - ease) + t * ease
      } else {
        const r = (u - ballRatio) / Math.max(0.05, 1 - ballRatio)
        const rockerLift =
          soleType === 'rocker'
            ? Math.sin(activeRockerRad) * 0.65 * r * r
            : 0.07 * r * r
        y = t + rockerLift
      }
      pos.setY(i, y)

      const distForefoot = Math.hypot(u - ballRatio, (finalZ - (pronationDeg < 0 ? 0.14 : -0.14)) * 0.8)
      const foreIntensity = Math.max(0, 1 - distForefoot * 3.2) * (eng.forefootLoad / 100)
      const vColor = baseColor.clone()
      if (foreIntensity > 0.42) {
        vColor.lerp(eng.forefootLoad >= 80 ? critColor : warnColor, Math.min(1, (foreIntensity - 0.35) * 1.8))
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
        opacity: 0.58,
        side: THREE.DoubleSide,
      })
    )
    assembly.add(soleMesh)
    st.soleMesh = soleMesh

    const wireColor = isDark ? 0xf4f0e8 : 0x1c1816
    const soleWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(soleGeom),
      new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.2 })
    )
    assembly.add(soleWire)
    st.soleWire = soleWire

    const shankPts: THREE.Vector3[] = []
    const shankEndRatio = Math.min(ballRatio - 0.02, 0.15 + eng.shankLength / eng.lastLengthMm)
    for (let i = 0; i <= 20; i++) {
      const u = 0.15 + (i / 20) * Math.max(0.1, shankEndRatio - 0.15)
      const x = -1.3 + u * 2.6
      const s = Math.max(0, Math.min(1, (u - 0.17) / Math.max(0.05, ballRatio - 0.17)))
      const ease = s * s * (3 - 2 * s)
      const y = h * (1 - ease) + t * ease + 0.018
      shankPts.push(new THREE.Vector3(x, y, 0))
    }
    const shankCurve = new THREE.CatmullRomCurve3(shankPts)
    const shankRadius = 0.016 + (eng.steelThickness - 1.2) * 0.012
    const shankGeom = new THREE.TubeGeometry(shankCurve, 24, shankRadius, 10, false)
    const shankMesh = new THREE.Mesh(
      shankGeom,
      new THREE.MeshStandardMaterial({
        color: eng.heelOffsetTooFarBack ? 0xe11d48 : 0xd97706,
        roughness: 0.25,
        metalness: 0.75,
      })
    )
    assembly.add(shankMesh)
    st.shankMesh = shankMesh

    const xHeelCenter = -1.3 + 0.15 * 2.6
    const tipOffsetScene = soleType === 'flat' ? heelTipOffsetMm * mmToUnit : 0
    const heelHScene = Math.max(0.04, h)
    const tipRadius = Math.max(0.035, (tipWidthMm * mmToUnit) / 2)

    let topR = 0.22
    let botR = tipRadius
    if (soleType === 'rocker') {
      topR = 0.29
      botR = 0.27
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
    assembly.add(heelMesh)
    st.heelMesh = heelMesh

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
    <div className="relative w-full h-[235px] select-none overflow-hidden">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="pointer-events-none absolute top-2.5 left-3 right-3 flex items-center justify-between text-[9px] font-mono tracking-wider">
        <div className="px-2.5 py-1 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <span className="opacity-60 mr-1.5">HEEL:</span>
          <strong className="font-serif text-[11px]">{eng.heelLoad}%</strong>
          <span className="mx-1.5 opacity-30">|</span>
          <span className="opacity-60 mr-1">M1:</span>
          <strong
            className="font-serif text-[11px]"
            style={{ color: eng.loadM1Pct >= 45 ? '#E11D48' : '#10B981' }}
          >
            {eng.loadM1Pct}%
          </strong>
          <span className="mx-1.5 opacity-30">|</span>
          <span className="opacity-60 mr-1">M5:</span>
          <strong
            className="font-serif text-[11px]"
            style={{ color: eng.loadM5Pct >= 40 ? '#E11D48' : '#D97706' }}
          >
            {eng.loadM5Pct}%
          </strong>
        </div>

        <div className="px-2 py-1 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
          <span className="opacity-60">CoP Z: </span>
          <strong className="font-serif text-[11px]">
            {eng.copLateralMm > 0 ? `+${eng.copLateralMm}` : eng.copLateralMm} mm
          </strong>
        </div>
      </div>

      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
        <span className="text-[7.5px] font-mono uppercase tracking-[0.2em] opacity-45 pointer-events-none">
          3D BIOMECHANICS // DRAG TO ORBIT
        </span>
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'iso', label: '3/4' },
              { id: 'side', label: 'ПРОФИЛЬ' },
              { id: 'top', label: 'СВЕРХУ' },
              { id: 'rear', label: 'ОСЬ Z' },
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
