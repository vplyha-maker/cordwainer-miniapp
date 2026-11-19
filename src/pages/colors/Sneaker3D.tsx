import React, { Component, useCallback, useEffect, useRef, useState } from 'react'
import type * as THREE_TYPES from 'three'
import type { SneakerColors, SneakerZoneKey } from './colorEngine'
import { RainbowTilesLoader } from './RainbowTilesLoader'
import {
  SNEAKER_LAST_PARAMS,
  bindGlbMaterialsPreservingTextures,
  buildSneakerMeshGroup,
  createSneakerMaterials,
  disposeObject3DResources,
  drawShadowGradient,
  ensureCleanGlbSegmentation,
  type SneakerMaterials,
  type ZoneMaterialRegistry,
} from './sneakerGeometry'

export type Sneaker3DProps = {
  sneakerColors: SneakerColors
  isDark: boolean
  onResetAll?: () => void
  resetLabel?: string
  loading3DLabel?: string
  webglFallbackLabel?: string
}

function triggerLightHaptic() {
  try {
    const w = window as unknown as {
      Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (style: string) => void } } }
    }
    w.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
  } catch {}
}

function SneakerFallbackCard({
  sneakerColors,
  isDark,
  label,
}: {
  sneakerColors: SneakerColors
  isDark: boolean
  label?: string
}) {
  const previewZones: string[] = [
    sneakerColors.vamp,
    sneakerColors.quarters,
    sneakerColors.swoosh,
    sneakerColors.outsole,
    sneakerColors.encap,
  ]

  return (
    <div
      className={
        'w-full h-full flex flex-col items-center justify-center border border-dashed rounded-sm px-4 text-center ' +
        (isDark ? 'border-white/15 text-[#F4F0E8]/70' : 'border-black/15 text-[#1C1816]/70')
      }
    >
      <div className="flex gap-2 mb-2.5">
        {previewZones.map((hex, idx) => (
          <span
            key={idx}
            className="w-5 h-5 rounded-full border border-current/20 shadow-sm"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <span className="text-[10px] font-sans uppercase tracking-[0.18em]">
        {label || 'WebGL недоступен • Режим палитры'}
      </span>
    </div>
  )
}

type ErrorBoundaryProps = {
  sneakerColors: SneakerColors
  isDark: boolean
  fallbackLabel?: string
  children: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

class SneakerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.error('[Sneaker3D] ErrorBoundary перехватил сбой 3D:', error)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative w-full h-[178px] sm:h-[218px] md:h-[270px] select-none">
          <SneakerFallbackCard
            sneakerColors={this.props.sneakerColors}
            isDark={this.props.isDark}
            label={this.props.fallbackLabel}
          />
        </div>
      )
    }
    return this.props.children
  }
}

