# Implementation Plan — Game Improvements

Based on [GAME-IMPROVEMENTS.md](./GAME-IMPROVEMENTS.md), this plan covers all improvements **except #16 (Historical League Tables)** and **#20 (Season Simulation Speed)**.

---

## Phase 1: Core Gameplay — High Impact

### 1. Dynamic AI Tactics (#1)
**Files:** `src/engine/match.ts`, `src/config.ts`, `src/types.ts`

**Steps:**
1. Add a `tacticPreference` field to the `Team` interface (or compute it dynamically).
2. Create `selectAITactic(team, opponent, isHome, leaguePosition)` in `match.ts`.
3. Logic considerations:
   - Weaker team vs stronger → lean `defensive` or `counter`.
   - Home team → more likely `balanced` or `attack`.
   - Bottom-of-table team → bias toward `attack` (desperate).
   - Top-of-table team → bias toward `defensive` (protect lead).
4. Replace the current hardcoded AI tactic (always `balanced`) with the new function in `simulateMatch()`.
5. Optionally show the AI's chosen tactic in the match view for transparency.

**Dependencies:** None.

---

### 2. Half-Time Tactical Changes (#2)
**Files:** `src/engine/match.ts`, `src/engine/match-animation.ts`, `src/ui/views/match-view.ts`

**Steps:**
1. Split match simulation into two halves (`simulateHalf()`).
2. At half-time during animated matches, pause and show a tactical overlay:
   - Allow changing tactic (attack/balanced/defensive/counter).
   - Allow 1-2 substitutions (swap bench player for starter).
3. Re-simulate the second half with updated tactic and lineup.
4. For non-animated (quick sim) matches, auto-play both halves with the same tactic.
5. Update match events to track which half they belong to.

**Dependencies:** Benefits from #11 (Substitution System).

---

### 3. Substitution System (#11)
**Files:** `src/engine/match.ts`, `src/engine/match-animation.ts`, `src/types.ts`, `src/ui/views/match-view.ts`

**Steps:**
1. Add `maxSubs` constant to `config.ts` (default: 3).
2. In animated matches, allow manual substitutions at half-time (UI overlay).
3. Implement auto-substitution logic for injured players during matches:
   - Find best available bench player for the injured player's position.
   - Apply the existing `subbedIn` bonus (+10% rating).
4. Track substitutions used in `G.matchSubs` (already exists).
5. Reduce team effective strength when a player is injured and no sub is available.

**Dependencies:** None (already partially implemented with `matchSubs` and `subbedIn`).

---

### 4. Stadium Upgrades / Facilities (#7)
**Files:** `src/types.ts`, `src/config.ts`, `src/engine/season.ts`, `src/engine/training.ts`, `src/engine/player.ts`, `src/ui/views/dashboard.ts` (or new `facilities.ts` view)

**Steps:**
1. Add `Facilities` interface to `types.ts`:
   ```ts
   interface Facilities {
     trainingFacility: number; // 0-3 level
     youthAcademy: number;     // 0-3 level
     stadium: number;          // 0-3 level
   }
   ```
2. Add `facilities` field to `GameState`.
3. Add facility costs and effects to `config.ts`:
   - Training Facility: $5,000/$8,000/$12,000 → +3%/+5%/+7% training effectiveness.
   - Youth Academy: $8,000/$13,000/$20,000 → regens start with +2/+4/+6 skill.
   - Stadium: $10,000/$17,000/$25,000 → +$500/+$1,000/+$1,500 base income.
4. Create a Facilities UI section (new tab or sub-section of Dashboard).
5. Hook into `training.ts` for training facility bonus.
6. Hook into `player.ts` (`makePlayer`) for youth academy regen bonus.
7. Hook into `transfers.ts` (`awardSeasonIncome`) for stadium income bonus.

**Dependencies:** None.

---

## Phase 2: Medium Impact Features

### 5. Pre-Match Opponent Scouting (#3)
**Files:** `src/ui/views/match-view.ts` (or `dashboard.ts`), `src/engine/match.ts`

