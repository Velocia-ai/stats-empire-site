// Soccer / Football, full pitch. Pass map / pass-network trajectory lines,
// positional heatmap, defensive-third zone coverage, shot map.
// Coordinate convention for the soccer-pitch pitch:
//   x,y normalized 0..1 over the full pitch, viewed from above, attacking up.
//   Own goal is at the bottom (y≈0.97); opponent goal is at the top (y≈0.03).
//   x≈0.5 is the central spine; x≈0 is the left touchline, x≈1 the right.
//   Defensive third is the bottom band, middle third center, final third top.

import type {
  FreeGame,
  HeatCell,
  MetricRow,
  SpatialPoint,
  SportData,
  TrajectoryPath,
  ZonePolygon,
} from '@/lib/types';

// --- Shot map + key touches (final third) -------------------------------------
const spray: SpatialPoint[] = [
  // Shots toward the opponent goal (top)
  { x: 0.5, y: 0.1, outcome: 'winner', label: 'Goal, low driven, 0.34 xG', value: 0.34 },
  { x: 0.42, y: 0.14, outcome: 'miss', label: 'Shot, saved, 0.12 xG', value: 0.12 },
  { x: 0.58, y: 0.12, outcome: 'winner', label: 'Goal, header, 0.28 xG', value: 0.28 },
  { x: 0.36, y: 0.2, outcome: 'miss', label: 'Shot, blocked, 0.07 xG', value: 0.07 },
  { x: 0.64, y: 0.18, outcome: 'miss', label: 'Shot, wide, 0.05 xG', value: 0.05 },
  { x: 0.5, y: 0.24, outcome: 'miss', label: 'Shot, off target, 0.09 xG', value: 0.09 },
  // Key progressive passes / carries
  { x: 0.3, y: 0.34, outcome: 'make', label: 'Through ball, assist', value: 1 },
  { x: 0.7, y: 0.38, outcome: 'make', label: 'Cutback, chance created', value: 1 },
  { x: 0.46, y: 0.46, outcome: 'make', label: 'Line-breaking pass', value: 1 },
  { x: 0.22, y: 0.5, outcome: 'make', label: 'Progressive carry', value: 1 },
  { x: 0.78, y: 0.52, outcome: 'make', label: 'Switch of play', value: 1 },
  // Defensive actions (own half)
  { x: 0.4, y: 0.74, outcome: 'make', label: 'Tackle won', value: 1 },
  { x: 0.6, y: 0.7, outcome: 'make', label: 'Interception', value: 1 },
  { x: 0.5, y: 0.82, outcome: 'make', label: 'Clearance', value: 1 },
];

// --- Positional heatmap (where the player operated; advanced #8 role) ---------
const heatmap: HeatCell[] = [
  { x: 0.5, y: 0.46, weight: 0.92 }, { x: 0.42, y: 0.5, weight: 0.78 }, { x: 0.58, y: 0.44, weight: 0.74 },
  { x: 0.46, y: 0.34, weight: 0.66 }, { x: 0.54, y: 0.36, weight: 0.63 },
  { x: 0.3, y: 0.5, weight: 0.52 }, { x: 0.7, y: 0.48, weight: 0.49 },
  { x: 0.5, y: 0.6, weight: 0.58 }, { x: 0.48, y: 0.2, weight: 0.41 },
  { x: 0.4, y: 0.68, weight: 0.36 }, { x: 0.6, y: 0.64, weight: 0.33 },
  { x: 0.5, y: 0.12, weight: 0.29 }, { x: 0.5, y: 0.78, weight: 0.24 },
];

