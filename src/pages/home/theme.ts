import type { HomePalette } from './types'

export function getHomePalette(isDark: boolean): HomePalette {
  if (isDark) {
    return {
      isDark: true,
      bg: '#09090B',
      bgMesh:
        'radial-gradient(ellipse 70% 45% at 85% 0%, rgba(212, 163, 115, 0.11) 0%, transparent 60%), radial-gradient(ellipse 55% 40% at 5% 30%, rgba(56, 189, 248, 0.05) 0%, transparent 55%)',
      headerBg: 'rgba(9, 9, 11, 0.76)',
      surface: '#131316',
      surfaceElevated: '#1A1A1F',
      surfaceHover: '#222228',
      surfaceSubtle: 'rgba(255, 255, 255, 0.055)',
      cardioBg:
        'linear-gradient(135deg, #161518 0%, #0E0E11 55%, #111827 100%)',
      tributeBg:
        'linear-gradient(125deg, rgba(212, 163, 115, 0.14) 0%, #131316 65%)',
      text: '#F5F4F0',
      textMuted: 'rgba(245, 244, 240, 0.64)',
      textSubtle: 'rgba(245, 244, 240, 0.38)',
      border: 'rgba(255, 255, 255, 0.085)',
      borderStrong: 'rgba(255, 255, 255, 0.18)',
      shadowCard:
        '0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 14px 36px -16px rgba(0, 0, 0, 0.75)',
      shadowHero:
        '0 1px 0 rgba(255, 255, 255, 0.12) inset, 0 28px 64px -20px rgba(0, 0, 0, 0.85)',
      accentBronze: '#D4A373',
      accentBronzeSoft: 'rgba(212, 163, 115, 0.16)',
      accentRed: '#F04E37',
      pillActiveBg: '#F5F4F0',
      pillActiveText: '#09090B',
      pillActiveBorder: '#F5F4F0',
    }
  }

  return {
    isDark: false,
    bg: '#ECEAE4',
    bgMesh:
      'radial-gradient(ellipse 75% 45% at 90% -5%, rgba(196, 148, 98, 0.16) 0%, transparent 58%), radial-gradient(ellipse 60% 40% at 8% 28%, rgba(255, 255, 255, 0.85) 0%, transparent 60%)',
    headerBg: 'rgba(236, 234, 228, 0.78)',
    surface: '#F7F6F2',
    surfaceElevated: '#FFFFFF',
    surfaceHover: '#EFECE5',
    surfaceSubtle: 'rgba(17, 17, 20, 0.05)',
    cardioBg:
      'linear-gradient(135deg, #171619 0%, #111114 58%, #151C2B 100%)',
    tributeBg:
      'linear-gradient(125deg, rgba(168, 118, 68, 0.15) 0%, #F7F6F2 68%)',
    text: '#111114',
    textMuted: 'rgba(17, 17, 20, 0.62)',
    textSubtle: 'rgba(17, 17, 20, 0.42)',
    border: 'rgba(17, 17, 20, 0.085)',
    borderStrong: 'rgba(17, 17, 20, 0.18)',
    shadowCard:
      '0 1px 0 rgba(255, 255, 255, 0.85) inset, 0 10px 28px -14px rgba(17, 17, 20, 0.14)',
    shadowHero:
      '0 1px 0 rgba(255, 255, 255, 0.16) inset, 0 24px 56px -18px rgba(17, 17, 20, 0.34)',
    accentBronze: '#A6723F',
    accentBronzeSoft: 'rgba(166, 114, 63, 0.13)',
    accentRed: '#D93B26',
    pillActiveBg: '#111114',
    pillActiveText: '#F5F4F0',
    pillActiveBorder: '#111114',
  }
}

export const HOME_STYLE_SHEET = `
  .cw-home-root * {
    -webkit-tap-highlight-color: transparent !important;
    -webkit-touch-callout: none;
  }

  .cw-reveal-block {
    opacity: 0;
    transform: translate3d(0, 18px, 0);
    transition:
      opacity 0.56s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.56s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-reveal-block[data-visible="true"] {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  @keyframes cwPulseBeacon {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.78); }
  }

  .cw-beacon {
    animation: cwPulseBeacon 2.2s ease-in-out infinite;
  }

  .cw-interactive {
    transition:
      background-color 0.22s ease,
      border-color 0.22s ease,
      box-shadow 0.26s ease,
      transform 0.26s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.18s ease;
  }

  .cw-interactive:hover:not(:disabled) {
    transform: translate3d(0, -2px, 0);
  }

  .cw-interactive:active:not(:disabled) {
    transform: translate3d(0, 0, 0);
    opacity: 0.9;
  }

  .cw-interactive:focus-visible {
    outline: 2px solid var(--cw-accent);
    outline-offset: 2px;
  }

  .cw-hero-media {
    transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-hero-stage:hover .cw-hero-media {
    transform: scale(1.03);
  }

  .cw-spectrum-strip {
    flex: 1 1 0%;
    transition: flex-grow 0.38s cubic-bezier(0.22, 1, 0.36, 1), filter 0.28s ease;
  }

  .cw-spectrum-block:hover .cw-spectrum-strip:nth-child(2) { flex-grow: 1.45; }
  .cw-spectrum-block:hover .cw-spectrum-strip:nth-child(4) { flex-grow: 1.3; }

  .cw-cad-grid {
    background-image: radial-gradient(circle, var(--cw-dot) 1px, transparent 1px);
    background-size: 16px 16px;
  }

  .cw-cad-svg {
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-interactive:hover .cw-cad-svg {
    transform: translate3d(3px, 0, 0);
  }

  .cw-glide {
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-interactive:hover:not(:disabled) .cw-glide {
    transform: translate3d(3px, 0, 0);
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
    .cw-interactive,
    .cw-hero-media,
    .cw-spectrum-strip,
    .cw-cad-svg,
    .cw-glide {
      transition: none !important;
    }
  }
`
