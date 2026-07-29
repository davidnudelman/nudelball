import { describe, expect, it } from 'vitest';
import { randomTeamLogo, teamLogoSvg } from '../src/assets/logos';

describe('team logos', () => {
  it('generates deterministic logos from the same seed', () => {
    const seed = 'Lions FC|BR|#0A4DBF|#F5B700';
    expect(randomTeamLogo(seed)).toEqual(randomTeamLogo(seed));
  });

  it('generates valid SVG output for team colors', () => {
    const logo = randomTeamLogo('Bulls United|US|#AA0011|#111111');
    const svg = teamLogoSvg(logo, '#AA0011', '#111111');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.includes('viewBox="0 0 32 32"')).toBe(true);
    expect(svg.includes('currentColor')).toBe(true);
  });
});
