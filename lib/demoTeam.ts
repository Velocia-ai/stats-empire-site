// Stats Empire, coach-facing soccer demo dataset.
//
// A fictional but realistic club (Athletic Rovers, reused from the soccer
// freemium fixture for cross-surface consistency) used to drive a coach-facing
// stats demo: a roster the UI can map over, plus per-player and team-level stat
// records across THREE timeframe views.
//
// Timeframes (use the TIMEFRAMES list to render a toggle):
//   - match  : a single representative match
//   - week   : the last few matches aggregated (here, last 4)
//   - season : the full season to date (34 matches)
//
// Coherence guarantees (so the numbers read true under scrutiny):
//   - Counting stats are monotonic per player: season >= week >= match.
//   - Rate stats (passPct, xG/90 implied by volume) stay plausible across views.
//   - Team stats are the squad-level story for each timeframe, not a naive sum
//     of the 9 listed players (a real squad rotates a wider group).
//   - "clips" is a per-player count of tagged video clips available, so the UI
//     can reference clip-by-clip video analysis. It also grows match -> season.
//
// Voice/format: no em-dashes anywhere. Plain typed data, no React imports.

// --- Types -------------------------------------------------------------------

/** The three timeframe views a coach can toggle between. */
export type Timeframe = 'match' | 'week' | 'season';

/** Outfield/keeper positions, broad enough for a coach-facing summary. */
export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'CDM' | 'CM' | 'CAM' | 'RW' | 'LW' | 'ST';

/**
 * One player's stat line for a single timeframe. Counting stats are totals for
 * that window; passPct and duelsWonPct are window-level rates (0 to 100).
 */
export interface PlayerStatLine extends StatLine {
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xG: number;
  xA: number;
  passes: number;
  passPct: number; // 0 to 100
  keyPasses: number;
  dribbles: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  duelsWon: number;
  duelsWonPct: number; // 0 to 100
  fouls: number;
  foulsWon: number;
  offsides: number;
  yellow: number;
  red: number;
  /** Tagged video clips available for this player in this window. */
  clips: number;
}

/** A squad member plus their stat record across all three timeframes. */
export interface DemoPlayer {
  id: string;
  name: string;
  number: number;
  position: Position;
  /** True for the everyday starting XI; false for rotation/bench. */
  starter: boolean;
  /** One stat line per timeframe. */
  stats: Record<Timeframe, PlayerStatLine>;
}

/**
 * Team-level summary for a single timeframe. Mirrors the player shape where it
 * makes sense, plus squad-only fields (possession, result counts).
 */
export interface TeamStatLine extends StatLine {
  /** Matches covered by this window (match = 1, week = 4, season = 34). */
  matchesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  wins: number;
  draws: number;
  losses: number;
  possessionPct: number; // 0 to 100
  shots: number;
  shotsOnTarget: number;
  xG: number;
  xGA: number;
  passes: number;
  passPct: number; // 0 to 100
  tackles: number;
  interceptions: number;
  recoveries: number;
  duelsWonPct: number; // 0 to 100
  cleanSheets: number;
  /** Total tagged video clips across the squad for this window. */
  clips: number;
}

/** Top-level club identity + per-timeframe team summary. */
export interface DemoTeam {
  id: string;
  name: string;
  shortName: string;
  badgeInitials: string;
  competition: string;
  season: string;
  coach: string;
  formation: string;
  /** Primary brand color hint for the UI (hex), used lightly if at all. */
  colorHint: string;
  /** Team summary per timeframe. */
  stats: Record<Timeframe, TeamStatLine>;
}

// --- Timeframe metadata (drives the toggle UI) -------------------------------

export interface TimeframeMeta {
  id: Timeframe;
  label: string;
  /** Short helper line describing the window. */
  blurb: string;
}

export const TIMEFRAMES: TimeframeMeta[] = [
  { id: 'match', label: 'Per match', blurb: 'Matchday 34 vs Calle Union' },
  { id: 'week', label: 'Per week', blurb: 'Last 4 matches, aggregated' },
  { id: 'season', label: 'Per season', blurb: '34 matches, season to date' },
];

// --- Team summary ------------------------------------------------------------

export const DEMO_TEAM: DemoTeam = {
  id: 'athletic-rovers',
  name: 'Athletic Rovers',
  shortName: 'Rovers',
  badgeInitials: 'AR',
  competition: 'Continental First Division',
  season: '2025/26',
  coach: 'Diego Marchetti',
  formation: '4-3-3',
  colorHint: '#c8ff3d',
  stats: {
    match: {
      matchesPlayed: 1,
      goalsFor: 3,
      goalsAgainst: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      possessionPct: 58.0,
      shots: 16,
      shotsOnTarget: 7,
      xG: 2.34,
      xGA: 0.82,
      passes: 612,
      passPct: 89.4,
      tackles: 19,
      interceptions: 11,
      recoveries: 47,
      duelsWonPct: 56.8,
      cleanSheets: 0,
      clips: 84,
    },
    week: {
      matchesPlayed: 4,
      goalsFor: 9,
      goalsAgainst: 4,
      wins: 3,
      draws: 0,
      losses: 1,
      possessionPct: 55.6,
      shots: 58,
      shotsOnTarget: 24,
      xG: 8.12,
      xGA: 4.05,
      passes: 2284,
      passPct: 87.9,
      tackles: 76,
      interceptions: 43,
      recoveries: 181,
      duelsWonPct: 54.3,
      cleanSheets: 1,
      clips: 312,
    },
    season: {
      matchesPlayed: 34,
      goalsFor: 61,
      goalsAgainst: 38,
      wins: 20,
      draws: 7,
      losses: 7,
      possessionPct: 54.1,
      shots: 472,
      shotsOnTarget: 188,
      xG: 58.7,
      xGA: 36.9,
      passes: 18640,
      passPct: 86.7,
      tackles: 612,
      interceptions: 348,
      recoveries: 1487,
      duelsWonPct: 52.9,
      cleanSheets: 11,
      clips: 2640,
    },
  },
};

