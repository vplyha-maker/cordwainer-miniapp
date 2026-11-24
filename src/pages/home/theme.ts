import type { HomePalette } from './types'

export function getHomePalette(isDark: boolean): HomePalette {
  if (isDark) {
    return {
      isDark: true,
      bg: '#08080A',
      bgMesh:
        'radial-gradient(ellipse 80% 45% at 85% 0%, rgba(212, 163, 115, 0.09) 0%, transparent 60%)',
      headerBg: 'rgba(8, 8, 10, 0.72)',
      surface: '#0F0F12',
      surfaceElevated: '#16161B',
      surfaceHover: '#1D1D24',
      surfaceSubtle: 'rgba(255, 255, 255, 0.05)',
      cardioBg:
        'linear-gradient(135deg, #121114 0%, #0A0A0D 52%, #101624 100%)',
      tributeBg:
        'linear-gradient(120deg, rgba(212, 163, 115, 0.16) 0%, rgba(22, 22, 27, 0.92) 70%)',
      text: '#F5F4F0',
      textMuted: 'rgba(245, 244, 240, 0.62)',
      textSubtle: 'rgba(245, 244, 240, 0.36)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      shadowCard:
        '0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 20px 50px -24px rgba(0, 0, 0, 0.85)',
      shadowHero: '0 24px 64px -24px rgba(0, 0, 0, 0.9)',
      accentBronze: '#D4A373',
      accentBronzeSoft: 'rgba(212, 163, 115, 0.15)',
      accentRed: '#F04E37',
      pillActiveBg: '#F5F4F0',
      pillActiveText: '#08080A',
      pillActiveBorder: '#F5F4F0',
    }
  }

  return {
    isDark: false,
    bg: '#EAE7E0',
    bgMesh:
      'radial-gradient(ellipse 80% 45% at 88% 0%, rgba(176, 126, 74, 0.12) 0%, transparent 58%)',
    headerBg: 'rgba(234, 231, 224, 0.78)',
    surface: '#F4F2EC',
    surfaceElevated: '#FBFAF7',
    surfaceHover: '#ECE9E1',
    surfaceSubtle: 'rgba(16, 16, 19, 0.05)',
    cardioBg:
      'linear-gradient(135deg, #151418 0%, #0C0C0F 55%, #131B2A 100%)',
    tributeBg:
      'linear-gradient(120deg, rgba(166, 114, 63, 0.16) 0%, rgba(251, 250, 247, 0.95) 72%)',
    text: '#101013',
    textMuted: 'rgba(16, 16, 19, 0.60)',
    textSubtle: 'rgba(16, 16, 19, 0.40)',
    border: 'rgba(16, 16, 19, 0.09)',
    borderStrong: 'rgba(16, 16, 19, 0.18)',
    shadowCard:
      '0 1px 0 rgba(255, 255, 255, 0.85) inset, 0 16px 40px -22px rgba(16, 16, 19, 0.18)',
    shadowHero: '0 24px 60px -24px rgba(16, 16, 19, 0.35)',
    accentBronze: '#A6723F',
    accentBronzeSoft: 'rgba(166, 114, 63, 0.13)',
    accentRed: '#D93B26',
    pillActiveBg: '#101013',
    pillActiveText: '#F5F4F0',
    pillActiveBorder: '#101013',
  }
}

export const HOME_STYLE_SHEET = `
  .cw-home-root * {
    -webkit-tap-highlight-color: transparent !important;
    -webkit-touch-callout: none;
  }

  .cw-reveal-block {
    opacity: 0;
    transform: translate3d(0, 16px, 0);
    transition:
      opacity 0.54s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.54s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-reveal-block[data-visible="true"] {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  @keyframes cwPulseBeacon {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.38; transform: scale(0.76); }
  }

  .cw-beacon {
    animation: cwPulseBeacon 2.2s ease-in-out infinite;
  }

  .cw-pane {
    transition:
      background-color 0.24s ease,
      border-color 0.24s ease,
      opacity 0.18s ease;
  }

  .cw-pane:active:not(:disabled) {
    opacity: 0.88;
  }

  .cw-pane:focus-visible {
    outline: 2px solid var(--cw-accent);
    outline-offset: -2px;
  }

  .cw-hero-media {
    transition: transform 0.85s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-hero-stage:hover .cw-hero-media {
    transform: scale(1.035);
  }

  .cw-pigment-col {
    flex: 1 1 0%;
    transition: flex-grow 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-pigment-stage:hover .cw-pigment-col:nth-child(2) { flex-grow: 1.55; }
  .cw-pigment-stage:hover .cw-pigment-col:nth-child(4) { flex-grow: 1.35; }

  .cw-blueprint-bg {
    background-image:
      linear-gradient(to right, var(--cw-grid) 1px, transparent 1px),
      linear-gradient(to bottom, var(--cw-grid) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .cw-blueprint-svg {
    transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-pane:hover .cw-blueprint-svg {
    transform: translate3d(5px, -2px, 0);
  }

  .cw-glide {
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-pane:hover:not(:disabled) .cw-glide,
  .cw-hero-stage:hover .cw-glide {
    transform: translate3d(4px, 0, 0);
  }

  .cw-dock-btn {
    transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.18s ease;
  }

  .cw-dock-btn:active:not(:disabled) {
    opacity: 0.84;
  }

  @media (prefers-reduced-motion: reduce) {
    .cw-reveal-block {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
    .cw-beacon {
      animation: none !important;
    }
    .cw-pane,
    .cw-hero-media,
    .cw-pigment-col,
    .cw-blueprint-svg,
    .cw-glide,
    .cw-dock-btn {
      transition: none !important;
    }
  }
`
