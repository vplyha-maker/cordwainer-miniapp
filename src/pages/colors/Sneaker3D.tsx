import React, { Component, memo, useCallback, useEffect, useRef, useState } from 'react'
import type * as THREE_TYPES from 'three'
import type { SneakerColors, SneakerZoneKey } from './colorEngine'
import { hapticReset } from './haptics'
import { RainbowTilesLoader } from './RainbowTilesLoader'
import {
  SNEAKER_LAST_PARAMS,
  bindGlbMaterialsPreservingTextures,
  buildSneakerMeshGroup,
  createSneakerMaterials,
  disposeObject3DResources,
  drawShadowGradient,
  ensureCleanGlbSegmentation,
  getSneakerModelConfig,
  resetZoneRegistry,
  type SneakerMaterials,
  type SneakerModelId,
  type ZoneMaterialRegistry,
} from './sneakerGeometry'
import {
  getThemeTokens,
  resolveStudioStageStyle,
  type PerformanceMode,
} from './themeSystem'

export type Sneaker3DProps = {
  sneakerColors: SneakerColors
  isDark: boolean
  modelId?: SneakerModelId
  onResetAll?: () => void
  resetLabel?: string
  loading3DLabel?: string
  webglFallbackLabel?: string
  compact?: boolean
  studioBgHex?: string
  autoContrast?: boolean
  performanceMode?: PerformanceMode
}

function isAndroidDevice(): boolean {
  try {
    return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  } catch {
    return false
  }
}

function isLowMemoryDevice(): boolean {
  try {
    if (typeof navigator === 'undefined') return false
    const nav = navigator as Navigator & { deviceMemory?: number }
    const mem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8
    const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 8
    return mem <= 4 || cores <= 4
  } catch {
    return false
  }
}

