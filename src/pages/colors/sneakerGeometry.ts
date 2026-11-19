import type * as THREE_TYPES from 'three'
import type { SneakerColors, SneakerZoneKey } from './colorEngine'

export type ThreeLib = typeof THREE_TYPES

export type SneakerMaterials = {
  vamp: THREE_TYPES.MeshStandardMaterial
  quarters: THREE_TYPES.MeshStandardMaterial
  tongue: THREE_TYPES.MeshStandardMaterial
  lining: THREE_TYPES.MeshStandardMaterial
  toeBox: THREE_TYPES.MeshStandardMaterial
  heel: THREE_TYPES.MeshStandardMaterial
  collar: THREE_TYPES.MeshStandardMaterial
  midsole: THREE_TYPES.MeshStandardMaterial
  encap: THREE_TYPES.MeshStandardMaterial
  outsole: THREE_TYPES.MeshStandardMaterial
  laces: THREE_TYPES.MeshStandardMaterial
  eyestays: THREE_TYPES.MeshStandardMaterial
  swoosh: THREE_TYPES.MeshStandardMaterial
}

export type ZoneMaterialRegistry = Record<SneakerZoneKey, THREE_TYPES.MeshStandardMaterial[]>

/**
 * Централизованные параметры колодки и подошвы для тонкой настройки под разные модели.
 */
export const SNEAKER_LAST_PARAMS = {
  halfLengthZ: 1.34,
  footprintEps2: 0.045,
  soleFlatStartT: 0.12,
  soleFlatEndT: 0.62,
  toeSpringHeight: 0.11,
  heelBevelHeight: 0.012,
  heelLift: 0.06,
  yTopBaseOffset: -0.14,
  yMidBotOffset: -0.268,
  yOutBotOffset: -0.32,
  layerTierStep: 0.0095,
  glbTargetMaxDim: 2.68,
  glbVerticalOffset: 0.04,
} as const

const GLB_EXPLICIT_ZONE_MAP: Record<string, SneakerZoneKey> = {
  // 16-материальная / 21-мешевая студийная модель CORDWAINE AEROSTRAP
  sock_upper_0: 'vamp',
  sock_sock_upper_0: 'vamp',
  upper: 'vamp',
  sock_001_material_018_0: 'toeBox',
  sock_001: 'toeBox',
  sock_006_material_018_0: 'quarters',
  sock_006: 'quarters',
  sock_007_material_015_0: 'heel',
  material_015: 'heel',
  sole_004_material_006_0: 'heel',
  sole_004: 'heel',
  sock_007_material_003_0: 'collar',
  material_003: 'collar',
  sock_008_material_021_0: 'collar',
  sock_008: 'collar',
  material_021: 'collar',
  sock_005_material_016_0: 'collar',
  sock_005: 'collar',
  material_016: 'collar',
  sole_005_material_020_0: 'eyestays',
  material_020: 'eyestays',
  sole_005_material_005_0: 'laces',
  material_005: 'laces',
  cube_002_material_024_0: 'laces',
  cube_002: 'laces',
  material_024: 'laces',
  sock_002_material_025_0: 'swoosh',
  sock_002: 'swoosh',
  material_025: 'swoosh',
  sole_006_material_008_0: 'swoosh',
  sole_006: 'swoosh',
  cube_material_008_0: 'tongue',
  plane_001_material_008_0: 'tongue',
  plane_001: 'tongue',
  plane_002__0: 'tongue',
  plane_002: 'tongue',
  sock_003_material_017_0: 'lining',
  sock_003: 'lining',
  material_017: 'lining',
  bubble_material_006_0: 'encap',
  bubble: 'encap',
  sole_cushy_0: 'midsole',
  cushy: 'midsole',
  sole_001_material_007_0: 'outsole',
  sole_001: 'outsole',
  material_007: 'outsole',

  // Классические ключи универсальных моделей
  upper_vamp: 'vamp',
  vamp: 'vamp',
  mudguard: 'vamp',
  toe_mesh: 'toeBox',
  toe_box: 'toeBox',
  toebox: 'toeBox',
  quarter_left: 'quarters',
  quarter_right: 'quarters',
  quarters: 'quarters',
  saddle: 'quarters',
  eyestay: 'eyestays',
  eyestays: 'eyestays',
  eye_stay: 'eyestays',
  heel_counter: 'heel',
  heelcounter: 'heel',
  heel_wrap: 'heel',
  heel_lining: 'lining',
  collar_lining: 'lining',
  collar: 'collar',
  ankle_collar: 'collar',
  tongue: 'tongue',
  tongue_mesh: 'tongue',
  lining: 'lining',
  sockliner: 'lining',
  insole: 'lining',
  lace_set: 'laces',
  laces: 'laces',
  n_logo: 'swoosh',
  logo_n: 'swoosh',
  swoosh: 'swoosh',
  heel_tab: 'swoosh',
  backtab: 'swoosh',
  encap: 'encap',
  encap_rim: 'encap',
  heel_clip: 'encap',
  midsole: 'midsole',
  mid_sole: 'midsole',
  eva_midsole: 'midsole',
  outsole: 'outsole',
  out_sole: 'outsole',
  rubber_outsole: 'outsole',
}

/**
 * Распознаёт конструктивную зону меша GLB по имени узла, родительского узла и материала.
 */
