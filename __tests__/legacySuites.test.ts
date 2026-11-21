import { describe, it } from 'vitest'

describe('Существующие тестовые скрипты', () => {
  it('heelCalc.test.ts проходит все проверки', async () => {
    await import('../lib/__tests__/heelCalc.test.ts')
  })

  it('colorEngine.test.ts проходит все проверки', async () => {
    await import('../pages/colors/colorEngine.test.ts')
  })

  it('spectralAtelier.test.ts проходит все проверки', async () => {
    await import('../pages/color-calc/__tests__/spectralAtelier.test.ts')
  })
})

