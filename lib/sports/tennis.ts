// Tennis, full court. Shot-landing heatmap, serve-placement spray, rally
// trajectory lines, court-zone coverage.
// Coordinate convention for the tennis-court pitch:
//   x,y normalized 0..1 over the full doubles court, viewed from above.
//   The player's baseline is the bottom (y≈0.95); the opponent's baseline is
//   the top (y≈0.05); the net runs horizontally across the middle (y≈0.5).
//   x≈0.5 is the center line; the deuce court is the right half (x>0.5),
//   the ad court is the left half (x<0.5) from the server's perspective.
//   Player profiled: a baseline-plus-serve game with big corner targeting.

import type {
  FreeGame,
  HeatCell,
  MetricRow,
  SpatialPoint,
  SportData,
  TrajectoryPath,
  ZonePolygon,
} from '@/lib/types';

// --- Serve placement + winners spray (landing spots) --------------------------
const spray: SpatialPoint[] = [
  // Serving into the deuce box (right side, near net y≈0.32); value = mph.
  { x: 0.7, y: 0.32, outcome: 'winner', label: 'Ace, out wide, deuce', value: 132 },
  { x: 0.56, y: 0.3, outcome: 'make', label: '1st serve, body', value: 118 },
  { x: 0.78, y: 0.36, outcome: 'winner', label: 'Ace, T, deuce', value: 128 },
  { x: 0.62, y: 0.42, outcome: 'error', label: 'Double fault', value: 0 },
  { x: 0.66, y: 0.34, outcome: 'make', label: '2nd serve, kick, deuce', value: 102 },
  // Serving into the ad box (left side).
  { x: 0.3, y: 0.32, outcome: 'winner', label: 'Ace, out wide, ad', value: 126 },
  { x: 0.44, y: 0.3, outcome: 'make', label: '1st serve, T, ad', value: 121 },
  { x: 0.22, y: 0.38, outcome: 'make', label: 'Kick serve, ad', value: 99 },
  { x: 0.34, y: 0.34, outcome: 'winner', label: 'Ace, body jam, ad', value: 124 },
  // Groundstroke winners (landing deep in opponent court).
  { x: 0.16, y: 0.12, outcome: 'winner', label: 'FH winner, DTL', value: 0 },
  { x: 0.84, y: 0.1, outcome: 'winner', label: 'BH winner, crosscourt', value: 0 },
  { x: 0.5, y: 0.08, outcome: 'make', label: 'Deep return', value: 0 },
  { x: 0.74, y: 0.18, outcome: 'error', label: 'FH unforced, wide', value: 0 },
  { x: 0.5, y: 0.46, outcome: 'winner', label: 'Drop-shot winner', value: 0 },
  { x: 0.2, y: 0.2, outcome: 'winner', label: 'Passing shot, ad corner', value: 0 },
  { x: 0.8, y: 0.22, outcome: 'make', label: 'Approach -> volley', value: 0 },
];