export function resolveGlbZone(rawName: string): SneakerZoneKey | null {
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/[\s.-]+/g, '_')
    .replace(/(sock|sole|material|cube|plane)(\d+)/g, '$1_$2')
  if (!normalized) return null

  }

  if (normalized.includes('sock_upper')) return 'vamp'
  if (normalized.includes('sock_001')) return 'toeBox'
  if (normalized.includes('sock_006')) return 'quarters'
  if (normalized.includes('sock_007_material_015') || normalized.includes('material_015')) return 'heel'
  if (
    normalized.includes('sock_007_material_003') ||
    normalized.includes('sock_008') ||
    normalized.includes('sock_005')
  ) {
    return 'collar'
  }
  if (normalized.includes('sole_005_material_020') || normalized.includes('material_020')) {
    return 'eyestays'
  }
  if (
    normalized.includes('sole_005_material_005') ||
    normalized.includes('cube_002') ||
    normalized.includes('material_024')
  ) {
    return 'laces'
  }
  if (
    normalized.includes('sock_002') ||
    normalized.includes('sole_006') ||
    normalized.includes('material_025')
  ) {
    return 'swoosh'
  }
  if (normalized.includes('sole_004')) return 'heel'
  if (
    normalized.includes('plane_001') ||
    normalized.includes('plane_002') ||
    normalized.includes('cube_material_008')
  ) {
    return 'tongue'
  }
  if (normalized.includes('sock_003') || normalized.includes('material_017')) return 'lining'
  if (normalized.includes('bubble')) return 'encap'
  if (normalized.includes('sole_cushy') || normalized.includes('cushy')) return 'midsole'
  if (normalized.includes('sole_001') || normalized.includes('material_007')) return 'outsole'

  if (
    normalized.includes('lining') ||
    normalized.includes('insole') ||
    normalized.includes('sockliner')
  ) {
    return 'lining'
  }
  if (
    normalized.includes('heel_tab') ||
    normalized.includes('backtab') ||
    normalized.includes('swoosh') ||
    normalized.includes('logo') ||
    normalized.includes('tab')
  ) {
    return 'swoosh'
  }
  if (normalized.includes('encap') || normalized.includes('clip')) return 'encap'
  if (
    normalized.includes('midsole') ||
    normalized.includes('mid_sole') ||
    normalized.includes('eva')
  ) {
    return 'midsole'
  }
  if (
    normalized.includes('outsole') ||
    normalized.includes('out_sole') ||
    normalized.includes('tread')
  ) {
    return 'outsole'
  }
  if (normalized.includes('eyestay') || normalized.includes('eye_stay') || normalized.includes('strap')) {
    return 'eyestays'
  }
  if (normalized.includes('toe')) return 'toeBox'
  if (normalized.includes('vamp') || normalized.includes('mudguard')) return 'vamp'
  if (normalized.includes('quarter') || normalized.includes('saddle')) return 'quarters'
  if (normalized.includes('collar')) return 'collar'
  if (normalized.includes('tongue')) return 'tongue'
  if (normalized.includes('lace')) return 'laces'
  if (normalized.includes('heel')) return 'heel'
  if (normalized.includes('sole')) return 'outsole'
  return null
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 + 1e-9)))
  return t * t * (3 - 2 * t)
}

function wrapAnglePi(phi: number): number {
  return Math.atan2(Math.sin(phi), Math.cos(phi))
}

/**
 * C^1-гладкая параметризация контура следа без бесконечной производной в полюсах (AUDIT-07).
 */
export function getFootprintPoint(rawPhi: number) {
  const phi = wrapAnglePi(rawPhi)
  const zNorm = Math.cos(phi)
  const z = SNEAKER_LAST_PARAMS.halfLengthZ * zNorm
  const t = 0.5 * (zNorm + 1.0)

  const s = Math.sin(phi)
  const eps2 = SNEAKER_LAST_PARAMS.footprintEps2
  const roundEnv = (s / Math.pow(s * s + eps2, 0.16)) * Math.pow(1 + eps2, 0.16)

  const wBase =
    0.405 -
    0.045 * Math.exp(-Math.pow((t - 0.36) / 0.15, 2)) +
    0.115 * Math.exp(-Math.pow((t - 0.66) / 0.21, 2)) -
    0.025 * Math.exp(-Math.pow((t - 0.96) / 0.07, 2))

  const latWeight = 0.5 * (1 + s / Math.sqrt(s * s + 0.02))
  const asymPos =
    -0.035 * Math.exp(-Math.pow((t - 0.38) / 0.14, 2)) +
    0.018 * Math.exp(-Math.pow((t - 0.70) / 0.16, 2))
  const asymNeg = 0.028 * Math.exp(-Math.pow((t - 0.58) / 0.20, 2))
  const asym = latWeight * asymPos + (1 - latWeight) * asymNeg

  const centerX =
    0.025 * Math.exp(-Math.pow((t - 0.70) / 0.25, 2)) -
    0.014 * Math.exp(-Math.pow((t - 0.36) / 0.18, 2))

  const x = centerX + roundEnv * (wBase + asym)
  return { x, z, t }
}

/**
 * C^1-гладкое замыкание верхнего канта горловины на центральном шве пятки (AUDIT-07).
 */
export function getToplineRim(rawPhi: number) {
  const phi = wrapAnglePi(rawPhi)
  const s = Math.sin(phi)
  const a = Math.acos(Math.max(-1, Math.min(1, Math.cos(phi))))

  const u1 = Math.max(0, Math.min(1, a / 0.35))
  const ue = Math.max(0, Math.min(1, (a - 0.35) / (1.48 - 0.35)))
  const uc = Math.max(0, Math.min(1, (a - 1.48) / (Math.PI - 1.48)))

  const zSeg1 = 0.44 - 0.03 * (u1 * u1)
  const zSeg2 = 0.41 - 0.63 * ue
  const zSeg3 = -0.22 - 0.98 * Math.sin(uc * (Math.PI * 0.5))

  const w12 = smoothstep(0.28, 0.42, a)
  const w23 = smoothstep(1.40, 1.56, a)
  const zRim = (1 - w12) * zSeg1 + w12 * ((1 - w23) * zSeg2 + w23 * zSeg3)

  const xSeg1 = 0.13 * Math.sin(u1 * (Math.PI * 0.5))
  const xSeg2 = 0.13 + 0.05 * ue
  const cosUc = Math.cos(uc * (Math.PI * 0.5))
  const smoothTapering = (cosUc / Math.pow(cosUc * cosUc + 0.04, 0.15)) * Math.pow(1.04, 0.15)
  const xSeg3 = (0.18 + 0.12 * Math.sin(uc * Math.PI)) * smoothTapering

  const xAbs = (1 - w12) * xSeg1 + w12 * ((1 - w23) * xSeg2 + w23 * xSeg3)
  const signSmooth = s / Math.sqrt(s * s + 1e-5)
  const xRim = signSmooth * xAbs

  const ySeg1 = 0.22
  const ySeg2 = 0.22 + 0.44 * Math.pow(ue + 1e-4, 0.92)
  const ySeg3 = 0.66 * (1 - uc) + 0.62 * uc - 0.21 * Math.pow(Math.sin(uc * Math.PI) + 1e-4, 1.15)
  const yRim = (1 - w12) * ySeg1 + w12 * ((1 - w23) * ySeg2 + w23 * ySeg3)

  return { x: xRim, y: yRim, z: zRim }
}

/**
 * Продольный профиль подошвы с горизонтальной опорной плоскостью на t in [0.12, 0.62] (AUDIT-06).
 */