function Sneaker3DCanvas({
  sneakerColors,
  isDark,
  onResetAll,
  resetLabel,
  loading3DLabel,
  webglFallbackLabel,
}: Sneaker3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const matsRef = useRef<SneakerMaterials | null>(null)
  const zoneRegistryRef = useRef<ZoneMaterialRegistry | null>(null)
  const shoeRootRef = useRef<THREE_TYPES.Group | null>(null)

  const latestColorsRef = useRef<SneakerColors>(sneakerColors)
  latestColorsRef.current = sneakerColors
  const latestIsDarkRef = useRef<boolean>(isDark)
  latestIsDarkRef.current = isDark

  const hemiLightRef = useRef<THREE_TYPES.HemisphereLight | null>(null)
  const shadowCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const shadowTexRef = useRef<THREE_TYPES.CanvasTexture | null>(null)

  const requestSingleRenderRef = useRef<(() => void) | null>(null)
  const wakeCameraAnimationRef = useRef<(() => void) | null>(null)

  const [isLoading3D, setIsLoading3D] = useState(true)
  const [webglError, setWebglError] = useState(false)
  const [contextLostCount, setContextLostCount] = useState(0)

  const rotTarget = useRef({ yaw: -0.26, pitch: 0.16 })
  const rotCurrent = useRef({ yaw: -0.26, pitch: 0.16 })
  const isInteracting = useRef(false)
  const lastActivityTime = useRef<number>(Date.now())
  const lastPointer = useRef({ x: 0, y: 0 })

  const applyColorsToRegistry = useCallback((colors: SneakerColors) => {
    const reg = zoneRegistryRef.current
    if (!reg) return
    ;(Object.keys(colors) as SneakerZoneKey[]).forEach((zone) => {
      const hex = colors[zone]
      reg[zone]?.forEach((mat) => {
        mat.color.set(hex)
      })
    })
    requestSingleRenderRef.current?.()
  }, [])

  useEffect(() => {
    let disposed = false
    let frameId = 0
    let isLoopRunning = false
    let isVisibleInViewport = true
    let isDocumentVisible = typeof document !== 'undefined' ? !document.hidden : true
    let cleanupFn: (() => void) | undefined

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    setIsLoading3D(true)
    setWebglError(false)

    Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js').catch(() => null),
    ])
      .then(([THREE, gltfMod]) => {
        if (disposed) return

        const container = mountRef.current
        if (!container) return

        const width = container.clientWidth || 340
        const height = container.clientHeight || 205

        let renderer: THREE_TYPES.WebGLRenderer
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          })
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('[Sneaker3D] Не удалось инициализировать WebGLRenderer:', err)
          }
          if (!disposed) {
            setWebglError(true)
            setIsLoading3D(false)
          }
          return
        }

        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.12
        container.innerHTML = ''
        container.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(29, width / height, 0.1, 50)
        camera.position.set(0, 0.44, 5.15)
        camera.lookAt(0, 0.04, 0)

        const currentDark = latestIsDarkRef.current
        const currentColors = latestColorsRef.current

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd8d0c5, currentDark ? 1.1 : 1.3)
        hemiLight.position.set(0, 6, 0)
        scene.add(hemiLight)
        hemiLightRef.current = hemiLight

        const keyLight = new THREE.DirectionalLight(0xfffdf8, 2.0)
        keyLight.position.set(3.6, 5.2, 4.4)
        scene.add(keyLight)

        const fillLight = new THREE.DirectionalLight(0xe2ecff, 1.0)
        fillLight.position.set(-4.2, 2.2, 2.8)
        scene.add(fillLight)

        const rimLight = new THREE.DirectionalLight(0xffffff, 1.2)
        rimLight.position.set(0, 3.8, -4.5)
        scene.add(rimLight)

        const { mats, registry } = createSneakerMaterials(THREE, currentColors)
        matsRef.current = mats
        zoneRegistryRef.current = registry
        const baseMaterialsSet = new Set<THREE_TYPES.Material>(Object.values(mats))

        const pivotGroup = new THREE.Group()
        scene.add(pivotGroup)
        shoeRootRef.current = pivotGroup

        const shadowCanvas = document.createElement('canvas')
        shadowCanvas.width = 256
        shadowCanvas.height = 128
        drawShadowGradient(shadowCanvas, currentDark)
        shadowCanvasRef.current = shadowCanvas

        const shadowTex = new THREE.CanvasTexture(shadowCanvas)
        shadowTexRef.current = shadowTex
        const shadowGeom = new THREE.PlaneGeometry(3.3, 1.35)
        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
        })
        const shadowPlane = new THREE.Mesh(shadowGeom, shadowMat)
        shadowPlane.rotation.x = -Math.PI / 2
        shadowPlane.position.y = -0.42
        scene.add(shadowPlane)

        const clock = new THREE.Clock()

        const renderSingleFrame = () => {
          if (disposed || !isVisibleInViewport || !isDocumentVisible) return
          if (!isLoopRunning) {
            renderer.render(scene, camera)
          }
        }
        requestSingleRenderRef.current = renderSingleFrame

        const animate = () => {
          if (disposed || !isVisibleInViewport || !isDocumentVisible) {
            isLoopRunning = false
            return
          }

          const idleMs = Date.now() - lastActivityTime.current
          if (!isInteracting.current && (prefersReducedMotion || idleMs >= 6000)) {
            rotCurrent.current.yaw = rotTarget.current.yaw
            rotCurrent.current.pitch = rotTarget.current.pitch
            if (shoeRootRef.current) {
              shoeRootRef.current.rotation.y = rotCurrent.current.yaw
              shoeRootRef.current.rotation.x = rotCurrent.current.pitch
              shoeRootRef.current.position.y = 0
            }
            isLoopRunning = false
            renderer.render(scene, camera)
            return
          }

          isLoopRunning = true
          frameId = requestAnimationFrame(animate)
          const elapsed = clock.getElapsedTime()

          const swayDamping = Math.max(0, Math.min(1, (5400 - idleMs) / 1200))

          if (!isInteracting.current && !prefersReducedMotion && swayDamping > 0) {
            rotTarget.current.yaw += Math.sin(elapsed * 0.65) * 0.0007 * swayDamping
          }

          rotCurrent.current.yaw += (rotTarget.current.yaw - rotCurrent.current.yaw) * 0.14
          rotCurrent.current.pitch += (rotTarget.current.pitch - rotCurrent.current.pitch) * 0.14

          if (shoeRootRef.current) {
            shoeRootRef.current.rotation.y = rotCurrent.current.yaw
            shoeRootRef.current.rotation.x = rotCurrent.current.pitch
            shoeRootRef.current.position.y = prefersReducedMotion
              ? 0
              : Math.sin(elapsed * 1.5) * 0.015 * swayDamping
          }

          renderer.render(scene, camera)
        }

        const wakeCameraLoop = () => {
          lastActivityTime.current = Date.now()
          if (prefersReducedMotion) {
            renderSingleFrame()
            return
          }
          if (!isLoopRunning && !disposed && isVisibleInViewport && isDocumentVisible) {
            clock.getDelta()
            animate()
          }
        }
        wakeCameraAnimationRef.current = wakeCameraLoop

        const mountProceduralFallback = () => {
          if (disposed || pivotGroup.children.length > 0) return
          const proceduralMesh = buildSneakerMeshGroup(THREE, mats)
          pivotGroup.add(proceduralMesh)
          applyColorsToRegistry(latestColorsRef.current)
          setIsLoading3D(false)
          wakeCameraLoop()
        }

        if (gltfMod?.GLTFLoader) {
          const loader = new gltfMod.GLTFLoader()
          const tryLoadGlb = (urls: string[], index = 0) => {
            if (disposed) return
            if (index >= urls.length) {
              mountProceduralFallback()
              return
            }

            loader.load(
              urls[index],
              (gltf) => {
                if (disposed) {
                  if (gltf?.scene) disposeObject3DResources(gltf.scene)
                  return
                }
                if (!gltf?.scene) {
                  tryLoadGlb(urls, index + 1)
                  return
                }

                const box = new THREE.Box3().setFromObject(gltf.scene)
                const size = new THREE.Vector3()
                box.getSize(size)
                const maxDim = Math.max(size.x, size.y, size.z)

                if (maxDim > 0 && maxDim < 10) {
                  disposeObject3DResources(pivotGroup, baseMaterialsSet)
                  pivotGroup.clear()

                  ensureCleanGlbSegmentation(THREE, gltf.scene)
                  bindGlbMaterialsPreservingTextures(
                    THREE,
                    gltf.scene,
                    mats,
                    registry,
                    latestColorsRef.current
                  )
                  const scale = SNEAKER_LAST_PARAMS.glbTargetMaxDim / maxDim
                  gltf.scene.scale.setScalar(scale)
                  gltf.scene.rotation.y = Math.PI * 0.5
                  gltf.scene.updateMatrixWorld(true)

                  const scaledBox = new THREE.Box3().setFromObject(gltf.scene)
                  const scaledCenter = new THREE.Vector3()
                  scaledBox.getCenter(scaledCenter)
                  gltf.scene.position.sub(scaledCenter)
                  gltf.scene.position.y += SNEAKER_LAST_PARAMS.glbVerticalOffset

                  const minY = scaledBox.min.y - scaledCenter.y + SNEAKER_LAST_PARAMS.glbVerticalOffset
                  shadowPlane.position.y = Math.min(-0.42, minY - 0.015)

                  pivotGroup.add(gltf.scene)
                  applyColorsToRegistry(latestColorsRef.current)
                  setIsLoading3D(false)
                  wakeCameraLoop()
                } else {
                  disposeObject3DResources(gltf.scene)
                  tryLoadGlb(urls, index + 1)
                }
              },
              undefined,
              () => tryLoadGlb(urls, index + 1)
            )
          }

          tryLoadGlb(['/sneaker_modular.glb', '/models/sneaker_modular.glb'])
        } else {
          mountProceduralFallback()
        }

        const updateViewportSize = () => {
          if (!container || disposed) return
          const w = container.clientWidth || 340
          const h = container.clientHeight || 205
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
          renderSingleFrame()
        }

        let resizeObserver: ResizeObserver | null = null
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(updateViewportSize)
          resizeObserver.observe(container)
        }
        window.addEventListener('resize', updateViewportSize)

        let intersectionObserver: IntersectionObserver | null = null
        if (typeof IntersectionObserver !== 'undefined') {
          intersectionObserver = new IntersectionObserver(
            (entries) => {
              const entry = entries[0]
              if (!entry) return
              isVisibleInViewport = entry.isIntersecting
              if (isVisibleInViewport) renderSingleFrame()
            },
            { threshold: 0.05 }
          )
          intersectionObserver.observe(container)
        }

        const onVisibilityChange = () => {
          isDocumentVisible = !document.hidden
          if (isDocumentVisible) renderSingleFrame()
        }
        document.addEventListener('visibilitychange', onVisibilityChange)

        const domCanvas = renderer.domElement
        const onContextLost = (e: Event) => {
          e.preventDefault()
          cancelAnimationFrame(frameId)
          isLoopRunning = false
        }
        const onContextRestored = () => {
          if (!disposed) {
            setContextLostCount((c) => c + 1)
          }
        }
        domCanvas.addEventListener('webglcontextlost', onContextLost, false)
        domCanvas.addEventListener('webglcontextrestored', onContextRestored, false)

        cleanupFn = () => {
          window.removeEventListener('resize', updateViewportSize)
          document.removeEventListener('visibilitychange', onVisibilityChange)
          resizeObserver?.disconnect()
          intersectionObserver?.disconnect()
          domCanvas.removeEventListener('webglcontextlost', onContextLost)
          domCanvas.removeEventListener('webglcontextrestored', onContextRestored)

          disposeObject3DResources(pivotGroup)
          shadowGeom.dispose()
          shadowMat.dispose()
          shadowTex.dispose()
          Object.values(mats).forEach((m) => m.dispose())
          renderer.dispose()

          matsRef.current = null
          zoneRegistryRef.current = null
          shoeRootRef.current = null
          hemiLightRef.current = null
          shadowCanvasRef.current = null
          shadowTexRef.current = null
          requestSingleRenderRef.current = null
          wakeCameraAnimationRef.current = null
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[Sneaker3D] Сбой загрузки 3D-модуля:', err)
        }
        if (!disposed) {
          setWebglError(true)
          setIsLoading3D(false)
        }
      })

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      if (cleanupFn) cleanupFn()
    }
  }, [contextLostCount, applyColorsToRegistry])

  useEffect(() => {
    applyColorsToRegistry(sneakerColors)
  }, [sneakerColors, applyColorsToRegistry])

  useEffect(() => {
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = isDark ? 1.1 : 1.3
    }
    if (shadowCanvasRef.current && shadowTexRef.current) {
      drawShadowGradient(shadowCanvasRef.current, isDark)
      shadowTexRef.current.needsUpdate = true
    }
    requestSingleRenderRef.current?.()
  }, [isDark])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isInteracting.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    wakeCameraAnimationRef.current?.()
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
    wakeCameraAnimationRef.current?.()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isInteracting.current = false
    wakeCameraAnimationRef.current?.()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleResetClick = () => {
    triggerLightHaptic()
    rotTarget.current = { yaw: -0.26, pitch: 0.16 }
    wakeCameraAnimationRef.current?.()
    onResetAll?.()
  }

  return (
    <div className="relative w-full h-[178px] sm:h-[218px] md:h-[270px] select-none">
      {webglError ? (
        <SneakerFallbackCard
          sneakerColors={sneakerColors}
          isDark={isDark}
          label={webglFallbackLabel}
        />
      ) : (
        <div
          ref={mountRef}
          role="img"
          aria-label="3D CORDWAINE AEROSTRAP"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          style={{ touchAction: 'none' }}
        />
      )}

      {isLoading3D && !webglError && (
        <RainbowTilesLoader isDark={isDark} label={loading3DLabel} />
      )}

      <button
        type="button"
        onClick={handleResetClick}
        className={
          'absolute bottom-1 right-2 px-3 py-1.5 min-h-[28px] text-[8.5px] font-sans uppercase tracking-[0.2em] border rounded-full backdrop-blur-sm transition-opacity opacity-80 hover:opacity-100 cursor-pointer bg-transparent ' +
          (isDark ? 'border-white/25 text-[#F4F0E8]' : 'border-black/25 text-[#1C1816]')
        }
      >
        {resetLabel || '360° • Сброс'}
      </button>
    </div>
  )
}

export function Sneaker3D(props: Sneaker3DProps) {
  return (
    <SneakerErrorBoundary
      sneakerColors={props.sneakerColors}
      isDark={props.isDark}
      fallbackLabel={props.webglFallbackLabel}
    >
      <Sneaker3DCanvas {...props} />
    </SneakerErrorBoundary>
  )
}
