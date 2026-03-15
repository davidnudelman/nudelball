/**
 * League management module — handles fixture generation, standings
 * calculations, and empty stats creation.
 *
 * The round-robin fixture generator creates a double round-robin schedule
 * (home-and-away) for each division independently.
 */

import type { Fixture, GameState, Stats, Team } from '../types';

// ---------------------------------------------------------------------------
// Empty Stats
// ---------------------------------------------------------------------------

/**
 * Create an empty stats object with all counters at zero.
 *
 * Used when initialising a new team or resetting season stats.
 *
 * @returns A fresh Stats object with all values set to 0.
 */
export const emptyStats = (): Stats => ({
  p: 0,
  w: 0,
  d: 0,
  l: 0,
  gf: 0,
  ga: 0,
  pts: 0,
});

// ---------------------------------------------------------------------------
// Fixture Generation
// ---------------------------------------------------------------------------

/**
 * Generate a full double round-robin fixture schedule for all divisions.
 *
 * Uses the "rotate-one-keep-fixed" algorithm:
 * 1. Fix the first team in place.
 * 2. Rotate all other teams through the remaining slots.
 * 3. Each rotation produces one round of pairings.
 * 4. First pass = home fixtures, second pass = reversed (away fixtures).
 *
 * This produces `(N-1) * 2` match-weeks per division, where N = teams per div.
 * For 8 teams, that's 14 match-weeks.
 *
 * The resulting fixture map is keyed by division number (1-4), with each
 * value being an array of match-weeks, where each match-week is an array
 * of Fixture objects.
 *
 * @param G - The game state (mutated: G.fixtures is overwritten).
 */
export const generateFixtures = (G: GameState): void => {
  G.fixtures = {};

  for (let d = 1; d <= 4; d++) {
    const divTeams = G.teams.filter(tm => tm.div === d);
    if (divTeams.length < 2) continue;

    const n = divTeams.length;
    const ids = divTeams.map(tm => tm.id);
    const half = Math.floor(n / 2);
    const fixed = ids[0];
    const rotating = ids.slice(1);

    /* Generate single round-robin rounds */
    const rounds: Array<Array<[number, number]>> = [];
    for (let r = 0; r < n - 1; r++) {
      const round: Array<[number, number]> = [];
      const current = [fixed, ...rotating];
      for (let i = 0; i < half; i++) {
        round.push([current[i], current[n - 1 - i]]);
      }
      rotating.push(rotating.shift()!);
      rounds.push(round);
    }

    /* Build double round-robin: first pass home, second pass reversed */
    const divFix: Fixture[][] = [];

    for (const round of rounds) {
      divFix.push(
        round.map(([h, a]) => ({
          home: h,
          away: a,
          homeGoals: null,
          awayGoals: null,
          events: [],
        })),
      );
    }

    for (const round of rounds) {
      divFix.push(
        round.map(([h, a]) => ({
          home: a,
          away: h,
          homeGoals: null,
          awayGoals: null,
          events: [],
        })),
      );
    }

    G.fixtures[d] = divFix;
  }
};

// ---------------------------------------------------------------------------
// Standings / Sorted Division
// ---------------------------------------------------------------------------

/**
 * Get teams in a division sorted by league standings.
 *
 * Sorting priority:
 * 1. Points (descending)
 * 2. Goal difference (descending)
 * 3. Goals scored (descending)
 *
 * @param G - The game state.
 * @param div - Division number (1-4).
 * @returns Array of teams sorted by standing position.
 */
export const getSortedDiv = (G: GameState, div: number): Team[] => {
  return G.teams
    .filter(tm => tm.div === div)
    .sort((a, b) => {
      if (b.seasonStats.pts !== a.seasonStats.pts) {
        return b.seasonStats.pts - a.seasonStats.pts;
      }
      const gdA = a.seasonStats.gf - a.seasonStats.ga;
      const gdB = b.seasonStats.gf - b.seasonStats.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.seasonStats.gf - a.seasonStats.gf;
    });
};
