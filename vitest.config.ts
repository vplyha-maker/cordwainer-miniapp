import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/lib/__tests__/heelCalc.test.ts',
      'src/pages/colors/colorEngine.test.ts',
      'src/pages/color-calc/__tests__/spectralAtelier.test.ts',
    ],
  },
})
