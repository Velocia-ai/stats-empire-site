// Australian Rules Football, oval field. Possession heatmap, kick/disposal
// trajectory lines, forward/mid/back-50 zone coverage.
// Coordinate convention for the afl-oval pitch:
//   x,y normalized 0..1 on the bounding box of the oval.
//   The team attacks toward the top: back-50 (defensive) is bottom (y≈0.8+),
//   midfield is the center bounce area (y≈0.5), forward-50 is the top (y≈0.2).
//   x≈0.5 is the corridor straight through the middle of the ground.
//   Player profiled: an inside/outside midfielder living around the contest.

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
// value: goals score 6, behinds and possessions score 1, so set-shot goals pop.
const spray: SpatialPoint[] = [
  // Midfield grunt work around the center
  { x: 0.5, y: 0.5, outcome: 'neutral', label: 'Centre clearance', value: 1 },
  { x: 0.44, y: 0.46, outcome: 'make', label: 'Contested mark', value: 1 },
  { x: 0.57, y: 0.54, outcome: 'make', label: 'Handball receive', value: 1 },
  { x: 0.39, y: 0.58, outcome: 'neutral', label: 'Ground-ball get', value: 1 },
  { x: 0.62, y: 0.42, outcome: 'make', label: 'Intercept', value: 1 },
  { x: 0.52, y: 0.4, outcome: 'make', label: 'Stoppage clearance', value: 1 },
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

// --- Possession/positioning heatmap (dense through the midfield corridor) ------
// 55 cells on a regular grid, masked to the oval; gaussian-mixture weights peak
// at the centre bounce with wing and forward lobes.
const heatmap: HeatCell[] = [
  { x: 0.423, y: 0.192, weight: 0.16 }, { x: 0.5, y: 0.192, weight: 0.18 }, { x: 0.577, y: 0.192, weight: 0.15 },
  { x: 0.346, y: 0.269, weight: 0.21 }, { x: 0.423, y: 0.269, weight: 0.32 }, { x: 0.5, y: 0.269, weight: 0.36 },
  { x: 0.577, y: 0.269, weight: 0.29 }, { x: 0.654, y: 0.269, weight: 0.18 }, { x: 0.269, y: 0.346, weight: 0.2 },
  { x: 0.346, y: 0.346, weight: 0.37 }, { x: 0.423, y: 0.346, weight: 0.56 }, { x: 0.5, y: 0.346, weight: 0.61 },
  { x: 0.577, y: 0.346, weight: 0.48 }, { x: 0.654, y: 0.346, weight: 0.3 }, { x: 0.731, y: 0.346, weight: 0.17 },
  { x: 0.192, y: 0.423, weight: 0.17 }, { x: 0.269, y: 0.423, weight: 0.32 }, { x: 0.346, y: 0.423, weight: 0.55 },
  { x: 0.423, y: 0.423, weight: 0.8 }, { x: 0.5, y: 0.423, weight: 0.88 }, { x: 0.577, y: 0.423, weight: 0.71 },
  { x: 0.654, y: 0.423, weight: 0.45 }, { x: 0.731, y: 0.423, weight: 0.27 }, { x: 0.807, y: 0.423, weight: 0.15 },
  { x: 0.192, y: 0.5, weight: 0.19 }, { x: 0.269, y: 0.5, weight: 0.35 }, { x: 0.346, y: 0.5, weight: 0.59 },
  { x: 0.423, y: 0.5, weight: 0.87 }, { x: 0.5, y: 0.5, weight: 1 }, { x: 0.577, y: 0.5, weight: 0.86 },
  { x: 0.654, y: 0.5, weight: 0.57 }, { x: 0.731, y: 0.5, weight: 0.34 }, { x: 0.807, y: 0.5, weight: 0.19 },
  { x: 0.192, y: 0.577, weight: 0.16 }, { x: 0.269, y: 0.577, weight: 0.27 }, { x: 0.346, y: 0.577, weight: 0.44 },
  { x: 0.423, y: 0.577, weight: 0.67 }, { x: 0.5, y: 0.577, weight: 0.83 }, { x: 0.577, y: 0.577, weight: 0.75 },
  { x: 0.654, y: 0.577, weight: 0.51 }, { x: 0.731, y: 0.577, weight: 0.3 }, { x: 0.807, y: 0.577, weight: 0.16 },
  { x: 0.269, y: 0.654, weight: 0.16 }, { x: 0.346, y: 0.654, weight: 0.26 }, { x: 0.423, y: 0.654, weight: 0.41 },
  { x: 0.5, y: 0.654, weight: 0.51 }, { x: 0.577, y: 0.654, weight: 0.48 }, { x: 0.654, y: 0.654, weight: 0.32 },
  { x: 0.731, y: 0.654, weight: 0.18 }, { x: 0.346, y: 0.731, weight: 0.13 }, { x: 0.423, y: 0.731, weight: 0.22 },
  { x: 0.5, y: 0.731, weight: 0.27 }, { x: 0.577, y: 0.731, weight: 0.24 }, { x: 0.654, y: 0.731, weight: 0.16 },
  { x: 0.5, y: 0.807, weight: 0.12 },
];

// --- Forward / Mid / Back-50 zone coverage (non-overlapping oval bands) --------
// Three horizontal arcs partition the oval top-to-bottom; value = share of the
// player's possessions won in that band.
const zones: ZonePolygon[] = [
  {
    id: 'fwd50',
    label: 'Forward 50',
    points: [[0.16, 0.34], [0.28, 0.14], [0.5, 0.08], [0.72, 0.14], [0.84, 0.34], [0.5, 0.36]],
    value: 0.34,
  },
  {
    id: 'mid',
    label: 'Midfield',
    points: [[0.5, 0.36], [0.84, 0.34], [0.92, 0.5], [0.84, 0.66], [0.5, 0.64], [0.16, 0.66], [0.08, 0.5], [0.16, 0.34]],
    value: 0.52,
  },
  {
    id: 'back50',
    label: 'Back 50',
    points: [[0.16, 0.66], [0.5, 0.64], [0.84, 0.66], [0.72, 0.86], [0.5, 0.92], [0.28, 0.86]],
    value: 0.14,
  },
];

// --- Kick / disposal trajectory lines -----------------------------------------
// outcome tints (winner = leads to goal, make = effective disposal, neutral =
// switch/reset, error = turnover); intensity drives stroke weight + opacity.
const trajectories: TrajectoryPath[] = [
  {
    id: 'clearance-to-fwd',
    label: 'Centre clearance -> inside 50',
    points: [[0.5, 0.5], [0.48, 0.4], [0.49, 0.3], [0.5, 0.22]],
    outcome: 'winner',
    intensity: 0.92,
  },
  {
    id: 'inside-50-entry',
    label: 'Wing kick -> goal assist',
    points: [[0.3, 0.5], [0.36, 0.4], [0.42, 0.32], [0.46, 0.18]],
    outcome: 'winner',
    intensity: 0.84,
  },
  {
    id: 'rebound-50',
    label: 'Rebound 50 -> corridor',
    points: [[0.4, 0.84], [0.45, 0.7], [0.52, 0.58], [0.5, 0.5]],
    outcome: 'make',
    intensity: 0.74,
  },
  {
    id: 'handball-chain',
    label: 'Handball chain out of contest',
    points: [[0.5, 0.52], [0.56, 0.5], [0.62, 0.46], [0.7, 0.44]],
    outcome: 'make',
    intensity: 0.66,
  },
  {
    id: 'switch-kick',
    label: 'Switch kick to open wing',
    points: [[0.42, 0.62], [0.3, 0.55], [0.22, 0.5], [0.24, 0.42]],
    outcome: 'neutral',
    intensity: 0.56,
  },
  {
    id: 'long-bomb-fwd',
    label: 'Long bomb inside 50',
    points: [[0.5, 0.62], [0.5, 0.46], [0.48, 0.32], [0.5, 0.22]],
    outcome: 'make',
    intensity: 0.62,
  },
  {
    id: 'kick-in',
    label: 'Kick-in to corridor',
    points: [[0.5, 0.88], [0.46, 0.78], [0.48, 0.68], [0.5, 0.6]],
    outcome: 'make',
    intensity: 0.5,
  },
  {
    id: 'turnover-kick',
    label: 'Forward kick -> intercepted',
    points: [[0.55, 0.4], [0.62, 0.34], [0.7, 0.3], [0.62, 0.26]],
    outcome: 'error',
    intensity: 0.4,
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
  { label: 'Disposal Eff.', value: 81.5, unit: '%', delta: 1.7, max: 100 },
  { label: 'Contested %', value: 45.2, unit: '%', delta: 4.6, max: 100 },
  { label: 'Clearances', value: 7, delta: 2 },
  { label: 'Inside 50s', value: 6, delta: 2 },
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
    { label: 'Kick Efficiency', value: 78.9, unit: '%' },
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
