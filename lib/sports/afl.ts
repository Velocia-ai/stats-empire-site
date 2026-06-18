// Australian Rules Football, oval field. Possession heatmap, kick/disposal
// trajectory lines, forward/mid/back-50 zone coverage.
// Coordinate convention for the afl-oval pitch:
//   x,y normalized 0..1 on the bounding box of the oval.
//   The team attacks toward the top: back-50 (defensive) is bottom (y≈0.8+),
//   midfield is the center bounce area (y≈0.5), forward-50 is the top (y≈0.2).
//   x≈0.5 is the corridor straight through the middle of the ground.

import type {
  FreeGame,
  HeatCell,
  MetricRow,
  SpatialPoint,
  SportData,
  TrajectoryPath,
  ZonePolygon,
} from '@/lib/types';

// --- Possession / disposal locations (where this player won the ball) ---------
const spray: SpatialPoint[] = [
  // Midfield grunt work around the center
  { x: 0.5, y: 0.5, outcome: 'neutral', label: 'Centre clearance', value: 1 },
  { x: 0.44, y: 0.46, outcome: 'make', label: 'Contested mark', value: 1 },
  { x: 0.57, y: 0.54, outcome: 'make', label: 'Handball receive', value: 1 },
  { x: 0.39, y: 0.58, outcome: 'neutral', label: 'Ground-ball get', value: 1 },
  { x: 0.62, y: 0.42, outcome: 'make', label: 'Intercept', value: 1 },
  // Forward-50 entries & marks
  { x: 0.5, y: 0.22, outcome: 'winner', label: 'Goal, set shot 35m', value: 6 },
  { x: 0.41, y: 0.28, outcome: 'winner', label: 'Goal, snap', value: 6 },
  { x: 0.6, y: 0.26, outcome: 'error', label: 'Behind, wide', value: 1 },
  { x: 0.46, y: 0.18, outcome: 'make', label: 'Mark inside 50', value: 1 },
  { x: 0.55, y: 0.32, outcome: 'make', label: 'Forward tackle', value: 1 },
  // Back-50 defensive efforts
  { x: 0.48, y: 0.8, outcome: 'make', label: 'Defensive mark', value: 1 },
  { x: 0.56, y: 0.76, outcome: 'make', label: 'Spoil', value: 1 },
  { x: 0.4, y: 0.84, outcome: 'neutral', label: 'Rebound 50', value: 1 },
  { x: 0.6, y: 0.7, outcome: 'make', label: 'Tackle', value: 1 },
  // Wing run
  { x: 0.24, y: 0.5, outcome: 'make', label: 'Wing gather', value: 1 },
  { x: 0.78, y: 0.48, outcome: 'make', label: 'Outside run', value: 1 },
];

// --- Possession/positioning heatmap (dense through midfield corridor) ---------
const heatmap: HeatCell[] = [
  { x: 0.5, y: 0.5, weight: 0.96 }, { x: 0.42, y: 0.48, weight: 0.78 }, { x: 0.58, y: 0.52, weight: 0.72 },
  { x: 0.5, y: 0.35, weight: 0.64 }, { x: 0.5, y: 0.65, weight: 0.61 },
  { x: 0.3, y: 0.5, weight: 0.52 }, { x: 0.7, y: 0.5, weight: 0.49 },
  { x: 0.5, y: 0.22, weight: 0.58 }, { x: 0.45, y: 0.78, weight: 0.46 },
  { x: 0.38, y: 0.3, weight: 0.34 }, { x: 0.6, y: 0.72, weight: 0.31 },
  { x: 0.22, y: 0.42, weight: 0.27 }, { x: 0.8, y: 0.58, weight: 0.25 },
];