export function getSoleVerticalProfile(t: number) {
  const {
    soleFlatStartT,
    soleFlatEndT,
    toeSpringHeight,
    heelBevelHeight,
    heelLift: heelLiftAmp,
    yTopBaseOffset,
    yMidBotOffset,
    yOutBotOffset,
  } = SNEAKER_LAST_PARAMS

  const toeSpring =
    Math.pow(Math.max(0, (t - soleFlatEndT) / (1 - soleFlatEndT)), 1.75) * toeSpringHeight
  const heelBevel = Math.pow(1 - smoothstep(0.0, soleFlatStartT, t), 2) * heelBevelHeight
  const heelLift = (1 - t) * heelLiftAmp
  const yTopBase = yTopBaseOffset + heelLift + toeSpring
  const yMidBot = yMidBotOffset + heelBevel + toeSpring
  const yOutBotBase = yOutBotOffset + heelBevel + toeSpring
  const midThick = yTopBase - yMidBot
  return { yTopBase, yMidBot, yOutBotBase, midThick, toeSpring }
}

function evalBaseLastSurface(rawPhi: number, v: number): readonly [number, number, number] {
  const phi = wrapAnglePi(rawPhi)
  const fp = getFootprintPoint(phi)
  const rim = getToplineRim(phi)
  const { yTopBase: y0 } = getSoleVerticalProfile(fp.t)

  const a = Math.acos(Math.max(-1, Math.min(1, Math.cos(phi))))
  const toeWeight = 1 - smoothstep(0.35, 0.92, a)
  const heelWeight = smoothstep(2.0, Math.PI, a)

  const vClamped = Math.max(0, Math.min(1, v))
  const uSide = 1 - Math.pow(1 - vClamped, 1.35)

  const uToe =
    vClamped < 0.34
      ? 0.12 * Math.pow(vClamped / 0.34, 1.45)
      : 0.12 + 0.88 * Math.pow((vClamped - 0.34) / 0.66, 1.02)

  const uH = (1 - toeWeight) * uSide + toeWeight * uToe
  const heelBulbZ = -0.048 * Math.sin(vClamped * Math.PI) * heelWeight

  const x = (1 - uH) * fp.x + uH * rim.x
  const z = (1 - uH) * fp.z + uH * rim.z + heelBulbZ

  const ySide = y0 + (rim.y - y0) * Math.pow(vClamped, 0.82) + 0.038 * Math.sin(vClamped * Math.PI)
  const yNoseTop = y0 + 0.19
  const yToe =
    vClamped < 0.34
      ? y0 + (yNoseTop - y0) * Math.sin((vClamped / 0.34) * (Math.PI * 0.5))
      : yNoseTop +
        (rim.y - yNoseTop) * ((vClamped - 0.34) / 0.66) +
        0.015 * Math.sin(((vClamped - 0.34) / 0.66) * Math.PI)

  const y = (1 - toeWeight) * ySide + toeWeight * yToe
  return [x, y, z] as const
}

export function sampleUpperSurfaceWithNormal(
  phi: number,
  v: number,
  normalOffset = 0
): { pos: readonly [number, number, number]; normal: readonly [number, number, number] } {
  const [x, y, z] = evalBaseLastSurface(phi, v)

  const epsPhi = 0.012
  const epsV = 0.012
  const [xP1, yP1, zP1] = evalBaseLastSurface(phi + epsPhi, v)
  const [xP0, yP0, zP0] = evalBaseLastSurface(phi - epsPhi, v)
  const vHi = Math.min(1, v + epsV)
  const vLo = Math.max(0, v - epsV)
  const [xV1, yV1, zV1] = evalBaseLastSurface(phi, vHi)
  const [xV0, yV0, zV0] = evalBaseLastSurface(phi, vLo)

  const tx = xP1 - xP0
  const ty = yP1 - yP0
  const tz = zP1 - zP0

  const bx = xV1 - xV0
  const by = yV1 - yV0
  const bz = zV1 - zV0

  let nx = ty * bz - tz * by
  let ny = tz * bx - tx * bz
  let nz = tx * by - ty * bx

  const outX = x
  const outY = Math.max(0.15, y - 0.02)
  const outZ = z - -0.25
  if (nx * outX + ny * outY + nz * outZ < 0) {
    nx = -nx
    ny = -ny
    nz = -nz
  }

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) + 1e-7
  const unx = nx / len
  const uny = ny / len
  const unz = nz / len

  return {
    pos: [
      x + normalOffset * unx,
      y + normalOffset * uny,
      z + normalOffset * unz,
    ] as const,
    normal: [unx, uny, unz] as const,
  }
}

export function sampleUpperSurface(
  phi: number,
  v: number,
  normalOffset = 0
): readonly [number, number, number] {
  return sampleUpperSurfaceWithNormal(phi, v, normalOffset).pos
}