// --- Roster (9 players, the spine of the XI plus key rotation) ---------------
//
// Stat lines are hand-tuned for internal coherence:
//   season counting stats >= week >= match, rates stay believable, and the
//   striker scores, the playmaker assists, the keeper saves, etc.

export const DEMO_PLAYERS: DemoPlayer[] = [
  {
    id: 'ar-1-okafor',
    name: 'Samuel Okafor',
    number: 1,
    position: 'GK',
    starter: true,
    stats: {
      match: {
        minutes: 90, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, xG: 0, xA: 0,
        passes: 31, passPct: 80.6, keyPasses: 0, dribbles: 0, tackles: 0, interceptions: 1,
        recoveries: 4, duelsWon: 1, duelsWonPct: 100, fouls: 0, foulsWon: 1, offsides: 0,
        yellow: 0, red: 0, clips: 6,
      },
      week: {
        minutes: 360, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, xG: 0, xA: 0,
        passes: 128, passPct: 78.9, keyPasses: 0, dribbles: 0, tackles: 0, interceptions: 3,
        recoveries: 17, duelsWon: 3, duelsWonPct: 75.0, fouls: 1, foulsWon: 2, offsides: 0,
        yellow: 0, red: 0, clips: 22,
      },
      season: {
        minutes: 3060, goals: 0, assists: 1, shots: 0, shotsOnTarget: 0, xG: 0, xA: 0.4,
        passes: 1088, passPct: 79.4, keyPasses: 2, dribbles: 0, tackles: 0, interceptions: 24,
        recoveries: 142, duelsWon: 26, duelsWonPct: 72.2, fouls: 3, foulsWon: 9, offsides: 0,
        yellow: 2, red: 0, clips: 168,
      },
    },
  },
  {
    id: 'ar-2-bianchi',
    name: 'Luca Bianchi',
    number: 2,
    position: 'RB',
    starter: true,
    stats: {
      match: {
        minutes: 90, goals: 0, assists: 1, shots: 1, shotsOnTarget: 0, xG: 0.04, xA: 0.31,
        passes: 64, passPct: 90.6, keyPasses: 2, dribbles: 2, tackles: 3, interceptions: 2,
        recoveries: 7, duelsWon: 6, duelsWonPct: 60.0, fouls: 1, foulsWon: 1, offsides: 0,
        yellow: 1, red: 0, clips: 9,
      },
      week: {
        minutes: 360, goals: 0, assists: 2, shots: 4, shotsOnTarget: 1, xG: 0.21, xA: 0.78,
        passes: 241, passPct: 88.4, keyPasses: 6, dribbles: 7, tackles: 11, interceptions: 8,
        recoveries: 26, duelsWon: 21, duelsWonPct: 57.0, fouls: 4, foulsWon: 3, offsides: 0,
        yellow: 1, red: 0, clips: 31,
      },
      season: {
        minutes: 2880, goals: 1, assists: 7, shots: 22, shotsOnTarget: 6, xG: 1.4, xA: 5.2,
        passes: 1916, passPct: 86.9, keyPasses: 41, dribbles: 53, tackles: 84, interceptions: 61,
        recoveries: 214, duelsWon: 168, duelsWonPct: 55.4, fouls: 27, foulsWon: 22, offsides: 1,
        yellow: 6, red: 0, clips: 246,
      },
    },
  },
  {
    id: 'ar-4-vargas',
    name: 'Mateo Vargas',
    number: 4,
    position: 'CB',
    starter: true,
    stats: {
      match: {
        minutes: 90, goals: 0, assists: 0, shots: 1, shotsOnTarget: 1, xG: 0.12, xA: 0,
        passes: 78, passPct: 93.6, keyPasses: 0, dribbles: 0, tackles: 4, interceptions: 3,
        recoveries: 9, duelsWon: 8, duelsWonPct: 72.7, fouls: 1, foulsWon: 0, offsides: 0,
        yellow: 0, red: 0, clips: 7,
      },
      week: {
        minutes: 360, goals: 1, assists: 0, shots: 3, shotsOnTarget: 2, xG: 0.44, xA: 0.06,
        passes: 296, passPct: 92.2, keyPasses: 1, dribbles: 1, tackles: 14, interceptions: 12,
        recoveries: 34, duelsWon: 29, duelsWonPct: 69.0, fouls: 4, foulsWon: 2, offsides: 1,
        yellow: 1, red: 0, clips: 24,
      },
      season: {
        minutes: 3015, goals: 4, assists: 1, shots: 24, shotsOnTarget: 11, xG: 3.1, xA: 0.6,
        passes: 2412, passPct: 91.4, keyPasses: 8, dribbles: 9, tackles: 112, interceptions: 98,
        recoveries: 287, duelsWon: 241, duelsWonPct: 67.3, fouls: 31, foulsWon: 14, offsides: 3,
        yellow: 7, red: 1, clips: 204,
      },
    },
  },
  {
    id: 'ar-6-delacroix',
    name: 'Theo Delacroix',
    number: 6,
    position: 'CDM',
    starter: true,
    stats: {
      match: {
        minutes: 90, goals: 0, assists: 0, shots: 1, shotsOnTarget: 0, xG: 0.07, xA: 0.14,
        passes: 89, passPct: 94.4, keyPasses: 1, dribbles: 1, tackles: 5, interceptions: 4,
        recoveries: 11, duelsWon: 9, duelsWonPct: 64.3, fouls: 2, foulsWon: 1, offsides: 0,
        yellow: 0, red: 0, clips: 8,
      },
      week: {
        minutes: 358, goals: 0, assists: 1, shots: 3, shotsOnTarget: 1, xG: 0.28, xA: 0.49,
        passes: 332, passPct: 93.1, keyPasses: 5, dribbles: 4, tackles: 18, interceptions: 15,
        recoveries: 41, duelsWon: 33, duelsWonPct: 61.1, fouls: 6, foulsWon: 4, offsides: 0,
        yellow: 1, red: 0, clips: 29,
      },
      season: {
        minutes: 2790, goals: 2, assists: 6, shots: 19, shotsOnTarget: 7, xG: 2.0, xA: 4.4,
        passes: 2604, passPct: 92.0, keyPasses: 37, dribbles: 31, tackles: 138, interceptions: 121,
        recoveries: 318, duelsWon: 258, duelsWonPct: 59.7, fouls: 41, foulsWon: 28, offsides: 0,
        yellow: 9, red: 0, clips: 261,
      },
    },
  },
  {
    id: 'ar-8-nakamura',
    name: 'Kenji Nakamura',
    number: 8,
    position: 'CM',
    starter: true,
    stats: {
      match: {
        minutes: 90, goals: 0, assists: 1, shots: 2, shotsOnTarget: 1, xG: 0.18, xA: 0.36,
        passes: 81, passPct: 91.4, keyPasses: 3, dribbles: 4, tackles: 2, interceptions: 2,
        recoveries: 8, duelsWon: 7, duelsWonPct: 58.3, fouls: 1, foulsWon: 2, offsides: 0,
        yellow: 0, red: 0, clips: 10,
      },
      week: {
        minutes: 352, goals: 1, assists: 2, shots: 7, shotsOnTarget: 3, xG: 0.71, xA: 1.02,
        passes: 304, passPct: 90.1, keyPasses: 9, dribbles: 13, tackles: 9, interceptions: 7,
        recoveries: 29, duelsWon: 24, duelsWonPct: 55.8, fouls: 4, foulsWon: 5, offsides: 1,
        yellow: 1, red: 0, clips: 34,
      },
      season: {
        minutes: 2745, goals: 6, assists: 11, shots: 51, shotsOnTarget: 22, xG: 5.8, xA: 8.9,
        passes: 2388, passPct: 89.2, keyPasses: 68, dribbles: 96, tackles: 71, interceptions: 58,
        recoveries: 226, duelsWon: 184, duelsWonPct: 54.1, fouls: 29, foulsWon: 37, offsides: 2,
        yellow: 5, red: 0, clips: 288,
      },
    },
  },
  {
    id: 'ar-10-ferreira',
    name: 'Rafael Ferreira',
    number: 10,
    position: 'CAM',
    starter: true,
    stats: {
      match: {
        minutes: 90, goals: 1, assists: 1, shots: 4, shotsOnTarget: 2, xG: 0.54, xA: 0.41,
        passes: 67, passPct: 88.1, keyPasses: 4, dribbles: 6, tackles: 1, interceptions: 1,
        recoveries: 5, duelsWon: 6, duelsWonPct: 54.5, fouls: 1, foulsWon: 4, offsides: 1,
        yellow: 0, red: 0, clips: 12,
      },
      week: {
        minutes: 348, goals: 3, assists: 3, shots: 14, shotsOnTarget: 8, xG: 1.96, xA: 1.34,
        passes: 248, passPct: 86.7, keyPasses: 13, dribbles: 21, tackles: 5, interceptions: 4,
        recoveries: 18, duelsWon: 22, duelsWonPct: 52.4, fouls: 5, foulsWon: 11, offsides: 2,
        yellow: 1, red: 0, clips: 41,
      },
      season: {
        minutes: 2820, goals: 16, assists: 14, shots: 112, shotsOnTarget: 58, xG: 14.7, xA: 11.8,
        passes: 1992, passPct: 85.4, keyPasses: 94, dribbles: 168, tackles: 38, interceptions: 31,
        recoveries: 147, duelsWon: 169, duelsWonPct: 50.9, fouls: 33, foulsWon: 78, offsides: 9,
        yellow: 4, red: 0, clips: 372,
      },
    },
  },
  {
    id: 'ar-7-osei',
    name: 'Daniel Osei',
    number: 7,
    position: 'RW',
    starter: true,
    stats: {
      match: {
        minutes: 78, goals: 1, assists: 0, shots: 3, shotsOnTarget: 2, xG: 0.61, xA: 0.18,
        passes: 42, passPct: 85.7, keyPasses: 2, dribbles: 5, tackles: 1, interceptions: 0,
        recoveries: 4, duelsWon: 5, duelsWonPct: 50.0, fouls: 1, foulsWon: 3, offsides: 1,
        yellow: 0, red: 0, clips: 11,
      },
      week: {
        minutes: 306, goals: 2, assists: 1, shots: 11, shotsOnTarget: 6, xG: 2.04, xA: 0.62,
        passes: 168, passPct: 84.5, keyPasses: 7, dribbles: 19, tackles: 4, interceptions: 2,
        recoveries: 15, duelsWon: 18, duelsWonPct: 48.6, fouls: 3, foulsWon: 8, offsides: 3,
        yellow: 0, red: 0, clips: 36,
      },
      season: {
        minutes: 2480, goals: 13, assists: 8, shots: 98, shotsOnTarget: 49, xG: 12.1, xA: 6.4,
        passes: 1364, passPct: 83.1, keyPasses: 61, dribbles: 154, tackles: 29, interceptions: 18,
        recoveries: 118, duelsWon: 141, duelsWonPct: 47.8, fouls: 24, foulsWon: 62, offsides: 14,
        yellow: 3, red: 0, clips: 318,
      },
    },
  },
  {
    id: 'ar-11-sorensen',
    name: 'Anders Sorensen',
    number: 11,
    position: 'LW',
    starter: true,
    stats: {
      match: {
        minutes: 90, goals: 0, assists: 0, shots: 2, shotsOnTarget: 1, xG: 0.29, xA: 0.22,
        passes: 49, passPct: 87.8, keyPasses: 2, dribbles: 4, tackles: 2, interceptions: 1,
        recoveries: 6, duelsWon: 5, duelsWonPct: 50.0, fouls: 2, foulsWon: 2, offsides: 0,
        yellow: 0, red: 0, clips: 8,
      },
      week: {
        minutes: 340, goals: 1, assists: 2, shots: 9, shotsOnTarget: 4, xG: 1.28, xA: 0.91,
        passes: 192, passPct: 86.5, keyPasses: 8, dribbles: 16, tackles: 7, interceptions: 5,
        recoveries: 22, duelsWon: 19, duelsWonPct: 49.4, fouls: 5, foulsWon: 6, offsides: 1,
        yellow: 1, red: 0, clips: 33,
      },
      season: {
        minutes: 2655, goals: 9, assists: 12, shots: 84, shotsOnTarget: 38, xG: 9.6, xA: 9.1,
        passes: 1588, passPct: 85.0, keyPasses: 72, dribbles: 138, tackles: 44, interceptions: 33,
        recoveries: 161, duelsWon: 152, duelsWonPct: 48.9, fouls: 31, foulsWon: 49, offsides: 6,
        yellow: 5, red: 0, clips: 301,
      },
    },
  },
  {
    id: 'ar-9-kovac',
    name: 'Marko Kovac',
    number: 9,
    position: 'ST',
    starter: true,
    stats: {
      match: {
        minutes: 85, goals: 1, assists: 0, shots: 5, shotsOnTarget: 3, xG: 0.88, xA: 0.09,
        passes: 33, passPct: 84.8, keyPasses: 1, dribbles: 2, tackles: 0, interceptions: 0,
        recoveries: 3, duelsWon: 7, duelsWonPct: 53.8, fouls: 2, foulsWon: 3, offsides: 2,
        yellow: 0, red: 0, clips: 13,
      },
      week: {
        minutes: 334, goals: 3, assists: 1, shots: 18, shotsOnTarget: 10, xG: 3.12, xA: 0.44,
        passes: 121, passPct: 83.5, keyPasses: 4, dribbles: 8, tackles: 1, interceptions: 1,
        recoveries: 11, duelsWon: 27, duelsWonPct: 51.9, fouls: 6, foulsWon: 9, offsides: 5,
        yellow: 1, red: 0, clips: 44,
      },
      season: {
        minutes: 2710, goals: 22, assists: 6, shots: 134, shotsOnTarget: 71, xG: 20.4, xA: 4.1,
        passes: 982, passPct: 82.0, keyPasses: 33, dribbles: 71, tackles: 12, interceptions: 9,
        recoveries: 96, duelsWon: 218, duelsWonPct: 50.5, fouls: 38, foulsWon: 74, offsides: 31,
        yellow: 6, red: 0, clips: 408,
      },
    },
  },
];

