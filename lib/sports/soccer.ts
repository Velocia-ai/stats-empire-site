// Soccer / Football, full pitch. Pass map / pass-network trajectory lines,
// positional heatmap, zonal coverage, shot map.
// Coordinate convention for the soccer-pitch pitch:
//   x,y normalized 0..1 over the full pitch, viewed from above, attacking up.
//   Own goal is at the bottom (y≈0.97); opponent goal is at the top (y≈0.03).
//   x≈0.5 is the central spine; x≈0 is the left touchline, x≈1 the right.
//   Defensive third is the bottom band, middle third center, final third top.
//   Player profiled: an advanced left-sided #8 (box-to-box, left half-space).

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
  // Shots toward the opponent goal (top); value carries xG so size encodes it.
  { x: 0.5, y: 0.1, outcome: 'winner', label: 'Goal, low driven, 0.34 xG', value: 0.34 },
  { x: 0.42, y: 0.14, outcome: 'miss', label: 'Shot, saved, 0.12 xG', value: 0.12 },
  { x: 0.58, y: 0.12, outcome: 'winner', label: 'Goal, header, 0.28 xG', value: 0.28 },
  { x: 0.36, y: 0.2, outcome: 'miss', label: 'Shot, blocked, 0.07 xG', value: 0.07 },
  { x: 0.64, y: 0.18, outcome: 'miss', label: 'Shot, wide, 0.05 xG', value: 0.05 },
  { x: 0.5, y: 0.24, outcome: 'miss', label: 'Half-volley, off target, 0.09 xG', value: 0.09 },
  { x: 0.46, y: 0.08, outcome: 'winner', label: 'Tap-in rebound, 0.61 xG', value: 0.61 },
  { x: 0.3, y: 0.22, outcome: 'miss', label: 'Curler, post, 0.11 xG', value: 0.11 },
  // Key progressive passes / carries (value=1, neutral size; outcome=make).
  { x: 0.3, y: 0.34, outcome: 'make', label: 'Through ball -> assist', value: 1 },
  { x: 0.7, y: 0.38, outcome: 'make', label: 'Cutback, chance created', value: 1 },
  { x: 0.46, y: 0.46, outcome: 'make', label: 'Line-breaking pass', value: 1 },
  { x: 0.22, y: 0.5, outcome: 'make', label: 'Progressive carry, left', value: 1 },
  { x: 0.78, y: 0.52, outcome: 'make', label: 'Switch of play', value: 1 },
  { x: 0.34, y: 0.3, outcome: 'make', label: 'Half-space combination', value: 1 },
  { x: 0.56, y: 0.42, outcome: 'make', label: 'One-two return', value: 1 },
  // Defensive actions (own half).
  { x: 0.4, y: 0.74, outcome: 'make', label: 'Tackle won', value: 1 },
  { x: 0.6, y: 0.7, outcome: 'make', label: 'Interception', value: 1 },
  { x: 0.5, y: 0.82, outcome: 'make', label: 'Clearance', value: 1 },
  { x: 0.32, y: 0.66, outcome: 'make', label: 'Ball recovery', value: 1 },
];

