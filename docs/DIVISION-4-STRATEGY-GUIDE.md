# Division 4 to Division 1: Strategy Guide

## Overview

This guide is based on a deep analysis of the Nudelball game engine. Every number, formula, and recommendation is derived from the actual codebase — not guesswork.

**The goal:** Climb from Division 4 to Division 1 and build a dynasty.
**Minimum path:** 3 seasons (Div 4 → 3 → 2 → 1).
**Realistic path:** 5-8 seasons with smart management.

---

## Understanding Your Starting Position

### Division 4 Player Quality

| Division | Skill Range | Average |
|----------|------------|---------|
| Div 1    | 28–46      | ~37     |
| Div 2    | 24–40      | ~32     |
| Div 3    | 20–34      | ~27     |
| **Div 4** | **16–28** | **~22** |

Your best player is about as good as Div 1's worst. But that's fine — you only need to beat 6 other Div 4 teams.

### Division 4 Finances

| Revenue Source         | Amount                    |
|------------------------|---------------------------|
| Base season income     | $1,000                    |
| Win bonus              | $350 per win              |
| Draw bonus             | $100 per draw             |
| Best-case (14W)        | ~$5,900/season            |
| Typical (8W 3D 3L)     | ~$4,100/season            |
| Starting budget        | $10,000                   |

