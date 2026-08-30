```markdown
# 👞 Cordwainer Mini App

Telegram Mini App + web application: an encyclopedia of the shoemaking craft, professional calculators, and tools for shoemakers, designers, last makers, and orthopedists.

**Website:** [https://www.cordwaine.app](https://www.cordwaine.app)  
**Telegram bot:** [@Cordwainer_bot](https://t.me/Cordwainer_bot)  
**Stack:** React 18 · TypeScript · Vite 6 · Tailwind CSS 4 · Framer Motion · @tma.js/sdk

Supported languages: **Russian** and **Ukrainian**.

---

## 🎯 Features

### 🏠 Home screen & navigation
- Welcome screen with language switcher (RU / UK)
- Main menu of encyclopedia sections
- Bottom Dock for quick navigation
- Favorites (blog articles) stored in `localStorage`
- Telegram WebApp adaptation (theme, viewport, initData)
- Dark theme by default in the browser; in Telegram follows `colorScheme`
- Performance mode (`auto` / `full` / `fast`) for low-end devices

### 🧮 Calculators

| Calculator | What it does |
|------------|--------------|
| **Shoe sizes** | Converter by foot length (mm/cm) → Mondopoint, EU, UK, US, metric (GOST/Ukr). Tables based on ISO 19407:2023 / ISO/TS 19407 and Mondopoint (ISO 9407). Men's, women's, and children's shoes |
| **Last width (girth)** | GOST widths (numeric 1–12 and letter), converter US / UK / EU ↔ GOST, ball, instep, and heel girths (mm and inches) |
| **Heel** | Heel geometry calculation: step-by-step stepper + Canvas visualization |
| **Color / mixing recipes** | Pigment selection, spectral data, paint mixing, Web Worker for heavy recipe calculations |

### 🎨 Colors & coloristics
- Pigment database with spectral curves (`public/spectra/*.txt`)
- Spectrum chart (`SpectrumGraph`)
- Color methodology (`ColorMethodology`)
- Pigment selector (`PigmentSelector`)
- Color science utilities (Lab / spectrum calculations)

### 📰 Blog & content
- Article journal (`BlogPage`) with Markdown content
- Tags (industry, etc.), article favorites
- “About the project” / collaborations section
- SEO orphan page for the width calculator: `/forward-ortho-converter`

### 📱 PWA & Telegram
- `manifest.json`, icons 192/512
- Hero image preload for LCP
- Integration of `telegram-web-app.js` + `@tma.js/sdk` / `@tma.js/sdk-react`
- Viewport-fit, safe-area, zoom disabled

### ⚡ Performance
- Low-power device heuristics (Android, cores, deviceMemory, `prefers-reduced-motion`)
- Framer Motion animation modes
- Web Worker for mixing recipes (`recipeWorker.ts`) so the UI stays responsive

### 💰 Prices
- Scraped material/price data (script + GitHub Actions workflow)
- Prices page in the app

---

## 🚀 Quick start

### Requirements
- Node.js 18+ (recommended 20 or 24)
- npm

### Install & run

```bash
npm install
npm run dev
```

Vite dev server starts (usually `http://localhost:5173`).

To test inside Telegram:
1. Deploy a preview (Vercel / Cloudflare Pages / ngrok).
2. Set the HTTPS URL in BotFather → Bot Settings → Menu Button / Web App.

### Build

```bash
npm run build
```

Output goes to `dist/`. Preview the production build:

```bash
npm run preview
```

### E2E tests

```bash
npx playwright install --with-deps
npm run test:e2e
```

CI (GitHub Actions): on every push — `npm install` → `npm run build` → Playwright e2e.

---

## 📦 Dependencies

**Runtime**

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | UI |
| `@tma.js/sdk` / `@tma.js/sdk-react` | Telegram Mini App SDK |
| `framer-motion` | Animations and screen transitions |
| `react-markdown` | Blog article rendering |
| `recharts` | Charts |
| `lucide-react` | Icons |
| `axios` / `cheerio` | Price scraping |
| `@neondatabase/serverless` | Optional DB for prices |

**Dev**

| Package | Purpose |
|---------|---------|
| `vite` + `@vitejs/plugin-react` | Build & HMR |
| `typescript` | Typing |
| `tailwindcss` + `@tailwindcss/vite` | Styles (v4) |
| `@playwright/test` | E2E |

---

## 🏗️ Architecture

```
cordwainer-miniapp/
├── index.html                 # Entry HTML, PWA meta, Telegram script, preload hero
├── package.json
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
├── vercel.json
├── .github/workflows/
│   ├── ci.yml                 # Build + Playwright
│   └── scrape-prices.yml      # Scheduled price scraping
│
├── api/
│   └── prices.ts              # API route (Vercel)
│
├── public/
│   ├── manifest.json          # PWA
│   ├── icon-192.png / icon-512.png
│   ├── hero-cover.webp, blog-hero.webp, …
│   ├── spectra/               # Pigment spectral data (*.txt)
│   ├── audio/                 # Optional sounds
│   ├── robots.txt, sitemap.xml, llms.txt
│   └── google*.html           # Search Console verification
│
├── scripts/
│   ├── scrape-prices.mjs
│   └── scrapers/
│
└── src/
    ├── main.tsx               # React root
    ├── App.tsx                # Screen routing, theme, language, favorites, perf mode
    ├── index.css              # Tailwind + theme CSS variables
    │
    ├── pages/                 # Screens (screen-based navigation)
    │   ├── WelcomePage.tsx
    │   ├── HomePage.tsx
    │   ├── BlogPage.tsx
    │   ├── CalcMenuPage.tsx
    │   ├── SizeCalcPage.tsx
    │   ├── WidthCalcPage.tsx
    │   ├── HeelCalcPage.tsx
    │   ├── ColorCalcPage.tsx
    │   ├── ColorsPage.tsx
    │   ├── GlossaryPage.tsx
    │   ├── PricesPage.tsx
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
    ├── lib/                   # Domain logic for calculators
    │   ├── shoeSizes.ts       # ISO 19407 / Mondopoint
    │   ├── shoeWidths.ts      # GOST widths + girths
    │   ├── heelCalc.ts
    │   ├── heelGeometry.ts
    │   └── performance.ts     # auto/full/fast modes
    │
    ├── utils/
    │   ├── colorScience.ts    # Spectrum, Lab, mixing
    │   └── calculatorLogic.ts
    │
    ├── hooks/
    │   ├── useColorCalculations.ts
    │   └── usePaintMix.ts
    │
    ├── workers/
    │   └── recipeWorker.ts    # Heavy recipes in Web Worker
    │
    ├── data/
    │   ├── pigments.ts
    │   ├── loadPigments.ts
    │   └── blog.ts
    │
    └── theme/
        └── pigmentTheme.ts
```

### Navigation model
Screen-based (not React Router): `App.tsx` holds the current `Screen` state and switches pages inside `AnimatePresence`. Deep links and the SEO landing `/forward-ortho-converter` are handled as special cases.

### Color module
1. Spectral files in `public/spectra/`.
2. Load & parse → `loadPigments` / `pigments`.
3. Calculations in `colorScience.ts` + hooks `useColorCalculations` / `usePaintMix`.
4. Heavy recipes run in `recipeWorker.ts` (non-blocking UI).

### Favorites & language
- `localStorage`: `app_lang`, favorite articles, performance mode.
- Language type: `Lang = 'ru' | 'uk'`.

---

## 🌐 Deployment

### Vercel / Netlify / Cloudflare Pages
1. Connect the repository.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Node version: 18+ (preferably 20/24)

### Telegram Mini App
1. Deploy to HTTPS.
2. BotFather → your bot → **Menu Button** / **Web App** → app URL.
3. In Cordwainer Bot the “Open Cordwainer Mini App” button already points to the production URL.

### Environment variables
Currently no client-side secrets are required (static app).  
If you add a backend or analytics, use Vite `VITE_*` variables.

---

## 🧪 Development

### New screen
1. Create `src/pages/NewPage.tsx`.
2. Add a value to the `Screen` type in `App.tsx`.
3. Render the page inside `AnimatePresence` and wire navigation from the menu/dock.

### New calculator
1. Put logic in `src/lib/`.
2. UI in `src/pages/XxxCalcPage.tsx`.
3. Add an entry in `CalcMenuPage`.

### New pigments
1. Add a spectral `.txt` file to `public/spectra/`.
2. Register it in `data/pigments.ts` / `loadPigments.ts`.

### Styles
- Tailwind CSS v4 via `@tailwindcss/vite`.
- Global tokens: CSS variables in `index.css` and runtime updates in `App.tsx`.

---

## 📁 Useful public files

| File | Purpose |
|------|---------|
| `public/manifest.json` | PWA |
| `public/llms.txt` | Project description for LLMs / crawlers |
| `public/sitemap.xml` / `robots.txt` | SEO |
| `public/spectra/` | Pigment spectra for color science |

---

## 📝 License & related projects

The Mini App is linked to the Telegram bot **Cordwainer Bot** (repo `shoemaker-bot`):  
a reference for constructions, materials, chemistry, glossary, and server-side calculators (including leather consumption and piece-rate wages).

- Bot: [https://t.me/Cordwainer_bot](https://t.me/Cordwainer_bot)
- Website: [https://www.cordwaine.app](https://www.cordwaine.app)

---

## 📞 Contacts

- GitHub: [@vplyha-maker](https://github.com/vplyha-maker)
- Telegram: [@Cordwainer_bot](https://t.me/Cordwainer_bot)

---

*Cordwainer — the object as idea, form as language, craft as experience.*
```