// --- Convenience exports -----------------------------------------------------

/** The full demo bundle, if the UI prefers a single import. */
export const DEMO_SOCCER = {
  team: DEMO_TEAM,
  players: DEMO_PLAYERS,
  timeframes: TIMEFRAMES,
} as const;

/** Pull a player's stat line for a given timeframe. */
export function playerStatsFor(player: DemoPlayer, timeframe: Timeframe): PlayerStatLine {
  return player.stats[timeframe];
}

/** Pull the team stat line for a given timeframe. */
export function teamStatsFor(timeframe: Timeframe): TeamStatLine {
  return DEMO_TEAM.stats[timeframe];
}

// =============================================================================
// SPORT REGISTRY (sport-agnostic API, additive on top of the soccer exports)
// =============================================================================
//
// The block below lets the UI render ANY sport without hardcoding fields. The
// UI maps over a sport's `columns` (player-table columns) and `teamMetrics`
// (team-summary tiles) instead of reaching for `l.goals` / `teamLine.passPct`.
//
// Design:
//   - A stat line is treated generically as a bag of numbers (StatLine =
//     Record<string, number>). The concrete soccer/basketball interfaces above
//     are structurally assignable to it, so old typed data drops straight in.
//   - ColumnDef.key / TeamMetricDef.key index into that bag. A `format` decides
//     how the number reads; if omitted the UI can fall back to the `format`
//     enum (pct / decimal / int) plus a default formatter.
//   - Every DemoSport bundles its own team, players, timeframes, columns and
//     teamMetrics, so adding a third sport later is just one more entry.

