import type { TeamLogo, TeamLogoMotif, TeamLogoShape } from '../types';

const SHAPES: TeamLogoShape[] = ['shield', 'circle', 'hex', 'diamond', 'pennant', 'octagon', 'badge', 'banner'];
const MOTIFS: TeamLogoMotif[] = ['paw', 'ball', 'wings', 'horns', 'stripe', 'star', 'claw', 'crown', 'helmet', 'bolt'];
const VARIANT_COUNT = 24;
const LOGO_CATALOG: TeamLogo[] = [];

for (const shape of SHAPES) {
  for (const motif of MOTIFS) {
    for (let variant = 0; variant < VARIANT_COUNT; variant++) {
      LOGO_CATALOG.push({ shape, motif, variant });
    }
  }
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function logoSignature(logo: TeamLogo): string {
  return `${logo.shape}|${logo.motif}|${logo.variant}`;
}

export function randomTeamLogo(seed: string, usedSignatures?: ReadonlySet<string>): TeamLogo {
  const h = hashSeed(seed);
  const catalogLength = LOGO_CATALOG.length;
  const startIndex = h % catalogLength;

  if (!usedSignatures || usedSignatures.size === 0) {
    return { ...LOGO_CATALOG[startIndex] };
  }

  for (let offset = 0; offset < catalogLength; offset++) {
    const candidate = LOGO_CATALOG[(startIndex + offset) % catalogLength];
    if (!usedSignatures.has(logoSignature(candidate))) {
      return { ...candidate };
    }
  }

  return { ...LOGO_CATALOG[startIndex] };
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
    case 'octagon':
      return `<polygon points="10,2.5 22,2.5 29.5,10 29.5,22 22,29.5 10,29.5 2.5,22 2.5,10" />`;
    case 'badge':
      return `<path d="M6.5 2.5 h19 c2.2 0 4 1.8 4 4 v12.4 c0 4.9-4.2 9-13.5 11.3 C6.7 27.9 2.5 23.8 2.5 18.9 V6.5 c0-2.2 1.8-4 4-4 Z" />`;
    case 'banner':
      return `<path d="M4 4 h24 v18 H19 l-3 6 -3-6 H4 Z" />`;
    case 'shield':
    default:
      return `<path d="M16 2.5 L27.5 7.5 V17.8 C27.5 24.2 22.2 28.4 16 30.1 C9.8 28.4 4.5 24.2 4.5 17.8 V7.5 Z" />`;
  }
}

