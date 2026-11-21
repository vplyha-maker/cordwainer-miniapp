import { describe, it } from 'vitest'

describe('Существующие тестовые скрипты', () => {
  it('heelCalc.test.ts проходит все проверки', async () => {
    await import('../src/lib/__tests__/heelCalc.test.ts')
  })

  it('colorEngine.test.ts проходит все проверки', async () => {
    await import('../src/pages/colors/colorEngine.test.ts')
  })

  it('spectralAtelier.test.ts проходит все проверки', async () => {
    await import('../src/pages/color-calc/__tests__/spectralAtelier.test.ts')
  })
})