// --- Generic stat-line + column/metric model ---------------------------------

/**
 * A timeframe's stat line as a generic bag of numeric fields. The concrete
 * soccer/basketball stat-line interfaces `extends StatLine`, which both gives
 * them the index signature (so they are assignable to the registry) and keeps
 * their named fields fully typed for the sport-specific code paths.
 */
export interface StatLine {
  [key: string]: number;
}

/**
 * How a numeric value should be rendered when a column/metric does not supply
 * its own `format` function. The UI owns the concrete formatter; this is the
 * declarative hint.
 *   - 'int'     : whole number, thousands-separated (e.g. 1,088)
 *   - 'decimal' : one decimal place (e.g. 2.3)
 *   - 'pct'     : percentage, value is already 0..100 (e.g. 47.8%)
 *   - 'plusminus': signed integer (e.g. +6, -3)
 */
export type StatFormat = 'int' | 'decimal' | 'pct' | 'plusminus';

/**
 * One player-table column for a sport. The UI maps a sport's `columns` to build
 * the sortable roster table, so it never hardcodes soccer fields.
 */
export interface ColumnDef {
  /**
   * Stat field to read from a player's StatLine for the active timeframe, OR a
   * synthetic key the UI handles specially:
   *   - 'player' : the name/number/position cell (always first, left-aligned)
   *   - 'clips'  : the per-player tagged-clip count (lives on every StatLine)
   */
  key: string;
  /** Short header label, kept legible at desktop size (e.g. 'PTS', 'G'). */
  label: string;
  /** Longer description for the header tooltip / aria-label (e.g. 'Points'). */
  title: string;
  /** Cell + header alignment. 'player' is left, all stats are right. */
  align: 'left' | 'right';
  /**
   * Declarative render hint when there is no `format` function. Optional; the
   * UI may default to 'int'.
   */
  format?: StatFormat;
  /**
   * Mark the 1 to 2 emphasis columns for this sport (goals/assists for soccer,
   * points for basketball) so they read a touch stronger and seed the default
   * sort.
   */
  headline?: boolean;
  /**
   * Optional numeric width hint (px) for the column, for sports with wider
   * values. Advisory only; the UI may ignore it.
   */
  width?: number;
}

/**
 * One team-summary tile for a sport. The UI maps a sport's `teamMetrics` to
 * build the headline team strip.
 */