function buildPanelPatch(
  THREE: ThreeLib,
  options: {
    phiStart: number
    phiEnd: number
    phiSteps: number
    vStart: number
    vEnd: number
    vSteps: number
    layerTier: number
    thickness?: number
    bevelU?: number
    bevelV?: number
    seamInset?: number
  }
): THREE_TYPES.BufferGeometry {
  const {
    phiStart,
    phiEnd,
    phiSteps,
    vStart,
    vEnd,
    vSteps,
    layerTier,
    thickness = 0.011,
    bevelU = 0.08,
    bevelV = 0.09,
    seamInset = 0.008,
  } = options

  const p0 = phiStart + (phiEnd - phiStart) * seamInset
  const p1 = phiEnd - (phiEnd - phiStart) * seamInset
  const v0 = vStart + (vEnd - vStart) * seamInset
  const v1 = vEnd - (vEnd - vStart) * seamInset

  const baseElevation = layerTier * SNEAKER_LAST_PARAMS.layerTierStep
  const outerOffset = baseElevation + thickness
  const innerOffset = baseElevation

  const positions: number[] = []
  const indices: number[] = []
  const stride = vSteps + 1

  for (let i = 0; i <= phiSteps; i++) {
    const u = i / phiSteps
    const phi = p0 + u * (p1 - p0)
    const envU = smoothstep(0, bevelU, u) * smoothstep(1, 1 - bevelU, u)
    for (let j = 0; j <= vSteps; j++) {
      const w = j / vSteps
      const v = v0 + w * (v1 - v0)
      const envV = smoothstep(0, bevelV, w) * smoothstep(1, 1 - bevelV, w)
      const effOffset = innerOffset + (outerOffset - innerOffset) * (0.28 + 0.72 * envU * envV)
      const [x, y, z] = sampleUpperSurface(phi, v, effOffset)
      positions.push(x, y, z)
    }
  }

  const innerBase = (phiSteps + 1) * stride
  for (let i = 0; i <= phiSteps; i++) {
    const phi = p0 + (i / phiSteps) * (p1 - p0)
    for (let j = 0; j <= vSteps; j++) {
      const v = v0 + (j / vSteps) * (v1 - v0)
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

export function buildParametricGridGeometry(
  THREE: ThreeLib,
  uSteps: number,
  wSteps: number,
  evalPoint: (u: number, w: number) => readonly [number, number, number],
  flipWinding = false
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
      if (flipWinding) {
        indices.push(a, b, d, b, c, d)
      } else {
        indices.push(a, d, b, b, d, c)
      }
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

export function getNLogoStrokesForSide(sign: -1 | 1): {
  pStart: number
  vStart: number
  pEnd: number
  vEnd: number
  elevationDelta: number
  flipWinding: boolean
}[] {
  const diagStartPhi = sign < 0 ? 1.14 : 1.46
  const diagEndPhi = sign < 0 ? 1.46 : 1.14

  return [
    {
      pStart: 1.06,
      vStart: 0.15,
      pEnd: 1.18,
      vEnd: 0.64,
      elevationDelta: 0.0,
      flipWinding: sign < 0,
    },
    {
      pStart: 1.42,
      vStart: 0.15,
      pEnd: 1.54,
      vEnd: 0.64,
      elevationDelta: 0.0,
      flipWinding: sign < 0,
    },
    {
      pStart: diagStartPhi,
      vStart: 0.62,
      pEnd: diagEndPhi,
      vEnd: 0.17,
      elevationDelta: 0.0008,
      flipWinding: sign > 0,
    },
  ]
}

export function buildSoleComponentGeometry(
  THREE: ThreeLib,
  part: 'midsole' | 'encap' | 'outsole',
  phiSteps = 96
): THREE_TYPES.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []

  const phiStart = part === 'encap' ? 1.55 : -Math.PI
  const phiEnd = part === 'encap' ? Math.PI * 2 - 1.55 : Math.PI
  const rings = 4

  const topContour: [number, number, number][] = []
  const botContour: [number, number, number][] = []

  for (let i = 0; i <= phiSteps; i++) {
    const u = i / phiSteps
    const rawPhi = phiStart + u * (phiEnd - phiStart)
    const phi = wrapAnglePi(rawPhi)
    const fp = getFootprintPoint(phi)
    const { yTopBase, yMidBot, yOutBotBase, midThick } = getSoleVerticalProfile(fp.t)

    if (part === 'midsole') {
      const groove = -0.007 * Math.sin(u * Math.PI * 6) * (1 - fp.t * 0.5)
      const pTop: [number, number, number] = [fp.x * 1.002, yTopBase + 0.003, fp.z * 1.002]
      const pBot: [number, number, number] = [fp.x * 1.048, yMidBot, fp.z * 1.044]
      topContour.push(pTop)
      botContour.push(pBot)

      positions.push(...pTop)
      positions.push(fp.x * 1.028, yTopBase - midThick * 0.36 + groove, fp.z * 1.026)
      positions.push(fp.x * 1.044, yTopBase - midThick * 0.78, fp.z * 1.04)
      positions.push(...pBot)
    } else if (part === 'encap') {
      const endFade = smoothstep(0, 0.12, u) * smoothstep(1, 0.88, u)
      const encapOut = 1.055 + 0.014 * endFade
      const yEncapTop = yTopBase - midThick * 0.18
      const yEncapBot = yMidBot + 0.006
      const pTop: [number, number, number] = [fp.x * 1.015, yEncapTop, fp.z * 1.015]
      const pBot: [number, number, number] = [fp.x * 1.046, yEncapBot, fp.z * 1.044]
      topContour.push(pTop)
      botContour.push(pBot)

      positions.push(...pTop)
      positions.push(fp.x * encapOut, yEncapTop - 0.012, fp.z * encapOut)
      positions.push(
        fp.x * (encapOut + 0.006),
        (yEncapTop + yEncapBot) * 0.5,
        fp.z * (encapOut + 0.006)
      )
      positions.push(...pBot)
    } else {
      const lugFreq = 36
      const rawWave = Math.sin(u * lugFreq * Math.PI)
      const isArchBridge = fp.t > 0.34 && fp.t < 0.52
      const lugMod = isArchBridge ? 0.0 : 0.014 * (rawWave > 0 ? 1 : -0.45)
      const yOutBot = yOutBotBase + lugMod
      const pTop: [number, number, number] = [fp.x * 1.046, yMidBot, fp.z * 1.042]
      const pBot: [number, number, number] = [fp.x * 1.032, yOutBot, fp.z * 1.03]
      topContour.push(pTop)
      botContour.push(pBot)

      positions.push(...pTop)
      positions.push(fp.x * 1.054, yMidBot - 0.018, fp.z * 1.048)
      positions.push(fp.x * 1.042, yOutBot + 0.008, fp.z * 1.038)
      positions.push(...pBot)
    }
  }

  for (let i = 0; i < phiSteps; i++) {
    for (let r = 0; r < rings - 1; r++) {
      const a = i * rings + r
      const b = (i + 1) * rings + r
      const c = (i + 1) * rings + (r + 1)
      const d = i * rings + (r + 1)
      indices.push(a, d, b, b, d, c)
    }
  }

  if (part === 'encap') {
    const addEndCap = (ringIdx: number, reverse: boolean) => {
      const baseVertex = positions.length / 3
      const pTop = topContour[ringIdx]
      const pBot = botContour[ringIdx]
      const rMid1: [number, number, number] = [
        positions[(ringIdx * rings + 1) * 3],
        positions[(ringIdx * rings + 1) * 3 + 1],
        positions[(ringIdx * rings + 1) * 3 + 2],
      ]
      const rMid2: [number, number, number] = [
        positions[(ringIdx * rings + 2) * 3],
        positions[(ringIdx * rings + 2) * 3 + 1],
        positions[(ringIdx * rings + 2) * 3 + 2],
      ]
      const innerBack: [number, number, number] = [
        pTop[0] * 0.94,
        (pTop[1] + pBot[1]) * 0.5,
        pTop[2] * 0.98,
      ]
      positions.push(...pTop, ...rMid1, ...rMid2, ...pBot, ...innerBack)
      const [v0, v1, v2, v3, vc] = [
        baseVertex,
        baseVertex + 1,
        baseVertex + 2,
        baseVertex + 3,
        baseVertex + 4,
      ]
      if (reverse) {
        indices.push(vc, v1, v0, vc, v2, v1, vc, v3, v2)
      } else {
        indices.push(vc, v0, v1, vc, v1, v2, vc, v2, v3)
      }
    }
    addEndCap(0, false)
    addEndCap(phiSteps, true)
  } else {
    const halfSteps = Math.floor(phiSteps / 2)
    const crossCols = 6
    const capStride = crossCols + 1

    const topCapBase = positions.length / 3
    for (let k = 0; k <= halfSteps; k++) {
      const pL = topContour[halfSteps - k]
      const pR = topContour[halfSteps + k]
      for (let c = 0; c <= crossCols; c++) {
        const s = c / crossCols
        positions.push(
          (1 - s) * pL[0] + s * pR[0],
          (1 - s) * pL[1] + s * pR[1],
          (1 - s) * pL[2] + s * pR[2]
        )
      }
    }

    for (let k = 0; k < halfSteps; k++) {
      for (let c = 0; c < crossCols; c++) {
        const a = topCapBase + k * capStride + c
        const b = topCapBase + (k + 1) * capStride + c
        const d = topCapBase + k * capStride + (c + 1)
        const e = topCapBase + (k + 1) * capStride + (c + 1)
        indices.push(a, d, b, b, d, e)
      }
    }

    const botCapBase = positions.length / 3
    for (let k = 0; k <= halfSteps; k++) {
      const uLong = k / halfSteps
      const phiAbs = uLong * Math.PI
      const fp = getFootprintPoint(phiAbs)
      const { yMidBot, yOutBotBase } = getSoleVerticalProfile(fp.t)
      const pL = botContour[halfSteps - k]
      const pR = botContour[halfSteps + k]

      const isArchBridge = fp.t > 0.34 && fp.t < 0.52
      const treadWave =
        part === 'outsole' && !isArchBridge
          ? 0.012 * (Math.sin(k * 1.45 * Math.PI) > 0 ? 1 : -0.45)
          : 0.0
      const baseFlatY = part === 'outsole' ? yOutBotBase : yMidBot

      for (let c = 0; c <= crossCols; c++) {
        const s = c / crossCols
        const edgeBlend = Math.pow(Math.abs(s - 0.5) * 2, 2)
        const yEdge = (1 - s) * pL[1] + s * pR[1]
        const yInner = baseFlatY + treadWave
        const yFinal = edgeBlend * yEdge + (1 - edgeBlend) * yInner
        positions.push(
          (1 - s) * pL[0] + s * pR[0],
          yFinal,
          (1 - s) * pL[2] + s * pR[2]
        )
      }
    }

    for (let k = 0; k < halfSteps; k++) {
      for (let c = 0; c < crossCols; c++) {
        const a = botCapBase + k * capStride + c
        const b = botCapBase + (k + 1) * capStride + c
        const d = botCapBase + k * capStride + (c + 1)
        const e = botCapBase + (k + 1) * capStride + (c + 1)
        indices.push(a, b, d, b, e, d)
      }
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.setIndex(indices)
  geom.computeVertexNormals()
  return geom
}

export function createSneakerMaterials(
  THREE: ThreeLib,
  currentColors: SneakerColors
): { mats: SneakerMaterials; registry: ZoneMaterialRegistry } {
  const mats: SneakerMaterials = {
    vamp: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.vamp),
      roughness: 0.56,
      metalness: 0.02,
    }),
    quarters: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.quarters),
      roughness: 0.52,
      metalness: 0.02,
    }),
    tongue: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.tongue),
      roughness: 0.72,
      metalness: 0.01,
      side: THREE.DoubleSide,
    }),
    lining: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.lining),
      roughness: 0.68,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
    toeBox: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.toeBox),
      roughness: 0.62,
      metalness: 0.01,
    }),
    heel: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.heel),
      roughness: 0.54,
      metalness: 0.03,
    }),
    collar: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.collar),
      roughness: 0.60,
      metalness: 0.02,
    }),
    midsole: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.midsole),
      roughness: 0.66,
      metalness: 0.02,
    }),
    encap: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.encap),
      roughness: 0.22,
      metalness: 0.08,
      transparent: true,
      opacity: 0.9,
    }),
    outsole: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.outsole),
      roughness: 0.58,
      metalness: 0.03,
    }),
    laces: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.laces),
      roughness: 0.78,
      metalness: 0.0,
    }),
    eyestays: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.eyestays),
      roughness: 0.46,
      metalness: 0.03,
    }),
    swoosh: new THREE.MeshStandardMaterial({
      color: new THREE.Color(currentColors.swoosh),
      roughness: 0.34,
      metalness: 0.06,
    }),
  }

  const registry: ZoneMaterialRegistry = {
    vamp: [mats.vamp],
    quarters: [mats.quarters],
    tongue: [mats.tongue],
    lining: [mats.lining],
    toeBox: [mats.toeBox],
    heel: [mats.heel],
    collar: [mats.collar],
    midsole: [mats.midsole],
    encap: [mats.encap],
    outsole: [mats.outsole],
    laces: [mats.laces],
    eyestays: [mats.eyestays],
    swoosh: [mats.swoosh],
  }

  return { mats, registry }
}