**Steps:**
1. Before each match, show a scouting report panel:
   - Opponent overall strength (approximate range, e.g., "Strong" / "Average" / "Weak").
   - Recent form (last 3-5 results, win/loss streak).
   - Preferred formation (from `team.aiFormation`).
   - Key player (highest-rated player name + position + OVR).
2. Calculate opponent form from `seasonStats` (wins vs losses ratio).
3. Display alongside the tactic selection before kick-off.

**Dependencies:** None.

---

### 6. Morale / Team Chemistry (#4)
**Files:** `src/types.ts`, `src/config.ts`, `src/engine/match.ts`, `src/engine/season.ts`

**Steps:**
1. Add `morale` field to `Team` interface (range: -10 to +10, default 0).
2. Morale modifiers:
   - Win: +1, Loss: -1, Draw: 0.
   - Promotion: +5, Relegation: -5.
   - Cup win: +3, Cup elimination: -1.
   - Selling popular player (top scorer): -2.
3. Apply morale as a team strength multiplier in `teamStrength()`:
   - `1 + (morale * 0.005)` → ±5% at extremes.
4. Decay morale toward 0 by 1 point per week (slow regression to mean).
5. Display morale on Dashboard with descriptive label (Euphoric/Happy/Neutral/Low/Crisis).

**Dependencies:** None.

---

### 7. Loan System (#8)
**Files:** `src/types.ts`, `src/config.ts`, `src/engine/transfers.ts`, `src/ui/views/market.ts`

**Steps:**
1. Add `LoanPlayer` interface:
   ```ts
   interface LoanPlayer {
     player: Player;
     fromTeamId: number;
     loanFee: number;
     returnSeason: number;
   }
   ```
2. Add `loans` array to `GameState`.
3. Loan fee = 30% of market value.
4. Restrict loans: can't loan from same-division teams.
5. Add "Loan Market" tab in the Market view showing available players from higher divisions.
6. At season end (`endOfSeason`), return all loaned players to their parent clubs.
7. Loaned players count toward squad size but can't be sold.

**Dependencies:** None.

---

### 8. Youth Academy Pipeline (#14)
**Files:** `src/engine/season.ts`, `src/engine/player.ts`, `src/types.ts`, `src/ui/views/squad.ts`

**Steps:**
1. At season start, generate 1-2 youth prospects (age 16-17).
2. Quality scales with division and youth academy facility level:
   - Base skill = `DIV_RANGE[div][0] + rand(0, 5) + (youthAcademyLevel * 2)`.
3. Show prospects in a "Youth Academy" section on Squad view.
4. Player can "Promote" (add to first team) or "Release" each prospect.
5. Released prospects may appear as free agents next season.

**Dependencies:** Benefits from #4 (Stadium Upgrades) for youth academy level.

---

### 9. Manager Reputation System (#12)
**Files:** `src/types.ts`, `src/engine/season.ts`, `src/ui/views/trophy-room.ts`

**Steps:**
1. Already partially implemented via Records milestones and badges.
2. Add `managerReputation` computed value based on:
   - Win % (weighted).
   - Trophies won.
   - Promotions achieved.
   - Seasons managed.
3. Reputation tiers: Novice → Amateur → Semi-Pro → Professional → World-Class → Legend.
4. Higher reputation = better free agents available (filter free agent pool by rep level).
5. Display manager profile card in Trophy Room with stats summary.

**Dependencies:** None (builds on existing Records).

---

### 10. Auto-Rotation / Squad Rules (#19)
**Files:** `src/types.ts`, `src/engine/match.ts`, `src/ui/views/squad.ts`

**Steps:**
1. Add `squadRules` to `GameState`:
   ```ts
   interface SquadRules {
     restBelowStamina: number | null;  // e.g., 40
     alwaysStartBest: boolean;
     rotateGK: number | null;          // e.g., every 3 matches
   }
   ```
2. Add a "Squad Rules" panel in the Squad view with toggles/sliders.
3. Before each match, if rules are active, auto-select lineup based on rules:
   - Replace tired players (stamina < threshold) with best available bench player.
   - If `alwaysStartBest`, auto-pick highest OVR players.
4. Manual override always available (player can still manually select).