function SneakerFallbackCard({
  sneakerColors,
  isDarkStage,
  label,
}: {
  sneakerColors: SneakerColors
  isDarkStage: boolean
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
        'w-full h-full flex flex-col items-center justify-center border border-dashed rounded-2xl px-4 text-center ' +
        (isDarkStage ? 'border-white/15 text-[#F4F0E8]/75' : 'border-black/15 text-[#1C1816]/75')
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
  isDarkStage: boolean
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
        <div className="relative w-full h-[196px] sm:h-[236px] select-none">
          <SneakerFallbackCard
            sneakerColors={this.props.sneakerColors}
            isDarkStage={this.props.isDarkStage}
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
  modelId = 'aerostrap',
  onResetAll,
  resetLabel,
  loading3DLabel,
  webglFallbackLabel,
  compact = false,
  studioBgHex,
  autoContrast = true,
  performanceMode = 'auto',
}: Sneaker3DProps) {
  const uiTokens = getThemeTokens(isDark)
  const effectiveStageHex = studioBgHex || uiTokens.pageBg
  const stageStyle = resolveStudioStageStyle(effectiveStageHex, autoContrast, uiTokens)

  const mountRef = useRef<HTMLDivElement>(null)
  const matsRef = useRef<SneakerMaterials | null>(null)
  const zoneRegistryRef = useRef<ZoneMaterialRegistry | null>(null)
  const shoeRootRef = useRef<THREE_TYPES.Group | null>(null)

  const latestColorsRef = useRef<SneakerColors>(sneakerColors)
  latestColorsRef.current = sneakerColors
  const latestIsDarkStageRef = useRef<boolean>(stageStyle.isDarkStage)
  latestIsDarkStageRef.current = stageStyle.isDarkStage
  const latestModelIdRef = useRef<SneakerModelId>(modelId)
  latestModelIdRef.current = modelId

  const shadowCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const shadowTexRef = useRef<THREE_TYPES.CanvasTexture | null>(null)

  const requestSingleRenderRef = useRef<(() => void) | null>(null)
  const wakeCameraAnimationRef = useRef<(() => void) | null>(null)
  const loadModelRef = useRef<((id: SneakerModelId) => void) | null>(null)

  const [isLoading3D, setIsLoading3D] = useState(true)
  const [webglError, setWebglError] = useState(false)
  const [contextLostCount, setContextLostCount] = useState(0)

  const rotTarget = useRef({ yaw: -0.26, pitch: 0.16 })
  const rotCurrent = useRef({ yaw: -0.26, pitch: 0.16 })
  const isInteracting = useRef(false)
  const lastActivityTime = useRef<number>(Date.now())
  const lastPointer = useRef({ x: 0, y: 0 })

  // Прямое обновление цвета материалов без пересборки сцены (0 draw-call overhead)
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
    let loadRequestCounter = 0
    let cleanupFn: (() => void) | undefined

    const isAndroid = isAndroidDevice()
    const isLowRam = isLowMemoryDevice()
    const useEcoProfile =
      performanceMode === 'eco' || (performanceMode === 'auto' && isAndroid && isLowRam)
    const useLowPowerLighting =
      useEcoProfile || (performanceMode === 'auto' && isAndroid)

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
            antialias: !useEcoProfile,
            alpha: true,
            powerPreference: useEcoProfile || isAndroid ? 'low-power' : 'high-performance',
            precision: useEcoProfile ? 'mediump' : 'highp',
            stencil: false,
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

        // Адаптивный DPR для плавности на Android и слабых GPU
        const maxDpr = useEcoProfile
          ? 1.0
          : performanceMode === 'high'
            ? isAndroid
              ? 1.5
              : 2.0
            : isAndroid
              ? 1.25
              : 2.0

        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr))
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.1
        container.innerHTML = ''
        container.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(29, width / height, 0.5, 20)
        camera.position.set(0, 0.44, 5.15)
        camera.lookAt(0, 0.04, 0)

        const currentColors = latestColorsRef.current

        // Нейтральный студийный свет: НЕ зависит от темы интерфейса (белая подошва всегда белая)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd8d3cc, 1.28)
        hemiLight.position.set(0, 6, 0)
        scene.add(hemiLight)

        const keyLight = new THREE.DirectionalLight(0xfffdf8, useLowPowerLighting ? 2.15 : 1.95)
        keyLight.position.set(3.4, 5.2, 4.4)
        scene.add(keyLight)

        if (!useLowPowerLighting) {
          const fillLight = new THREE.DirectionalLight(0xe4eeff, 0.95)
          fillLight.position.set(-4.2, 2.2, 2.8)
          scene.add(fillLight)

          const rimLight = new THREE.DirectionalLight(0xffffff, 1.15)
          rimLight.position.set(0, 3.8, -4.5)
          scene.add(rimLight)
        } else {
          // Один мягкий контровой источник вместо двух — сохраняет читаемость белого на белом фоне при -35% нагрузки GPU
          const rimLight = new THREE.DirectionalLight(0xedf2ff, 0.95)
          rimLight.position.set(-2.4, 3.2, -3.6)
          scene.add(rimLight)
        }

        const { mats, registry } = createSneakerMaterials(THREE, currentColors)
        matsRef.current = mats
        zoneRegistryRef.current = registry
        const baseMaterialsSet = new Set<THREE_TYPES.Material>(Object.values(mats))

        const pivotGroup = new THREE.Group()
        scene.add(pivotGroup)
        shoeRootRef.current = pivotGroup

        const shadowCanvas = document.createElement('canvas')
        shadowCanvas.width = useEcoProfile ? 128 : 256
        shadowCanvas.height = useEcoProfile ? 64 : 128
        drawShadowGradient(shadowCanvas, latestIsDarkStageRef.current)
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
            if (shoeRootRef.current) {
              shoeRootRef.current.rotation.y = rotCurrent.current.yaw
              shoeRootRef.current.rotation.x = rotCurrent.current.pitch
            }
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
          const dYaw = rotTarget.current.yaw - rotCurrent.current.yaw
          const dPitch = rotTarget.current.pitch - rotCurrent.current.pitch
          const isSettled = Math.abs(dYaw) < 0.0015 && Math.abs(dPitch) < 0.0015

          // На Android останавливаем цикл сразу после затухания инерции, чтобы не нагружать GPU в простое
          const shouldStop =
            !isInteracting.current &&
            (prefersReducedMotion ||
              ((isAndroid || useEcoProfile) && (isSettled || idleMs >= 1200)) ||
              idleMs >= 4500)

          if (shouldStop) {
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

          const swayDamping =
            isAndroid || useEcoProfile
              ? 0
              : Math.max(0, Math.min(1, (4000 - idleMs) / 1200))

          if (!isInteracting.current && !prefersReducedMotion && swayDamping > 0) {
            rotTarget.current.yaw += Math.sin(elapsed * 0.65) * 0.0007 * swayDamping
          }

          const lerpFactor = isAndroid || useEcoProfile ? 0.28 : 0.15
          rotCurrent.current.yaw += (rotTarget.current.yaw - rotCurrent.current.yaw) * lerpFactor
          rotCurrent.current.pitch += (rotTarget.current.pitch - rotCurrent.current.pitch) * lerpFactor

          if (shoeRootRef.current) {
            shoeRootRef.current.rotation.y = rotCurrent.current.yaw
            shoeRootRef.current.rotation.x = rotCurrent.current.pitch
            shoeRootRef.current.position.y =
              prefersReducedMotion || isAndroid || useEcoProfile
                ? 0
                : Math.sin(elapsed * 1.5) * 0.014 * swayDamping
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
          if (disposed) return
          disposeObject3DResources(pivotGroup, baseMaterialsSet)
          pivotGroup.clear()
          resetZoneRegistry(mats, registry)
          const proceduralMesh = buildSneakerMeshGroup(THREE, mats)
          pivotGroup.add(proceduralMesh)
          shadowPlane.position.y = -0.42
          applyColorsToRegistry(latestColorsRef.current)
          setIsLoading3D(false)
          wakeCameraLoop()
        }

        const loader = gltfMod?.GLTFLoader ? new gltfMod.GLTFLoader() : null

        const loadModelById = (targetId: SneakerModelId) => {
          if (disposed) return
          loadRequestCounter += 1
          const myRequestId = loadRequestCounter
          const modelCfg = getSneakerModelConfig(targetId)

          setIsLoading3D(true)

          if (!loader) {
            mountProceduralFallback()
            return
          }

          const tryLoadGlb = (urls: string[], index = 0) => {
            if (disposed || myRequestId !== loadRequestCounter) return
            if (index >= urls.length) {
              mountProceduralFallback()
              return
            }

            loader.load(
              urls[index],
              (gltf) => {
                if (disposed || myRequestId !== loadRequestCounter) {
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

                if (maxDim > 0 && Number.isFinite(maxDim)) {
                  disposeObject3DResources(pivotGroup, baseMaterialsSet)
                  pivotGroup.clear()
                  resetZoneRegistry(mats, registry)

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
                  gltf.scene.rotation.y = modelCfg.rotationY
                  gltf.scene.updateMatrixWorld(true)

                  const scaledBox = new THREE.Box3().setFromObject(gltf.scene)
                  const scaledCenter = new THREE.Vector3()
                  scaledBox.getCenter(scaledCenter)
                  gltf.scene.position.sub(scaledCenter)
                  gltf.scene.position.y += SNEAKER_LAST_PARAMS.glbVerticalOffset

                  const minY =
                    scaledBox.min.y - scaledCenter.y + SNEAKER_LAST_PARAMS.glbVerticalOffset
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

          tryLoadGlb(modelCfg.urls)
        }

        loadModelRef.current = loadModelById
        loadModelById(latestModelIdRef.current)

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
              if (!isVisibleInViewport && isLoopRunning) {
                cancelAnimationFrame(frameId)
                isLoopRunning = false
              } else if (isVisibleInViewport) {
                renderSingleFrame()
              }
            },
            { threshold: 0.05 }
          )
          intersectionObserver.observe(container)
        }

        const onVisibilityChange = () => {
          isDocumentVisible = !document.hidden
          if (!isDocumentVisible && isLoopRunning) {
            cancelAnimationFrame(frameId)
            isLoopRunning = false
          } else if (isDocumentVisible) {
            renderSingleFrame()
          }
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
          shadowCanvasRef.current = null
          shadowTexRef.current = null
          requestSingleRenderRef.current = null
          wakeCameraAnimationRef.current = null
          loadModelRef.current = null
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
  }, [contextLostCount, performanceMode, applyColorsToRegistry])

  useEffect(() => {
    loadModelRef.current?.(modelId)
  }, [modelId])

  useEffect(() => {
    applyColorsToRegistry(sneakerColors)
  }, [sneakerColors, applyColorsToRegistry])

  // Тень под обувью адаптируется только к яркости фона студии (не к цветам материалов)
  useEffect(() => {
    if (shadowCanvasRef.current && shadowTexRef.current) {
      drawShadowGradient(shadowCanvasRef.current, stageStyle.isDarkStage)
      shadowTexRef.current.needsUpdate = true
    }
    requestSingleRenderRef.current?.()
  }, [stageStyle.isDarkStage])

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
    hapticReset()
    rotTarget.current = { yaw: -0.26, pitch: 0.16 }
    wakeCameraAnimationRef.current?.()
    onResetAll?.()
  }

  const activeModel = getSneakerModelConfig(modelId)

  return (
    <div
      className="w-full select-none rounded-[22px] px-3 pt-1 pb-2.5 border transition-colors duration-200"
      style={{
        backgroundColor: stageStyle.bgHex,
        borderColor: uiTokens.border,
      }}
    >
      <div
        className={
          'relative w-full transition-[height] duration-200 ' +
          (compact
            ? 'h-[168px] sm:h-[202px]'
            : 'h-[196px] sm:h-[234px] md:h-[268px]')
        }
      >
        {webglError ? (
          <SneakerFallbackCard
            sneakerColors={sneakerColors}
            isDarkStage={stageStyle.isDarkStage}
            label={webglFallbackLabel}
          />
        ) : (
          <div
            ref={mountRef}
            role="img"
            aria-label={'3D ' + activeModel.name}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
            style={{ touchAction: 'none' }}
          />
        )}

        {isLoading3D && !webglError && (
          <RainbowTilesLoader
            isDark={stageStyle.isDarkStage}
            label={loading3DLabel || '3D • ' + activeModel.name + '...'}
          />
        )}
      </div>

      {/* Редакционная строка модели + кнопка 360° с авто-контрастом под фон студии */}
      <div className="flex items-center gap-3 mt-0.5 px-0.5">
        <span
          className="text-[11px] font-sans font-medium uppercase tracking-[0.2em] shrink-0 transition-colors"
          style={{ color: stageStyle.labelColor }}
        >
          {activeModel.shortLabel}
        </span>

        <span
          className="h-px flex-1 transition-colors"
          style={{ backgroundColor: stageStyle.dividerColor }}
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={handleResetClick}
          title={resetLabel || '360°'}
          className="flex items-center gap-1.5 px-3.5 h-8 rounded-full border text-[12px] font-sans font-medium tracking-[0.04em] transition-transform duration-150 active:scale-[0.95] cursor-pointer shrink-0"
          style={{
            backgroundColor: stageStyle.btnBg,
            borderColor: stageStyle.btnBorder,
            color: stageStyle.btnText,
          }}
        >
          <span>360°</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 11-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export const Sneaker3D = memo(function Sneaker3D(props: Sneaker3DProps) {
  const uiTokens = getThemeTokens(props.isDark)
  const stageStyle = resolveStudioStageStyle(
    props.studioBgHex || uiTokens.pageBg,
    props.autoContrast ?? true,
    uiTokens
  )
  return (
    <SneakerErrorBoundary
      sneakerColors={props.sneakerColors}
      isDarkStage={stageStyle.isDarkStage}
      fallbackLabel={props.webglFallbackLabel}
    >
      <Sneaker3DCanvas {...props} />
    </SneakerErrorBoundary>
  )
})
