/**
 * office-visuals.ts -- Inline SVG illustration builders for the Office page.
 *
 * Each builder returns an SVG string representing a facility or sponsorship
 * tile that visually evolves with each upgrade level. The illustrations are
 * intentionally simple, monochromatic-on-coloured-background scenes that read
 * well at small sizes and animate softly via CSS hover effects.
 *
 * Design notes:
 * - All scenes are drawn on a 200x110 viewBox so cards can scale freely.
 * - Each level adds detail to the previous scene rather than replacing it,
 *   reinforcing the sense of growth as the player invests in their club.
 * - Colours use CSS variables defined in main.css so the visuals respect
 *   light/dark themes.
 */

/* ================================================================
   STADIUM SCENE
   ================================================================
   Level 0 -- bare pitch with a single small grandstand.
   Level 1 -- single tier on both sides + small floodlights.
   Level 2 -- two tiers, full perimeter, larger floodlights.
   Level 3 -- three-tier arena with roof, big floodlights, corner flags. */

/**
 * Build the stadium SVG illustration for a given upgrade level.
 *
 * @param level - Current stadium level (0..3)
 * @returns Complete inline SVG markup
 */
export function stadiumScene(level: number): string {
  const lv = Math.max(0, Math.min(3, level | 0));

  /* Sky / background gradient -- tints get richer as the stadium grows */
  const skyTop = ['#1f2a3a', '#1f3a4a', '#1f4a5a', '#1d5a6a'][lv];
  const skyBot = ['#15202b', '#15252b', '#15302b', '#15352b'][lv];
  const grass = ['#2a5a2e', '#2e6432', '#316f36', '#34803a'][lv];

  let s = '';
  s += `<svg class="of-scene of-scene-stadium" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`;
  s += `<defs>`;
  s += `<linearGradient id="of-sky-${lv}" x1="0" y1="0" x2="0" y2="1">`;
  s += `<stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/>`;
  s += `</linearGradient>`;
  s += `</defs>`;

  /* Sky */
  s += `<rect width="200" height="110" fill="url(#of-sky-${lv})"/>`;

  /* Floodlights -- only visible from level 1 onwards */
  if (lv >= 1) {
    /* Two lights at level 1, four at level 2/3 */
    const lightCount = lv >= 2 ? 4 : 2;
    const lightHeight = 18 + lv * 4;
    const lightSpacing = 200 / (lightCount + 1);
    for (let i = 1; i <= lightCount; i++) {
      const x = lightSpacing * i;
      const topY = 70 - lightHeight;
      /* Pole */
      s += `<line x1="${x}" y1="70" x2="${x}" y2="${topY}" stroke="#9aa6b2" stroke-width="1.2"/>`;
      /* Lamp head */
      s += `<rect x="${x - 4}" y="${topY - 3}" width="8" height="3" rx="1" fill="#cad3df"/>`;
      /* Light glow */
      s += `<ellipse cx="${x}" cy="${topY - 2}" rx="${4 + lv * 1.5}" ry="${2 + lv * 0.5}" fill="#fff7c2" opacity="${0.25 + lv * 0.1}"/>`;
    }
  }

  /* Pitch / grass area */
  s += `<rect x="0" y="78" width="200" height="32" fill="${grass}"/>`;
  /* Centre circle */
  s += `<circle cx="100" cy="94" r="6" fill="none" stroke="#b9c8d2" stroke-width="0.6" opacity="0.6"/>`;
  s += `<line x1="100" y1="80" x2="100" y2="108" stroke="#b9c8d2" stroke-width="0.5" opacity="0.4"/>`;

  /* Stands -- left + right depending on level */
  if (lv === 0) {
    /* A tiny single grandstand on the left side */
    s += `<polygon points="10,78 60,78 56,68 14,68" fill="#3a4658" stroke="#1a212b" stroke-width="0.6"/>`;
    /* A few seat lines */
    s += `<line x1="14" y1="71" x2="56" y2="71" stroke="#5b6878" stroke-width="0.4"/>`;
    s += `<line x1="14" y1="74" x2="56" y2="74" stroke="#5b6878" stroke-width="0.4"/>`;
  } else {
    /* Tier 1 -- spans full width */
    s += `<polygon points="0,78 200,78 192,66 8,66" fill="#3a4658" stroke="#1a212b" stroke-width="0.6"/>`;
    s += `<line x1="8" y1="70" x2="192" y2="70" stroke="#5b6878" stroke-width="0.4"/>`;
    s += `<line x1="8" y1="73" x2="192" y2="73" stroke="#5b6878" stroke-width="0.4"/>`;
    s += `<line x1="8" y1="76" x2="192" y2="76" stroke="#5b6878" stroke-width="0.4"/>`;

    /* Tier 2 -- visible from level 2 */
    if (lv >= 2) {
      s += `<polygon points="6,66 194,66 186,52 14,52" fill="#4a566a" stroke="#1a212b" stroke-width="0.6"/>`;
      s += `<line x1="14" y1="56" x2="186" y2="56" stroke="#6a7686" stroke-width="0.4"/>`;
      s += `<line x1="14" y1="60" x2="186" y2="60" stroke="#6a7686" stroke-width="0.4"/>`;
    }

    /* Tier 3 with roof -- visible from level 3 */
    if (lv >= 3) {
      s += `<polygon points="14,52 186,52 178,38 22,38" fill="#5a6678" stroke="#1a212b" stroke-width="0.6"/>`;
      s += `<line x1="22" y1="42" x2="178" y2="42" stroke="#7a8696" stroke-width="0.4"/>`;
      s += `<line x1="22" y1="46" x2="178" y2="46" stroke="#7a8696" stroke-width="0.4"/>`;
      /* Curved roof */
      s += `<path d="M 18 38 Q 100 22 182 38" fill="none" stroke="#cad3df" stroke-width="1.4"/>`;
      s += `<path d="M 18 38 Q 100 26 182 38" fill="#202830" opacity="0.5"/>`;
    }
  }

  /* Corner flags from level 2 */
  if (lv >= 2) {
    s += `<line x1="6" y1="80" x2="6" y2="74" stroke="#fff" stroke-width="0.6"/>`;
    s += `<polygon points="6,74 10,75.5 6,77" fill="#e94f4f"/>`;
    s += `<line x1="194" y1="80" x2="194" y2="74" stroke="#fff" stroke-width="0.6"/>`;
    s += `<polygon points="194,74 190,75.5 194,77" fill="#e94f4f"/>`;
  }

  /* Star burst on top tier roof at max level */
  if (lv >= 3) {
    s += `<text x="100" y="33" text-anchor="middle" font-family="Oswald, sans-serif" font-size="6" fill="#ffd34a" font-weight="700">ELITE</text>`;
  }

  s += `</svg>`;
  return s;
}