export interface TeamMetricDef {
  /** Stat field to read from the team StatLine for the active timeframe. */
  key: string;
  /** Tile label (e.g. 'Points for', 'Pass %'). */
  label: string;
  /** Render hint when there is no `format` function (see StatFormat). */
  format?: StatFormat;
  /**
   * Optional secondary line for the tile, built from the same team StatLine
   * (e.g. "38 against"). Returns the ready-to-render string, or undefined.
   */
  sub?: (team: StatLine) => string | undefined;
  /** Flag the single accent tile (goals/points for) so it pops on brand. */
  accent?: boolean;
}

/** A roster member in the generic registry (sport-neutral shape). */
export interface SportPlayer {
  id: string;
  name: string;
  number: number;
  /** Sport position label (e.g. 'ST', 'PG'); kept as a string here. */
  position: string;
  /** True for the everyday starting lineup; false for rotation/bench. */
  starter: boolean;
  /** One generic stat line per timeframe. */
  stats: Record<Timeframe, StatLine>;
}

/** Top-level club identity + per-timeframe team summary (sport-neutral). */
export interface SportTeam {
  id: string;
  name: string;
  shortName: string;
  badgeInitials: string;
  competition: string;
  season: string;
  coach: string;
  /** Formation (soccer) or scheme/positional setup (basketball). */
  formation: string;
  colorHint: string;
  /** Generic team stat line per timeframe. */
  stats: Record<Timeframe, StatLine>;
}

/** Everything the UI needs to render one sport end to end. */
export interface DemoSport {
  key: 'soccer' | 'basketball';
  label: string;
  team: SportTeam;
  players: SportPlayer[];
  timeframes: TimeframeMeta[];
  /** Player-table columns for THIS sport (UI maps over these). */
  columns: ColumnDef[];
  /** Team-summary tiles for THIS sport (UI maps over these). */
  teamMetrics: TeamMetricDef[];
}

// --- Basketball types --------------------------------------------------------

/** Basketball positions, point guard through center. */
export type BasketballPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

/**
 * One basketball player's stat line for a single timeframe. Counting stats are
 * totals for the window; fgPct/threePct/ftPct are window-level rates (0..100);
 * plusMinus is a signed net rating for the window.
 */
export interface BasketballStatLine extends StatLine {
  minutes: number;
  points: number;
  rebounds: number; // total (off + def)
  offRebounds: number;
  defRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgPct: number; // 0..100
  threePct: number; // 0..100
  ftPct: number; // 0..100
  fouls: number;
  plusMinus: number; // signed
  /** Tagged video clips available for this player in this window. */
  clips: number;
}

/** A basketball squad member plus their stat record across all timeframes. */
export interface BasketballPlayer {
  id: string;
  name: string;
  number: number;
  position: BasketballPosition;
  starter: boolean;
  stats: Record<Timeframe, BasketballStatLine>;
}

/** Team-level basketball summary for a single timeframe. */
export interface BasketballTeamStatLine extends StatLine {
  /** Games covered by this window (match = 1, week = 4, season = 62). */
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  /** Average possessions per game in the window (pace). */
  possessions: number;
  fgPct: number; // 0..100
  threePct: number; // 0..100
  ftPct: number; // 0..100
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  /** Total tagged video clips across the squad for this window. */
  clips: number;
}

/** Basketball club identity + per-timeframe team summary. */
export interface BasketballTeam {
  id: string;
  name: string;
  shortName: string;
  badgeInitials: string;
  competition: string;
  season: string;
  coach: string;
  /** Positional setup, e.g. '1-2-2 motion'. */
  scheme: string;
  colorHint: string;
  stats: Record<Timeframe, BasketballTeamStatLine>;
}

// --- Basketball timeframe metadata -------------------------------------------

export const BASKETBALL_TIMEFRAMES: TimeframeMeta[] = [
  { id: 'match', label: 'Per game', blurb: 'Game 62 vs Pioneer Forge' },
  { id: 'week', label: 'Per week', blurb: 'Last 4 games, aggregated' },
  { id: 'season', label: 'Per season', blurb: '62 games, season to date' },
];

// --- Basketball team summary -------------------------------------------------

export const DEMO_BASKETBALL_TEAM: BasketballTeam = {
  id: 'harbor-city-tide',
  name: 'Harbor City Tide',
  shortName: 'Tide',
  badgeInitials: 'HC',
  competition: 'Continental Hoops League',
  season: '2025/26',
  coach: 'Priya Raman',
  scheme: '1-2-2 motion',
  colorHint: '#c8ff3d',
  stats: {
    match: {
      gamesPlayed: 1,
      wins: 1,
      losses: 0,
      pointsFor: 112,
      pointsAgainst: 104,
      possessions: 99,
      fgPct: 48.3,
      threePct: 38.7,
      ftPct: 81.0,
      rebounds: 44,
      assists: 26,
      steals: 8,
      blocks: 5,
      turnovers: 12,
      clips: 96,
    },
    week: {
      gamesPlayed: 4,
      wins: 3,
      losses: 1,
      pointsFor: 441,
      pointsAgainst: 418,
      possessions: 98,
      fgPct: 47.1,
      threePct: 37.4,
      ftPct: 79.6,
      rebounds: 178,
      assists: 102,
      steals: 31,
      blocks: 19,
      turnovers: 53,
      clips: 372,
    },
    season: {
      gamesPlayed: 62,
      wins: 41,
      losses: 21,
      pointsFor: 6944,
      pointsAgainst: 6603,
      possessions: 97,
      fgPct: 46.8,
      threePct: 36.9,
      ftPct: 78.8,
      rebounds: 2740,
      assists: 1584,
      steals: 471,
      blocks: 298,
      turnovers: 842,
      clips: 5832,
    },
  },
};

// --- Basketball roster (9 players: starting 5 + key rotation) ----------------
//
// Counting stats are monotonic per player (season >= week >= match); shooting
// rates and plus/minus stay plausible across the three windows. The lead guard
// distributes, the wings score, the bigs rebound and block.

