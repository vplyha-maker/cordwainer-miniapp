import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // Папка, где будут лежать наши тесты
  use: {
    baseURL: 'http://localhost:5173', // Стандартный адрес Vite
    trace: 'on-first-retry',
  },
  // Автоматически запускаем проект перед началом тестов
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});