// --- Shot-landing heatmap (opponent's half; deep corners + serve spots hot) ----
// 73 cells on a regular grid over the top half (opponent court), with a serve
// band near the service line; gaussian-mixture weights.
const heatmap: HeatCell[] = [
  { x: 0.038, y: 0.038, weight: 0.15 }, { x: 0.115, y: 0.038, weight: 0.42 }, { x: 0.192, y: 0.038, weight: 0.47 },
  { x: 0.269, y: 0.038, weight: 0.26 }, { x: 0.346, y: 0.038, weight: 0.18 }, { x: 0.423, y: 0.038, weight: 0.26 },
  { x: 0.5, y: 0.038, weight: 0.31 }, { x: 0.577, y: 0.038, weight: 0.26 }, { x: 0.654, y: 0.038, weight: 0.18 },
  { x: 0.731, y: 0.038, weight: 0.25 }, { x: 0.807, y: 0.038, weight: 0.45 }, { x: 0.884, y: 0.038, weight: 0.41 },
  { x: 0.961, y: 0.038, weight: 0.15 }, { x: 0.038, y: 0.115, weight: 0.33 }, { x: 0.115, y: 0.115, weight: 0.9 },
  { x: 0.192, y: 0.115, weight: 1 }, { x: 0.269, y: 0.115, weight: 0.54 }, { x: 0.346, y: 0.115, weight: 0.37 },
  { x: 0.423, y: 0.115, weight: 0.51 }, { x: 0.5, y: 0.115, weight: 0.6 }, { x: 0.577, y: 0.115, weight: 0.51 },
  { x: 0.654, y: 0.115, weight: 0.37 }, { x: 0.731, y: 0.115, weight: 0.52 }, { x: 0.807, y: 0.115, weight: 0.96 },
  { x: 0.884, y: 0.115, weight: 0.87 }, { x: 0.961, y: 0.115, weight: 0.32 }, { x: 0.038, y: 0.192, weight: 0.28 },
  { x: 0.115, y: 0.192, weight: 0.77 }, { x: 0.192, y: 0.192, weight: 0.86 }, { x: 0.269, y: 0.192, weight: 0.48 },
  { x: 0.346, y: 0.192, weight: 0.29 }, { x: 0.423, y: 0.192, weight: 0.36 }, { x: 0.5, y: 0.192, weight: 0.44 },
  { x: 0.577, y: 0.192, weight: 0.36 }, { x: 0.654, y: 0.192, weight: 0.29 }, { x: 0.731, y: 0.192, weight: 0.46 },
  { x: 0.807, y: 0.192, weight: 0.83 }, { x: 0.884, y: 0.192, weight: 0.74 }, { x: 0.961, y: 0.192, weight: 0.27 },
  { x: 0.115, y: 0.269, weight: 0.29 }, { x: 0.192, y: 0.269, weight: 0.43 }, { x: 0.269, y: 0.269, weight: 0.43 },
  { x: 0.346, y: 0.269, weight: 0.36 }, { x: 0.423, y: 0.269, weight: 0.36 }, { x: 0.5, y: 0.269, weight: 0.44 },
  { x: 0.577, y: 0.269, weight: 0.35 }, { x: 0.654, y: 0.269, weight: 0.34 }, { x: 0.731, y: 0.269, weight: 0.41 },
  { x: 0.807, y: 0.269, weight: 0.41 }, { x: 0.884, y: 0.269, weight: 0.28 }, { x: 0.192, y: 0.346, weight: 0.29 },
  { x: 0.269, y: 0.346, weight: 0.52 }, { x: 0.346, y: 0.346, weight: 0.5 }, { x: 0.423, y: 0.346, weight: 0.38 },
  { x: 0.5, y: 0.346, weight: 0.38 }, { x: 0.577, y: 0.346, weight: 0.37 }, { x: 0.654, y: 0.346, weight: 0.48 },
  { x: 0.731, y: 0.346, weight: 0.49 }, { x: 0.807, y: 0.346, weight: 0.28 }, { x: 0.192, y: 0.423, weight: 0.14 },
  { x: 0.269, y: 0.423, weight: 0.29 }, { x: 0.346, y: 0.423, weight: 0.38 }, { x: 0.423, y: 0.423, weight: 0.32 },
  { x: 0.5, y: 0.423, weight: 0.25 }, { x: 0.577, y: 0.423, weight: 0.3 }, { x: 0.654, y: 0.423, weight: 0.36 },
  { x: 0.731, y: 0.423, weight: 0.28 }, { x: 0.807, y: 0.423, weight: 0.13 }, { x: 0.346, y: 0.5, weight: 0.17 },
  { x: 0.423, y: 0.5, weight: 0.2 }, { x: 0.5, y: 0.5, weight: 0.16 }, { x: 0.577, y: 0.5, weight: 0.18 },
  { x: 0.654, y: 0.5, weight: 0.16 },
];

// --- Court zone coverage (non-overlapping partition of the full court) ---------
// Opponent baseline band (top), the net/approach band straddling the net, then
// the player's ad (left) and deuce (right) halves of the own court.
const zones: ZonePolygon[] = [
  {
    id: 'opp-baseline',
    label: 'Opp. Baseline',
    points: [[0.04, 0.04], [0.96, 0.04], [0.96, 0.4], [0.04, 0.4]],
    value: 0.44,
  },
  {
    id: 'net',
    label: 'Net / Approach',
    points: [[0.04, 0.4], [0.96, 0.4], [0.96, 0.58], [0.04, 0.58]],
    value: 0.13,
  },
  {
    id: 'ad',
    label: 'Ad Court',
    points: [[0.04, 0.58], [0.5, 0.58], [0.5, 0.96], [0.04, 0.96]],
    value: 0.22,
  },
  {
    id: 'deuce',
    label: 'Deuce Court',
    points: [[0.5, 0.58], [0.96, 0.58], [0.96, 0.96], [0.5, 0.96]],
    value: 0.21,
  },
];

