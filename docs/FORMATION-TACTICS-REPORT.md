# Formation & Tactics Impact Report

## How Match Simulation Works

Every match in Nudelball is resolved through an expected-goals (xG) model. Understanding this model is key to understanding how formations and tactics affect outcomes.

### The Core Formula

```
teamStrength = average(effectiveOVR of all 11 starters)

homeXG = max(0.3, (homeStrength - awayStrength) / 15 + homeTactic.homeBonus) × awayTactic.defPenalty
awayXG = max(0.3, (awayStrength - homeStrength) / 15 + awayTactic.awayBonus) × homeTactic.defPenalty
```

Goals are then drawn from a Poisson-like distribution around these xG values. Higher xG = more goals on average.

**Key takeaway:** Two things matter — **team strength** (driven by formation/squad) and **tactic multipliers**.

---

## Part 1: Formations

### How Formations Affect Team Strength

Formations don't directly modify xG. Instead, they affect the **effective OVR** of each player through position matching. This changes team strength, which changes xG.

### The Out-of-Position (OOP) Penalty System

Every player has a natural position. The position hierarchy is:

```
GK (0) → DEF (1) → MID (2) → STR (3)
```

| Situation           | Multiplier | Effective Skill Loss |
|---------------------|-----------|---------------------|
| Natural position    | 1.00 (0%)  | None                |
| 1 step away         | 0.85 (15%) | ~4-7 skill points   |
| 2 steps away        | 0.70 (30%) | ~8-14 skill points  |
| GK ↔ Any outfield   | 0.00       | Cannot play          |

**Example:** A skill-40 MID forced to play STR (1 step) → effective skill ~34.
A skill-40 MID forced to play DEF (1 step other way) → effective skill ~34.
A skill-40 DEF forced to play STR (2 steps) → effective skill ~28.

### The Effective OVR Formula

```
base = skill × (0.5 + 0.5 × stamina / 100)
freshBonus = benchStreak ≥ 3 ? 1.10 : 1.00
oopMultiplier = 1.0 - (positionDistance × 0.15)
formMultiplier = 1.0 + (form × 0.05)

effectiveOVR = round(base × freshBonus × oopMultiplier × formMultiplier)
// Capped at base skill value
```

### Available Formations

| Formation | GK | DEF | MID | STR | Style |
|-----------|---:|----:|----:|----:|-------|
| 3-3-4     | 1  | 3   | 3   | 4   | Ultra-attacking |
| 3-4-3     | 1  | 3   | 4   | 3   | Attacking |
| 3-5-2     | 1  | 3   | 5   | 2   | Midfield control |
| 4-3-3     | 1  | 4   | 3   | 3   | Wide attacking |
| **4-4-2** | 1  | 4   | 4   | 2   | **Classic balanced** |
| 4-5-1     | 1  | 4   | 5   | 1   | Defensive midfield |
| 5-3-2     | 1  | 5   | 3   | 2   | Solid defence |
| 5-4-1     | 1  | 5   | 4   | 1   | Ultra-defensive |

### Default Squad Composition

New teams start with: **2 GK / 7 DEF / 7 MID / 6 STR** (22 total, 11 starters)

### Formation Fit Analysis

For each formation, how many players can play in their natural position from a standard squad:

| Formation | DEF Fit | MID Fit | STR Fit | Total OOP | OOP Penalty Impact |
|-----------|---------|---------|---------|-----------|-------------------|
| **4-4-2** | 4/4 ✓  | 4/4 ✓  | 2/2 ✓  | **0**     | None              |
| 4-3-3     | 4/4 ✓  | 3/3 ✓  | 3/3 ✓  | **0**     | None              |
| 4-5-1     | 4/4 ✓  | 5/5 ✓  | 1/1 ✓  | **0**     | None              |
| 3-4-3     | 3/3 ✓  | 4/4 ✓  | 3/3 ✓  | **0**     | None (if 3+ STR available) |
| 5-3-2     | 5/5 ✓  | 3/3 ✓  | 2/2 ✓  | **0**     | None              |
| 5-4-1     | 5/5 ✓  | 4/4 ✓  | 1/1 ✓  | **0**     | None              |
| 3-5-2     | 3/3 ✓  | 5/5 ✓  | 2/2 ✓  | **0**     | None              |
| 3-3-4     | 3/3 ✓  | 3/3 ✓  | 4/4 ✓  | **0**     | None (if 4+ STR available) |

**Observation:** With 7 DEF, 7 MID, and 6 STR, most formations CAN be filled without OOP. The issue is whether your **best 11** fit the formation. If your top striker is injured, a 4-3-3 might force a MID into STR (15% penalty).

### Formation Tier List

**Tier S — Always Safe**
- **4-4-2:** Matches default squad perfectly. Your 4 best DEF, 4 best MID, 2 best STR. Maximum OVR contribution.