// --- Forward / Mid / Back-50 zone coverage (arcs of the oval) ------------------
const zones: ZonePolygon[] = [
  {
    id: 'fwd50',
    label: 'Forward 50',
    points: [[0.2, 0.32], [0.32, 0.1], [0.68, 0.1], [0.8, 0.32], [0.5, 0.34]],
    value: 0.41,
  },
  {
    id: 'mid',
    label: 'Midfield',
    points: [[0.12, 0.34], [0.88, 0.34], [0.88, 0.66], [0.12, 0.66]],
    value: 0.46,
  },
  {
    id: 'back50',
    label: 'Back 50',
    points: [[0.2, 0.68], [0.5, 0.66], [0.8, 0.68], [0.68, 0.9], [0.32, 0.9]],
    value: 0.13,
  },
];

// --- Kick / disposal trajectory lines -----------------------------------------
const trajectories: TrajectoryPath[] = [
  {
    id: 'clearance-to-fwd',
    points: [[0.5, 0.5], [0.48, 0.4], [0.49, 0.3], [0.5, 0.22]],
    outcome: 'winner',
    intensity: 0.9,
  },
  {
    id: 'switch-kick',
    points: [[0.42, 0.62], [0.3, 0.55], [0.22, 0.5], [0.24, 0.42]],
    outcome: 'neutral',
    intensity: 0.55,
  },
  {
    id: 'rebound-50',
    points: [[0.4, 0.84], [0.45, 0.7], [0.52, 0.58], [0.5, 0.5]],
    outcome: 'make',
    intensity: 0.7,
  },
  {
    id: 'inside-50-entry',
    points: [[0.3, 0.5], [0.36, 0.4], [0.42, 0.32], [0.46, 0.18]],
    outcome: 'make',
    intensity: 0.78,
  },
];

// --- Advanced AFL metrics -----------------------------------------------------
const metrics: MetricRow[] = [
  { label: 'Disposals', value: 31, delta: 4, spark: [22, 26, 24, 28, 29, 31] },
  { label: 'Kicks', value: 19, delta: 2 },
  { label: 'Handballs', value: 12, delta: 2 },
  { label: 'Marks', value: 8, delta: 1 },
  { label: 'Tackles', value: 6, delta: -1 },
  { label: 'Goals', value: 2, delta: 1 },
  { label: 'Kick Efficiency', value: 78.9, unit: '%', delta: 2.4, max: 100 },
  { label: 'Contested Poss.', value: 14, delta: 3, max: 31 },
  { label: 'Clearances', value: 7, delta: 2 },
  { label: 'Metres Gained', value: 612, unit: 'm', delta: 88 },
];

const freeGame: FreeGame = {
  id: 'afl-2026-05-03',
  sport: 'afl',
  title: 'Round 8, Best Afield',
  matchup: 'Northern Magpies vs. Coastal Demons',
  date: '2026-05-03',
  headline:
    '31 disposals, 14 contested, 7 clearances and 2 goals, a midfield masterclass that drove three match-defining inside-50 entries.',
  summaryMetrics: [
    { label: 'Disposals', value: 31 },
    { label: 'Contested Poss.', value: 14 },
    { label: 'Clearances', value: 7 },
    { label: 'Goals', value: 2 },
    { label: 'Tackles', value: 6 },
    { label: 'Metres Gained', value: 612, unit: 'm' },
  ],
};

const afl: SportData = {
  sport: 'afl',
  displayName: 'Australian Football',
  pitch: 'afl-oval',
  spatialKind: 'heatmap',
  spray,
  heatmap,
  zones,
  trajectories,
  metrics,
  trend: {
    label: 'Disposals & Contested Possessions, last 6 rounds',
    xLabels: ['R3', 'R4', 'R5', 'R6', 'R7', 'R8'],
    series: [
      { name: 'Disposals', data: [22, 26, 24, 28, 29, 31], color: 'var(--color-accent1)' },
      { name: 'Contested', data: [9, 11, 10, 12, 12, 14], color: 'var(--color-accent2)' },
    ],
  },
  freeGame,
};

export default afl;