// --- Positional heatmap (advanced left #8: left half-space + middle third) -----
// 64 cells on a regular grid; weights from a gaussian mixture so the field reads
// as a continuous density bloom rather than scattered dots.
const heatmap: HeatCell[] = [
  { x: 0.423, y: 0.115, weight: 0.16 }, { x: 0.5, y: 0.115, weight: 0.19 }, { x: 0.577, y: 0.115, weight: 0.15 },
  { x: 0.269, y: 0.192, weight: 0.16 }, { x: 0.346, y: 0.192, weight: 0.28 }, { x: 0.423, y: 0.192, weight: 0.37 },
  { x: 0.5, y: 0.192, weight: 0.38 }, { x: 0.577, y: 0.192, weight: 0.31 }, { x: 0.654, y: 0.192, weight: 0.18 },
  { x: 0.192, y: 0.269, weight: 0.15 }, { x: 0.269, y: 0.269, weight: 0.33 }, { x: 0.346, y: 0.269, weight: 0.53 },
  { x: 0.423, y: 0.269, weight: 0.62 }, { x: 0.5, y: 0.269, weight: 0.59 }, { x: 0.577, y: 0.269, weight: 0.44 },
  { x: 0.654, y: 0.269, weight: 0.25 }, { x: 0.192, y: 0.346, weight: 0.23 }, { x: 0.269, y: 0.346, weight: 0.51 },
  { x: 0.346, y: 0.346, weight: 0.78 }, { x: 0.423, y: 0.346, weight: 0.86 }, { x: 0.5, y: 0.346, weight: 0.74 },
  { x: 0.577, y: 0.346, weight: 0.54 }, { x: 0.654, y: 0.346, weight: 0.32 }, { x: 0.731, y: 0.346, weight: 0.15 },
  { x: 0.192, y: 0.423, weight: 0.27 }, { x: 0.269, y: 0.423, weight: 0.6 }, { x: 0.346, y: 0.423, weight: 0.92 },
  { x: 0.423, y: 0.423, weight: 1 }, { x: 0.5, y: 0.423, weight: 0.84 }, { x: 0.577, y: 0.423, weight: 0.61 },
  { x: 0.654, y: 0.423, weight: 0.39 }, { x: 0.731, y: 0.423, weight: 0.2 }, { x: 0.192, y: 0.5, weight: 0.25 },
  { x: 0.269, y: 0.5, weight: 0.57 }, { x: 0.346, y: 0.5, weight: 0.89 }, { x: 0.423, y: 0.5, weight: 0.99 },
  { x: 0.5, y: 0.5, weight: 0.84 }, { x: 0.577, y: 0.5, weight: 0.61 }, { x: 0.654, y: 0.5, weight: 0.41 },
  { x: 0.731, y: 0.5, weight: 0.22 }, { x: 0.192, y: 0.577, weight: 0.19 }, { x: 0.269, y: 0.577, weight: 0.45 },
  { x: 0.346, y: 0.577, weight: 0.74 }, { x: 0.423, y: 0.577, weight: 0.85 }, { x: 0.5, y: 0.577, weight: 0.73 },
  { x: 0.577, y: 0.577, weight: 0.53 }, { x: 0.654, y: 0.577, weight: 0.34 }, { x: 0.731, y: 0.577, weight: 0.18 },
  { x: 0.269, y: 0.654, weight: 0.32 }, { x: 0.346, y: 0.654, weight: 0.54 }, { x: 0.423, y: 0.654, weight: 0.64 },
  { x: 0.5, y: 0.654, weight: 0.56 }, { x: 0.577, y: 0.654, weight: 0.4 }, { x: 0.654, y: 0.654, weight: 0.24 },
  { x: 0.269, y: 0.731, weight: 0.19 }, { x: 0.346, y: 0.731, weight: 0.34 }, { x: 0.423, y: 0.731, weight: 0.42 },
  { x: 0.5, y: 0.731, weight: 0.39 }, { x: 0.577, y: 0.731, weight: 0.27 }, { x: 0.654, y: 0.731, weight: 0.16 },
  { x: 0.346, y: 0.807, weight: 0.17 }, { x: 0.423, y: 0.807, weight: 0.22 }, { x: 0.5, y: 0.807, weight: 0.21 },
  { x: 0.577, y: 0.807, weight: 0.15 },
];

// --- Pitch-third zonal coverage (non-overlapping vertical partition) -----------
// Three full-width bands partition the pitch top-to-bottom; value = share of the
// player's involvements in that third.
const zones: ZonePolygon[] = [
  {
    id: 'final-third',
    label: 'Final Third',
    points: [[0.04, 0.04], [0.96, 0.04], [0.96, 0.37], [0.04, 0.37]],
    value: 0.34,
  },
  {
    id: 'middle-third',
    label: 'Middle Third',
    points: [[0.04, 0.37], [0.96, 0.37], [0.96, 0.66], [0.04, 0.66]],
    value: 0.49,
  },
  {
    id: 'defensive-third',
    label: 'Defensive Third',
    points: [[0.04, 0.66], [0.96, 0.66], [0.96, 0.96], [0.04, 0.96]],
    value: 0.17,
  },
];

