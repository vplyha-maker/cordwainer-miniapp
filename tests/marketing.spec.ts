import { test, expect } from '@playwright/test';

test('Кнопка "маркетинг" работает корректно и не выдает черный экран', async ({ page }) => {
  // 1. Открываем миниапп
  await page.goto('/');

  // 2. Ищем кнопку, содержащую слово "маркетинг" (или "читать про маркетинг")
  const marketingBtn = page.getByText('маркетинг', { exact: false });
  
  // 3. Кликаем по ней
  await marketingBtn.click();

  // 4. Проверяем, что после клика интерфейс не "умер" (корневой элемент React остался видим)
  // Если появляется черный экран или приложение падает, этот шаг выдаст ошибку
  await expect(page.locator('#root')).toBeVisible();
  
  // 5. Убеждаемся, что внутри body есть какой-то контент
  await expect(page.locator('body')).not.toBeEmpty();
});

