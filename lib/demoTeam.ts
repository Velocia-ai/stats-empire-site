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
export interface PlayerStatLine {
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
export interface TeamStatLine {
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
