/**
 * config.ts — All game constants and configuration values.
 *
 * Every magic number, array, and lookup table from the original
 * index.html is centralised here as typed, named exports.
 * Nothing in this file is mutable at runtime.
 */

import type {
  CountryNamePool,
  DevelopmentCurve,
  DevelopmentCurveConfig,
  Difficulty,
  DifficultyMultipliers,
  DivisionRange,
  Formation,
  PlayerRole,
  Position,
  PrizeMoney,
  SolidarityPayment,
  Sponsorship,
  Tactic,
  TacticId,
  TeamData,
  WaitingTeam,
} from './types';

/* ================================================================
   VERSION & PERSISTENCE KEYS
   ================================================================ */

/** Current game version string */
export const GAME_VERSION = '3.0.0';

/** localStorage key for the main game save */
export const SAVE_KEY = 'intlSoccerLeague_v1';

/** localStorage key for user settings (independent of save) */
export const SETTINGS_KEY = 'intlSoccerLeague_settings';

/* ================================================================
   LEAGUE STRUCTURE
   ================================================================ */

/** Number of teams in each division */
export const TEAMS_PER_DIV = 8;

/** Number of league match-weeks per season (round-robin home & away) */
export const SEASON_WEEKS = (TEAMS_PER_DIV - 1) * 2; // 14

/* ================================================================
   TEAMS DATA — Initial roster of all 32 league teams
   ================================================================ */

export const TEAMS_DATA: readonly TeamData[] = [
  /* Division 1 */
  { name: 'Barcelona',  div: 1, c1: '#ad1519', c2: '#fcdd09', country: 'ES' },
  { name: 'Madrid',     div: 1, c1: '#ad1519', c2: '#fcdd09', country: 'ES' },
  { name: 'Manchester', div: 1, c1: '#cf142b', c2: '#00247d', country: 'EN' },
  { name: 'Liverpool',  div: 1, c1: '#cf142b', c2: '#00247d', country: 'EN' },
  { name: 'Porto',      div: 1, c1: '#006600', c2: '#ff0000', country: 'PT' },
  { name: 'Lisbon',     div: 1, c1: '#006600', c2: '#ff0000', country: 'PT' },
  { name: 'Rome',       div: 1, c1: '#008c45', c2: '#cd212a', country: 'IT' },
  { name: 'Istanbul',   div: 1, c1: '#e30a17', c2: '#ffffff', country: 'TR' },
  /* Division 2 */
  { name: 'Berlin',     div: 2, c1: '#000000', c2: '#ffcc00', country: 'DE' },
  { name: 'Dortmund',   div: 2, c1: '#000000', c2: '#ffcc00', country: 'DE' },
  { name: 'Paris',      div: 2, c1: '#002395', c2: '#ed2939', country: 'FR' },
  { name: 'Lyon',       div: 2, c1: '#002395', c2: '#ed2939', country: 'FR' },
  { name: 'São Paulo',  div: 2, c1: '#009c3b', c2: '#ffdf00', country: 'BR' },
  { name: 'Santos',     div: 2, c1: '#009c3b', c2: '#ffdf00', country: 'BR' },
  { name: 'Amsterdam',  div: 2, c1: '#ae1c28', c2: '#21468b', country: 'NL' },
  { name: 'Seoul',      div: 2, c1: '#ffffff', c2: '#cd2e3a', country: 'KR' },
  /* Division 3 */
  { name: 'Chicago',    div: 3, c1: '#b22234', c2: '#3c3b6e', country: 'US' },
  { name: 'Los Angeles', div: 3, c1: '#b22234', c2: '#3c3b6e', country: 'US' },
  { name: 'Vancouver',  div: 3, c1: '#ff0000', c2: '#ffffff', country: 'CA' },
  { name: 'Toronto',    div: 3, c1: '#ff0000', c2: '#ffffff', country: 'CA' },
  { name: 'Kiev',       div: 3, c1: '#005bbb', c2: '#ffd500', country: 'UA' },
  { name: 'Warsaw',     div: 3, c1: '#ffffff', c2: '#dc143c', country: 'PL' },
  { name: 'Cairo',      div: 3, c1: '#ce1126', c2: '#ffffff', country: 'EG' },
  { name: 'Montevideo', div: 3, c1: '#0038a8', c2: '#ffffff', country: 'UY' },
  /* Division 4 */
  { name: 'Tokyo',      div: 4, c1: '#ffffff', c2: '#bc002d', country: 'JP' },
  { name: 'Beijing',    div: 4, c1: '#de2910', c2: '#ffde00', country: 'CN' },
  { name: 'Andorra',    div: 4, c1: '#0032a0', c2: '#fedf00', country: 'AD' },
  { name: 'Falklands',  div: 4, c1: '#00247d', c2: '#cf142b', country: 'FK' },
  { name: 'Arapiraca',  div: 4, c1: '#009c3b', c2: '#ffdf00', country: 'BR' },
  { name: 'Buenos Aires', div: 4, c1: '#74acdf', c2: '#ffffff', country: 'AR' },
  { name: 'Stockholm',  div: 4, c1: '#006aa7', c2: '#fecc02', country: 'SE' },
  { name: 'Melbourne',  div: 4, c1: '#00008b', c2: '#ffffff', country: 'AU' },
] as const;

/** Teams that wait outside the league and rotate in via promotion/relegation */
export const WAITING_TEAMS_DATA: readonly WaitingTeam[] = [
  { name: 'Bogota',    c1: '#fcd116', c2: '#003893', country: 'CO' },
  { name: 'Santiago',   c1: '#d52b1e', c2: '#0039a6', country: 'CL' },
  { name: 'Zagreb',     c1: '#ff0000', c2: '#ffffff', country: 'HR' },
  { name: 'Tel Aviv',   c1: '#0038b8', c2: '#ffffff', country: 'IL' },
] as const;

/* ================================================================
   POSITIONS
   ================================================================ */

/** Canonical position ordering for display and sorting */
export const POS_ORDER: readonly Position[] = ['GK', 'DEF', 'MID', 'STR'] as const;

/** CSS class suffix for each position (used for colour-coding badges) */
export const POS_CSS: Readonly<Record<Position, string>> = {
  GK: 'gk',
  DEF: 'def',
  MID: 'mid',
  STR: 'str',
} as const;

/**
 * Numeric distance for each position — used to calculate out-of-position penalty.
 * The penalty is proportional to the absolute difference between two positions.
 */
export const POS_DISTANCE: Readonly<Record<Position, number>> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  STR: 3,
} as const;