/* ================================================================
   TRAINING GROUND SCENE
   ================================================================
   Level 0 -- bare practice field with a few cones.
   Level 1 -- adds a small portable goal and a ball.
   Level 2 -- adds a gym building and another full goal.
   Level 3 -- adds an indoor dome / training complex. */

/**
 * Build the training facility SVG illustration for a given upgrade level.
 *
 * @param level - Current training facility level (0..3)
 * @returns Complete inline SVG markup
 */
export function trainingScene(level: number): string {
  const lv = Math.max(0, Math.min(3, level | 0));

  const skyTop = ['#243246', '#28384a', '#2c3e50', '#304455'][lv];
  const skyBot = ['#1a2230', '#1c2632', '#1e2a36', '#202c38'][lv];
  const grass = ['#3a6a3e', '#3e7042', '#427a46', '#46844a'][lv];

  let s = '';
  s += `<svg class="of-scene of-scene-training" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`;
  s += `<defs>`;
  s += `<linearGradient id="of-sky-tr-${lv}" x1="0" y1="0" x2="0" y2="1">`;
  s += `<stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/>`;
  s += `</linearGradient>`;
  s += `</defs>`;
  s += `<rect width="200" height="110" fill="url(#of-sky-tr-${lv})"/>`;

  /* Distant fence/horizon line */
  s += `<line x1="0" y1="68" x2="200" y2="68" stroke="#3a4456" stroke-width="0.6" opacity="0.6"/>`;

  /* Indoor training dome at level 3 */
  if (lv >= 3) {
    s += `<ellipse cx="160" cy="68" rx="32" ry="20" fill="#5a6678" stroke="#1a212b" stroke-width="0.8"/>`;
    s += `<rect x="128" y="60" width="64" height="10" fill="#5a6678" stroke="#1a212b" stroke-width="0.6"/>`;
    /* Dome highlight */
    s += `<path d="M 132 60 Q 160 38 188 60" fill="none" stroke="#7a8696" stroke-width="0.8"/>`;
    s += `<text x="160" y="66" text-anchor="middle" font-family="Oswald, sans-serif" font-size="5" fill="#cad3df" font-weight="700">INDOOR</text>`;
  }

  /* Gym building at level 2+ */
  if (lv >= 2) {
    /* Building behind the field */
    s += `<rect x="14" y="44" width="44" height="24" fill="#4a566a" stroke="#1a212b" stroke-width="0.8"/>`;
    /* Roof */
    s += `<polygon points="12,44 60,44 56,38 16,38" fill="#3a4658" stroke="#1a212b" stroke-width="0.6"/>`;
    /* Windows */
    s += `<rect x="18" y="50" width="6" height="6" fill="#7ec5ff" opacity="0.7"/>`;
    s += `<rect x="28" y="50" width="6" height="6" fill="#7ec5ff" opacity="0.7"/>`;
    s += `<rect x="38" y="50" width="6" height="6" fill="#7ec5ff" opacity="0.7"/>`;
    s += `<rect x="48" y="50" width="6" height="6" fill="#7ec5ff" opacity="0.7"/>`;
    /* Door */
    s += `<rect x="32" y="58" width="8" height="10" fill="#2a3242"/>`;
    /* Sign */
    s += `<text x="36" y="48" text-anchor="middle" font-family="Oswald, sans-serif" font-size="5" fill="#ffd34a" font-weight="700">GYM</text>`;
  }

  /* Grass field */
  s += `<rect x="0" y="68" width="200" height="42" fill="${grass}"/>`;
  /* Field stripes */
  s += `<rect x="0" y="74" width="200" height="6" fill="#000" opacity="0.06"/>`;
  s += `<rect x="0" y="86" width="200" height="6" fill="#000" opacity="0.06"/>`;
  s += `<rect x="0" y="98" width="200" height="6" fill="#000" opacity="0.06"/>`;

  /* Cones -- always present, more at higher levels */
  const coneCount = 3 + lv * 2;
  for (let i = 0; i < coneCount; i++) {
    const cx = 70 + (i * 14) % 110;
    const cy = 90 + ((i * 7) % 14);
    s += `<polygon points="${cx},${cy} ${cx - 2},${cy + 4} ${cx + 2},${cy + 4}" fill="#ff8a3a" stroke="#1a212b" stroke-width="0.3"/>`;
  }

  /* Goal -- visible from level 1 */
  if (lv >= 1) {
    /* Goal frame */
    s += `<rect x="88" y="76" width="24" height="14" fill="none" stroke="#fff" stroke-width="0.8"/>`;
    /* Net hint */
    s += `<line x1="88" y1="80" x2="112" y2="80" stroke="#fff" stroke-width="0.3" opacity="0.5"/>`;
    s += `<line x1="88" y1="84" x2="112" y2="84" stroke="#fff" stroke-width="0.3" opacity="0.5"/>`;
    s += `<line x1="94" y1="76" x2="94" y2="90" stroke="#fff" stroke-width="0.3" opacity="0.5"/>`;
    s += `<line x1="100" y1="76" x2="100" y2="90" stroke="#fff" stroke-width="0.3" opacity="0.5"/>`;
    s += `<line x1="106" y1="76" x2="106" y2="90" stroke="#fff" stroke-width="0.3" opacity="0.5"/>`;
    /* Ball */
    s += `<circle cx="100" cy="98" r="2.4" fill="#fff" stroke="#1a212b" stroke-width="0.4"/>`;
    s += `<polygon points="100,96.8 101.2,97.6 100.8,99 99.2,99 98.8,97.6" fill="#1a212b" opacity="0.6"/>`;
  }

  /* Second goal at level 2+ */
  if (lv >= 2) {
    s += `<rect x="160" y="76" width="20" height="12" fill="none" stroke="#fff" stroke-width="0.8"/>`;
  }

  s += `</svg>`;
  return s;
}

