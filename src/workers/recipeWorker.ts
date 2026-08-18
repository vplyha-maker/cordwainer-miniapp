// src/workers/recipeWorker.ts

// Пока без логики — только приём/ответ
self.onmessage = (e: MessageEvent) => {
  const { id, targetHex, basicPigments, maxComponents, targetVolume } = e.data

  // Сюда потом вставим findRecipeByHex
  const result = null // заглушка

  self.postMessage({ id, result })
}

export {} // чтобы TypeScript не ругался