// --- Rally + serve trajectory lines -------------------------------------------
// outcome tints (winner = point won, make = neutral rally ball, error = miss);
// intensity drives stroke weight + opacity.
const trajectories: TrajectoryPath[] = [
  {
    id: 'serve-plus-one',
    label: 'Serve +1 forehand winner',
    kind: 'Forehand winner',
    points: [[0.5, 0.95], [0.7, 0.32], [0.18, 0.7], [0.16, 0.12]],
    outcome: 'winner',
    intensity: 0.94,
  },
  {
    id: 'crosscourt-exchange',
    label: 'Crosscourt rally -> winner',
    kind: 'Backhand winner',
    points: [[0.2, 0.85], [0.8, 0.2], [0.2, 0.8], [0.84, 0.1]],
    outcome: 'winner',
    intensity: 0.82,
  },
  {
    id: 'dtl-redirect',
    label: 'Down-the-line redirect',
    kind: 'Forehand winner',
    points: [[0.78, 0.82], [0.74, 0.5], [0.7, 0.22], [0.16, 0.12]],
    outcome: 'winner',
    intensity: 0.76,
  },
  {
    id: 'approach-volley',
    label: 'Approach -> volley winner',
    kind: 'Volley',
    points: [[0.5, 0.9], [0.55, 0.62], [0.5, 0.46], [0.6, 0.2]],
    outcome: 'winner',
    intensity: 0.7,
  },
  {
    id: 'ace-wide-ad',
    label: 'Ace, out wide ad court',
    kind: 'Serve',
    points: [[0.5, 0.95], [0.42, 0.6], [0.3, 0.32]],
    outcome: 'winner',
    intensity: 0.66,
  },
  {
    id: 'drop-shot',
    label: 'Drop shot winner',
    kind: 'Drop shot',
    points: [[0.5, 0.88], [0.5, 0.62], [0.48, 0.5], [0.5, 0.46]],
    outcome: 'winner',
    intensity: 0.58,
  },
  {
    id: 'baseline-grind',
    label: 'Baseline grind, ball in',
    kind: 'Backhand',
    points: [[0.3, 0.85], [0.7, 0.18], [0.3, 0.82], [0.68, 0.2]],
    outcome: 'make',
    intensity: 0.5,
  },
  {
    id: 'unforced-error',
    label: 'Forehand unforced error',
    kind: 'Unforced error',
    points: [[0.4, 0.88], [0.7, 0.3], [0.74, 0.18]],
    outcome: 'error',
    intensity: 0.42,
  },
];

// --- Advanced tennis metrics --------------------------------------------------
const metrics: MetricRow[] = [
  { label: '1st-Serve %', value: 68.4, unit: '%', delta: 2.6, max: 100 },
  { label: '1st-Serve Win %', value: 79.1, unit: '%', delta: 3.2, max: 100 },
  { label: '2nd-Serve Win %', value: 58.3, unit: '%', delta: 4.0, max: 100 },
  { label: 'Aces', value: 14, delta: 4 },
  { label: 'Winners', value: 38, delta: 6 },
  { label: 'Unforced Errors', value: 19, delta: -4 },
  { label: 'Break Pts Won', value: '5/9', delta: 2 },
  { label: 'Return Pts Won', value: 41.7, unit: '%', delta: 2.9, max: 100 },
  { label: 'Avg Rally Length', value: 4.6, unit: 'shots', delta: -0.3 },
  { label: 'Net Points Won', value: 76.5, unit: '%', delta: 5.1, max: 100 },
  { label: 'Avg Serve Speed', value: 118.6, unit: 'mph', delta: 2.4 },
  { label: 'Double Faults', value: 3, delta: -2 },
];

const freeGame: FreeGame = {
  id: 'tn-2026-06-07',
  sport: 'tennis',
  title: 'Quarterfinal, Straight Sets',
  matchup: 'A. Marchetti def. R. Volkov',
  date: '2026-06-07',
  headline:
    '6-3, 6-4, 7-5 behind a 68.4% first-serve rate, 14 aces and 38 winners to 19 unforced errors, five of nine break points converted.',
  summaryMetrics: [
    { label: 'Aces', value: 14 },
    { label: 'Winners', value: 38 },
    { label: 'Unforced Errors', value: 19 },
    { label: '1st-Serve %', value: 68.4, unit: '%' },
    { label: 'Break Pts', value: '5/9' },
    { label: 'Net Points Won', value: 76.5, unit: '%' },
  ],
};

const tennis: SportData = {
  sport: 'tennis',
  displayName: 'Tennis',
  pitch: 'tennis-court',
  spatialKind: 'spray',
  spray,
  heatmap,
  zones,
  trajectories,
  metrics,
  trend: {
    label: '1st-Serve % & Winners/UE differential, last 6 matches',
    xLabels: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
    series: [
      { name: '1st-Serve %', data: [62, 65, 61, 66, 67, 68], color: 'var(--color-accent1)' },
      { name: 'Win/UE diff', data: [8, 11, 6, 14, 16, 19], color: 'var(--color-accent2)' },
    ],
  },
  freeGame,
};

export default tennis;