/** Effective rating loss per position-step away from natural position (15%) */
export const OOP_PENALTY_PER_STEP = 0.15;

/** Default squad composition: how many of each position are generated for a new team */
export const SQUAD_COMP: Readonly<Record<Position, number>> = {
  GK: 2,
  DEF: 7,
  MID: 7,
  STR: 6,
} as const;

/**
 * Position-based goal scoring likelihood weights.
 * Strikers score most, goalkeepers almost never.
 */
export const GOAL_POS_WEIGHT: Readonly<Record<Position, number>> = {
  STR: 50,
  MID: 35,
  DEF: 14.95,
  GK: 0.05,
} as const;

/* ================================================================
   FORMATIONS
   ================================================================ */

/**
 * All available formations.
 * Each must satisfy the baseline: >=3 DEF, >=3 MID, >=1 STR.
 */
export const FORMATIONS: readonly Formation[] = [
  { label: '3-3-4', slots: { GK: 1, DEF: 3, MID: 3, STR: 4 } }, // Ultra-attacking
  { label: '3-4-3', slots: { GK: 1, DEF: 3, MID: 4, STR: 3 } }, // Attacking
  { label: '3-5-2', slots: { GK: 1, DEF: 3, MID: 5, STR: 2 } }, // Midfield control
  { label: '4-3-3', slots: { GK: 1, DEF: 4, MID: 3, STR: 3 } }, // Wide attacking
  { label: '4-4-2', slots: { GK: 1, DEF: 4, MID: 4, STR: 2 } }, // Classic balanced
  { label: '4-5-1', slots: { GK: 1, DEF: 4, MID: 5, STR: 1 } }, // Defensive midfield
  { label: '5-3-2', slots: { GK: 1, DEF: 5, MID: 3, STR: 2 } }, // Solid defence
  { label: '5-4-1', slots: { GK: 1, DEF: 5, MID: 4, STR: 1 } }, // Ultra-defensive
] as const;

/** Default formation index — 4-4-2 (classic balanced) */
export const DEFAULT_FORMATION_IDX = 4;

/* ================================================================
   TACTICS
   ================================================================ */

/**
 * Tactic definitions.
 * homeBonus/awayBonus replace the base expected-goals multipliers.
 * defPenalty is applied to the opponent's expected goals.
 */
export const TACTICS: Readonly<Record<TacticId, Tactic>> = {
  attack:    { homeBonus: 1.35, awayBonus: 1.20, defPenalty: 1.15, label: 'All-Out Attack', icon: '\u2694\uFE0F' },
  balanced:  { homeBonus: 1.15, awayBonus: 1.00, defPenalty: 1.00, label: 'Balanced',       icon: '\u2696\uFE0F' },
  defensive: { homeBonus: 0.85, awayBonus: 0.75, defPenalty: 0.80, label: 'Defensive',      icon: '\uD83D\uDEE1\uFE0F' },
  counter:   { homeBonus: 0.95, awayBonus: 0.90, defPenalty: 0.90, label: 'Counter-Attack', icon: '\uD83C\uDFF9' },
} as const;

/* ================================================================
   TRAINING
   ================================================================ */

/** Base chance per player per week to gain +1 skill (12%) */
export const TRAINING_SKILL_CHANCE = 0.12;

/** Extra training chance for players whose position matches the focus (8%) */
export const TRAINING_FOCUS_BONUS = 0.08;

/** Available training focus options (simplified from 5 to 3) */
export const TRAINING_FOCUSES: readonly string[] = [
  'balanced',
  'fitness',
  'development',
] as const;

/* ================================================================
   CUP COMPETITION
   ================================================================ */

/** Names for each cup round */
export const CUP_ROUNDS: readonly string[] = [
  'Round of 32',
  'Round of 16',
  'Quarter-Finals',
  'Semi-Finals',
  'Final',
] as const;

/** Week numbers when cup matches are played */
export const CUP_WEEKS: readonly number[] = [2, 5, 9, 12, 15] as const;

/** Prize money awarded to the cup winner */
export const CUP_PRIZE = 1000;

/** Total weeks in a season (includes cup final week, which extends beyond league) */
export const TOTAL_SEASON_WEEKS = Math.max(SEASON_WEEKS, ...CUP_WEEKS); // 15

/* ================================================================
   DISCIPLINE (RED / YELLOW CARDS)
   ================================================================ */

/** Chance (%) per selected player per match of receiving a yellow card */
export const YELLOW_CARD_CHANCE = 3.5;

/** Chance (%) per selected player per match of receiving a red card */
export const RED_CARD_CHANCE = 0.3;

/** Number of yellow cards that triggers an automatic 1-match ban */
export const YELLOW_ACCUMULATION = 5;

/** Number of matches a player is suspended after a red card */
export const RED_SUSPENSION = 2;

/* ================================================================
   PLAYER FORM
   ================================================================ */

/** Form points gained after a win */
export const FORM_WIN_BOOST = 1;

/** Form points gained when a player scores a goal */
export const FORM_GOAL_BOOST = 1;

/** Form points lost after a loss */
export const FORM_LOSS_PENALTY = -1;

/** Maximum form value */
export const FORM_MAX = 3;

/** Minimum form value */
export const FORM_MIN = -3;

/** Each form point adjusts effective OVR by this percentage (5%) */
export const FORM_OVR_PCT = 0.05;

/* ================================================================
   DIVISION RANGES & INCOME
   ================================================================ */

/**
 * Skill range [min, max] for players generated in each division.
 * Division 1 teams are strongest, division 4 weakest.
 */
export const DIV_RANGE: Readonly<Record<number, DivisionRange>> = {
  1: [28, 46],
  2: [24, 40],
  3: [20, 34],
  4: [16, 28],
} as const;

/** Base season income awarded to every team, by division */
export const DIV_SEASON_INCOME: Readonly<Record<number, number>> = {
  1: 5000,
  2: 3500,
  3: 2000,
  4: 1000,
} as const;

/**
 * Per-win bonus scaled inversely by division.
 * Lower division teams earn more per result to help them compete.
 */
export const DIV_WIN_BONUS: Readonly<Record<number, number>> = {
  1: 100,
  2: 150,
  3: 250,
  4: 350,
} as const;

/** Per-draw bonus by division */
export const DIV_DRAW_BONUS: Readonly<Record<number, number>> = {
  1: 30,
  2: 50,
  3: 80,
  4: 100,
} as const;

/* ================================================================
   PRIZE MONEY & FINANCIAL AWARDS
   ================================================================ */