/* ================================================================
   YOUTH ACADEMY SCENE
   ================================================================
   Level 0 -- single small shed/cabin.
   Level 1 -- proper school building with sign.
   Level 2 -- school + dormitory wing.
   Level 3 -- full campus with multiple buildings and a tree-lined path. */

/**
 * Build the youth academy SVG illustration for a given upgrade level.
 *
 * @param level - Current youth academy level (0..3)
 * @returns Complete inline SVG markup
 */
export function youthScene(level: number): string {
  const lv = Math.max(0, Math.min(3, level | 0));

  const skyTop = ['#2a3a4e', '#2e4256', '#324a5e', '#365266'][lv];
  const skyBot = ['#1c2432', '#1e2836', '#202c3a', '#22303e'][lv];
  const groundCol = ['#4a3c2a', '#4e402e', '#524432', '#564836'][lv];

  let s = '';
  s += `<svg class="of-scene of-scene-youth" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`;
  s += `<defs>`;
  s += `<linearGradient id="of-sky-yt-${lv}" x1="0" y1="0" x2="0" y2="1">`;
  s += `<stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/>`;
  s += `</linearGradient>`;
  s += `</defs>`;
  s += `<rect width="200" height="110" fill="url(#of-sky-yt-${lv})"/>`;

  /* Ground */
  s += `<rect x="0" y="80" width="200" height="30" fill="${groundCol}"/>`;
  /* Grass strip on top of dirt */
  s += `<rect x="0" y="78" width="200" height="3" fill="#3e7042"/>`;

  if (lv === 0) {
    /* Tiny shed in the centre */
    s += `<rect x="80" y="58" width="40" height="22" fill="#7a5a3a" stroke="#1a212b" stroke-width="0.8"/>`;
    /* Roof */
    s += `<polygon points="76,58 124,58 100,46" fill="#5a3a1a" stroke="#1a212b" stroke-width="0.6"/>`;
    /* Door */
    s += `<rect x="94" y="68" width="12" height="12" fill="#3a2a1a"/>`;
    /* Window */
    s += `<rect x="84" y="62" width="6" height="6" fill="#7ec5ff" opacity="0.7"/>`;
    s += `<rect x="110" y="62" width="6" height="6" fill="#7ec5ff" opacity="0.7"/>`;
  }

  if (lv >= 1) {
    /* Main school building */
    s += `<rect x="60" y="50" width="80" height="30" fill="#a06a3a" stroke="#1a212b" stroke-width="0.8"/>`;
    /* Roof */
    s += `<polygon points="56,50 144,50 100,34" fill="#5a3a1a" stroke="#1a212b" stroke-width="0.6"/>`;
    /* Bell tower / chimney */
    s += `<rect x="92" y="22" width="16" height="14" fill="#a06a3a" stroke="#1a212b" stroke-width="0.6"/>`;
    s += `<polygon points="88,22 112,22 100,14" fill="#5a3a1a" stroke="#1a212b" stroke-width="0.6"/>`;
    s += `<rect x="96" y="26" width="8" height="6" fill="#ffd34a" opacity="0.85"/>`;
    /* Windows row */
    s += `<rect x="66" y="56" width="8" height="8" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="78" y="56" width="8" height="8" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="114" y="56" width="8" height="8" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="126" y="56" width="8" height="8" fill="#7ec5ff" opacity="0.85"/>`;
    /* Big door */
    s += `<rect x="94" y="64" width="12" height="16" fill="#3a2a1a"/>`;
    s += `<circle cx="103" cy="72" r="0.6" fill="#ffd34a"/>`;
    /* Sign */
    s += `<rect x="84" y="42" width="32" height="6" fill="#1a212b" stroke="#ffd34a" stroke-width="0.5"/>`;
    s += `<text x="100" y="46.6" text-anchor="middle" font-family="Oswald, sans-serif" font-size="4.4" fill="#ffd34a" font-weight="700">ACADEMY</text>`;
  }

  /* Dormitory wing at level 2+ */
  if (lv >= 2) {
    s += `<rect x="10" y="58" width="42" height="22" fill="#8a5a2a" stroke="#1a212b" stroke-width="0.8"/>`;
    s += `<polygon points="6,58 56,58 31,46" fill="#5a3a1a" stroke="#1a212b" stroke-width="0.6"/>`;
    /* Three small windows */
    s += `<rect x="16" y="64" width="6" height="6" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="26" y="64" width="6" height="6" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="36" y="64" width="6" height="6" fill="#7ec5ff" opacity="0.85"/>`;
    /* Door */
    s += `<rect x="28" y="72" width="6" height="8" fill="#3a2a1a"/>`;
  }

  /* Sports building + tree-lined path at level 3 */
  if (lv >= 3) {
    /* Right-side training building */
    s += `<rect x="148" y="58" width="42" height="22" fill="#6a4a2a" stroke="#1a212b" stroke-width="0.8"/>`;
    s += `<polygon points="144,58 194,58 169,46" fill="#3a2a1a" stroke="#1a212b" stroke-width="0.6"/>`;
    s += `<rect x="154" y="64" width="6" height="6" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="164" y="64" width="6" height="6" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="174" y="64" width="6" height="6" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="184" y="64" width="6" height="6" fill="#7ec5ff" opacity="0.85"/>`;
    s += `<rect x="166" y="72" width="8" height="8" fill="#3a2a1a"/>`;
    /* Trees flanking the entrance */
    s += `<rect x="59" y="74" width="2" height="6" fill="#4a2a1a"/>`;
    s += `<circle cx="60" cy="72" r="4" fill="#3e7042" stroke="#1a212b" stroke-width="0.4"/>`;
    s += `<rect x="139" y="74" width="2" height="6" fill="#4a2a1a"/>`;
    s += `<circle cx="140" cy="72" r="4" fill="#3e7042" stroke="#1a212b" stroke-width="0.4"/>`;
    /* Path */
    s += `<rect x="96" y="80" width="8" height="30" fill="#c5b89a" opacity="0.5"/>`;
  }

  s += `</svg>`;
  return s;
}

