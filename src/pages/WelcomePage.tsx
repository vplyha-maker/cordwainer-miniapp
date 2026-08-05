@import "tailwindcss";

@theme {
  --color-cream: #F8F4EE;
  --color-cream-dark: #EDE6DB;
  --color-ink: #1A1A1A;
  --color-ink-soft: #2C2C2C;
  --color-charcoal: #3D3D3D;
  --color-warm-gray: #6B6560;
  --color-muted: #9A938B;
  --color-accent: #8B5E3C;
  --color-accent-light: #C4A484;
  --color-gold: #C9A227;
  --color-burgundy: #6B2D3C;
  --color-surface: #FFFFFF;
  --font-display: "Playfair Display", "Times New Roman", serif;
  --font-body: "Inter", system-ui, -apple-system, sans-serif;
  --radius-card: 1.25rem;
  --radius-button: 0.875rem;
  --shadow-soft: 0 4px 24px -4px rgb(0 0 0 / 0.08), 0 2px 8px -2px rgb(0 0 0 / 0.04);
  --shadow-elevated: 0 12px 40px -8px rgb(0 0 0 / 0.12), 0 4px 16px -4px rgb(0 0 0 / 0.06);
}

@layer base {
  html, body, #root { height: 100%; margin: 0; padding: 0; }
  body {
    font-family: var(--font-body);
    background-color: var(--color-cream);
    color: var(--color-ink);
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
  }
}

@layer utilities {
  .font-display { font-family: var(--font-display); }
  .tg-safe {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}