**Tier A — Situationally Strong**
- **4-3-3:** Great when you have 3+ high-skill strikers. Extra attacker adds firepower.
- **4-5-1:** Great when midfield is your deepest/strongest group. Requires one elite striker to carry.

**Tier B — Specialist Use**
- **3-5-2:** Midfield-heavy approach. Risky with only 3 defenders if they get injured.
- **5-3-2:** Defensive fortress. Best when protecting a lead or playing much stronger opponents.
- **5-4-1:** Ultra-defensive. Nearly guarantees low-scoring games.

**Tier C — High Risk**
- **3-4-3:** Needs 3 quality strikers AND only 3 defenders. Glass cannon.
- **3-3-4:** Needs 4 strikers and only 3 of everything else. Almost never optimal.

### Formation Impact: Worked Example

**Scenario:** Div 3 team, best 11 players with avg skill 28.

| Formation | Players in Position | Avg Effective OVR | Team Strength |
|-----------|--------------------|--------------------|---------------|
| 4-4-2     | 11/11              | 28.0               | 28.0          |
| 4-3-3     | 10/11 (1 MID→STR) | 27.1               | 27.1          |
| 5-4-1     | 11/11              | 28.0               | 28.0          |
| 3-3-4     | 9/11 (2 MID→STR)  | 26.2               | 26.2          |

**The 1.8-point drop from 4-4-2 to 3-3-4** translates to roughly **-0.12 xG per match** — over 14 games, that's ~1.7 fewer goals scored and roughly 1 fewer win. That could mean the difference between promotion and mid-table.

---

## Part 2: Tactics

### Tactic Multiplier Reference

| Tactic         | homeBonus | awayBonus | defPenalty | Net Style        |
|----------------|-----------|-----------|------------|------------------|
| All-Out Attack | 1.35      | 1.20      | 1.15       | High risk/reward |
| Balanced       | 1.15      | 1.00      | 1.00       | Neutral baseline |
| Counter-Attack | 0.95      | 0.90      | 0.90       | Slight defensive |
| Defensive      | 0.85      | 0.75      | 0.80       | Low-scoring      |

### How Tactics Modify xG

**Your goals:** `homeBonus` (home) or `awayBonus` (away) adds to your base xG.
**Opponent's goals:** Your `defPenalty` multiplies their xG (lower = better defence).

### Detailed Tactic Breakdown

#### All-Out Attack

```
Your xG:     +35% at home, +20% away (vs Balanced baseline)
Opponent xG: +15% (your defence is exposed)
```

**When to use:**
- Home vs weaker teams (maximize goal output)
- Cup matches (draws resolved by coin-flip — better to score)
- When chasing a result (losing in league standings)

