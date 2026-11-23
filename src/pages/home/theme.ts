
import type { HomePalette } from './types'

export function getHomePalette(isDark: boolean): HomePalette {
  if (isDark) {
    return {
      isDark: true,
      bg: '#0C0B0A',
      bgMesh:
        'radial-gradient(ellipse 80% 50% at 85% -5%, rgba(212, 163, 115, 0.13) 0%, transparent 62%), radial-gradient(ellipse 65% 45% at 10% 35%, rgba(59, 130, 246, 0.06) 0%, transparent 58%)',
      headerBg: 'rgba(12, 11, 10, 0.72)',
      surface: '#151311',
      surfaceElevated: '#1C1916',
      surfaceHover: '#231F1B',
      surfaceSubtle: 'rgba(247, 243, 236, 0.045)',
      cardioBg:
        'linear-gradient(145deg, #1E1A16 0%, #161412 52%, #131822 100%)',
      tributeBg:
        'linear-gradient(135deg, rgba(212, 163, 115, 0.12) 0%, rgba(21, 19, 17, 0.96) 68%)',
      text: '#F7F3EC',
      textMuted: 'rgba(247, 243, 236, 0.66)',
      textSubtle: 'rgba(247, 243, 236, 0.42)',
      border: 'rgba(247, 243, 236, 0.09)',
      borderStrong: 'rgba(247, 243, 236, 0.22)',
      shadowCard:
        '0 1px 0 rgba(255, 248, 236, 0.06) inset, 0 12px 32px -12px rgba(0, 0, 0, 0.65)',
      shadowHero:
        '0 1px 0 rgba(255, 248, 236, 0.12) inset, 0 24px 56px -18px rgba(0, 0, 0, 0.78)',
      accentBronze: '#D4A373',
      accentBronzeSoft: 'rgba(212, 163, 115, 0.16)',
      accentRed: '#E04F3E',
      pillActiveBg: '#F7F3EC',
      pillActiveText: '#141210',
      pillActiveBorder: '#F7F3EC',
    }
  }

  return {
    isDark: false,
    bg: '#F5F2EC',
    bgMesh:
      'radial-gradient(ellipse 85% 55% at 88% -8%, rgba(180, 132, 82, 0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 45% at 8% 42%, rgba(255, 255, 255, 0.75) 0%, transparent 62%)',
    headerBg: 'rgba(245, 242, 236, 0.78)',
    surface: '#FFFFFF',
    surfaceElevated: '#FCFAF6',
    surfaceHover: '#F3EEE6',
    surfaceSubtle: 'rgba(20, 18, 16, 0.04)',
    cardioBg:
      'linear-gradient(145deg, #FFFFFF 0%, #F7F2EA 58%, #EEF1F7 100%)',
    tributeBg:
      'linear-gradient(135deg, rgba(162, 114, 64, 0.11) 0%, #FFFFFF 70%)',
    text: '#141210',
    textMuted: 'rgba(20, 18, 16, 0.62)',
    textSubtle: 'rgba(20, 18, 16, 0.42)',
    border: 'rgba(20, 18, 16, 0.08)',
    borderStrong: 'rgba(20, 18, 16, 0.20)',
    shadowCard:
      '0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 10px 28px -12px rgba(28, 22, 16, 0.10), 0 2px 6px rgba(28, 22, 16, 0.04)',
    shadowHero:
      '0 1px 0 rgba(255, 255, 255, 0.18) inset, 0 24px 52px -16px rgba(24, 18, 12, 0.28)',
    accentBronze: '#9A6B3B',
    accentBronzeSoft: 'rgba(154, 107, 59, 0.12)',
    accentRed: '#C83A2B',
    pillActiveBg: '#141210',
    pillActiveText: '#F7F3EC',
    pillActiveBorder: '#141210',
  }
}

export const HOME_STYLE_SHEET = `
  .cw-home-root * {
    -webkit-tap-highlight-color: transparent !important;
    -webkit-touch-callout: none;
  }

  @keyframes cwRevealUp {
    from {
      opacity: 0;
      transform: translate3d(0, 14px, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes cwPulseDot {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.45;
      transform: scale(0.82);
    }
  }

  .cw-reveal {
    animation: cwRevealUp 0.52s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .cw-delay-1 { animation-delay: 0.05s; }
  .cw-delay-2 { animation-delay: 0.11s; }
  .cw-delay-3 { animation-delay: 0.17s; }
  .cw-delay-4 { animation-delay: 0.23s; }

  .cw-card {
    transition:
      background-color 0.24s ease,
      border-color 0.24s ease,
      box-shadow 0.28s ease,
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-card:hover:not(:disabled) {
    transform: translate3d(0, -2px, 0);
  }

  .cw-card:active:not(:disabled) {
    transform: translate3d(0, 0, 0);
    opacity: 0.92;
  }

  .cw-card:focus-visible {
    outline: 2px solid var(--cw-accent);
    outline-offset: 2px;
  }

  .cw-arrow {
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease;
  }

  .cw-card:hover:not(:disabled) .cw-arrow {
    transform: translate3d(2px, -2px, 0);
  }

  .cw-swatch-fan > span {
    transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .cw-card:hover .cw-swatch-fan > span:nth-child(1) { transform: translate3d(-4px, 0, 0) rotate(-7deg); }
  .cw-card:hover .cw-swatch-fan > span:nth-child(2) { transform: translate3d(-2px, -2px, 0) rotate(-3deg); }
  .cw-card:hover .cw-swatch-fan > span:nth-child(4) { transform: translate3d(2px, -2px, 0) rotate(3deg); }
  .cw-card:hover .cw-swatch-fan > span:nth-child(5) { transform: translate3d(4px, 0, 0) rotate(7deg); }

  .cw-live-dot {
    animation: cwPulseDot 2.2s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .cw-reveal,
    .cw-live-dot {
      animation: none !important;
    }
    .cw-card,
    .cw-arrow,
    .cw-swatch-fan > span {
      transition: none !important;
    }
  }
`