/** Prize money awarded at season end for various achievements */
export const PRIZE_MONEY: Readonly<PrizeMoney> = {
  div1Champion: 500,
  div1RunnerUp: 100,
  promotionBonus: 2500,
  avoidRelegation: 500,
  relegation: 250,
} as const;

/** One-time payment to relegated teams to cushion the financial blow */
export const PARACHUTE_PAYMENT = 1500;

/** Solidarity payments: top Div 1 teams pay, distributed to Div 3-4 teams */
export const SOLIDARITY_PAYMENT: Readonly<SolidarityPayment> = {
  min: 500,
  max: 1000,
} as const;

/** Target squad size for AI teams by division (AI will buy/sell to reach this) */
export const AI_TARGET_SQUAD: Readonly<Record<number, number>> = {
  1: 22,
  2: 22,
  3: 23,
  4: 23,
} as const;

/* ================================================================
   TRANSFER MARKET
   ================================================================ */

/** Starting budget for every team at game initialization */
export const STARTING_BUDGET = 10000;

/** Number of free agents generated fresh each season */
export const FREE_AGENTS_PER_SEASON = 16;

/** Maximum number of free agents in the pool at any time */
export const MAX_FREE_AGENT_POOL = 16;

/** Skill range for generated free agents [min, max] */
export const FREE_AGENT_SKILL_RANGE: readonly [number, number] = [10, 35] as const;

/** Sell price as a fraction of market value (65%) */
export const SELL_VALUE_RATIO = 0.65;

/** Minimum squad size — players cannot be sold below this */
export const SQUAD_MIN = 19;

/** Maximum squad size — players cannot be signed above this */
export const SQUAD_MAX = 25;

/* ================================================================
   DIFFICULTY SETTINGS (New for modular version)
   ================================================================ */

/**
 * Multipliers applied based on the selected difficulty level.
 * - easy:   AI is 10% weaker, budget is 50% larger, training 30% more effective
 * - normal: No adjustments (1x everything)
 * - hard:   AI is 10% stronger, budget is 25% smaller, training 20% less effective
 */
export const DIFFICULTY_SETTINGS: Readonly<Record<Difficulty, DifficultyMultipliers>> = {
  easy:   { aiStrengthMult: 0.9,  budgetMult: 1.5,  trainingMult: 1.3 },
  normal: { aiStrengthMult: 1.0,  budgetMult: 1.0,  trainingMult: 1.0 },
  hard:   { aiStrengthMult: 1.1,  budgetMult: 0.75, trainingMult: 0.8 },
} as const;

/* ================================================================
   PLAYER DEVELOPMENT CURVES (New for modular version)
   ================================================================ */

/**
 * Age-based player development constants.
 * - Players under peakAgeStart get a training bonus (youngBonus per year)
 * - Players over peakAgeEnd face a skill decline chance (declineRate per year)
 * - Players reaching retirementAge retire at season end
 */
export const DEVELOPMENT_CURVES: Readonly<DevelopmentCurveConfig> = {
  peakAgeStart: 26,
  peakAgeEnd: 30,
  youngBonus: 0.03,    // 3% extra training chance per year under peak
  declineRate: 0.02,   // 2% skill decline chance per year over peak end
  retirementAge: 38,
} as const;

/** Age at which a player retires and is replaced by a regen */
export const RETIREMENT_AGE = 38;

/**
 * Array-style development curves for the `applyDevelopmentCurve()` function.
 * Each entry defines improvement/decline probabilities for an age bracket.
 */
export const DEVELOPMENT_CURVE_TABLE: readonly DevelopmentCurve[] = [
  { minAge: 16, maxAge: 20, improvementChance: 0.50, maxGain: 3, declineChance: 0.00, maxLoss: 0 },
  { minAge: 21, maxAge: 23, improvementChance: 0.35, maxGain: 2, declineChance: 0.00, maxLoss: 0 },
  { minAge: 24, maxAge: 25, improvementChance: 0.20, maxGain: 1, declineChance: 0.00, maxLoss: 0 },
  { minAge: 26, maxAge: 29, improvementChance: 0.05, maxGain: 1, declineChance: 0.05, maxLoss: 1 },
  { minAge: 30, maxAge: 32, improvementChance: 0.00, maxGain: 0, declineChance: 0.20, maxLoss: 1 },
  { minAge: 33, maxAge: 35, improvementChance: 0.00, maxGain: 0, declineChance: 0.40, maxLoss: 2 },
  { minAge: 36, maxAge: 37, improvementChance: 0.00, maxGain: 0, declineChance: 0.60, maxLoss: 2 },
] as const;

/* ================================================================
   COUNTRY NAME POOLS
   ================================================================ */