function motifSvg(motif: TeamLogoMotif, variant: number): string {
  const turn = ((variant % 7) - 3) * 2.4;
  const scale = 0.9 + ((variant % 5) * 0.04);
  const shiftY = (variant % 3) - 1;
  let motifCore: string;

  switch (motif) {
    case 'ball':
      motifCore = `<circle cx="16" cy="16" r="${5.1 + ((variant % 6) * 0.35)}" fill="none" stroke="currentColor" stroke-width="1.8"/>` +
        `<polygon points="16,11 18.1,12.5 17.3,15 14.7,15 13.9,12.5" fill="currentColor" opacity="0.75"/>` +
        `<path d="M11.2 18.6 l2.1-1.2 M20.8 18.6 l-2.1-1.2 M16 22.3 v-2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
      break;
    case 'wings':
      motifCore = `<path d="M8.2 19.5 C9 14.2, 10.6 12.4, 15 12.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
        `<path d="M23.8 19.5 C23 14.2, 21.4 12.4, 17 12.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
        `<circle cx="16" cy="17.2" r="1.8" fill="currentColor"/>`;
      break;
    case 'horns':
      motifCore = `<path d="M11.2 11.8 C9.8 10, 10.2 7.8, 12.8 7.2 C12.4 8.8, 12.5 10.1, 13.9 11.2" fill="currentColor"/>` +
        `<path d="M20.8 11.8 C22.2 10, 21.8 7.8, 19.2 7.2 C19.6 8.8, 19.5 10.1, 18.1 11.2" fill="currentColor"/>` +
        `<path d="M12.2 21 C13.2 17.2, 14.9 15.4, 16 15.4 C17.1 15.4, 18.8 17.2, 19.8 21 Z" fill="currentColor" opacity="0.8"/>`;
      break;
    case 'stripe':
      motifCore = `<rect x="11.1" y="7.5" width="2.4" height="17" rx="1.1" fill="currentColor"/>` +
        `<rect x="14.8" y="7.5" width="2.4" height="17" rx="1.1" fill="currentColor" opacity="0.85"/>` +
        `<rect x="18.5" y="7.5" width="2.4" height="17" rx="1.1" fill="currentColor" opacity="0.7"/>`;
      break;
    case 'star':
      motifCore = `<polygon points="16,8.2 18.2,13.1 23.5,13.6 19.4,16.9 20.6,22.1 16,19.2 11.4,22.1 12.6,16.9 8.5,13.6 13.8,13.1" fill="currentColor"/>`;
      break;
    case 'claw':
      motifCore = `<path d="M10.2 22.3 C11.7 18.9 12 14.9 10.7 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M15.2 23 C16.6 19.2 16.9 14.6 15.8 10.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M20.3 22.3 C21.7 18.8 22.1 14.8 20.8 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
      break;
    case 'crown':
      motifCore = `<path d="M8.5 22.5 L8.5 12.8 L12.3 16.1 L16 10.6 L19.7 16.1 L23.5 12.8 L23.5 22.5 Z" fill="currentColor"/>` +
        `<rect x="8.5" y="21.2" width="15" height="2.1" fill="currentColor" opacity="0.78"/>`;
      break;
    case 'helmet':
      motifCore = `<path d="M9.4 18.6 C9.4 12.8 12.2 9.5 16.1 9.5 C20.8 9.5 23.4 13.1 23.4 18.2 L19.5 18.2 C19.5 14.9 18.2 13 16.1 13 C14 13 12.9 14.7 12.9 17.8 V22.6 H9.4 Z" fill="currentColor"/>` +
        `<rect x="17.6" y="18.6" width="5.8" height="3.2" rx="1.2" fill="currentColor" opacity="0.78"/>`;
      break;
    case 'bolt':
      motifCore = `<polygon points="17.9,7.4 11.1,17 15.8,17 13.9,24.6 21.1,14.4 16.5,14.4" fill="currentColor"/>`;
      break;
    case 'paw':
    default:
      motifCore = `<circle cx="16" cy="18" r="3.4" fill="currentColor"/>` +
        `<circle cx="11.5" cy="13.6" r="1.6" fill="currentColor"/>` +
        `<circle cx="14.3" cy="11.8" r="1.6" fill="currentColor"/>` +
        `<circle cx="17.7" cy="11.8" r="1.6" fill="currentColor"/>` +
        `<circle cx="20.5" cy="13.6" r="1.6" fill="currentColor"/>`;
      break;
  }

  const ringWidth = 0.9 + ((variant % 4) * 0.3);
  const ring = `<circle cx="16" cy="16" r="${11.6 - ((variant % 3) * 0.6)}" fill="none" stroke="currentColor" stroke-width="${ringWidth}" opacity="0.35"/>`;
  return `<g transform="rotate(${turn} 16 16) translate(0 ${shiftY}) scale(${scale})">${motifCore}${ring}</g>`;
}

export function teamLogoSvg(logo: TeamLogo, c1: string, c2: string): string {
  const bgPath = shapePath(logo.shape);
  const motif = motifSvg(logo.motif, logo.variant);
  const shadeOpacity = (0.2 + ((logo.variant % 6) * 0.08)).toFixed(2);
  const slashX = 6 + ((logo.variant % 5) * 4);
  const slashWidth = 4 + ((logo.variant % 4) * 1.2);
  const accent = `<rect x="${slashX}" y="3" width="${slashWidth}" height="26" rx="2.2" fill="${c2}" opacity="0.22"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<g fill="${c1}" stroke="rgba(0,0,0,0.35)" stroke-width="1">${bgPath}</g>` +
    `<g fill="${c2}" opacity="${shadeOpacity}">${bgPath}</g>` +
    `<g>${accent}</g>` +
    `<g style="color:#ffffff;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35))">${motif}</g>` +
    `</svg>`;
}