**When to avoid:**
- Away vs stronger teams (you'll concede heavily)
- When protecting a good league position

**Expected outcomes vs equal opponent (home):**
- Your xG: ~1.35, Opponent xG: ~1.15
- Most likely result: 1-1 draw or 2-1 win
- High chance of 3+ goals total

#### Balanced

```
Your xG:     +15% at home, +0% away
Opponent xG: +0% (no change)
```

**When to use:**
- Default choice for most situations
- Away matches where you're roughly equal
- When you have no strong read on the opponent

**Expected outcomes vs equal opponent (home):**
- Your xG: ~1.15, Opponent xG: ~1.00
- Most likely result: 1-1 draw or 1-0 win
- Low variance — predictable results

#### Counter-Attack

```
Your xG:     -5% at home, -10% away
Opponent xG: -10% (your defence is organized)
```

**When to use:**
- Away vs slightly stronger teams (reduce their scoring while staying competitive)
- Home vs significantly stronger teams (grind a draw)
- When you have one elite striker who can score from limited chances

**Expected outcomes vs equal opponent (home):**
- Your xG: ~0.95, Opponent xG: ~0.90
- Most likely result: 1-0 or 0-0
- Low-scoring but slightly in your favour

#### Defensive

```
Your xG:     -15% at home, -25% away
Opponent xG: -20% (fortress mode)
```

**When to use:**
- Away vs much stronger teams (steal a 0-0 draw)
- Protecting a season-long position (a draw is acceptable)
- When your squad is weakened by injuries/suspensions

**Expected outcomes vs equal opponent (home):**
- Your xG: ~0.85, Opponent xG: ~0.80
- Most likely result: 0-0 or 1-0
- Lowest variance — fewest goals

### Tactic vs Tactic Matrix

Expected goal difference per match (home team perspective) when two equal-strength teams meet:

| Home \ Away      | All-Out Attack | Balanced | Counter-Attack | Defensive |
|------------------|:-:|:-:|:-:|:-:|
| **All-Out Attack** | +0.17 | +0.20 | +0.22 | +0.16 |
| **Balanced**       | +0.02 | +0.15 | +0.16 | +0.07 |
| **Counter-Attack** | -0.01 | +0.05 | +0.05 | -0.02 |
| **Defensive**      | -0.08 | -0.02 | +0.00 | +0.08 |

**Key findings:**
1. **All-Out Attack at home beats everything** — it has the highest goal advantage in every column
2. **Defensive vs Defensive** produces a slight home advantage (+0.08) — park-the-bus wars favour the home side
3. **Counter-Attack is the "draw machine"** — smallest margins in every matchup
4. **Balanced is the safest all-rounder** — positive advantage in most scenarios

### Tactic Decision Framework

```
IF (your team strength > opponent + 5):
    → All-Out Attack (dominate and score)
ELSE IF (your team strength ≈ opponent ± 5):
    → Home: Balanced | Away: Counter-Attack
ELSE IF (your team strength < opponent - 5):
    → Home: Counter-Attack | Away: Defensive
ELSE IF (must-win match):
    → All-Out Attack (accept risk for reward)
```

---

## Part 3: Combined Formation + Tactic Strategies

### Strategy Profiles

#### "Park the Bus" — 5-4-1 + Defensive

- **xG Impact:** Very low scoring both ways
- **Best for:** Away matches against Div 1 teams when you're from Div 2
- **Expected result:** 0-0 or 0-1 loss
- **Points gained:** High draw rate = steady 1-point accumulation

#### "Classic Football" — 4-4-2 + Balanced

- **xG Impact:** Moderate, balanced output
- **Best for:** Standard matches against equal opponents
- **Expected result:** 1-1 or 1-0
- **Points gained:** Consistent mix of wins and draws

#### "Blitz" — 4-3-3 + All-Out Attack

- **xG Impact:** Highest offensive output
- **Best for:** Home matches against weaker teams, must-win situations
- **Expected result:** 2-1 or 3-2
- **Points gained:** High win rate but also higher loss rate

#### "Counter Punch" — 5-3-2 + Counter-Attack

- **xG Impact:** Slightly below average both ways, defensive lean
- **Best for:** Away matches against stronger opponents
- **Expected result:** 0-0 or 1-0
- **Points gained:** Good at stealing draws and narrow wins

#### "Midfield Domination" — 3-5-2 + Balanced

- **xG Impact:** Moderate, reliant on midfield quality
- **Best for:** Teams with deep, high-skill midfield groups
- **Expected result:** 1-0 or 1-1
- **Points gained:** Control-oriented, low variance

---

## Part 4: Seasonal Strategy by Division

### Division 4 (Weakest Competition)

| Match Type          | Formation | Tactic         |
|---------------------|-----------|----------------|
| Home vs anyone      | 4-4-2     | All-Out Attack |
| Away vs bottom half | 4-4-2     | Balanced       |
| Away vs top teams   | 4-4-2     | Balanced       |
| Cup matches         | 4-4-2     | All-Out Attack |

**Rationale:** You should be competitive against everyone. Maximize goals.

### Division 3 (Mixed Quality)

| Match Type             | Formation | Tactic         |
|------------------------|-----------|----------------|
| Home vs bottom half    | 4-4-2     | All-Out Attack |
| Home vs top teams      | 4-4-2     | Balanced       |
| Away vs bottom half    | 4-4-2     | Balanced       |
| Away vs top teams      | 4-5-1     | Counter-Attack |
| Cup vs higher division | 4-5-1     | Counter-Attack |

### Division 2 (The Wall)

| Match Type             | Formation | Tactic         |
|------------------------|-----------|----------------|
| Home vs bottom half    | 4-4-2     | Balanced       |
| Home vs top teams      | 4-5-1     | Counter-Attack |
| Away vs bottom half    | 4-4-2     | Counter-Attack |
| Away vs top teams      | 5-4-1     | Defensive      |
| Cup vs Div 1 teams     | 5-3-2     | Counter-Attack |

### Division 1 (Elite)

| Match Type             | Formation | Tactic         |
|------------------------|-----------|----------------|
| Home vs bottom half    | 4-3-3     | All-Out Attack |
| Home vs top teams      | 4-4-2     | Balanced       |
| Away vs bottom half    | 4-4-2     | Balanced       |
| Away vs top teams      | 4-5-1     | Defensive      |
| Cup final              | 4-4-2     | All-Out Attack |

---

## Appendix: Key Numbers

| Metric                        | Value         |
|-------------------------------|---------------|
| OOP penalty per step          | 15%           |
| Form impact per point         | ±5% OVR      |
| Fresh bonus (3+ bench games)  | +10% OVR     |
| Stamina at 100%               | Full skill    |
| Stamina at 50%                | 75% skill     |
| Stamina at 0%                 | 50% skill     |
| Min xG floor                  | 0.30          |
| Strength diff of 15           | ±1.0 xG shift |
| Home advantage (All-Out)      | +0.35 xG     |
| Defence bonus (Defensive)     | -20% opp xG  |