/** Country-specific name pools for procedural player-name generation */
export const COUNTRY_NAMES: Record<string, CountryNamePool> = {
  ES: { first: ['Carlos','Diego','Alejandro','Fernando','Sergio','Raúl','Andrés','Iker','Xavi','Pablo','Álvaro','Marcos','Jordi','Gerard','David','Hugo','Adrián','Rubén','Antonio','Jesús','Miguel','Óscar','Alberto','Gonzalo','Enrique','Javier','Daniel','Iván','Nacho','Víctor'], last: ['García','López','Martínez','Rodríguez','Hernández','Sánchez','Torres','Ramos','Fernández','Moreno','Muñoz','Álvarez','Romero','Díaz','Navarro','Gil','Domínguez','Vázquez','Serrano','Molina','Ortega','Castillo','Rubio','Delgado','Pardo','Caballero','Iglesias','Pascual','Ruiz','Guerrero'] },
  EN: { first: ['Alfred','Henry','John','George','Edward','William','James','Arthur','Thomas','Harry','Charles','Frederick','Oliver','Benjamin','Samuel','Daniel','Jack','Michael','Robert','Andrew','David','Richard','Philip','Stephen','Patrick','Martin','Owen','Peter','Luke','Simon'], last: ['Pemberton','Smith','Hunter','Baker','Cook','Taylor','Wilson','Brown','Johnson','Evans','Clarke','Roberts','Walker','Turner','Wright','Green','Hall','Wood','Harris','King','Carter','Mitchell','Moore','Jackson','White','Davis','Cooper','Morris','Thompson','Ward'] },
  PT: { first: ['Rui','Nuno','João','Luís','Pedro','Tiago','Diogo','André','Bruno','Hugo','Ricardo','Gonçalo','Miguel','Paulo','Sérgio','Cristiano','Bernardo','Renato','Vítor','Fábio','Marco','Rafael','Manuel','Eduardo','Nelson','Cláudio','Filipe','Hélder','José','Carlos'], last: ['Silva','Santos','Fernandes','Costa','Oliveira','Alves','Pereira','Sousa','Ferreira','Nunes','Vieira','Carvalho','Lopes','Pinto','Mendes','Ribeiro','Rocha','Marques','Correia','Reis','Monteiro','Tavares','Gomes','Cardoso','Fonseca','Teixeira','Mota','Coelho','Martins','Abreu'] },
  DE: { first: ['Hans','Klaus','Werner','Karl','Jürgen','Thomas','Lothar','Bastian','Miroslav','Lukas','Manuel','Toni','Leon','Joshua','Kai','Timo','Leroy','Julian','Marco','Florian','Philipp','Matthias','Stefan','Bernd','Mats','Lars','Nico','Jonas','Felix','Maximilian'], last: ['Müller','Schmidt','Schneider','Fischer','Weber','Becker','Schwarz','Wagner','Hoffmann','Keller','Richter','Klein','Wolf','Neumann','Braun','Werner','Krause','Lehmann','Hartmann','König','Kroos','Reus','Hummels','Götze','Brandt','Schäfer','Lange','Sommer','Vogt','Gross'] },
  FR: { first: ['Antoine','Kylian','Hugo','Olivier','Paul','Raphaël','Lucas','Adrien','Blaise','Moussa','Ousmane','Samuel','Karim','Franck','Thierry','Patrice','Laurent','Didier','Marcel','Yohan','Gaël','Florian','Nabil','Mathieu','Aurélien','Clément','Jules','Rémy','Benoît','Corentin'], last: ['Dupont','Martin','Bernard','Dubois','Moreau','Laurent','Simon','Michel','Lefèvre','Leroy','Roux','Girard','Mercier','Faure','Lambert','Fontaine','Chevalier','Robin','Masson','Blanc','Henry','Renard','Barbier','Fournier','Picard','Deschamps','Vidal','Moulin','Perrin','Lemoine'] },
  BR: { first: ['Ronaldo','Romário','Carlos','Henrique','Vinícius','Neymar','Lucas','Thiago','Gabriel','Davi','Rafael','Matheus','Gustavo','Felipe','Leonardo','Robinho','Caio','Marcelo','João','Rodrigo','Danilo','Anderson','Émerson','Bruno','Rivaldo','Adriano','Wendell','Renan','Kaká','Willian'], last: ['Albuquerque','Silva','Rocha','Santos','Oliveira','Souza','Lima','Pereira','Costa','Ferreira','Ribeiro','Gomes','Martins','Araújo','Barbosa','Nascimento','Cardoso','Correia','Vieira','Nunes','Moura','Cavalcanti','Monteiro','Teixeira','Freitas','Carvalho','Pinto','Mendes','Batista','Reis'] },
  US: { first: ['Braden','Tyler','Josh','Weston','Christian','Matt','Clint','Landon','Kyle','Cameron','DeAndre','Jordan','Brandon','Austin','Reggie','Marcus','Ethan','Cole','Jake','Mason','Caleb','Logan','Dylan','Chase','Hunter','Connor','Aidan','Blake','Tristan','Nolan'], last: ['Pulisic','McKennie','Adams','Brooks','Bradley','Dempsey','Howard','Altidore','Morris','Yedlin','Robinson','Turner','Musah','Reyna','Aaronson','Ferreira','Sargent','Weah','Dest','Richards','Palmer','Fields','Carter','Mitchell','Anderson','Thompson','Gonzalez','Ramirez','Sullivan','Murphy'] },
  CA: { first: ['Alphonso','Jonathan','Atiba','Cyle','Junior','Tajon','Stephen','Richie','Milan','Jayden','Derek','Samuel','Scott','Liam','Mark','Owen','Theo','Lucas','Ismaël','Alistair','Kamal','Zachary','Aidan','Fraser','Rahim','Doneil','Maxime','Charles','Russell','Marcus'], last: ['Davies','David','Hutchinson','Larin','Hoilett','Buchanan','Eustáquio','Borjan','Morgan','Nelson','Fraser','Campbell','Kennedy','Stewart','Robertson','MacDonald','Thomson','Henderson','Murray','Taylor','Sinclair','Gordon','Reid','Graham','Hamilton','Clarke','Ross','Mitchell','MacLeod','Johnston'] },
  UA: { first: ['Andriy','Oleksandr','Mykola','Viktor','Serhiy','Dmytro','Taras','Vitaliy','Yevhen','Artem','Ruslan','Bohdan','Denys','Vladyslav','Oleh','Roman','Anatoliy','Ihor','Mykhailo','Maksym','Vasyl','Pavlo','Yaroslav','Hryhoriy','Stepan','Volodymyr','Kostiantyn','Petro','Ivan','Leonid'], last: ['Shevchenko','Rebrov','Tymoshchuk','Konoplyanka','Yarmolenko','Zinchenko','Tsygankov','Malinovsky','Mudryk','Dovbyk','Sydorchuk','Mykolenko','Zabarnyi','Bondar','Matvienko','Stepanenko','Shaparenko','Pyatov','Trubin','Lunin','Melnyk','Kovalenko','Tkachuk','Shevchuk','Boyko','Lysenko','Horbachuk','Savchenko','Kravets','Moroz'] },
  PL: { first: ['Robert','Kamil','Jakub','Wojciech','Piotr','Grzegorz','Krzysztof','Łukasz','Tomasz','Arkadiusz','Maciej','Bartosz','Dawid','Mateusz','Sebastian','Damian','Karol','Michał','Marcin','Przemysław','Szymon','Jan','Marek','Rafał','Zbigniew','Leszek','Dariusz','Paweł','Filip','Konrad'], last: ['Lewandowski','Szczęsny','Zieliński','Milik','Piszczek','Glik','Krychowiak','Rybus','Moder','Klich','Bednarek','Szymański','Zalewski','Linetty','Frankowski','Piątek','Świderski','Nowak','Kowalski','Wiśniewski','Wójcik','Kamiński','Kozłowski','Jankowski','Zając','Mazur','Krawczyk','Piotrowski','Grabowski','Pawlak'] },
  JP: { first: ['Takumi','Kaoru','Daichi','Takehiro','Wataru','Ritsu','Junya','Hidemasa','Yuto','Shinji','Keisuke','Makoto','Yuya','Genki','Gaku','Takefusa','Kyogo','Ao','Ayase','Mao','Reo','Koji','Hiroshi','Masato','Daiki','Kento','Shogo','Yuki','Hayato','Sho'], last: ['Minamino','Mitoma','Kamada','Tomiyasu','Endo','Doan','Ito','Morita','Nagatomo','Kagawa','Honda','Hasebe','Osako','Haraguchi','Kubo','Furuhashi','Tanaka','Ueda','Asano','Maeda','Yamamoto','Nakamura','Suzuki','Sato','Watanabe','Takahashi','Kobayashi','Yoshida','Inoue','Kimura'] },
  CN: { first: ['Wei','Lei','Hao','Jun','Tao','Peng','Xiang','Zheng','Ming','Yong','Jian','Long','Chao','Feng','Lin','Gang','Bin','Liang','Bo','Kai','Zhi','Hang','Rui','Yi','Cheng','Yang','Dong','Ke','Qiang','Xin'], last: ['Wu','Li','Zhang','Wang','Liu','Chen','Yang','Huang','Zhao','Zhou','Xu','Sun','Ma','Zhu','Lin','He','Gao','Zheng','Luo','Song','Xie','Tang','Han','Feng','Deng','Cao','Peng','Zeng','Jiang','Yu'] },
  AD: { first: ['Marc','Jordi','Àlex','Ilde','Sergi','Cristian','Èric','Jesús','Máximo','Ludovic','Adrián','Emili','Óscar','Moisés','Rubén','Gabi','Juli','Víctor','Albert','Ricard','Joan','David','Ferran','Xavier','Arnau','Pau','Carles','Antoni','Bernat','Martí'], last: ['Lima','Vieira','Rubio','Riera','Vales','Rebes','Cervós','García','Llovera','Alavedra','Pujol','Clemente','Moreno','San Nicolás','Martínez','Fernández','Sonejee','Jiménez','Silva','Koldo','Maneiro','Ayala','Lorenzo','Sánchez','Gómez','Torres','Navarro','Domínguez','Pérez','Rodríguez'] },
  FK: { first: ['James','William','John','Robert','David','Thomas','Michael','George','Ian','Peter','Andrew','Richard','Paul','Mark','Stephen','Simon','Timothy','Philip','Keith','Colin','Ewan','Graham','Alan','Edward','Oliver','Christopher','Roger','Derek','Stuart','Neil'], last: ['Morrison','Stewart','Peck','Clarke','Felton','Sheridan','Luxton','Binnie','Sherlock','Watson','Aldridge','Henderson','Goodwin','Halford','Rendell','Gilbert','McLeod','Harper','Barkman','Curtis','Ross','Newman','Summers','Langdon','Adams','Roberts','Campbell','Duncan','Mitchell','Grant'] },
  AR: { first: ['Lionel','Diego','Ángel','Paulo','Gonzalo','Sergio','Nicolás','Emiliano','Leandro','Lautaro','Julián','Enzo','Alexis','Rodrigo','Maximiliano','Mauro','Lucas','Roberto','Javier','Hernán','Gabriel','Claudio','Fernando','Esteban','Matías','Federico','Joaquín','Agustín','Ramiro','Cristian'], last: ['Messi','Maradona','Fernández','Martínez','Álvarez','Di María','Otamendi','Paredes','Romero','Molina','De Paul','Mac Allister','Acuña','Correa','Dybala','Higuaín','Agüero','Batistuta','Simeone','Zanetti','Gallardo','Crespo','Gómez','López','Pérez','Ruiz','Medina','Sosa','Domínguez','Rossi'] },
  CO: { first: ['James','Falcao','Juan','Carlos','David','Luis','Fredy','Mario','Yerry','Dávinson','Wilmar','Mateus','Duván','Roger','Jhon','Edwin','Cuadrado','Jefferson','Adrián','Daniel','Andrés','Sebastián','Harold','Jorge','Gustavo','Oscar','Camilo','Santiago','Álvaro','Rafael'], last: ['Rodríguez','García','Martínez','López','Sánchez','Ospina','Zapata','Mina','Barrios','Uribe','Díaz','Cuadrado','Muriel','Borré','Lerma','Sinisterra','Arias','Mojica','Moreno','Quintero','Hernández','Asprilla','Rincón','Valderrama','Córdoba','Yepes','Perea','Guarín','Falcao','Higuita'] },
  CL: { first: ['Arturo','Alexis','Gary','Charles','Eduardo','Claudio','Mauricio','Gonzalo','Jorge','Iván','Marcelo','Matías','Erick','Ben','Diego','Pablo','Felipe','Fabián','Ángelo','Víctor','Jean','Esteban','Guillermo','Leonardo','Rodrigo','Francisco','Nicolás','Sebastián','Tomás','Cristián'], last: ['Vidal','Sánchez','Medel','Aránguiz','Vargas','Bravo','Isla','Jara','Valdivia','Zamorano','Salas','Díaz','Suazo','Beausejour','Pinilla','Fernández','Fuenzalida','Mena','Pizarro','Paredes','Henríquez','Gutiérrez','Silva','Muñoz','Reyes','Castillo','Contreras','Núñez','Rojas','Morales'] },
  NL: { first: ['Johan','Marco','Ruud','Dennis','Edgar','Virgil','Frenkie','Memphis','Matthijs','Daley','Wesley','Stefan','Arjen','Robin','Rafael','Clarence','Patrick','Georginio','Cody','Xavi','Donyell','Teun','Jurriën','Micky','Jeremie','Nathan','Tijjani','Ryan','Luuk','Wout'], last: ['van Dijk','de Jong','Bergkamp','Gullit','Rijkaard','Koeman','Kluivert','Sneijder','Robben','Cruyff','van Basten','de Boer','Davids','Seedorf','van Persie','Depay','de Ligt','Blind','Dumfries','Gakpo','Timber','Simons','Ake','Wijnaldum','Koopmeiners','Gravenberch','Weghorst','Malen','Reijnders','Frimpong'] },
  HR: { first: ['Luka','Ivan','Mateo','Marcelo','Mario','Dejan','Nikola','Ante','Joško','Borna','Andrej','Duje','Josip','Šime','Mislav','Dominik','Bruno','Lovro','Kristijan','Marko','Davor','Robert','Zvonimir','Igor','Stipe','Vedran','Danijel','Niko','Dario','Tin'], last: ['Modrić','Perišić','Kovačić','Brozović','Mandžukić','Lovren','Rebić','Kramarić','Vlašić','Rakitić','Šuker','Boban','Prosinečki','Tudor','Bilić','Vida','Gvardiol','Sučić','Baturina','Majer','Ivanušec','Pašalić','Orsić','Petković','Livaković','Budimir','Juranović','Stanišić','Šutalo','Erlić'] },
  TR: { first: ['Hakan','Arda','Cengiz','Burak','Emre','Ozan','Ferdi','Kerem','Barış','Çağlar','Merih','Zeki','İrfan','Yusuf','Abdülkadir','Enes','Serdar','Cenk','Okay','Kaan','Orkun','Halil','Uğurcan','Altay','Berkan','Taylan','Salih','Ridvan','Yunus','Kenan'], last: ['Çalhanoğlu','Güler','Ünder','Yılmaz','Belözoğlu','Kabak','Kadıoğlu','Aktürkoğlu','Söyüncü','Demiral','Çakır','Yazıcı','Ömür','Ünal','Akgün','Bayındır','Çelik','Karaman','Tufan','Yokuslu','Kökçü','Dervişoğlu','Tosun','Türüc','Özcan','Ayhan','Erkin','Şahin','Tekdemir','Mor'] },
  SE: { first: ['Zlatan','Alexander','Emil','Viktor','Dejan','Sebastian','Robin','Albin','Mattias','Ludwig','Jesper','Anthony','Jens','Marcus','Gustav','Hugo','Patrik','Henrik','Fredrik','Kristoffer','Ken','Oscar','Carl','Mikael','Pontus','Andreas','Per','Erik','Linus','Joel'], last: ['Ibrahimović','Isak','Forsberg','Claesson','Kulusevski','Larsson','Quaison','Olsson','Ekdal','Augustinsson','Krafth','Svanberg','Danielson','Lindelöf','Granqvist','Lustig','Jansson','Berg','Toivonen','Guidetti','Svensson','Johansson','Nilsson','Andersson','Eriksson','Karlsson','Pettersson','Lindqvist','Persson','Berglund'] },
  KR: { first: ['Son','Kim','Park','Lee','Hwang','Cho','Jung','Kang','Yoon','Kwon','Ki','Han','Hong','Jeong','Song','Jang','Bae','Ahn','Seo','Lim','Oh','Shin','Moon','Yang','Choi','Ryu','Na','Ko','Woo','Do'], last: ['Heung-min','Min-jae','Ji-sung','Kang-in','Hee-chan','Gue-sung','Sung-yueng','Chang-hoon','Jae-sung','In-beom','Young-gwon','Jin-su','Chul','Seung-ho','Woo-young','Hyun-jun','Tae-hwan','Jun-ho','Dong-hyun','Ui-jo','Ji-soo','Min-hyeok','Jeong-hyeon','Seung-woo','Hyeon-gyu','Sang-ho','Jin-hyeon','Yeong-jae','Se-jong','Min-woo'] },
  EG: { first: ['Mohamed','Ahmed','Mahmoud','Omar','Ali','Mostafa','Amr','Ramadan','Tarek','Karim','Trezeguet','Marwan','Ayman','Nabil','Abdallah','Ibrahim','Hassan','Hussein','Emad','Walid','Hazem','Wael','Essam','Mido','Shikabala','Zizo','Afsha','Hamdi','Galal','Saad'], last: ['Salah','Elneny','Hegazi','Trezeguet','Sobhi','Mohsen','Ashraf','Fathi','El Shenawy','Warda','Marmoush','Abo Gabal','Hassan','Hamdi','El Said','Ghaly','Barakat','Zidan','Mido','Aboutrika','Hossam','Meteb','Gedo','Kahraba','Mustafa','Soliman','Mohsen','Gabr','Samir','Abdel Shafy'] },
  UY: { first: ['Luis','Edinson','Diego','Federico','Rodrigo','José','Ronald','Maxi','Martín','Sebastián','Giorgian','Darwin','Matías','Nicolás','Álvaro','Nahitan','Lucas','Facundo','Mathías','Fernando','Agustín','Manuel','Brian','Guillermo','Diego','Marcelo','Gonzalo','Gastón','Cristhian','Jonathan'], last: ['Suárez','Cavani','Godín','Valverde','Bentancur','Giménez','Araújo','De Arrascaeta','Muslera','Cáceres','Núñez','Viña','Olivera','Ugarte','Torres','Pellistri','Ocampos','Coates','Vecino','Nández','Torreira','De la Cruz','Rodríguez','Recoba','Forlán','Francescoli','Sosa','Enzo','Álvarez','Abreu'] },
  AU: { first: ['Aaron','Mathew','Mitchell','Ajdin','Harry','Kye','Martin','Jason','Bailey','Thomas','Craig','Tim','Mark','Lucas','Awer','Garang','Riley','Connor','Cameron','Jackson','Joel','Rhyan','Nathaniel','Jamie','Keanu','Joshua','Denis','Trent','Brandon','Kusini'], last: ['Mooy','Ryan','Leckie','Hrustic','Souttar','Rowles','Boyle','Cummings','Duke','Behich','Irvine','McGree','Maclaren','Goodwin','Mabil','Kuol','Wright','Baccus','Atkinson','Deng','Karacic','King','Degenek','Sainsbury','Jedinak','Cahill','Kewell','Neill','Vidosic','Arzani'] },
  IL: { first: ['Eran','Yossi','Eli','Omer','Dor','Lior','Manor','Bibras',"Mu'nas",'Shon','Gadi','Tomer','Sagiv','Nir','Raz','Eden','Tal','Liel','Oscar','Hatem','Moanes','Sun','Dia','Eyal','Ofir','Gil','Ram','Idan','Omer','Itay'], last: ['Zahavi','Benayoun','Dabour','Weissman','Peretz','Solomon','Atzili','Natcho','Abu Fani','Dabbur','Haziza','Glazer','Kinda','Bitton','Revivo','Berkovic','Refaelov','Davidzada','Yeini','Menachem','Shua','Lavi','Nachmias','Abada','Shamir','Karzev','Eliyahu','Melikson','Almog','Baribo'] },
  IT: { first: ['Marco','Andrea','Alessandro','Lorenzo','Federico','Gianluigi','Leonardo','Giovanni','Nicolo','Sandro','Ciro','Francesco','Roberto','Fabio','Matteo','Giacomo','Davide','Gianluca','Claudio','Daniele','Filippo','Riccardo','Simone','Luca','Antonio','Giorgio','Emanuele','Salvatore','Angelo','Vincenzo'], last: ['Rossi','Bianchi','Romano','Ferrari','Esposito','Colombo','Ricci','Moretti','Marchetti','Barbieri','Fontana','Galli','Conti','Costa','Marini','Bruno','Mancini','Leone','Longo','Greco','Rinaldi','Serra','Ferrara','Pellegrini','Gentile','Martinelli','Caruso','Vitale','Benedetti','Montanari'] },
};