export function buildSneakerMeshGroup(THREE: ThreeLib, mats: SneakerMaterials): THREE_TYPES.Group {
  const group = new THREE.Group()

  const toeBoxGeom = buildPanelPatch(THREE, {
    phiStart: -0.78,
    phiEnd: 0.78,
    phiSteps: 40,
    vStart: 0.34,
    vEnd: 1.0,
    vSteps: 18,
    layerTier: 0,
    thickness: 0.01,
    seamInset: 0.004,
  })
  group.add(new THREE.Mesh(toeBoxGeom, mats.toeBox))

  const vampFrontGeom = buildPanelPatch(THREE, {
    phiStart: -0.92,
    phiEnd: 0.92,
    phiSteps: 52,
    vStart: 0.0,
    vEnd: 0.39,
    vSteps: 14,
    layerTier: 2,
    thickness: 0.012,
    seamInset: 0.006,
  })
  group.add(new THREE.Mesh(vampFrontGeom, mats.vamp))

  ;([-1, 1] as const).forEach((sign) => {
    const pMin = sign > 0 ? 0.70 : -0.92
    const pMax = sign > 0 ? 0.92 : -0.70
    const vampWingGeom = buildPanelPatch(THREE, {
      phiStart: pMin,
      phiEnd: pMax,
      phiSteps: 12,
      vStart: 0.35,
      vEnd: 0.70,
      vSteps: 10,
      layerTier: 2,
      thickness: 0.012,
      seamInset: 0.005,
    })
    group.add(new THREE.Mesh(vampWingGeom, mats.vamp))

    const qMin = sign > 0 ? 0.86 : -1.84
    const qMax = sign > 0 ? 1.84 : -0.86
    const quarterGeom = buildPanelPatch(THREE, {
      phiStart: qMin,
      phiEnd: qMax,
      phiSteps: 32,
      vStart: 0.0,
      vEnd: 0.70,
      vSteps: 18,
      layerTier: 1,
      thickness: 0.011,
      seamInset: 0.006,
    })
    group.add(new THREE.Mesh(quarterGeom, mats.quarters))

    const eMin = sign > 0 ? 0.32 : -1.56
    const eMax = sign > 0 ? 1.56 : -0.32
    const eyestayGeom = buildPanelPatch(THREE, {
      phiStart: eMin,
      phiEnd: eMax,
      phiSteps: 32,
      vStart: 0.68,
      vEnd: 1.0,
      vSteps: 12,
      layerTier: 2,
      thickness: 0.013,
      seamInset: 0.006,
    })
    group.add(new THREE.Mesh(eyestayGeom, mats.eyestays))

    const cMin = sign > 0 ? 1.50 : -2.44
    const cMax = sign > 0 ? 2.44 : -1.50
    const collarGeom = buildPanelPatch(THREE, {
      phiStart: cMin,
      phiEnd: cMax,
      phiSteps: 24,
      vStart: 0.62,
      vEnd: 1.0,
      vSteps: 12,
      layerTier: 0,
      thickness: 0.011,
      seamInset: 0.005,
    })
    group.add(new THREE.Mesh(collarGeom, mats.collar))

    const hMin = sign > 0 ? 1.78 : -Math.PI
    const hMax = sign > 0 ? Math.PI : -1.78
    const heelCounterGeom = buildPanelPatch(THREE, {
      phiStart: hMin,
      phiEnd: hMax,
      phiSteps: 34,
      vStart: 0.18,
      vEnd: 0.68,
      vSteps: 14,
      layerTier: 2,
      thickness: 0.012,
      seamInset: 0.004,
    })
    group.add(new THREE.Mesh(heelCounterGeom, mats.heel))

    const encapMin = sign > 0 ? 1.82 : -Math.PI
    const encapMax = sign > 0 ? Math.PI : -1.82
    const heelClipGeom = buildPanelPatch(THREE, {
      phiStart: encapMin,
      phiEnd: encapMax,
      phiSteps: 30,
      vStart: 0.0,
      vEnd: 0.20,
      vSteps: 8,
      layerTier: 3,
      thickness: 0.012,
      seamInset: 0.004,
    })
    group.add(new THREE.Mesh(heelClipGeom, mats.encap))

    const htMin = sign > 0 ? 2.36 : -Math.PI
    const htMax = sign > 0 ? Math.PI : -2.36
    const heelTabGeom = buildPanelPatch(THREE, {
      phiStart: htMin,
      phiEnd: htMax,
      phiSteps: 22,
      vStart: 0.69,
      vEnd: 1.0,
      vSteps: 10,
      layerTier: 2,
      thickness: 0.012,
      seamInset: 0.004,
    })
    group.add(new THREE.Mesh(heelTabGeom, mats.swoosh))

    const nStrokes = getNLogoStrokesForSide(sign)
    nStrokes.forEach(({ pStart, vStart, pEnd, vEnd, elevationDelta, flipWinding }) => {
      const trimGeom = buildParametricGridGeometry(
        THREE,
        14,
        6,
        (u, w) => {
          const uExp = -0.08 + u * 1.16
          const wCentered = (w - 0.5) * 2
          const pTrim = sign * ((1 - uExp) * pStart + uExp * pEnd + wCentered * 0.072)
          const vTrim = Math.max(0.08, Math.min(0.74, (1 - uExp) * vStart + uExp * vEnd))
          return sampleUpperSurface(pTrim, vTrim, 0.025 + elevationDelta)
        },
        flipWinding
      )
      group.add(new THREE.Mesh(trimGeom, mats.laces))

      const barGeom = buildParametricGridGeometry(
        THREE,
        14,
        6,
        (u, w) => {
          const wCentered = (w - 0.5) * 2
          const pBar = sign * ((1 - u) * pStart + u * pEnd + wCentered * 0.046)
          const vBar = Math.max(0.1, Math.min(0.72, (1 - u) * vStart + u * vEnd))
          return sampleUpperSurface(pBar, vBar, 0.031 + elevationDelta)
        },
        flipWinding
      )
      group.add(new THREE.Mesh(barGeom, mats.swoosh))
    })
  })

  const liningGeom = buildParametricGridGeometry(THREE, 64, 14, (u, s) => {
    const rawPhi = 0.42 + u * (Math.PI * 2 - 0.84)
    const phi = wrapAnglePi(rawPhi)
    const [xr, yr, zr] = sampleUpperSurface(phi, 0.98, -0.004)
    const sProgress = Math.max(0, (s - 0.14) / 0.86)
    const radialShrink = 1 - 0.72 * Math.pow(sProgress, 1.08)
    const lipArch = 0.022 * Math.sin(Math.min(1, s / 0.28) * Math.PI)
    const x = xr * radialShrink
    const z = -0.58 + (zr - -0.58) * radialShrink
    const y = yr + lipArch - 0.48 * Math.pow(sProgress, 0.8)
    return [x, y, z] as const
  })
  group.add(new THREE.Mesh(liningGeom, mats.lining))

  const tongueGeom = buildParametricGridGeometry(
    THREE,
    26,
    16,
    (u, w) => {
      const wCentered = (w - 0.5) * 2
      const z = 0.44 - u * 0.78
      const x = wCentered * (0.125 + 0.055 * u)
      const y = 0.21 + 0.5 * Math.pow(u, 0.88) + 0.045 * Math.cos(wCentered * (Math.PI * 0.5))
      return [x, y, z] as const
    },
    false
  )
  group.add(new THREE.Mesh(tongueGeom, mats.tongue))

  const tongueTagGeom = buildParametricGridGeometry(
    THREE,
    8,
    8,
    (u, w) => {
      const uTag = 0.8 + u * 0.17
      const wCentered = (w - 0.5) * 0.88
      const z = 0.44 - uTag * 0.78 + 0.01
      const x = wCentered * (0.125 + 0.055 * uTag)
      const y = 0.21 + 0.5 * Math.pow(uTag, 0.88) + 0.05 * Math.cos(wCentered * (Math.PI * 0.5))
      return [x, y, z] as const
    },
    false
  )
  group.add(new THREE.Mesh(tongueTagGeom, mats.swoosh))

  const laceU = [0.1, 0.26, 0.42, 0.58, 0.74, 0.88]
  const eyeletTorus = new THREE.TorusGeometry(0.018, 0.0055, 8, 16)
  const zAxisVec = new THREE.Vector3(0, 0, 1)
  const normalVec = new THREE.Vector3()
  laceU.forEach((uL) => {
    const aL = 0.40 + uL * 1.00
    ;([-1, 1] as const).forEach((side) => {
      const { pos, normal } = sampleUpperSurfaceWithNormal(side * aL, 0.84, 0.032)
      const eyeMesh = new THREE.Mesh(eyeletTorus, mats.lining)
      eyeMesh.position.set(pos[0], pos[1], pos[2])
      normalVec.set(normal[0], normal[1], normal[2]).normalize()
      eyeMesh.quaternion.setFromUnitVectors(zAxisVec, normalVec)
      group.add(eyeMesh)
    })
  })

  const lacePairs: [number, number][] = [[0, 0]]
  for (let k = 0; k < laceU.length - 1; k++) {
    lacePairs.push([k, k + 1])
    lacePairs.push([k + 1, k])
  }

  lacePairs.forEach(([iL, iR], idxPair) => {
    const aL = 0.40 + laceU[iL] * 1.00
    const aR = 0.40 + laceU[iR] * 1.00
    const rimL = sampleUpperSurface(-aL, 0.84, 0.031)
    const rimR = sampleUpperSurface(aR, 0.84, 0.031)
    const overLift = idxPair % 2 === 1 ? 0.008 : 0.0

    const laceStrapGeom = buildParametricGridGeometry(
      THREE,
      16,
      5,
      (u, w) => {
        const wCentered = 0.5 - w
        const x = (1 - u) * rimL[0] + u * rimR[0]
        const z = (1 - u) * rimL[2] + u * rimR[2] + wCentered * 0.042
        const arch = (0.048 + overLift) * Math.sin(u * Math.PI)
        const y =
          (1 - u) * rimL[1] +
          u * rimR[1] +
          arch +
          0.012 +
          0.006 * Math.cos(wCentered * Math.PI)
        return [x, y, z] as const
      },
      true
    )
    group.add(new THREE.Mesh(laceStrapGeom, mats.laces))
  })

  const midsoleGeom = buildSoleComponentGeometry(THREE, 'midsole', 96)
  group.add(new THREE.Mesh(midsoleGeom, mats.midsole))

  const encapRingGeom = buildSoleComponentGeometry(THREE, 'encap', 56)
  group.add(new THREE.Mesh(encapRingGeom, mats.encap))

  const outsoleGeom = buildSoleComponentGeometry(THREE, 'outsole', 96)
  group.add(new THREE.Mesh(outsoleGeom, mats.outsole))

  group.rotation.y = Math.PI * 0.5
  return group
}