**Key insight:** Div 4 has the **highest per-result bonuses** in the game ($350/win vs Div 1's $100/win). The engine rewards winning at lower levels proportionally more.

---

## Phase 1: Foundation (Seasons 1-2)

### Squad Assessment

Your 22-player squad breaks down as: 2 GK / 7 DEF / 7 MID / 6 STR.

**Step 1: Sort your players by skill.**
- **Core players (skill 24-28):** These are your starters. Protect them.
- **Youth prospects (age 16-20):** These are your future. Develop them.
- **Dead weight (skill 16-18, age 28+):** Sell these immediately.

### Training: Youth Focus

This is the single most important decision in Season 1.

**Training math:**
- Base training chance: 12% per player per week
- Youth focus bonus: +8% for players under 22
- Total for young players: **20% per week**
- Over 14 match weeks: ~2.8 expected skill gains from training
- Plus development curve at season end: 50% chance of +1 to +3 (ages 16-20)

**A skill-18 youngster can realistically reach skill 24-28 in 2 seasons through training + development alone.** This is free squad improvement with zero transfer spend.

### Formation: 4-4-2

The default squad composition (7 DEF, 7 MID, 6 STR) fits 4-4-2 perfectly with **zero out-of-position penalties**. Any other formation will force at least one player out of position, costing 15-30% of their effective rating.

### Tactics: Aggression at Home, Discipline Away

| Situation        | Tactic           | Why                                           |
|------------------|------------------|-----------------------------------------------|
| Home matches     | All-Out Attack   | 1.35x expected goals — opponents are weak     |
| Away matches     | Balanced         | 1.00x away bonus, no defensive risk           |
| Cup matches      | All-Out Attack   | Draws go to coin-flip; better to win outright |

### Transfer Strategy

**Priority 1: Use the free agent market.**
- Free agents can have skill up to 35 — way above Div 4's 28 cap
- A single skill-35 signing in a skill-22 squad is transformative
- Check free agents every transfer window; sign the best available

**Priority 2: Sell dead weight.**
- Players with skill 16-18 and age 28+ have no future
- Sell value = 65% of market value (skill² × 50 / 100)
- A skill-18 player sells for ~$100 — not much, but every dollar counts
- Minimum squad size is 19, so you can sell up to 3 players

**Priority 3: Target Div 3 rejects.**
- AI teams offer 2-4 players from their bottom 60%
- Div 3 bottom players have skill ~20-24 — still useful depth for Div 4
- Price: skill × 100 × 1.0 (Div 4 multiplier) — a skill-24 player costs ~$2,400

### Stamina Management

**This is where most new managers fail.**

- Players lose 8-15 stamina per match
- At 50% stamina, a player performs at only 75% of their skill
- **Below 50 stamina: 25% chance of permanent -1 skill loss**
- Bench players recover +20 stamina per match they sit out

**Rotation rule:** Never start the same player more than 3 matches in a row. Keep 2 players per position and alternate them.

### Season 1-2 Target

- **League:** Finish top 2 → Promotion ($2,500 bonus)
- **Cup:** Win if possible ($1,000 prize) — Div 4 teams can upset higher divisions
- **Squad:** Develop 3-4 youth players to skill 24+
- **Budget:** End season with $8,000+ for Div 3 signings

---

## Phase 2: Climbing Through Div 3 (Seasons 3-5)

### The Step Up

Div 3 opponents have skill 20-34. Your trained squad should be around 22-30. **You're competitive but not dominant.**

### Spending the Promotion Bonus

The $2,500 promotion bonus is the biggest single payout in the game. Spend it on:
- 1 elite signing (skill 30+) for your weakest position group
- OR 2 solid signings (skill 26-28) for depth

### Training Shift

Switch from "Youth" to "Attack" or "Balanced":
- **Attack:** +8% bonus for STR players — your strikers score more, gain form faster
- **Balanced:** +8% for all positions — best for overall squad improvement

### Tactical Adjustments

Div 3 opponents are competent. Adjust your approach:

| Opponent Strength | Tactic          | Formation |
|-------------------|-----------------|-----------|
| Bottom 3 teams    | All-Out Attack  | 4-4-2     |
| Mid-table teams   | Balanced        | 4-4-2     |
| Top 2 teams       | Counter-Attack  | 4-5-1     |

### Financial Discipline

| Income Source         | Div 3 Amount |
|-----------------------|--------------|
| Base income           | $2,000       |
| Win bonus             | $250/win     |
| Draw bonus            | $80/draw     |
| Solidarity payments   | ~$60-130     |

Div 3 teams receive **solidarity payments** from Div 1's top 2 teams (random $500-1,000 pool split among all Div 3-4 teams). It's not much, but it's free money.

---

## Phase 3: The Division 2 Wall (Seasons 5-8)

### Why This Is the Hardest Phase

- Div 2 opponents: skill 24-40 (your range: ~28-35)
- **No solidarity payments** — only Div 3-4 teams receive them
- Base income: $3,500 (decent but not great)
- You're too good for Div 3 but possibly not good enough for consistent Div 2 top-2 finishes

### Survival Strategy

**Don't try to win the league immediately.** Aim for mid-table safety first.

**Formation: 4-5-1 or 5-4-1**
- More defenders/midfielders = higher average team strength
- One elite striker (skill 35+) handles all attacking output
- Avoids spreading thin across 3-4 attacking slots

**Tactic: Defensive away, Counter-Attack at home**
- Defensive reduces opponent goals by 20% (0.80 defPenalty)
- Drawing 8 and winning 4 in a 14-game season = 20 points — often enough for safety

### The Form Snowball

Form ranges from -3 to +3. Each point = ±5% effective OVR.

**A 3-game winning streak gives your starters +3 form = +15% effective OVR.**

A skill-35 player with +3 form plays like a skill-40 player. This is how you punch above your weight. Conversely, a losing streak (-3 form) makes skill-35 play like skill-30 — devastating.

**Protect winning streaks at all costs.** Play your strongest lineup in home games to build momentum.

### The Fresh Bonus Exploit

Players benched for 3+ consecutive matches get **+10% OVR** when selected.

**Strategy:** Rotate your best player deliberately. Bench them for 3 games, then start them for a crucial match. A skill-38 player with fresh bonus plays like skill-42.

### Age Management

By season 5-8, your original squad is aging:
- Original 18-year-olds are now 23-26 (prime years, 5% improvement chance)
- Original 25-year-olds are now 30-33 (20-40% decline chance)
- Original 30-year-olds are now 35-38 (60% decline or **retired**)

**Start replacing 30+ players NOW.** Young regens (18 years old) enter at genSkill(currentDiv), so Div 2 regens have skill 24-40 — immediately useful.

---

## Phase 4: Breaking Into Division 1 (Seasons 8-12)

### What You Need

To finish top 2 in Div 2, you need:
- A squad average skill of ~34-36
- At least 3 players with skill 38+
- Depth to handle injuries/suspensions (25% chance of -1 skill if stamina dips)

### Transfer Market at This Stage

| Player Skill | Market Value | Sell Value (65%) |
|-------------|-------------|------------------|
| 35          | $600        | $400             |
| 40          | $800        | $500             |
| 45          | $1,000      | $650             |

**Buy young (18-22) high-skill players.** They'll develop further.
**Sell aging (30+) players** before decline wipes their value.

### The Final Push

Once you have a squad capable of challenging for top 2:
- Play **All-Out Attack at home** against bottom teams (maximize goal difference for tiebreakers)
- Play **Counter-Attack away** against top teams (steal draws)
- **Cup success** adds $1,000 — fund your last signing

---

## Phase 5: Division 1 Dynasty (Seasons 12-20)

### Staying Power

Div 1 is the most financially stable division:

| Revenue       | Amount              |
|---------------|---------------------|
| Base income   | $5,000/season       |
| Win bonus     | $100/win            |
| Champion prize| $500                |
| Runner-up     | $100                |

You also **pay** solidarity ($500-1,000 if top 2) — a tax on success.

### Avoiding Relegation

Bottom 2 in Div 1 get relegated. With the $1,500 parachute payment, it's recoverable, but it sets you back 1-2 seasons.

**Key:** Rotate ruthlessly. Injuries and fatigue in Div 1 are campaign-ending. Keep all 22 players match-fit.

### Winning Titles

- Points tiebreaker: goal difference, then goals scored
- All-Out Attack at home vs bottom teams generates the goal difference you need
- Defensive away vs the other top-2 contender minimizes losses
- **Cup double** (league + cup) is the ultimate achievement

---

## Quick Reference: Season-by-Season Checklist

| Season | Division | Priority | Formation | Home Tactic | Away Tactic | Training |
|--------|----------|----------|-----------|-------------|-------------|----------|
| 1      | Div 4    | Promote  | 4-4-2     | All-Out Attack | Balanced | Youth |
| 2      | Div 4/3  | Promote  | 4-4-2     | All-Out Attack | Balanced | Youth |
| 3-4    | Div 3    | Promote  | 4-4-2     | Balanced    | Counter-Attack | Attack |
| 5-7    | Div 2    | Survive  | 4-5-1     | Counter-Attack | Defensive | Balanced |
| 8-10   | Div 2/1  | Promote  | 4-4-2     | All-Out Attack | Counter-Attack | Balanced |
| 11-20  | Div 1    | Titles   | 4-4-2     | All-Out Attack | Defensive | Balanced |

---

## Common Mistakes

1. **Not rotating players** → Stamina drops below 50 → Permanent skill loss
2. **Ignoring youth development** → Missing free +3 skill/season gains
3. **Overspending on transfers** → Budget crisis, can't replace retiring players
4. **Playing All-Out Attack away vs stronger teams** → Concede too many goals
5. **Keeping aging players too long** → Skill decline erases seasons of development
6. **Neglecting the cup** → $1,000 prize is massive in lower divisions
7. **Wrong formation for your squad** → OOP penalties silently cripple performance