/** Fallback generic first names for any unmapped country */
export const GENERIC_FIRST: readonly string[] = [
  'Carlos','Ahmed','Wei','Diego','Omar','Ivan','Mateo','Felix','Leon','Oscar',
  'Pedro','Lucas','Bruno','Andre','James','Jack','Harry','Max','Marco','Luca',
] as const;

/** Fallback generic last names for any unmapped country */
export const GENERIC_LAST: readonly string[] = [
  'Silva','Santos','Garcia','Martinez','Mueller','Schmidt','Petrov','Rossi','Tanaka','Kim',
  'Fernandes','Costa','Torres','Ramos','Weber','Klein','Brown','Taylor','Park','Chen',
] as const;

/* ================================================================
   MORALE SYSTEM (#4)
   ================================================================ */

/** Morale gained per win */
export const MORALE_WIN = 1;
/** Morale lost per loss */
export const MORALE_LOSS = -1;
/** Morale boost for promotion */
export const MORALE_PROMOTION = 5;
/** Morale penalty for relegation */
export const MORALE_RELEGATION = -5;
/** Morale boost for cup win */
export const MORALE_CUP_WIN = 3;
/** Morale penalty for cup elimination */
export const MORALE_CUP_ELIM = -1;
/** Maximum morale value */
export const MORALE_MAX = 10;
/** Minimum morale value */
export const MORALE_MIN = -10;
/** Morale effect on team strength per point (0.5%) */
export const MORALE_STRENGTH_PCT = 0.005;

