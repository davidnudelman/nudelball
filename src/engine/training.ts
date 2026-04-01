/**
 * Training system module — handles weekly training effects for all teams.
 *
 * Human player training:
 * - **Balanced**: All positions get a training bonus.
 * - **Fitness**: Players recover stamina; skill training chance halved.
 * - **Development**: Skill growth bonus, favours youth (under 22).
 *
 * AI team training:
 * - Runs at a reduced base rate (60% of human base) with no focus bonuses
 *   or facility upgrades. This prevents the human player from compounding
 *   an insurmountable skill advantage over AI teams across seasons.
 */

import type { GameState, Player, Position, TrainingFocus } from '../types';
import { TRAINING_FOCUS_BONUS, TRAINING_SKILL_CHANCE, TRAINING_FACILITY_BONUS } from '../config';
import { clamp, rand } from './player';

/** AI teams train at this fraction of the human base skill chance */
const AI_TRAINING_RATE = 0.60;

// ---------------------------------------------------------------------------
// Training Application
// ---------------------------------------------------------------------------

/**
 * Apply weekly training effects to the human player's squad.
 *
 * For each non-injured player, a base chance (`TRAINING_SKILL_CHANCE` = 12%)
 * determines whether they gain +1 skill. Additional modifiers:
 *
 * - **Balanced**: All players get the focus bonus (+8%).
 * - **Fitness**: Players recover 5-12 extra stamina; skill chance halved.
 * - **Development**: All players get +8% bonus; youth (under 22) get
 *   an additional +8% (total +16%).
 *
 * An optional `difficultyMultiplier` scales the base chance.
 *
 * @param G - The game state (mutated in-place — player skills may increase).
 * @param difficultyMultiplier - Optional multiplier on the base training chance.
 */
export const applyTraining = (G: GameState, difficultyMultiplier: number = 1.0): void => {
  if (G.playerTeamId == null) return;

  const pt = G.teams[G.playerTeamId];
  const focus: TrainingFocus = G.trainingFocus || 'balanced';

  for (const p of pt.players) {
    /* Injured players don't train */
    if (p.injuredFor > 0) continue;

    /* Training facility bonus (#7) */
    const facilityBonus = (G.facilities?.trainingFacility ?? 0) * TRAINING_FACILITY_BONUS;
    let chance = (TRAINING_SKILL_CHANCE + facilityBonus) * difficultyMultiplier;

    if (focus === 'balanced') {
      /* Balanced: all positions get the focus bonus */
      chance += TRAINING_FOCUS_BONUS;
    } else if (focus === 'fitness') {
      /* Fitness: recover stamina, halve skill chance */
      p.stamina = Math.min(100, p.stamina + rand(5, 12));
      chance *= 0.5;
    } else if (focus === 'development') {
      /* Development: all players get bonus; youth get double */
      chance += TRAINING_FOCUS_BONUS;
      if ((p.age || 25) < 22) {
        chance += TRAINING_FOCUS_BONUS;
      }
    }

    /* Roll for skill improvement */
    if (Math.random() < chance) {
      p.skill = clamp(p.skill + 1, 1, 50);
    }
  }
};

/**
 * Apply simplified weekly training to all AI teams.
 *
 * AI teams train at a reduced rate (60% of the human base chance) with no
 * focus bonuses or facility upgrades. This keeps AI teams competitive across
 * seasons without giving them the same strategic depth as the human player.
 *
 * @param G - The game state (mutated in-place — AI player skills may increase).
 */
export const applyAITraining = (G: GameState): void => {
  const chance = TRAINING_SKILL_CHANCE * AI_TRAINING_RATE;

  for (const tm of G.teams) {
    /* Skip the human player's team (they get full training) */
    if (tm.id === G.playerTeamId) continue;
    /* Only train teams in active divisions */
    if (tm.div < 1 || tm.div > 4) continue;

    for (const p of tm.players) {
      if (p.injuredFor > 0) continue;
      if (Math.random() < chance) {
        p.skill = clamp(p.skill + 1, 1, 50);
      }
    }
  }
};