export function disposeObject3DResources(
  root: THREE_TYPES.Object3D,
  preservedMaterials?: Set<THREE_TYPES.Material>
) {
  const disposedGeometries = new Set<THREE_TYPES.BufferGeometry>()
  const disposedMaterials = new Set<THREE_TYPES.Material>()
  const disposedTextures = new Set<THREE_TYPES.Texture>()

  const disposeMaterialSafely = (mat: THREE_TYPES.Material) => {
    if (preservedMaterials?.has(mat) || disposedMaterials.has(mat)) return
    disposedMaterials.add(mat)

    const stdMat = mat as THREE_TYPES.MeshStandardMaterial
    const texProps: (keyof THREE_TYPES.MeshStandardMaterial)[] = [
      'map',
      'normalMap',
      'roughnessMap',
      'metalnessMap',
      'aoMap',
      'emissiveMap',
      'alphaMap',
      'bumpMap',
    ]
    texProps.forEach((prop) => {
      const tex = stdMat[prop] as THREE_TYPES.Texture | null | undefined
      if (tex && tex.isTexture && !disposedTextures.has(tex)) {
        disposedTextures.add(tex)
        tex.dispose()
      }
    })
    mat.dispose()
  }

  root.traverse((obj) => {
    const mesh = obj as THREE_TYPES.Mesh
    if (!mesh.isMesh) return
    if (mesh.geometry && !disposedGeometries.has(mesh.geometry)) {
      disposedGeometries.add(mesh.geometry)
      mesh.geometry.dispose()
    }
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(disposeMaterialSafely)
    } else if (mesh.material) {
      disposeMaterialSafely(mesh.material)
    }
  })
}

