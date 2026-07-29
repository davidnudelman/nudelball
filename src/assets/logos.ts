import type { TeamLogo, TeamLogoMotif, TeamLogoShape } from '../types';

const SHAPES: TeamLogoShape[] = ['shield', 'circle', 'hex', 'diamond', 'pennant'];
const MOTIFS: TeamLogoMotif[] = ['paw', 'ball', 'wings', 'horns', 'stripe', 'star'];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function randomTeamLogo(seed: string): TeamLogo {
  const h = hashSeed(seed);
  return {
    shape: SHAPES[h % SHAPES.length],
    motif: MOTIFS[Math.floor(h / 7) % MOTIFS.length],
    variant: Math.floor(h / 29) % 4,
  };
}

function shapePath(shape: TeamLogoShape): string {
  switch (shape) {
    case 'circle':
      return `<circle cx="16" cy="16" r="13.4" />`;
    case 'hex':
      return `<polygon points="16,2.5 27.5,9 27.5,23 16,29.5 4.5,23 4.5,9" />`;
    case 'diamond':
      return `<polygon points="16,2.5 29,16 16,29.5 3,16" />`;
    case 'pennant':
      return `<path d="M4 2.5 h20 l4 13.5 -4 13.5 H4 Z" />`;
    case 'shield':
    default:
      return `<path d="M16 2.5 L27.5 7.5 V17.8 C27.5 24.2 22.2 28.4 16 30.1 C9.8 28.4 4.5 24.2 4.5 17.8 V7.5 Z" />`;
  }
}

function motifSvg(motif: TeamLogoMotif, variant: number): string {
  switch (motif) {
    case 'ball':
      return `<circle cx="16" cy="16" r="${5.6 + variant * 0.2}" fill="none" stroke="currentColor" stroke-width="1.8"/>` +
        `<polygon points="16,11 18.1,12.5 17.3,15 14.7,15 13.9,12.5" fill="currentColor" opacity="0.75"/>` +
        `<path d="M11.2 18.6 l2.1-1.2 M20.8 18.6 l-2.1-1.2 M16 22.3 v-2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
    case 'wings':
      return `<path d="M8.2 19.5 C9 14.2, 10.6 12.4, 15 12.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
        `<path d="M23.8 19.5 C23 14.2, 21.4 12.4, 17 12.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
        `<circle cx="16" cy="17.2" r="1.8" fill="currentColor"/>`;
    case 'horns':
      return `<path d="M11.2 11.8 C9.8 10, 10.2 7.8, 12.8 7.2 C12.4 8.8, 12.5 10.1, 13.9 11.2" fill="currentColor"/>` +
        `<path d="M20.8 11.8 C22.2 10, 21.8 7.8, 19.2 7.2 C19.6 8.8, 19.5 10.1, 18.1 11.2" fill="currentColor"/>` +
        `<path d="M12.2 21 C13.2 17.2, 14.9 15.4, 16 15.4 C17.1 15.4, 18.8 17.2, 19.8 21 Z" fill="currentColor" opacity="0.8"/>`;
    case 'stripe':
      return `<rect x="11.1" y="7.5" width="2.4" height="17" rx="1.1" fill="currentColor"/>` +
        `<rect x="14.8" y="7.5" width="2.4" height="17" rx="1.1" fill="currentColor" opacity="0.85"/>` +
        `<rect x="18.5" y="7.5" width="2.4" height="17" rx="1.1" fill="currentColor" opacity="0.7"/>`;
    case 'star':
      return `<polygon points="16,8.2 18.2,13.1 23.5,13.6 19.4,16.9 20.6,22.1 16,19.2 11.4,22.1 12.6,16.9 8.5,13.6 13.8,13.1" fill="currentColor"/>`;
    case 'paw':
    default:
      return `<circle cx="16" cy="18" r="3.4" fill="currentColor"/>` +
        `<circle cx="11.5" cy="13.6" r="1.6" fill="currentColor"/>` +
        `<circle cx="14.3" cy="11.8" r="1.6" fill="currentColor"/>` +
        `<circle cx="17.7" cy="11.8" r="1.6" fill="currentColor"/>` +
        `<circle cx="20.5" cy="13.6" r="1.6" fill="currentColor"/>`;
  }
}

export function teamLogoSvg(logo: TeamLogo, c1: string, c2: string): string {
  const bgPath = shapePath(logo.shape);
  const motif = motifSvg(logo.motif, logo.variant);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<g fill="${c1}" stroke="rgba(0,0,0,0.35)" stroke-width="1">${bgPath}</g>` +
    `<g fill="${c2}" opacity="0.35">${bgPath}</g>` +
    `<g style="color:#ffffff;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35))">${motif}</g>` +
    `</svg>`;
}
