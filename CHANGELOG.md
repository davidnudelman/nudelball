# Changelog

All notable changes to Park the Bus will be documented in this file.

## [0.91.0] - 2026-04-05

### Added
- **Menu locking during match simulation** — navigation is blocked while a match is in progress, preventing the bug where subsequent matches would skip simulation
- **Immersive match screen** — full-screen simulation page with pitch gradient background, goal pulse animations, and match summary at full-time
- **Team talk system** — 12 possible team talks with 5 randomly presented per match; each has unique effects on morale, attack/defense bonuses, stamina drain, yellow card risk, form boost, and more
- **Auto-sub at half-time** — option to automatically substitute the most tired/weakest starters with the best available bench players
- **Glass morphism UI** — semi-transparent card surfaces with backdrop-filter blur applied globally to top bar, nav bar, cards, and overlays
- **Global pitch gradient background** — the match screen's gradient now persists across all views with `background-attachment: fixed`
- **Nav active glow** — subtle green glow on the active navigation button
- **Keyboard shortcut guards** — D/S/T/C/G/M/B/H/R/P keys blocked during match simulation; Space still works for HT/FT continue

### Fixed
- **Simulation skip bug** — removed speed control feature that caused closure state corruption, breaking simulation on subsequent matches
- **Duplicate football emoji** — "Play Week X" button no longer shows two football emojis
- **Match score readability** — score text changed to white with text-shadow for better contrast against the gradient background
- **Build failure** — `activeTeamTalk` made optional on `GameState` so existing test fixtures compile

### Changed
- Half-time and full-time buttons repositioned closer to the match score for easier access on mobile
- Font sizes tightened across breakpoints (15px base, 14px tablet, 13px phone) for better mobile compatibility
- Surface CSS variables switched to semi-transparent `rgba()` values for glass effect
- Light theme receives a soft green gradient variant
- Top bar title font reduced from 1.15rem to 1rem

## [0.90.0] and earlier

See commit history for previous changes.