// --- Pass-network trajectory lines (build-up -> chances -> shots) --------------
// outcome tints the line (winner=goal, make=completed, miss=chance not taken);
// intensity drives stroke weight + opacity so volume/quality read at a glance.
const trajectories: TrajectoryPath[] = [
  {
    id: 'buildup-to-goal',
    label: 'Build-up -> goal',
    points: [[0.3, 0.6], [0.4, 0.48], [0.46, 0.34], [0.5, 0.1]],
    outcome: 'winner',
    intensity: 0.94,
  },
  {
    id: 'through-ball-assist',
    label: 'Through ball -> assist',
    points: [[0.46, 0.46], [0.4, 0.36], [0.3, 0.34], [0.58, 0.12]],
    outcome: 'winner',
    intensity: 0.88,
  },
  {
    id: 'left-overlap-cross',
    label: 'Left overlap -> cutback',
    points: [[0.2, 0.5], [0.18, 0.36], [0.24, 0.22], [0.46, 0.16]],
    outcome: 'make',
    intensity: 0.74,
  },
  {
    id: 'switch-of-play',
    label: 'Switch to right wing',
    points: [[0.22, 0.5], [0.5, 0.46], [0.78, 0.52]],
    outcome: 'make',
    intensity: 0.66,
  },
  {
    id: 'one-two-half-space',
    label: 'One-two, left half-space',
    points: [[0.34, 0.5], [0.42, 0.4], [0.34, 0.32], [0.44, 0.22]],
    outcome: 'make',
    intensity: 0.7,
  },
  {
    id: 'cutback-chance',
    label: 'Cutback -> shot saved',
    points: [[0.78, 0.3], [0.7, 0.22], [0.5, 0.18], [0.42, 0.14]],
    outcome: 'miss',
    intensity: 0.58,
  },
  {
    id: 'progressive-carry',
    label: 'Progressive carry from deep',
    points: [[0.3, 0.74], [0.3, 0.6], [0.34, 0.46], [0.4, 0.36]],
    outcome: 'make',
    intensity: 0.62,
  },
  {
    id: 'recovery-to-reset',
    label: 'Ball recovery -> reset',
    points: [[0.5, 0.82], [0.42, 0.72], [0.38, 0.62], [0.3, 0.58]],
    outcome: 'neutral',
    intensity: 0.4,
  },
];

// --- Advanced soccer metrics --------------------------------------------------
const metrics: MetricRow[] = [
  { label: 'xG', value: 0.71, delta: 0.18, spark: [0.31, 0.42, 0.38, 0.55, 0.63, 0.71] },
  { label: 'xA', value: 0.54, delta: 0.12, spark: [0.22, 0.3, 0.27, 0.41, 0.48, 0.54] },
  { label: 'Goals', value: 2, delta: 1 },
  { label: 'Assists', value: 1, delta: 1 },
  { label: 'Pass Accuracy', value: 89.4, unit: '%', delta: 1.6, max: 100 },
  { label: 'Possession', value: 58.0, unit: '%', delta: 4.0, max: 100 },
  { label: 'Key Passes', value: 4, delta: 1 },
  { label: 'Prog. Carries', value: 9, delta: 2 },
  { label: 'Prog. Passes', value: 11, delta: 3 },
  { label: 'Shots', value: 6, delta: 2 },
  { label: 'Duels Won', value: 64.3, unit: '%', delta: 7.1, max: 100 },
  { label: 'Touches', value: 94, delta: 11 },
];

const freeGame: FreeGame = {
  id: 'sc-2026-05-24',
  sport: 'soccer',
  title: 'Matchday 34, Complete Performance',
  matchup: 'Athletic Rovers 3, 1 Calle Union',
  date: '2026-05-24',
  headline:
    '2 goals and an assist from a 0.71 xG night, 89.4% pass accuracy, 4 key passes and 9 progressive carries driving the build-up.',
  summaryMetrics: [
    { label: 'Goals', value: 2 },
    { label: 'Assists', value: 1 },
    { label: 'xG', value: 0.71 },
    { label: 'xA', value: 0.54 },
    { label: 'Key Passes', value: 4 },
    { label: 'Pass Accuracy', value: 89.4, unit: '%' },
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