**Dependencies:** None.

---

### 11. Player Roles / Specializations (#5)
**Files:** `src/types.ts`, `src/config.ts`, `src/engine/player.ts`, `src/engine/match.ts`, `src/ui/views/squad.ts`

**Steps:**
1. Add `role` field to `Player` interface:
   ```ts
   type PlayerRole = 'playmaker' | 'targetMan' | 'ballWinner' | 'speedster' | 'creator' | 'anchor' | null;
   ```
2. Assign roles randomly at player generation (weighted by position).
3. Define role-tactic synergies in config:
   - `playmaker` + `balanced` → +3% bonus.
   - `targetMan` + `attack` → +5% bonus.
   - `ballWinner` + `defensive` → +4% bonus.
   - `speedster` + `counter` → +5% bonus.
4. Apply synergy bonus in `teamStrength()` calculation.
5. Display role as a secondary badge on player cards in Squad view.

**Dependencies:** None.

---

## Phase 3: Match Experience

### 12. Match Commentary Depth (#9)
**Files:** `src/engine/match-animation.ts`, `src/data/coach-comments.ts` (or new `commentary.ts`)

**Steps:**
1. Create a commentary template system with contextual variants:
   - Equalizer: "EQUALIZER! {player} levels it at {score} in the {minute}th minute!"
   - Late goal: "{player} scores in stoppage time! What drama!"
   - Hat-trick: "HAT-TRICK! {player} completes their treble!"
   - Red card impact: "Red card! {team} down to {count} men!"
   - Opening goal, comeback goal, insurance goal templates.
2. Track match context (score, time, hat-trick count) during animation.
3. Replace generic event text with contextual commentary in the match ticker.
4. Add "near miss" and "great save" filler events between goals for drama.

**Dependencies:** None.

---

### 13. Red Card Match Impact (#10)
**Files:** `src/engine/match.ts`

**Steps:**
1. When a red card occurs mid-match, flag the sent-off player.
2. Recalculate team effective strength for remaining match time:
   - Remove the sent-off player's OVR from the team average.
   - Apply a small additional penalty (e.g., -5%) for disruption.
3. Already partially tracked via `G.matchRedCards` — extend to affect second-half simulation.
4. Show visual indicator in match view ("10 men" badge next to team name).

**Dependencies:** Benefits from #2 (Half-Time system, two-half simulation).

---

## Phase 4: Financial & Transfer Enhancements

### 14. Sponsorship Deals (#6)
**Files:** `src/types.ts`, `src/config.ts`, `src/engine/season.ts`, `src/ui/views/dashboard.ts`

**Steps:**
1. Add `Sponsorship` interface and `activeSponsor` to `GameState`:
   ```ts
   interface Sponsorship {
     name: string;
     incomePerSeason: number;
     cupBonusPerRound: number;
     requiredDiv: number;        // minimum division to qualify
     duration: number;           // seasons remaining
   }
   ```
2. Define sponsor tiers in config:
   - Small: $500/season, no requirement, always available.
   - Medium: $1,000/season, requires Div 3+.
   - Large: $2,000/season, requires Div 1.
   - Cup: $500 bonus per cup round advanced.
3. Offer sponsor selection at season start/end (UI overlay or Dashboard section).
4. Apply sponsor income in `awardSeasonIncome()`.
5. If relegated below required division, lose the sponsor at season end.

**Dependencies:** None.

---

### 15. Transfer Negotiation (#17)
**Files:** `src/engine/transfers.ts`, `src/ui/views/market.ts`

**Steps:**
1. When buying a player, show a negotiation dialog instead of instant purchase:
   - AI seller's initial ask = market value × (1.1 to 1.3, random).
   - Player can accept, counter-offer, or walk away.
   - 2-3 rounds maximum.
   - Each counter reduces the gap by ~50%.
