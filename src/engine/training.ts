/**
 * Training system module — handles weekly training effects for the
 * human player's squad.
 *
 * Training applies a chance-based skill improvement to each player,
 * with bonuses depending on the selected training focus. The difficulty
 * multiplier can scale the base training chance to make higher difficulties
 * harder (less skill growth) or lower difficulties easier (more growth).
 */

import type { GameState, Player, Position, TrainingFocus } from '../types';
import { TRAINING_FOCUS_BONUS, TRAINING_SKILL_CHANCE } from '../config';
import { clamp, rand } from './player';

// ---------------------------------------------------------------------------
// Focus → Position Mapping
// ---------------------------------------------------------------------------

/** Maps each training focus to the position groups that receive a bonus chance. */
const FOCUS_POSITIONS: Record<TrainingFocus, readonly Position[]> = {
  attack: ['STR'],
  defence: ['DEF', 'GK'],
  fitness: [],       /* fitness focus recovers stamina instead of targeting positions */
  youth: [],         /* youth focus targets age-based bonus instead of positions */
  balanced: ['GK', 'DEF', 'MID', 'STR'],
};

// ---------------------------------------------------------------------------
// Training Application
// ---------------------------------------------------------------------------

/**
 * Apply weekly training effects to the human player's squad.
 *
 * For each non-injured player, a base chance (`TRAINING_SKILL_CHANCE` = 12%)
 * determines whether they gain +1 skill. Additional modifiers:
 *
 * - **Position focus** (attack/defence/balanced): players matching the focus
 *   position get an extra 8% chance.
 * - **Youth focus**: players under 22 get an extra 8% chance (regardless of
 *   position).
 * - **Fitness focus**: players recover 5-12 extra stamina, but skill chance
 *   is halved (6%).
 *
 * An optional `difficultyMultiplier` scales the base chance. At difficulty
 * 1.0 (normal), training is unchanged. At 0.75, training is 25% less
 * effective. At 1.25, 25% more effective.
 *
 * @param G - The game state (mutated in-place — player skills may increase).
 * @param difficultyMultiplier - Optional multiplier on the base training chance
 *                               (default 1.0). Values > 1 = easier, < 1 = harder.
 */
export const applyTraining = (G: GameState, difficultyMultiplier: number = 1.0): void => {
  if (G.playerTeamId == null) return;

  const pt = G.teams[G.playerTeamId];
  const focus: TrainingFocus = G.trainingFocus || 'balanced';
  const bonusPos = FOCUS_POSITIONS[focus] || [];

  for (const p of pt.players) {
    /* Injured players don't train */
    if (p.injuredFor > 0) continue;

    let chance = TRAINING_SKILL_CHANCE * difficultyMultiplier;

    /* Bonus chance for players matching the focus position */
    if (bonusPos.includes(p.pos)) {
      chance += TRAINING_FOCUS_BONUS;
    }

    /* Youth focus: extra chance for players under 22 */
    if (focus === 'youth' && (p.age || 25) < 22) {
      chance += TRAINING_FOCUS_BONUS;
    }

    /* Fitness focus: recover extra stamina instead of skill */
    if (focus === 'fitness') {
      p.stamina = Math.min(100, p.stamina + rand(5, 12));
      chance *= 0.5; /* half skill chance when focusing on fitness */
    }

    /* Roll for skill improvement */
    if (Math.random() < chance) {
      p.skill = clamp(p.skill + 1, 1, 50);
    }
  }
};
