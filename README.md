```markdown
# 👞 Cordwainer Mini App

Telegram Mini App + веб-приложение: энциклопедия сапожного ремесла, профессиональные калькуляторы и инструменты для обувщиков, дизайнеров, колодочников и ортопедов.

**Сайт:** [https://www.cordwaine.app](https://www.cordwaine.app)  
**Telegram-бот:** [@Cordwainer_bot](https://t.me/Cordwainer_bot)  
**Стек:** React 18 · TypeScript · Vite 6 · Tailwind CSS 4 · Framer Motion · @tma.js/sdk

Поддерживаемые языки: **русский** и **украинский**.

---

## 🎯 Возможности

### 🏠 Главный экран и навигация
- Welcome-экран с переключением языка (RU / UK)
- Главное меню разделов энциклопедии
- Нижний док (Bottom Dock) для быстрой навигации
- Избранное (статьи блога) с сохранением в `localStorage`
- Адаптация под Telegram WebApp (тема, viewport, initData)
- Тёмная тема по умолчанию в браузере; в Telegram — по `colorScheme`
- Режим производительности (`auto` / `full` / `fast`) для слабых устройств

### 🧮 Калькуляторы

| Калькулятор | Что делает |
|------------|------------|
| **Размеры обуви** | Конвертер по длине стопы (мм/см) → Mondopoint, EU, UK, US, метрическая (ГОСТ/Укр). Таблицы по ISO 19407:2023 / ISO/TS 19407 и Mondopoint (ISO 9407). Мужская, женская, детская обувь |
| **Полнота колодки (ширина)** | Полнота по ГОСТ (цифровая 1–12 и буквенная), конвертер US / UK / EU ↔ ГОСТ, обхваты плюсны, подъёма и пятки (мм и дюймы) |
| **Каблук** | Расчёт геометрии каблука: пошаговый степпер + Canvas-визуализация (heel geometry) |
| **Цвет / рецепты смешивания** | Подбор пигментов, спектральные данные, смешивание красок, Web Worker для тяжёлых расчётов рецептов |

### 🎨 Цвета и колористика
- База пигментов со спектральными кривыми (`public/spectra/*.txt`)
- График спектра (`SpectrumGraph`)
- Методология цвета (`ColorMethodology`)
- Селектор пигментов (`PigmentSelector`)
- Color science utils (расчёты в Lab / спектре)

### 📰 Блог и контент
- Журнал статей (`BlogPage`) с Markdown-контентом
- Теги (индустрия и др.), избранное статей
- Раздел «О проекте» / коллаборации
- SEO-страница (orphan) для калькулятора полноты: `/forward-ortho-converter`

### 📱 PWA и Telegram
- `manifest.json`, иконки 192/512
- Preload hero-изображения для LCP
- Интеграция `telegram-web-app.js` + `@tma.js/sdk` / `@tma.js/sdk-react`
- Viewport-fit, safe-area, отключение масштабирования

### ⚡ Производительность
- Эвристика low-power устройств (Android, cores, deviceMemory, `prefers-reduced-motion`)
- Режимы анимаций Framer Motion
- Web Worker для рецептов смешивания (`recipeWorker.ts`)

---

## 🚀 Быстрый старт

### Требования
- **Node.js** 18+ (CI использует Node 24)
- npm (или pnpm / yarn)

### Установка

```bash
git clone https://github.com/vplyha-maker/cordwainer-miniapp.git
cd cordwainer-miniapp

npm install
```

### Разработка

```bash
npm run dev
```

Откроется Vite dev-server (обычно `http://localhost:5173`).

Для проверки внутри Telegram:
1. Задеплойте preview (Vercel / Cloudflare Pages / ngrok).
2. Укажите HTTPS-URL в BotFather → Bot Settings → Menu Button / Web App.

### Сборка

```bash
npm run build
```

Артефакты в `dist/`. Превью production-сборки:

```bash
npm run preview
```

### E2E-тесты

```bash
npx playwright install --with-deps
npm run test:e2e
```

CI (GitHub Actions): на каждый push — `npm install` → `npm run build` → Playwright e2e.

---

## 📦 Зависимости

**Runtime**
| Пакет | Назначение |
|-------|------------|
| `react` / `react-dom` | UI |
| `@tma.js/sdk` / `@tma.js/sdk-react` | Telegram Mini App SDK |
| `framer-motion` | Анимации и переходы экранов |
| `react-markdown` | Рендер статей блога |

**Dev**
| Пакет | Назначение |
|-------|------------|
| `vite` + `@vitejs/plugin-react` | Сборка и HMR |
| `typescript` | Типизация |
| `tailwindcss` + `@tailwindcss/vite` | Стили (v4) |
| `@playwright/test` | E2E |

---

## 🏗️ Архитектура

```
cordwainer-miniapp/
├── index.html                 # Entry HTML, PWA meta, Telegram script, preload hero
├── package.json
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
├── .github/workflows/ci.yml   # Build + Playwright
│
├── public/
│   ├── manifest.json          # PWA
│   ├── icon-192.png / icon-512.png
│   ├── hero-cover.webp, blog-hero.webp, …
│   ├── spectra/               # Спектральные данные пигментов (*.txt)
│   ├── audio/                 # Звуки (опционально)
│   ├── robots.txt, sitemap.xml, llms.txt
│   └── google*.html           # Search Console
│
└── src/
    ├── main.tsx               # React root
    ├── App.tsx                # Роутинг экранов, тема, язык, избранное, perf mode
    ├── index.css              # Tailwind + CSS-переменные темы
    │
    ├── pages/                 # Экраны (screen-based navigation)
    │   ├── WelcomePage.tsx
    │   ├── HomePage.tsx
    │   ├── BlogPage.tsx
    │   ├── CalcMenuPage.tsx
    │   ├── SizeCalcPage.tsx
    │   ├── WidthCalcPage.tsx
    │   ├── HeelCalcPage.tsx
    │   ├── ColorCalcPage.tsx
    │   ├── ColorsPage.tsx
    │   └── ForwardOrthoSEOPage.tsx
    │
    ├── components/
    │   ├── BottomDock.tsx
    │   ├── SectionCard.tsx
    │   ├── EmptyState.tsx
    │   ├── AboutProject.tsx
    │   ├── PigmentSelector.tsx
    │   ├── SpectrumGraph.tsx
    │   ├── ColorMethodology.tsx
    │   └── heel/
    │       ├── HeelCanvas.tsx
    │       └── HeelStepper.tsx
    │
    ├── lib/                   # Доменная логика калькуляторов
    │   ├── shoeSizes.ts       # ISO 19407 / Mondopoint
    │   ├── shoeWidths.ts      # Полнота ГОСТ + обхваты
    │   ├── heelCalc.ts
    │   ├── heelGeometry.ts
    │   └── performance.ts     # auto/full/fast режимы
    │
    ├── utils/
    │   ├── colorScience.ts    # Спектр, Lab, смешивание
    │   └── calculatorLogic.ts
    │
    ├── hooks/
    │   ├── useColorCalculations.ts
    │   └── usePaintMix.ts
    │
    ├── workers/
    │   └── recipeWorker.ts    # Тяжёлые рецепты в Web Worker
    │
    ├── data/
    │   ├── pigments.ts
    │   ├── loadPigments.ts
    │   ├── blog.ts
    │   └── articleContents.ts
    │
    └── theme/
        └── pigmentTheme.ts
```

### Навигация (screen state)

Вместо React Router используется явный state в `App.tsx`:

```ts
type Screen =
  | 'welcome' | 'home' | 'blog' | 'calc-menu'
  | 'size-calc' | 'width-calc' | 'heel-calc'
  | 'color-calc' | 'colors' | 'seo-width'
```

Переходы анимируются через `AnimatePresence` (Framer Motion).

### Тема и Telegram

1. До React: скрипт в `index.html` добавляет класс `dark`, если нет Telegram `initData`.
2. В приложении: `getIsDarkTheme()` читает `Telegram.WebApp.colorScheme` или форсирует dark в браузере.
3. CSS-переменные (`--color-bg`, `--color-accent`, пигментные токены) выставляются на `document.documentElement`.

### Калькулятор размеров

- Вход: длина стопы (мм).
- База: Mondopoint (округление до 5 мм).
- Выход: EU, UK, US (men/women), метрический/ГОСТ, см.
- Таблицы: взрослые и детские по ISO 19407.

### Калькулятор полноты

- ГОСТ-цифровая и буквенная полнота.
- Обхваты: плюсна, подъём, пятка.
- SEO-лендинг `/forward-ortho-converter` (orphan page) для органического трафика.

### Цветовой модуль

1. Спектральные файлы в `public/spectra/`.
2. Загрузка и парсинг → `loadPigments` / `pigments`.
3. Расчёты в `colorScience.ts` + хуки `useColorCalculations` / `usePaintMix`.
4. Тяжёлые рецепты — в `recipeWorker.ts` (не блокирует UI).

### Избранное и язык

- `localStorage`: `app_lang`, избранные статьи, режим производительности.
- Язык: `Lang = 'ru' | 'uk'`.

---

## 🌐 Деплой

### Vercel / Netlify / Cloudflare Pages

1. Подключите репозиторий.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Node version: 18+ (лучше 20/24)

### Telegram Mini App

1. Задеплойте на HTTPS.
2. BotFather → ваш бот → **Menu Button** / **Web App** → URL приложения.
3. В боте (Cordwainer Bot) кнопка «Открыть Cordwainer Mini App» уже указывает на production URL.

### Переменные окружения

На текущий момент секреты в клиенте не обязательны: приложение статическое.  
При добавлении бэкенда/аналитики используйте `VITE_*` переменные Vite.

---

## 🧪 Разработка

### Новый экран
1. Создайте `src/pages/NewPage.tsx`.
2. Добавьте значение в `Screen` в `App.tsx`.
3. Отрендерите страницу в `AnimatePresence` и добавьте переход из меню/дока.

### Новый калькулятор
1. Логику — в `src/lib/`.
2. UI — `src/pages/XxxCalcPage.tsx`.
3. Пункт в `CalcMenuPage`.

### Новые пигменты
1. Добавьте спектральный `.txt` в `public/spectra/`.
2. Зарегистрируйте в `data/pigments.ts` / `loadPigments.ts`.

### Стили
- Tailwind CSS v4 через `@tailwindcss/vite`.
- Глобальные токены — CSS-переменные в `index.css` и runtime в `App.tsx`.

---

## 📁 Полезные публичные файлы

| Файл | Назначение |
|------|------------|
| `public/manifest.json` | PWA |
| `public/llms.txt` | Описание проекта для LLM/краулеров |
| `public/sitemap.xml` / `robots.txt` | SEO |
| `public/spectra/` | Спектры пигментов для color science |

---

## 📝 Лицензия и связанные проекты

Mini App связан с Telegram-ботом **Cordwainer Bot** (репозиторий `shoemaker-bot`):  
справочник конструкций, материалов, химии, глоссария и серверные калькуляторы (в т.ч. расход кожи и сдельная зарплата).

- Бот: [https://t.me/Cordwainer_bot](https://t.me/Cordwainer_bot)
- Сайт: [https://www.cordwaine.app](https://www.cordwaine.app)

---

## 📞 Контакты

- GitHub: [@vplyha-maker](https://github.com/vplyha-maker)
- Telegram: [@Cordwainer_bot](https://t.me/Cordwainer_bot)

---

*Cordwainer — предмет как идея, форма как язык, мастерство как опыт.*
```


