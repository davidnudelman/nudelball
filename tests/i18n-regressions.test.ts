import { describe, expect, it } from 'vitest';
import { LANG, t } from '../src/data/i18n';
import type { Settings } from '../src/types';

const REQUIRED_KEYS = [
  'preMatchTeamTalk',
  'autoSubWithCount',
  'noSubsLeft',
  'lowStaminaWarningTitle',
  'lowStaminaWarningMessage',
  'saveGameTitle',
  'saveGamePrompt',
  'gameSaved',
  'deleteSaveTitle',
  'deleteSavePrompt',
  'failedToLoadSave',
  'saveImported',
  'invalidSaveFile',
  'continueLabel',
  'matchSummary',
  'noGoalsScored',
  'teamTalkImpact',
  'matchSpeed',
  'skipHalf',
  'skipFull',
] as const;

describe('i18n regression coverage', () => {
  it('has all new UX and pacing keys in every language', () => {
    for (const lang of ['en', 'pt', 'es'] as const) {
      for (const key of REQUIRED_KEYS) {
        expect(LANG[lang][key], `${lang}.${key}`).toBeTypeOf('string');
        expect(LANG[lang][key].length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('interpolates dynamic strings for auto-sub count and stamina warning body', () => {
    const settings: Settings = {
      theme: 'dark',
      lang: 'en',
      strengthDisplay: 'none',
      volume: 0.5,
      muted: false,
    };

    expect(t(settings, 'autoSubWithCount', { count: '3' })).toContain('3');
    expect(
      t(settings, 'lowStaminaWarningMessage', {
        count: '2',
        names: 'A. Player (55%), B. Player (48%)',
      }),
    ).toContain('A. Player');
  });
});