2. Manager reputation (from #9) affects starting ask:
   - High reputation → lower starting ask (AI respects you).
3. Add a "Walk Away" option that may trigger the AI to accept a lower final offer (30% chance).
4. Keep the existing instant-buy as a "Buy Now" option at the higher price.

**Dependencies:** Benefits from #9 (Manager Reputation) for ask adjustments.

---

### 16. Scout Network (#18)
**Files:** `src/types.ts`, `src/config.ts`, `src/engine/transfers.ts`, `src/ui/views/market.ts`

**Steps:**
1. Add `scoutLevel` to `GameState` (0 = basic, 1 = full, 2 = hidden gems).
2. Filter visible transfer market players by scout level:
   - Level 0: Only see players from your division + adjacent division.
   - Level 1 ($2,000): See all divisions.
   - Level 2 ($3,000): Occasionally find "hidden gems" (skill higher than division average).
3. Add "Upgrade Scouts" button in Market view with cost display.
4. Generate hidden gem players when scout level 2 is active (1-2 per season, above-average skill).

**Dependencies:** None.

---

## Phase 5: Progression & Narrative

### 17. Rivals & Derby Matches (#13)
**Files:** `src/data/teams.ts`, `src/types.ts`, `src/engine/match.ts`, `src/ui/views/calendar.ts`, `src/ui/views/dashboard.ts`

**Steps:**
1. Define rival pairs in teams data (by geography/country):
   - Barcelona ↔ Madrid, Manchester ↔ Liverpool, Porto ↔ Lisbon, etc.
2. Add `rivals` field to `Team` (array of team IDs).
3. Derby match effects:
   - Double form bonus/penalty for results.
   - +2 morale boost for derby win (if morale system exists).
   - Highlight derby fixtures in calendar with a special icon.
4. Show derby results in season-end summary.

**Dependencies:** Benefits from #6 (Morale System).

---

### 18. Season Awards Ceremony (#15)
**Files:** `src/engine/season.ts`, `src/ui/components/nav.ts` (season-end overlay)

**Steps:**
1. At season end, calculate awards from existing data:
   - **Division MVP:** Highest average match contribution (goals + assists proxy).
   - **Golden Boot:** Top scorer per division (already tracked in `topScorers`).
   - **Best Young Player:** Under-21 with most skill improvement this season.
   - **Team of the Season:** Best XI across the division (top player per position by OVR).
   - **Your Player of the Season:** Best performer on your team.
2. Display awards in the season-end overlay as a dedicated section.
3. Store awards in `SeasonHistory` for the history view.

**Dependencies:** None.

---

## Implementation Priority Order

| Order | Feature | Improvement # | Impact | Estimated Complexity |
|-------|---------|---------------|--------|---------------------|
| 1 | Substitution System | #11 | High | Medium |
| 2 | Half-Time Tactical Changes | #2 | High | High |
| 3 | Dynamic AI Tactics | #1 | High | Medium |
| 4 | Stadium Upgrades | #7 | High | High |
| 5 | Pre-Match Scouting | #3 | Medium | Low |
| 6 | Red Card Match Impact | #10 | Medium | Low |
| 7 | Match Commentary Depth | #9 | Medium | Medium |
| 8 | Morale System | #4 | Medium | Medium |
| 9 | Season Awards Ceremony | #15 | Low-Medium | Low |
| 10 | Manager Reputation | #12 | Medium | Medium |
| 11 | Player Roles | #5 | Medium | Medium |
| 12 | Youth Academy Pipeline | #14 | Medium | Medium |
| 13 | Auto-Rotation | #19 | Medium | Low |
| 14 | Sponsorship Deals | #6 | Medium | Medium |
| 15 | Loan System | #8 | Medium | Medium |
| 16 | Rivals & Derbies | #13 | Low-Medium | Low |
| 17 | Transfer Negotiation | #17 | Low-Medium | Medium |
| 18 | Scout Network | #18 | Medium | Medium |

---

## Notes

- **Save compatibility:** New fields added to `GameState` must have sensible defaults so existing saves still load. Use `G.newField ?? defaultValue` patterns.
- **i18n:** All new user-facing strings must be added to all 3 languages (EN, PT, ES) in `src/data/i18n.ts`.
- **Testing:** Each feature should include at least basic Vitest tests for the core logic.
- **Incremental delivery:** Features are designed to be independent where possible, allowing them to be implemented and shipped one at a time.