export const DEMO_BASKETBALL_PLAYERS: BasketballPlayer[] = [
  {
    id: 'hc-3-rivers',
    name: 'Andre Rivers',
    number: 3,
    position: 'PG',
    starter: true,
    stats: {
      match: {
        minutes: 34, points: 18, rebounds: 5, offRebounds: 1, defRebounds: 4, assists: 11,
        steals: 2, blocks: 0, turnovers: 3, fgPct: 46.7, threePct: 40.0, ftPct: 88.9,
        fouls: 2, plusMinus: 9, clips: 14,
      },
      week: {
        minutes: 135, points: 69, rebounds: 19, offRebounds: 3, defRebounds: 16, assists: 41,
        steals: 7, blocks: 1, turnovers: 13, fgPct: 45.1, threePct: 38.6, ftPct: 86.4,
        fouls: 8, plusMinus: 22, clips: 48,
      },
      season: {
        minutes: 2089, points: 1041, rebounds: 291, offRebounds: 44, defRebounds: 247, assists: 632,
        steals: 108, blocks: 14, turnovers: 198, fgPct: 44.6, threePct: 37.8, ftPct: 87.1,
        fouls: 121, plusMinus: 248, clips: 712,
      },
    },
  },
  {
    id: 'hc-11-castillo',
    name: 'Marco Castillo',
    number: 11,
    position: 'SG',
    starter: true,
    stats: {
      match: {
        minutes: 33, points: 24, rebounds: 4, offRebounds: 0, defRebounds: 4, assists: 3,
        steals: 1, blocks: 0, turnovers: 2, fgPct: 50.0, threePct: 45.5, ftPct: 90.0,
        fouls: 2, plusMinus: 11, clips: 15,
      },
      week: {
        minutes: 131, points: 91, rebounds: 16, offRebounds: 2, defRebounds: 14, assists: 12,
        steals: 5, blocks: 1, turnovers: 9, fgPct: 47.8, threePct: 42.1, ftPct: 88.5,
        fouls: 9, plusMinus: 26, clips: 51,
      },
      season: {
        minutes: 2034, points: 1364, rebounds: 233, offRebounds: 28, defRebounds: 205, assists: 188,
        steals: 71, blocks: 11, turnovers: 132, fgPct: 46.2, threePct: 40.3, ftPct: 89.2,
        fouls: 138, plusMinus: 214, clips: 768,
      },
    },
  },
  {
    id: 'hc-7-okonkwo',
    name: 'Emeka Okonkwo',
    number: 7,
    position: 'SF',
    starter: true,
    stats: {
      match: {
        minutes: 36, points: 21, rebounds: 7, offRebounds: 2, defRebounds: 5, assists: 4,
        steals: 2, blocks: 1, turnovers: 1, fgPct: 52.6, threePct: 37.5, ftPct: 76.9,
        fouls: 3, plusMinus: 7, clips: 13,
      },
      week: {
        minutes: 142, points: 78, rebounds: 28, offRebounds: 7, defRebounds: 21, assists: 15,
        steals: 6, blocks: 4, turnovers: 7, fgPct: 50.2, threePct: 35.9, ftPct: 75.4,
        fouls: 11, plusMinus: 19, clips: 49,
      },
      season: {
        minutes: 2201, points: 1178, rebounds: 421, offRebounds: 102, defRebounds: 319, assists: 219,
        steals: 92, blocks: 58, turnovers: 121, fgPct: 49.1, threePct: 34.7, ftPct: 74.8,
        fouls: 162, plusMinus: 196, clips: 731,
      },
    },
  },
  {
    id: 'hc-23-novak',
    name: 'Stefan Novak',
    number: 23,
    position: 'PF',
    starter: true,
    stats: {
      match: {
        minutes: 31, points: 14, rebounds: 9, offRebounds: 3, defRebounds: 6, assists: 2,
        steals: 1, blocks: 2, turnovers: 1, fgPct: 54.5, threePct: 33.3, ftPct: 70.0,
        fouls: 3, plusMinus: 6, clips: 11,
      },
      week: {
        minutes: 124, points: 53, rebounds: 37, offRebounds: 12, defRebounds: 25, assists: 9,
        steals: 4, blocks: 7, turnovers: 6, fgPct: 52.9, threePct: 31.0, ftPct: 68.2,
        fouls: 12, plusMinus: 14, clips: 43,
      },
      season: {
        minutes: 1962, points: 812, rebounds: 588, offRebounds: 198, defRebounds: 390, assists: 138,
        steals: 58, blocks: 96, turnovers: 98, fgPct: 51.7, threePct: 29.4, ftPct: 69.6,
        fouls: 184, plusMinus: 172, clips: 654,
      },
    },
  },
  {
    id: 'hc-50-bauer',
    name: 'Lukas Bauer',
    number: 50,
    position: 'C',
    starter: true,
    stats: {
      match: {
        minutes: 29, points: 16, rebounds: 12, offRebounds: 4, defRebounds: 8, assists: 1,
        steals: 0, blocks: 2, turnovers: 2, fgPct: 61.5, threePct: 0.0, ftPct: 66.7,
        fouls: 4, plusMinus: 5, clips: 12,
      },
      week: {
        minutes: 116, points: 58, rebounds: 46, offRebounds: 16, defRebounds: 30, assists: 5,
        steals: 2, blocks: 9, turnovers: 8, fgPct: 59.8, threePct: 0.0, ftPct: 64.3,
        fouls: 14, plusMinus: 12, clips: 41,
      },
      season: {
        minutes: 1818, points: 894, rebounds: 712, offRebounds: 251, defRebounds: 461, assists: 71,
        steals: 34, blocks: 121, turnovers: 121, fgPct: 58.4, threePct: 25.0, ftPct: 63.1,
        fouls: 211, plusMinus: 158, clips: 689,
      },
    },
  },
  {
    id: 'hc-9-tanaka',
    name: 'Hiro Tanaka',
    number: 9,
    position: 'SG',
    starter: false,
    stats: {
      match: {
        minutes: 19, points: 11, rebounds: 3, offRebounds: 0, defRebounds: 3, assists: 3,
        steals: 1, blocks: 0, turnovers: 1, fgPct: 50.0, threePct: 44.4, ftPct: 100.0,
        fouls: 1, plusMinus: 4, clips: 9,
      },
      week: {
        minutes: 76, points: 42, rebounds: 11, offRebounds: 1, defRebounds: 10, assists: 13,
        steals: 4, blocks: 1, turnovers: 5, fgPct: 47.4, threePct: 41.2, ftPct: 92.3,
        fouls: 5, plusMinus: 10, clips: 31,
      },
      season: {
        minutes: 1187, points: 628, rebounds: 168, offRebounds: 19, defRebounds: 149, assists: 201,
        steals: 64, blocks: 9, turnovers: 79, fgPct: 45.8, threePct: 39.6, ftPct: 90.5,
        fouls: 88, plusMinus: 121, clips: 498,
      },
    },
  },
  {
    id: 'hc-15-dembele',
    name: 'Ousmane Dembele',
    number: 15,
    position: 'SF',
    starter: false,
    stats: {
      match: {
        minutes: 17, points: 8, rebounds: 5, offRebounds: 1, defRebounds: 4, assists: 1,
        steals: 1, blocks: 1, turnovers: 0, fgPct: 50.0, threePct: 33.3, ftPct: 75.0,
        fouls: 2, plusMinus: 3, clips: 7,
      },
      week: {
        minutes: 68, points: 31, rebounds: 19, offRebounds: 5, defRebounds: 14, assists: 6,
        steals: 5, blocks: 3, turnovers: 4, fgPct: 48.6, threePct: 31.6, ftPct: 73.3,
        fouls: 7, plusMinus: 8, clips: 27,
      },
      season: {
        minutes: 1064, points: 472, rebounds: 281, offRebounds: 74, defRebounds: 207, assists: 94,
        steals: 71, blocks: 41, turnovers: 61, fgPct: 47.2, threePct: 32.8, ftPct: 72.4,
        fouls: 109, plusMinus: 96, clips: 441,
      },
    },
  },
  {
    id: 'hc-4-sullivan',
    name: 'Cole Sullivan',
    number: 4,
    position: 'PG',
    starter: false,
    stats: {
      match: {
        minutes: 14, points: 6, rebounds: 2, offRebounds: 0, defRebounds: 2, assists: 5,
        steals: 1, blocks: 0, turnovers: 1, fgPct: 42.9, threePct: 40.0, ftPct: 100.0,
        fouls: 1, plusMinus: 2, clips: 6,
      },
      week: {
        minutes: 56, points: 23, rebounds: 8, offRebounds: 1, defRebounds: 7, assists: 22,
        steals: 4, blocks: 0, turnovers: 6, fgPct: 41.5, threePct: 37.9, ftPct: 95.0,
        fouls: 4, plusMinus: 7, clips: 24,
      },
      season: {
        minutes: 874, points: 341, rebounds: 121, offRebounds: 11, defRebounds: 110, assists: 318,
        steals: 58, blocks: 4, turnovers: 92, fgPct: 40.8, threePct: 36.4, ftPct: 93.7,
        fouls: 71, plusMinus: 78, clips: 388,
      },
    },
  },
  {
    id: 'hc-44-mbeki',
    name: 'Thabo Mbeki',
    number: 44,
    position: 'C',
    starter: false,
    stats: {
      match: {
        minutes: 13, points: 7, rebounds: 6, offRebounds: 2, defRebounds: 4, assists: 0,
        steals: 0, blocks: 2, turnovers: 1, fgPct: 60.0, threePct: 0.0, ftPct: 50.0,
        fouls: 3, plusMinus: 1, clips: 5,
      },
      week: {
        minutes: 52, points: 28, rebounds: 25, offRebounds: 9, defRebounds: 16, assists: 2,
        steals: 1, blocks: 8, turnovers: 5, fgPct: 58.1, threePct: 0.0, ftPct: 52.4,
        fouls: 11, plusMinus: 5, clips: 22,
      },
      season: {
        minutes: 812, points: 414, rebounds: 388, offRebounds: 141, defRebounds: 247, assists: 28,
        steals: 21, blocks: 112, turnovers: 71, fgPct: 56.9, threePct: 0.0, ftPct: 54.8,
        fouls: 168, plusMinus: 64, clips: 372,
      },
    },
  },
];