/* ================================================================
   PLAYER ROLES (#5)
   ================================================================ */

/** Available player roles by position */
export const ROLES_BY_POSITION: Readonly<Record<Position, readonly PlayerRole[]>> = {
  GK: ['anchor', null],
  DEF: ['ballWinner', 'anchor', null],
  MID: ['playmaker', 'creator', 'ballWinner', null],
  STR: ['targetMan', 'speedster', 'creator', null],
} as const;

/** Tactic-role synergy bonuses (fractional, e.g. 0.03 = +3%) */
export const ROLE_TACTIC_SYNERGY: Readonly<Partial<Record<PlayerRole & string, Partial<Record<TacticId, number>>>>> = {
  playmaker: { balanced: 0.03 },
  targetMan: { attack: 0.05 },
  ballWinner: { defensive: 0.04 },
  speedster: { counter: 0.05 },
  creator: { attack: 0.03 },
  anchor: { defensive: 0.03 },
} as const;

/* ================================================================
   SPONSORSHIP DEALS (#6)
   ================================================================ */

/** Available sponsorship tiers */
export const SPONSORSHIP_TIERS: readonly Sponsorship[] = [
  { tier: 'small', incomePerSeason: 500, cupBonusPerRound: 0, requiredDiv: 4 },
  { tier: 'medium', incomePerSeason: 1000, cupBonusPerRound: 100, requiredDiv: 3 },
  { tier: 'large', incomePerSeason: 2000, cupBonusPerRound: 200, requiredDiv: 1 },
  { tier: 'cup', incomePerSeason: 300, cupBonusPerRound: 500, requiredDiv: 4 },
] as const;