export function ensureCleanGlbSegmentation(THREE: ThreeLib, root: THREE_TYPES.Object3D) {
  let toeBoxVerts = 0
  const meshesByName: Record<string, THREE_TYPES.Mesh> = {}

  root.traverse((obj) => {
    const m = obj as THREE_TYPES.Mesh
    if (!m.isMesh || !m.geometry) return
    const key = (m.name || '').trim()
    meshesByName[key] = m
    if (key.toLowerCase() === 'toebox') {
      toeBoxVerts = m.geometry.attributes.position?.count || 0
    }
  })

  if (toeBoxVerts === 0 || toeBoxVerts > 600) return

  const splitMeshByPredicate = (
    srcMesh: THREE_TYPES.Mesh,
    targetZoneName: string,
    predicate: (cx: number, cy: number, cz: number, ny: number, lum: number) => boolean
  ) => {
    const geom = srcMesh.geometry
    const posAttr = geom.attributes.position
    const normAttr = geom.attributes.normal
    const colAttr = geom.attributes.color
    const indexAttr = geom.index
    if (!posAttr || !indexAttr) return

    const indices = indexAttr.array
    const keepIndices: number[] = []
    const moveIndices: number[] = []

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i]
      const i1 = indices[i + 1]
      const i2 = indices[i + 2]
      const cx = (posAttr.getX(i0) + posAttr.getX(i1) + posAttr.getX(i2)) / 3
      const cy = (posAttr.getY(i0) + posAttr.getY(i1) + posAttr.getY(i2)) / 3
      const cz = (posAttr.getZ(i0) + posAttr.getZ(i1) + posAttr.getZ(i2)) / 3
      const ny = normAttr
        ? (normAttr.getY(i0) + normAttr.getY(i1) + normAttr.getY(i2)) / 3
        : 1
      const lum = colAttr
        ? (colAttr.getX(i0) + colAttr.getX(i1) + colAttr.getX(i2)) / 3
        : 0.5

      if (predicate(cx, cy, cz, ny, lum)) {
        moveIndices.push(i0, i1, i2)
      } else {
        keepIndices.push(i0, i1, i2)
      }
    }

    if (moveIndices.length === 0) return

    geom.setIndex(keepIndices)
    geom.computeBoundingSphere()

    const movedGeom = geom.clone()
    movedGeom.setIndex(moveIndices)
    movedGeom.computeBoundingSphere()

    const movedMesh = new THREE.Mesh(movedGeom, srcMesh.material)
    movedMesh.name = targetZoneName
    srcMesh.parent?.add(movedMesh)
  }

  if (meshesByName['Vamp']) {
    splitMeshByPredicate(meshesByName['Vamp'], 'ToeBox', (cx, cy, cz, ny) => {
      const dz = Math.max(0, cz - 0.44)
      const uSeam = Math.pow((cx - 0.012) / 0.285, 2) + Math.pow(dz / 0.61, 2)
      const yDeckFloor = -0.10 - 0.26 * Math.max(0, Math.min(1, (cz - 0.28) / 0.76))
      return cz > 0.22 && cz < 1.06 && uSeam < 1.0 && cy > yDeckFloor && ny > 0.06
    })
  }

  if (meshesByName['Outsole']) {
    splitMeshByPredicate(meshesByName['Outsole'], 'Midsole', (_cx, cy, cz) => {
      if (cz > 1.16) return false
      const toeRise = Math.pow(Math.max(0, (cz - 0.90) / 0.48), 1.55) * 0.21
      const ySplit = -0.440 + 0.018 * ((cz + 1.38) / 2.76) + toeRise
      return cy > ySplit
    })
  }

  if (meshesByName['Swoosh']) {
    splitMeshByPredicate(meshesByName['Swoosh'], 'Midsole', (_cx, cy) => cy < -0.24)
    splitMeshByPredicate(meshesByName['Swoosh'], 'Quarters', (_cx, cy, cz, _ny, lum) => {
      return (
        lum < 0.57 ||
        cz < -0.25 ||
        cz > 0.23 ||
        cy > 0.22 ||
        (cz < -0.12 && cy > 0.08)
      )
    })
  }

  ;(['HeelCounter', 'Collar'] as const).forEach((name) => {
    const mesh = meshesByName[name]
    if (!mesh) return
    splitMeshByPredicate(mesh, 'Midsole', (_cx, cy) => cy < -0.215)
    splitMeshByPredicate(mesh, 'Quarters', (_cx, cy, cz) => cy >= -0.215 && cz > -0.48 && cy < 0.16)
    splitMeshByPredicate(
      mesh,
      'Swoosh',
      (cx, cy, cz) => cz < -1.02 && cy > 0.22 && Math.abs(cx) < 0.22
    )
    const targetZone = name === 'HeelCounter' ? 'Collar' : 'HeelCounter'
    splitMeshByPredicate(mesh, targetZone, (_cx, cy, cz) => {
      const yCollarSeam = 0.075 + 0.13 * ((cz + 1.28) / 0.82)
      return name === 'HeelCounter' ? cy >= yCollarSeam : cy < yCollarSeam
    })
  })
}

