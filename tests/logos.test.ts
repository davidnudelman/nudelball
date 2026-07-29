import { describe, expect, it } from 'vitest';
import { logoSignature, randomTeamLogo, teamLogoSvg } from '../src/assets/logos';
import { TEAMS_DATA, WAITING_TEAMS_DATA } from '../src/config';

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

  it('assigns unique logo signatures across all configured teams', () => {
    const usedSignatures = new Set<string>();
    const allSeeds = [
      ...TEAMS_DATA.map(td => `${td.name}|${td.country}|${td.c1}|${td.c2}`),
      ...WAITING_TEAMS_DATA.map(td => `${td.name}|${td.country}|${td.c1}|${td.c2}`),
    ];

    for (const seed of allSeeds) {
      const logo = randomTeamLogo(seed, usedSignatures);
      usedSignatures.add(logoSignature(logo));
    }

    expect(usedSignatures.size).toBe(allSeeds.length);
  });
});
