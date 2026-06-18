// Tennis, full court. Shot-landing heatmap, serve-placement spray, rally
// trajectory lines, deuce/ad/net zone coverage.
// Coordinate convention for the tennis-court pitch:
//   x,y normalized 0..1 over the full doubles court, viewed from above.
//   The player's baseline is the bottom (y≈0.95); the opponent's baseline is
//   the top (y≈0.05); the net runs horizontally across the middle (y≈0.5).
//   x≈0.5 is the center line; the deuce court is the right half (x>0.5),
//   the ad court is the left half (x<0.5) from the server's perspective.

import type {
  FreeGame,
  HeatCell,
  MetricRow,
  SpatialPoint,
  SportData,
  TrajectoryPath,
  ZonePolygon,
} from '@/lib/types';

// --- Serve placement spray (landing in the opponent's service boxes) ----------
const spray: SpatialPoint[] = [
  // Serving into the deuce box (right side, near net y≈0.3)
  { x: 0.7, y: 0.32, outcome: 'winner', label: 'Ace, out wide, deuce', value: 132 },
  { x: 0.56, y: 0.3, outcome: 'make', label: '1st serve, body', value: 118 },
  { x: 0.78, y: 0.36, outcome: 'winner', label: 'Ace, T, deuce', value: 128 },
  { x: 0.62, y: 0.42, outcome: 'error', label: 'Double fault', value: 0 },
  // Serving into the ad box (left side)
  { x: 0.3, y: 0.32, outcome: 'winner', label: 'Ace, out wide, ad', value: 126 },
  { x: 0.44, y: 0.3, outcome: 'make', label: '1st serve, T, ad', value: 121 },
  { x: 0.22, y: 0.38, outcome: 'make', label: 'Kick serve, ad', value: 99 },
  // Groundstroke winners (landing deep in opponent court)
  { x: 0.18, y: 0.14, outcome: 'winner', label: 'FH winner, DTL', value: 0 },
  { x: 0.82, y: 0.12, outcome: 'winner', label: 'BH winner, crosscourt', value: 0 },
  { x: 0.5, y: 0.08, outcome: 'make', label: 'Deep return', value: 0 },
  { x: 0.74, y: 0.18, outcome: 'error', label: 'FH unforced, wide', value: 0 },
  { x: 0.5, y: 0.46, outcome: 'winner', label: 'Drop-shot winner', value: 0 },
];

// --- Shot-landing heatmap (opponent's court; deep corners hot) ----------------
const heatmap: HeatCell[] = [
  { x: 0.16, y: 0.14, weight: 0.84 }, { x: 0.84, y: 0.14, weight: 0.81 },
  { x: 0.5, y: 0.12, weight: 0.62 }, { x: 0.3, y: 0.2, weight: 0.58 }, { x: 0.7, y: 0.2, weight: 0.55 },
  { x: 0.22, y: 0.34, weight: 0.46 }, { x: 0.78, y: 0.34, weight: 0.44 },
  { x: 0.5, y: 0.28, weight: 0.39 }, { x: 0.4, y: 0.46, weight: 0.27 }, { x: 0.6, y: 0.46, weight: 0.25 },
  { x: 0.12, y: 0.08, weight: 0.49 }, { x: 0.88, y: 0.08, weight: 0.47 },
];

// --- Court zone coverage (deuce / ad / net / baseline) ------------------------
const zones: ZonePolygon[] = [
  {
    id: 'deuce',
    label: 'Deuce Court',
    points: [[0.5, 0.5], [0.95, 0.5], [0.95, 0.95], [0.5, 0.95]],
    value: 0.34,
  },
  {
    id: 'ad',
    label: 'Ad Court',
    points: [[0.05, 0.5], [0.5, 0.5], [0.5, 0.95], [0.05, 0.95]],
    value: 0.31,
  },
  {
    id: 'net',
    label: 'Net / Approach',
    points: [[0.2, 0.4], [0.8, 0.4], [0.8, 0.58], [0.2, 0.58]],
    value: 0.14,
  },
  {
    id: 'opp-baseline',
    label: 'Opp. Baseline',
    points: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.24], [0.05, 0.24]],
    value: 0.21,
  },
];

// --- Rally trajectory lines (crosscourt + down-the-line patterns) -------------
const trajectories: TrajectoryPath[] = [
  {
    id: 'serve-return-rally',
    points: [[0.5, 0.95], [0.7, 0.32], [0.18, 0.7], [0.82, 0.12]],
    outcome: 'winner',
    intensity: 0.9,
  },
  {
    id: 'crosscourt-exchange',
    points: [[0.2, 0.85], [0.8, 0.2], [0.2, 0.8], [0.84, 0.14]],
    outcome: 'winner',
    intensity: 0.78,
  },
  {
    id: 'approach-volley',
    points: [[0.5, 0.9], [0.55, 0.6], [0.5, 0.46], [0.6, 0.2]],
    outcome: 'winner',
    intensity: 0.7,
  },
  {
    id: 'unforced-error',
    points: [[0.4, 0.88], [0.7, 0.3], [0.74, 0.18]],
    outcome: 'error',
    intensity: 0.45,
  },
];

// --- Advanced tennis metrics --------------------------------------------------
const metrics: MetricRow[] = [
  { label: '1st-Serve %', value: 68.4, unit: '%', delta: 2.6, max: 100 },
  { label: '1st-Serve Win %', value: 79.1, unit: '%', delta: 3.2, max: 100 },
  { label: 'Aces', value: 14, delta: 4 },
  { label: 'Winners', value: 38, delta: 6 },
  { label: 'Unforced Errors', value: 19, delta: -4 },
  { label: 'Break Pts Won', value: '5/9', delta: 2 },
  { label: 'Avg Rally Length', value: 4.6, unit: 'shots', delta: -0.3 },
  { label: 'Net Points Won', value: 76.5, unit: '%', delta: 5.1, max: 100 },
  { label: 'Double Faults', value: 3, delta: -2 },
];

const freeGame: FreeGame = {
  id: 'tn-2026-06-07',
  sport: 'tennis',
  title: 'Quarterfinal, Straight Sets',
  matchup: 'A. Marchetti def. R. Volkov',
  date: '2026-06-07',
  headline:
    '6-3, 6-4, 7-5 behind a 68% first-serve rate, 14 aces and 38 winners to 19 unforced errors, five of nine break points converted.',
  summaryMetrics: [
    { label: 'Aces', value: 14 },
    { label: 'Winners', value: 38 },
    { label: 'Unforced Errors', value: 19 },
    { label: '1st-Serve %', value: 68, unit: '%' },
    { label: 'Break Pts', value: '5/9' },
    { label: 'Net Win %', value: 76.5, unit: '%' },
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