/* ================================================================
   SPONSOR BADGE
   ================================================================
   A heraldic-style shield whose colour, ornamentation and label depend on
   the sponsorship tier (small / medium / large). The `active` flag adds
   an additional glow ring to indicate the player has signed the deal. */

/**
 * Build the sponsorship badge SVG for a given tier.
 *
 * @param tier   - Sponsor tier ('small' | 'medium' | 'large')
 * @param active - Whether this is the currently signed sponsor
 * @returns Complete inline SVG markup
 */
export function sponsorBadge(tier: string, active: boolean): string {
  /* Tier-driven palette: bronze -> silver -> gold */
  const palette: Record<string, { fill: string; stroke: string; ring: string; label: string; rays: number }> = {
    small: {
      fill: '#b87333',
      stroke: '#5a3818',
      ring: '#d49460',
      label: 'BRONZE',
      rays: 0,
    },
    medium: {
      fill: '#bfc6cd',
      stroke: '#4a525a',
      ring: '#e0e6ec',
      label: 'SILVER',
      rays: 6,
    },
    large: {
      fill: '#ffcc4a',
      stroke: '#6a4a10',
      ring: '#fff0a8',
      label: 'GOLD',
      rays: 12,
    },
  };
  const p = palette[tier] || palette.small;

  let s = '';
  s += `<svg class="of-sponsor-badge${active ? ' is-active' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true">`;

  /* Outer rays for premium tiers */
  if (p.rays > 0) {
    for (let i = 0; i < p.rays; i++) {
      const a = (i / p.rays) * Math.PI * 2;
      const x1 = 60 + Math.cos(a) * 48;
      const y1 = 60 + Math.sin(a) * 48;
      const x2 = 60 + Math.cos(a) * 58;
      const y2 = 60 + Math.sin(a) * 58;
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${p.ring}" stroke-width="2" opacity="0.8"/>`;
    }
  }

  /* Outer ring */
  s += `<circle cx="60" cy="60" r="46" fill="none" stroke="${p.ring}" stroke-width="2" opacity="0.7"/>`;

  /* Shield */
  s += `<path d="M 60 18 L 96 28 L 96 60 Q 96 92 60 102 Q 24 92 24 60 L 24 28 Z" fill="${p.fill}" stroke="${p.stroke}" stroke-width="2.4"/>`;

  /* Inner highlight */
  s += `<path d="M 60 24 L 88 32 L 88 58 Q 88 84 60 94" fill="#fff" opacity="0.1"/>`;

  /* Star centerpiece */
  const starSize = 16;
  const cx = 60, cy = 56;
  let starPts = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? starSize : starSize / 2.4;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    starPts += `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `;
  }
  s += `<polygon points="${starPts.trim()}" fill="${p.stroke}" opacity="0.85"/>`;

  /* Label */
  s += `<text x="60" y="86" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" fill="${p.stroke}" font-weight="800" letter-spacing="0.5">${p.label}</text>`;

  /* Active checkmark in the corner */
  if (active) {
    s += `<circle cx="92" cy="92" r="12" fill="#3fb950" stroke="#fff" stroke-width="2"/>`;
    s += `<polyline points="86,92 91,97 99,87" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  s += `</svg>`;
  return s;
}

/**
 * Render a small "level pip" bar showing how many levels are unlocked.
 *
 * @param level - Current level
 * @param max   - Maximum level
 * @returns HTML markup for the level bar
 */
export function levelPips(level: number, max: number): string {
  let h = '<div class="of-level-pips">';
  for (let i = 0; i < max; i++) {
    const filled = i < level;
    h += `<span class="of-pip${filled ? ' filled' : ''}"></span>`;
  }
  h += '</div>';
  return h;
}