// --- Convenience bundle for basketball ---------------------------------------

export const DEMO_BASKETBALL = {
  team: DEMO_BASKETBALL_TEAM,
  players: DEMO_BASKETBALL_PLAYERS,
  timeframes: BASKETBALL_TIMEFRAMES,
} as const;

/** Pull a basketball player's stat line for a given timeframe. */
export function basketballPlayerStatsFor(
  player: BasketballPlayer,
  timeframe: Timeframe,
): BasketballStatLine {
  return player.stats[timeframe];
}

/** Pull the basketball team stat line for a given timeframe. */
export function basketballTeamStatsFor(timeframe: Timeframe): BasketballTeamStatLine {
  return DEMO_BASKETBALL_TEAM.stats[timeframe];
}

// --- Per-sport column + team-metric definitions ------------------------------
//
// These describe the SOCCER and BASKETBALL player tables / team tiles so the UI
// can render either by mapping. Keys index into each sport's StatLine.

/** Soccer player-table columns (mirror of the fields the current UI shows). */
export const SOCCER_COLUMNS: ColumnDef[] = [
  { key: 'player', label: 'Player', title: 'Player and position', align: 'left' },
  { key: 'goals', label: 'G', title: 'Goals', align: 'right', format: 'int', headline: true },
  { key: 'assists', label: 'A', title: 'Assists', align: 'right', format: 'int', headline: true },
  { key: 'shots', label: 'Sh', title: 'Shots', align: 'right', format: 'int' },
  { key: 'shotsOnTarget', label: 'SoT', title: 'Shots on target', align: 'right', format: 'int' },
  { key: 'xG', label: 'xG', title: 'Expected goals', align: 'right', format: 'decimal' },
  { key: 'xA', label: 'xA', title: 'Expected assists', align: 'right', format: 'decimal' },
  { key: 'passes', label: 'Pass', title: 'Passes completed', align: 'right', format: 'int' },
  { key: 'passPct', label: 'Pass %', title: 'Pass completion percentage', align: 'right', format: 'pct' },
  { key: 'keyPasses', label: 'KP', title: 'Key passes', align: 'right', format: 'int' },
  { key: 'tackles', label: 'Tkl', title: 'Tackles', align: 'right', format: 'int' },
  { key: 'interceptions', label: 'Int', title: 'Interceptions', align: 'right', format: 'int' },
  { key: 'duelsWonPct', label: 'Duels %', title: 'Duels won percentage', align: 'right', format: 'pct' },
  { key: 'fouls', label: 'Fls', title: 'Fouls committed', align: 'right', format: 'int' },
  { key: 'offsides', label: 'Off', title: 'Offsides', align: 'right', format: 'int' },
];