export function bindGlbMaterialsPreservingTextures(
  THREE: ThreeLib,
  root: THREE_TYPES.Object3D,
  baseMats: SneakerMaterials,
  registry: ZoneMaterialRegistry,
  currentColors: SneakerColors
) {
  const replacedOriginalMaterials = new Set<THREE_TYPES.Material>()

  root.traverse((obj) => {
    const mesh = obj as THREE_TYPES.Mesh
    if (!mesh.isMesh) return

    const rawMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    const parentName = mesh.parent && mesh.parent.name !== 'RootNode' ? mesh.parent.name : ''
    const candidateName = mesh.name || parentName || rawMat?.name || ''
    const zone =
      resolveGlbZone(mesh.name || '') ??
      resolveGlbZone(parentName + '_' + mesh.name + '_' + (rawMat?.name || '')) ??
      resolveGlbZone(rawMat?.name || '')

    if (!zone) {
      if (import.meta.env.DEV) {
        console.warn('[Sneaker3D] Неизвестная зона GLB-объекта: ' + candidateName)
      }
      return
    }

    const hasMeshVertexColor = Boolean(mesh.geometry?.attributes?.color)
    const srcStd = rawMat as THREE_TYPES.MeshStandardMaterial | undefined
    const hasOriginalTextures = Boolean(
      srcStd &&
        (srcStd.map ||
          srcStd.normalMap ||
          srcStd.roughnessMap ||
          srcStd.aoMap ||
          srcStd.metalnessMap)
    )

    if (rawMat) {
      replacedOriginalMaterials.add(rawMat)
    }

    if (hasOriginalTextures && srcStd) {
      const clonedMat = srcStd.clone()
      clonedMat.color = new THREE.Color(currentColors[zone])
      clonedMat.vertexColors = hasMeshVertexColor
      clonedMat.needsUpdate = true
      mesh.material = clonedMat
      registry[zone].push(clonedMat)
    } else if (hasMeshVertexColor) {
      const colorAttr = mesh.geometry.attributes.color
      if (colorAttr && !mesh.geometry.userData?.colorNormalized) {
        const count = colorAttr.count
        for (let idx = 0; idx < count; idx++) {
          const r = colorAttr.getX(idx)
          const g = colorAttr.getY(idx)
          const b = colorAttr.getZ(idx)
          const lift = (v: number) => Math.min(1, Math.pow(Math.max(0, v), 0.55) * 1.06)
          colorAttr.setXYZ(idx, lift(r), lift(g), lift(b))
        }
        colorAttr.needsUpdate = true
        mesh.geometry.userData = { ...mesh.geometry.userData, colorNormalized: true }
      }

      const vcMat = baseMats[zone].clone()
      vcMat.color = new THREE.Color(currentColors[zone])
      vcMat.vertexColors = true
      if (srcStd) {
        vcMat.side = srcStd.side ?? THREE.DoubleSide
        if (typeof srcStd.roughness === 'number') vcMat.roughness = srcStd.roughness
        if (typeof srcStd.metalness === 'number') vcMat.metalness = srcStd.metalness
      } else {
        vcMat.side = THREE.DoubleSide
      }
      vcMat.needsUpdate = true
      mesh.material = vcMat
      registry[zone].push(vcMat)
    } else {
      baseMats[zone].vertexColors = false
      mesh.material = baseMats[zone]
    }
  })

  replacedOriginalMaterials.forEach((origMat) => {
    origMat.dispose()
  })
}

export function drawShadowGradient(canvas: HTMLCanvasElement, dark: boolean) {
  const sCtx = canvas.getContext('2d')
  if (!sCtx) return
  sCtx.clearRect(0, 0, canvas.width, canvas.height)
  const grad = sCtx.createRadialGradient(128, 64, 10, 128, 64, 118)
  grad.addColorStop(0, dark ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.34)')
  grad.addColorStop(0.55, dark ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.11)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  sCtx.fillStyle = grad
  sCtx.fillRect(0, 0, canvas.width, canvas.height)
}