/* ================================================================
   STADIUM FACILITIES (#7)
   ================================================================ */

/** Cost per facility level upgrade [level1, level2, level3] */
export const FACILITY_COSTS: Readonly<Record<string, readonly number[]>> = {
  trainingFacility: [5000, 8000, 12000],
  youthAcademy: [8000, 13000, 20000],
  stadium: [10000, 17000, 25000],
} as const;

/** Training facility effectiveness bonus per level */
export const TRAINING_FACILITY_BONUS = 0.03;
/** Youth academy regen skill bonus per level */
export const YOUTH_ACADEMY_SKILL_BONUS = 2;
/** Stadium income bonus per level per season */
export const STADIUM_INCOME_BONUS = 500;

/* ================================================================
   LOAN SYSTEM (#8)
   ================================================================ */

/** Loan fee as fraction of market value */
export const LOAN_FEE_RATIO = 0.30;

/* ================================================================
   RIVAL PAIRS (#13)
   ================================================================ */

/** Rival team pairs (by team name) */
export const RIVAL_PAIRS: readonly [string, string][] = [
  ['Barcelona', 'Madrid'],
  ['Manchester', 'Liverpool'],
  ['Porto', 'Lisbon'],
  ['Berlin', 'Dortmund'],
  ['Paris', 'Lyon'],
  ['São Paulo', 'Santos'],
  ['Chicago', 'Los Angeles'],
  ['Vancouver', 'Toronto'],
  ['Tokyo', 'Beijing'],
  ['Buenos Aires', 'Montevideo'],
] as const;

/** Derby form multiplier (doubles form changes) */
export const DERBY_FORM_MULT = 2;
/** Derby morale bonus for winning */
export const DERBY_MORALE_BONUS = 2;

/* ================================================================
   SCOUT NETWORK (#18)
   ================================================================ */

/** Scout upgrade costs by level */
export const SCOUT_COSTS: readonly number[] = [0, 2000, 3000] as const;

/* ================================================================
   TRANSFER NEGOTIATION (#17)
   ================================================================ */

/** Maximum negotiation rounds */
export const NEGOTIATION_MAX_ROUNDS = 3;
/** AI seller initial markup range (10-30% above minimum) */
export const NEGOTIATION_MARKUP_MIN = 0.10;
export const NEGOTIATION_MARKUP_MAX = 0.30;
/** Each counter-offer reduces the gap by this fraction */
export const NEGOTIATION_REDUCTION = 0.50;

/* ================================================================
   MATCH NARRATIVE TEMPLATES (#excitement)
   ================================================================ */

/**
 * Goal narrative templates by position.
 * Placeholders: {name} = scorer name, {minute} = minute of goal.
 */
export const GOAL_NARRATIVES: Readonly<Record<Position, readonly string[]>> = {
  STR: [
    '{name} fires it into the bottom corner!',
    '{name} beats the keeper with a clinical finish!',
    '{name} volleys it home from close range!',
    '{name} rounds the goalkeeper and slots it in!',
    'A brilliant solo run by {name} — GOAL!',
    '{name} rises highest and heads it in!',
    '{name} smashes it into the roof of the net!',
    'Cool as you like, {name} chips the keeper!',
    '{name} pounces on a defensive error — GOAL!',
    '{name} with a thunderbolt from 20 yards!',
  ],
  MID: [
    '{name} unleashes a screamer from distance!',
    '{name} curls one in from 25 yards!',
    'A perfectly-timed run by {name} — taps it in!',
    '{name} picks up a loose ball and drives it home!',
    '{name} threads it through a crowd of defenders!',
    '{name} with a stunning long-range strike!',
    'Great link-up play and {name} finishes it off!',
    '{name} arrives late in the box — what a goal!',
  ],
  DEF: [
    '{name} heads in from a corner!',
    '{name} rises above everyone at the set piece — GOAL!',
    'A towering header from {name}!',
    '{name} smashes it in from a free kick!',
    '{name} ghosting in at the back post — unlikely scorer!',
    'Nobody picked up {name} at the corner — 1-0!',
  ],
  GK: [
    '{name} — yes the goalkeeper — scores from a free kick!',
    'Incredible! {name} runs the length of the pitch and scores!',
  ],
} as const;