/** Soccer team-summary tiles (mirror of the current team strip). */
export const SOCCER_TEAM_METRICS: TeamMetricDef[] = [
  {
    key: 'goalsFor',
    label: 'Goals for',
    format: 'int',
    accent: true,
    sub: (t) => `${t.goalsAgainst} against`,
  },
  { key: 'xG', label: 'Team xG', format: 'decimal', sub: (t) => `${t.xGA.toFixed(1)} xGA` },
  { key: 'shots', label: 'Shots', format: 'int', sub: (t) => `${t.shotsOnTarget} on target` },
  { key: 'passPct', label: 'Pass %', format: 'pct', sub: (t) => `${t.passes.toLocaleString()} passes` },
  {
    key: 'duelsWonPct',
    label: 'Duels won',
    format: 'pct',
    sub: (t) => `${t.recoveries.toLocaleString()} recoveries`,
  },
  {
    key: 'cleanSheets',
    label: 'Clean sheets',
    format: 'int',
    sub: (t) => `${t.matchesPlayed} ${t.matchesPlayed === 1 ? 'match' : 'matches'}`,
  },
];

/** Basketball player-table columns. */
export const BASKETBALL_COLUMNS: ColumnDef[] = [
  { key: 'player', label: 'Player', title: 'Player and position', align: 'left' },
  { key: 'points', label: 'PTS', title: 'Points', align: 'right', format: 'int', headline: true },
  { key: 'rebounds', label: 'REB', title: 'Total rebounds', align: 'right', format: 'int', headline: true },
  { key: 'assists', label: 'AST', title: 'Assists', align: 'right', format: 'int' },
  { key: 'steals', label: 'STL', title: 'Steals', align: 'right', format: 'int' },
  { key: 'blocks', label: 'BLK', title: 'Blocks', align: 'right', format: 'int' },
  { key: 'turnovers', label: 'TO', title: 'Turnovers', align: 'right', format: 'int' },
  { key: 'fgPct', label: 'FG%', title: 'Field goal percentage', align: 'right', format: 'pct' },
  { key: 'threePct', label: '3P%', title: 'Three point percentage', align: 'right', format: 'pct' },
  { key: 'ftPct', label: 'FT%', title: 'Free throw percentage', align: 'right', format: 'pct' },
  { key: 'minutes', label: 'MIN', title: 'Minutes played', align: 'right', format: 'int' },
  { key: 'fouls', label: 'PF', title: 'Personal fouls', align: 'right', format: 'int' },
  { key: 'plusMinus', label: '+/-', title: 'Plus/minus', align: 'right', format: 'plusminus', width: 64 },
];

/** Basketball team-summary tiles. */
export const BASKETBALL_TEAM_METRICS: TeamMetricDef[] = [
  {
    key: 'pointsFor',
    label: 'Points for',
    format: 'int',
    accent: true,
    sub: (t) => `${t.pointsAgainst} against`,
  },
  { key: 'fgPct', label: 'FG %', format: 'pct', sub: (t) => `${t.threePct.toFixed(1)}% from three` },
  { key: 'assists', label: 'Assists', format: 'int', sub: (t) => `${t.turnovers} turnovers` },
  { key: 'rebounds', label: 'Rebounds', format: 'int', sub: (t) => `${t.blocks} blocks` },
  { key: 'steals', label: 'Steals', format: 'int', sub: (t) => `${t.possessions} possessions/g` },
  {
    key: 'ftPct',
    label: 'Free throw %',
    format: 'pct',
    sub: (t) => `${t.gamesPlayed} ${t.gamesPlayed === 1 ? 'game' : 'games'}`,
  },
];

// --- The sport registry (what the sport-agnostic UI consumes) ----------------
//
// NOTE on record/possession in the team header: each sport's team StatLine
// carries the fields its UI needs. Soccer uses wins/draws/losses + possessionPct;
// basketball uses wins/losses + possessions. The UI reads them by sport key.

export const DEMO_SPORTS: DemoSport[] = [
  {
    key: 'soccer',
    label: 'Soccer',
    // Soccer data is structurally assignable to the generic registry shapes:
    // PlayerStatLine / TeamStatLine are records of numbers, DemoTeam matches
    // SportTeam (formation field), DemoPlayer matches SportPlayer.
    team: DEMO_TEAM,
    players: DEMO_PLAYERS,
    timeframes: TIMEFRAMES,
    columns: SOCCER_COLUMNS,
    teamMetrics: SOCCER_TEAM_METRICS,
  },
  {
    key: 'basketball',
    label: 'Basketball',
    team: {
      ...DEMO_BASKETBALL_TEAM,
      // Map the basketball-specific `scheme` onto the generic `formation` slot
      // so the sport-agnostic header can render it the same way.
      formation: DEMO_BASKETBALL_TEAM.scheme,
    },
    players: DEMO_BASKETBALL_PLAYERS,
    timeframes: BASKETBALL_TIMEFRAMES,
    columns: BASKETBALL_COLUMNS,
    teamMetrics: BASKETBALL_TEAM_METRICS,
  },
];

/** Look up a sport bundle by key (e.g. for a sport toggle). */
export function demoSportFor(key: DemoSport['key']): DemoSport {
  return DEMO_SPORTS.find((s) => s.key === key) ?? DEMO_SPORTS[0];
}