// --- Pitch-third / defensive zone coverage ------------------------------------
const zones: ZonePolygon[] = [
  {
    id: 'final-third',
    label: 'Final Third',
    points: [[0.05, 0.05], [0.95, 0.05], [0.95, 0.36], [0.05, 0.36]],
    value: 0.39,
  },
  {
    id: 'middle-third',
    label: 'Middle Third',
    points: [[0.05, 0.36], [0.95, 0.36], [0.95, 0.64], [0.05, 0.64]],
    value: 0.47,
  },
  {
    id: 'defensive-third',
    label: 'Defensive Third',
    points: [[0.05, 0.64], [0.95, 0.64], [0.95, 0.95], [0.05, 0.95]],
    value: 0.14,
  },
  {
    id: 'left-channel',
    label: 'Left Half-Space',
    points: [[0.18, 0.2], [0.42, 0.2], [0.42, 0.62], [0.18, 0.62]],
    value: 0.28,
  },
];

// --- Pass-network trajectory lines (build-up to shot) -------------------------
const trajectories: TrajectoryPath[] = [
  {
    id: 'buildup-to-goal',
    points: [[0.3, 0.6], [0.42, 0.48], [0.46, 0.34], [0.5, 0.1]],
    outcome: 'winner',
    intensity: 0.92,
  },
  {
    id: 'switch-of-play',
    points: [[0.22, 0.5], [0.5, 0.46], [0.78, 0.52]],
    outcome: 'make',
    intensity: 0.6,
  },
  {
    id: 'through-ball-assist',
    points: [[0.46, 0.46], [0.4, 0.36], [0.3, 0.34], [0.5, 0.1]],
    outcome: 'winner',
    intensity: 0.82,
  },
  {
    id: 'cutback-chance',
    points: [[0.78, 0.3], [0.7, 0.38], [0.5, 0.24]],
    outcome: 'miss',
    intensity: 0.55,
  },
];

// --- Advanced soccer metrics --------------------------------------------------
const metrics: MetricRow[] = [
  { label: 'xG', value: 0.71, delta: 0.18, spark: [0.31, 0.42, 0.38, 0.55, 0.63, 0.71] },
  { label: 'Goals', value: 2, delta: 1 },
  { label: 'Pass %', value: 89.4, unit: '%', delta: 1.6, max: 100 },
  { label: 'Possession', value: 58, unit: '%', delta: 4, max: 100 },
  { label: 'Key Passes', value: 4, delta: 1 },
  { label: 'Prog. Carries', value: 9, delta: 2 },
  { label: 'Shots', value: 6, delta: 2 },
  { label: 'Tackles', value: 5, delta: 1 },
  { label: 'Touches', value: 94, delta: 11 },
];

const freeGame: FreeGame = {
  id: 'sc-2026-05-24',
  sport: 'soccer',
  title: 'Matchday 34, Complete Performance',
  matchup: 'Athletic Rovers 3, 1 Calle Union',
  date: '2026-05-24',
  headline:
    '2 goals and an assist from a 0.71 xG night, 89% pass accuracy, 4 key passes and 9 progressive carries driving the build-up.',
  summaryMetrics: [
    { label: 'Goals', value: 2 },
    { label: 'Assists', value: 1 },
    { label: 'xG', value: 0.71 },
    { label: 'Key Passes', value: 4 },
    { label: 'Pass %', value: 89, unit: '%' },
    { label: 'Prog. Carries', value: 9 },
  ],
};

const soccer: SportData = {
  sport: 'soccer',
  displayName: 'Soccer',
  pitch: 'soccer-pitch',
  spatialKind: 'passmap',
  spray,
  heatmap,
  zones,
  trajectories,
  metrics,
  trend: {
    label: 'xG & Pass accuracy, last 6 matches',
    xLabels: ['MD29', 'MD30', 'MD31', 'MD32', 'MD33', 'MD34'],
    series: [
      { name: 'xG', data: [0.31, 0.42, 0.38, 0.55, 0.63, 0.71], color: 'var(--color-accent1)' },
      { name: 'Pass %', data: [85.2, 86.8, 84.9, 87.6, 88.5, 89.4], color: 'var(--color-accent2)' },
    ],
  },
  freeGame,
};

export default soccer;