/** Late-goal narrative suffixes (appended for goals 85'+) */
export const LATE_GOAL_SUFFIXES: readonly string[] = [
  ' A dramatic late goal!',
  ' The stadium erupts!',
  ' Scenes of delirium!',
  ' Heartbreak for the opposition!',
  ' What a time to score!',
  ' It\'s a last-gasp thriller!',
  ' Written in the stars!',
  ' You couldn\'t script it!',
] as const;

/** Yellow card narrative templates */
export const YELLOW_NARRATIVES: readonly string[] = [
  '{name} is booked for a late challenge.',
  '{name} picks up a yellow for persistent fouling.',
  'The referee shows {name} a yellow card.',
  '{name} goes into the book after a cynical foul.',
  'A reckless tackle from {name} — yellow card.',
] as const;

/** Red card narrative templates */
export const RED_NARRATIVES: readonly string[] = [
  '{name} is sent off! A terrible challenge!',
  'Straight red for {name} — violent conduct!',
  '{name} sees red after a two-footed lunge!',
  '{name} receives a second yellow — off you go!',
  'The referee has no choice — {name} is dismissed!',
] as const;

/** Probability of a goal occurring in the final 10 minutes (85-93) — adds drama */
export const LATE_GOAL_BIAS = 0.20;

/* ================================================================
   TITLE RACE / RELEGATION PRESSURE (#excitement)
   ================================================================ */

/** Weeks remaining in season when pressure kicks in */
export const PRESSURE_THRESHOLD_WEEKS = 4;
/** Form multiplier for teams in title race or relegation battle */
export const PRESSURE_FORM_MULT = 1.5;
/** Strength variance boost for pressure matches (more unpredictable) */
export const PRESSURE_VARIANCE = 0.08;

/* ================================================================
   TRANSFER DEADLINE DAY (#excitement)
   ================================================================ */

/** Week number that acts as transfer deadline day (last chance to buy) */
export const TRANSFER_DEADLINE_WEEK = 3;
/** Price discount on deadline day */
export const DEADLINE_DAY_DISCOUNT = 0.20;
/** Extra free agents spawned on deadline day */
export const DEADLINE_DAY_EXTRA_AGENTS = 4;

/* ================================================================
   HOT STREAK / ON FIRE (#excitement)
   ================================================================ */

/** Minimum form to trigger "On Fire" status */
export const ON_FIRE_FORM_MIN = 3;
/** Minimum recent goals to trigger "On Fire" status */
export const ON_FIRE_GOALS_MIN = 3;
/** OVR bonus multiplier when "On Fire" */
export const ON_FIRE_BONUS = 1.08;

/* ================================================================
   MAN OF THE MATCH (#excitement)
   ================================================================ */

/** MOTM is tracked per fixture — stored transiently on the fixture */
export const MOTM_GOAL_WEIGHT = 3;
export const MOTM_FORM_WEIGHT = 1;
export const MOTM_SKILL_WEIGHT = 1;

/* ================================================================
   AGGREGATE CONFIG OBJECT
   ================================================================ */

/**
 * GAME_CONFIG — a single object bundling all constants for convenience.
 * Individual named exports above are preferred for tree-shaking,
 * but this object is useful when passing config around as a whole.
 */
export const GAME_CONFIG = {
  version: GAME_VERSION,
  saveKey: SAVE_KEY,
  settingsKey: SETTINGS_KEY,

  // League
  teamsPerDiv: TEAMS_PER_DIV,
  seasonWeeks: SEASON_WEEKS,
  totalSeasonWeeks: TOTAL_SEASON_WEEKS,

  // Formations & tactics
  formations: FORMATIONS,
  defaultFormationIdx: DEFAULT_FORMATION_IDX,
  tactics: TACTICS,

  // Positions
  posOrder: POS_ORDER,
  posCss: POS_CSS,
  posDistance: POS_DISTANCE,
  oopPenaltyPerStep: OOP_PENALTY_PER_STEP,
  squadComp: SQUAD_COMP,
  goalPosWeight: GOAL_POS_WEIGHT,

  // Training
  trainingSkillChance: TRAINING_SKILL_CHANCE,
  trainingFocusBonus: TRAINING_FOCUS_BONUS,
  trainingFocuses: TRAINING_FOCUSES,

  // Cup
  cupRounds: CUP_ROUNDS,
  cupWeeks: CUP_WEEKS,
  cupPrize: CUP_PRIZE,

  // Discipline
  yellowCardChance: YELLOW_CARD_CHANCE,
  redCardChance: RED_CARD_CHANCE,
  yellowAccumulation: YELLOW_ACCUMULATION,
  redSuspension: RED_SUSPENSION,

  // Form
  formWinBoost: FORM_WIN_BOOST,
  formGoalBoost: FORM_GOAL_BOOST,
  formLossPenalty: FORM_LOSS_PENALTY,
  formMax: FORM_MAX,
  formMin: FORM_MIN,
  formOvrPct: FORM_OVR_PCT,

  // Division ranges & income
  divRange: DIV_RANGE,
  divSeasonIncome: DIV_SEASON_INCOME,
  divWinBonus: DIV_WIN_BONUS,
  divDrawBonus: DIV_DRAW_BONUS,

  // Prize money
  prizeMoney: PRIZE_MONEY,
  parachutePayment: PARACHUTE_PAYMENT,
  solidarityPayment: SOLIDARITY_PAYMENT,
  aiTargetSquad: AI_TARGET_SQUAD,

  // Transfer market
  startingBudget: STARTING_BUDGET,
  freeAgentsPerSeason: FREE_AGENTS_PER_SEASON,
  maxFreeAgentPool: MAX_FREE_AGENT_POOL,
  freeAgentSkillRange: FREE_AGENT_SKILL_RANGE,
  sellValueRatio: SELL_VALUE_RATIO,
  squadMin: SQUAD_MIN,
  squadMax: SQUAD_MAX,

  // New features
  difficultySettings: DIFFICULTY_SETTINGS,
  developmentCurves: DEVELOPMENT_CURVES,
} as const;
