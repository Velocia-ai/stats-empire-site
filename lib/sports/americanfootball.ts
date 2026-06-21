// American Football, gridiron field. Field-position heatmap, pass-completion and
// run trajectory lines, red-zone / territory zone coverage.
// Coordinate convention for the football-field pitch:
//   x,y normalized 0..1 on the bounding box of the gridiron.
//   The offense attacks toward the TOP: own end zone is the bottom (y≈0.92+),
//   own territory is lower (y≈0.7), midfield (the 50) sits at y≈0.5, opponent
//   territory is upper (y≈0.3), the opponent red zone is near the top (y≈0.12),
//   and the opponent end zone is the very top (y≈0.04).
//   x≈0.5 runs straight up the hash marks through the middle of the field;
//   x≈0.16 and x≈0.84 are the left and right sidelines / numbers.
//   Player profiled: a dual-threat franchise quarterback running the offense.

import type {
  FreeGame,
  HeatCell,
  MetricRow,
  SpatialPoint,
  SportData,
  TrajectoryPath,
  ZonePolygon,
} from '@/lib/types';

// --- Play locations / pass completions (where the ball ended up) ---------------
// value: touchdowns score 6, completions and gains score 1, so scores pop.
const spray: SpatialPoint[] = [
  // Short and intermediate completions across midfield
  { x: 0.5, y: 0.52, outcome: 'neutral', label: 'Checkdown, 4 yds', value: 1 },
  { x: 0.36, y: 0.46, outcome: 'make', label: 'Slant completion, 9 yds', value: 1 },
  { x: 0.64, y: 0.48, outcome: 'make', label: 'Out route, 11 yds', value: 1 },
  { x: 0.5, y: 0.4, outcome: 'make', label: 'Seam completion, 16 yds', value: 1 },
  { x: 0.3, y: 0.5, outcome: 'make', label: 'Screen pass, 7 yds', value: 1 },
  { x: 0.7, y: 0.44, outcome: 'neutral', label: 'Comeback, 8 yds', value: 1 },
  { x: 0.42, y: 0.5, outcome: 'make', label: 'Drag route, 6 yds', value: 1 },
  { x: 0.58, y: 0.42, outcome: 'make', label: 'Curl, 13 yds', value: 1 },
  { x: 0.66, y: 0.54, outcome: 'neutral', label: 'Flat route, 3 yds', value: 1 },
  // Deep shots into opponent territory
  { x: 0.78, y: 0.24, outcome: 'winner', label: 'Deep post, 38 yds', value: 1 },
  { x: 0.24, y: 0.28, outcome: 'error', label: 'Overthrown go route', value: 0 },
  { x: 0.58, y: 0.3, outcome: 'make', label: 'Dig route, 19 yds', value: 1 },
  { x: 0.32, y: 0.26, outcome: 'make', label: 'Deep crosser, 27 yds', value: 1 },
  { x: 0.7, y: 0.32, outcome: 'make', label: 'Corner route, 22 yds', value: 1 },
  // Red zone and scores
  { x: 0.5, y: 0.08, outcome: 'winner', label: 'TD pass, fade', value: 6 },
  { x: 0.42, y: 0.1, outcome: 'winner', label: 'TD run, QB keep', value: 6 },
  { x: 0.6, y: 0.13, outcome: 'make', label: 'Red-zone slant, 8 yds', value: 1 },
  { x: 0.46, y: 0.16, outcome: 'error', label: 'Goal-line INT', value: 0 },
  { x: 0.56, y: 0.18, outcome: 'make', label: 'Fade-stop, 12 yds', value: 1 },
  // Scrambles and runs near own territory
  { x: 0.52, y: 0.66, outcome: 'make', label: 'Scramble, 12 yds', value: 1 },
  { x: 0.4, y: 0.72, outcome: 'make', label: 'Designed QB run, 6 yds', value: 1 },
  { x: 0.6, y: 0.7, outcome: 'neutral', label: 'Handoff, 3 yds', value: 1 },
  { x: 0.34, y: 0.78, outcome: 'error', label: 'Sacked, -7 yds', value: 0 },
  { x: 0.62, y: 0.62, outcome: 'make', label: 'Zone-read keeper, 9 yds', value: 1 },
];

// --- Field-position density heatmap (where the offense operated) ----------------
// 85 cells on a regular grid spanning the gridiron width; gaussian-mixture weights
// peak just past midfield in opponent territory (the hot core) with a warm
// red-zone lobe up top and a cooler own-territory lobe down low.
const heatmap: HeatCell[] = [
  { x: 0.5, y: 0.04, weight: 0.14 }, { x: 0.423, y: 0.04, weight: 0.1 }, { x: 0.577, y: 0.04, weight: 0.1 },
  { x: 0.346, y: 0.1, weight: 0.18 }, { x: 0.423, y: 0.1, weight: 0.26 }, { x: 0.5, y: 0.1, weight: 0.34 },
  { x: 0.577, y: 0.1, weight: 0.26 }, { x: 0.654, y: 0.1, weight: 0.2 }, { x: 0.27, y: 0.18, weight: 0.16 },
  { x: 0.346, y: 0.18, weight: 0.22 }, { x: 0.423, y: 0.18, weight: 0.31 }, { x: 0.5, y: 0.18, weight: 0.4 },
  { x: 0.577, y: 0.18, weight: 0.33 }, { x: 0.654, y: 0.18, weight: 0.24 }, { x: 0.73, y: 0.18, weight: 0.15 },
  { x: 0.231, y: 0.28, weight: 0.16 }, { x: 0.27, y: 0.28, weight: 0.19 }, { x: 0.346, y: 0.28, weight: 0.34 },
  { x: 0.423, y: 0.28, weight: 0.5 }, { x: 0.5, y: 0.28, weight: 0.58 }, { x: 0.577, y: 0.28, weight: 0.46 },
  { x: 0.654, y: 0.28, weight: 0.3 }, { x: 0.73, y: 0.28, weight: 0.18 }, { x: 0.769, y: 0.28, weight: 0.14 },
  { x: 0.192, y: 0.38, weight: 0.15 }, { x: 0.231, y: 0.38, weight: 0.21 }, { x: 0.346, y: 0.38, weight: 0.49 },
  { x: 0.423, y: 0.38, weight: 0.72 }, { x: 0.5, y: 0.38, weight: 0.84 }, { x: 0.577, y: 0.38, weight: 0.68 },
  { x: 0.654, y: 0.38, weight: 0.44 }, { x: 0.73, y: 0.38, weight: 0.24 }, { x: 0.808, y: 0.38, weight: 0.14 },
  { x: 0.192, y: 0.48, weight: 0.17 }, { x: 0.231, y: 0.48, weight: 0.24 }, { x: 0.346, y: 0.48, weight: 0.55 },
  { x: 0.423, y: 0.48, weight: 0.86 }, { x: 0.5, y: 0.48, weight: 1 }, { x: 0.577, y: 0.48, weight: 0.83 },
  { x: 0.654, y: 0.48, weight: 0.52 }, { x: 0.769, y: 0.48, weight: 0.25 }, { x: 0.808, y: 0.48, weight: 0.15 },
  { x: 0.192, y: 0.58, weight: 0.14 }, { x: 0.231, y: 0.58, weight: 0.2 }, { x: 0.346, y: 0.58, weight: 0.46 },
  { x: 0.423, y: 0.58, weight: 0.7 }, { x: 0.5, y: 0.58, weight: 0.82 }, { x: 0.577, y: 0.58, weight: 0.66 },
  { x: 0.654, y: 0.58, weight: 0.42 }, { x: 0.769, y: 0.58, weight: 0.21 }, { x: 0.27, y: 0.68, weight: 0.18 },
  { x: 0.346, y: 0.68, weight: 0.32 }, { x: 0.423, y: 0.68, weight: 0.5 }, { x: 0.5, y: 0.68, weight: 0.6 },
  { x: 0.577, y: 0.68, weight: 0.49 }, { x: 0.654, y: 0.68, weight: 0.3 }, { x: 0.73, y: 0.68, weight: 0.17 },
  { x: 0.27, y: 0.78, weight: 0.14 }, { x: 0.346, y: 0.78, weight: 0.2 }, { x: 0.423, y: 0.78, weight: 0.31 },
  { x: 0.5, y: 0.78, weight: 0.38 }, { x: 0.577, y: 0.78, weight: 0.3 }, { x: 0.654, y: 0.78, weight: 0.18 },
  { x: 0.346, y: 0.86, weight: 0.12 }, { x: 0.423, y: 0.86, weight: 0.16 }, { x: 0.5, y: 0.86, weight: 0.22 },
  { x: 0.577, y: 0.86, weight: 0.15 }, { x: 0.654, y: 0.86, weight: 0.11 }, { x: 0.423, y: 0.92, weight: 0.09 },
  { x: 0.5, y: 0.92, weight: 0.12 }, { x: 0.577, y: 0.92, weight: 0.09 }, { x: 0.5, y: 0.96, weight: 0.07 },
  { x: 0.27, y: 0.38, weight: 0.32 }, { x: 0.73, y: 0.48, weight: 0.34 }, { x: 0.27, y: 0.48, weight: 0.34 },
  { x: 0.73, y: 0.58, weight: 0.28 }, { x: 0.27, y: 0.58, weight: 0.28 }, { x: 0.808, y: 0.58, weight: 0.13 },
  { x: 0.346, y: 0.92, weight: 0.07 }, { x: 0.654, y: 0.92, weight: 0.07 }, { x: 0.423, y: 0.96, weight: 0.05 },
  { x: 0.577, y: 0.96, weight: 0.05 }, { x: 0.5, y: 0.14, weight: 0.37 }, { x: 0.5, y: 0.53, weight: 0.92 },
];

// --- Red zone / Opp territory / Midfield / Own territory zone coverage ----------
// Four horizontal bands partition the field top-to-bottom; value = share of the
// offense's snaps that operated in that band.
const zones: ZonePolygon[] = [
  {
    id: 'redzone',
    label: 'Red zone',
    points: [[0.16, 0.04], [0.84, 0.04], [0.84, 0.2], [0.16, 0.2]],
    value: 0.22,
  },
  {
    id: 'opp-territory',
    label: 'Opp territory',
    points: [[0.16, 0.2], [0.84, 0.2], [0.84, 0.5], [0.16, 0.5]],
    value: 0.41,
  },
  {
    id: 'midfield',
    label: 'Midfield',
    points: [[0.16, 0.44], [0.84, 0.44], [0.84, 0.56], [0.16, 0.56]],
    value: 0.21,
  },
  {
    id: 'own-territory',
    label: 'Own territory',
    points: [[0.16, 0.56], [0.84, 0.56], [0.84, 0.96], [0.16, 0.96]],
    value: 0.16,
  },
];

// --- Pass / run / sack trajectory lines ----------------------------------------
// outcome tints (winner = touchdown, make = positive play, neutral = no-gain /
// checkdown, error = turnover / sack); intensity drives stroke weight + opacity.
// `kind` uses American-football vocabulary.
const trajectories: TrajectoryPath[] = [
  {
    id: 'deep-pass-td',
    label: 'Deep post -> touchdown',
    kind: 'Touchdown',
    points: [[0.5, 0.5], [0.56, 0.36], [0.6, 0.2], [0.5, 0.08]],
    outcome: 'winner',
    intensity: 0.95,
  },
  {
    id: 'deep-shot',
    label: 'Play-action deep shot',
    kind: 'Deep pass',
    points: [[0.46, 0.5], [0.6, 0.38], [0.72, 0.3], [0.78, 0.24]],
    outcome: 'make',
    intensity: 0.86,
  },
  {
    id: 'seam-completion',
    label: 'Seam route over the middle',
    kind: 'Pass completion',
    points: [[0.5, 0.52], [0.5, 0.46], [0.5, 0.42], [0.5, 0.4]],
    outcome: 'make',
    intensity: 0.74,
  },
  {
    id: 'screen-pass',
    label: 'Bubble screen to the flat',
    kind: 'Screen pass',
    points: [[0.5, 0.54], [0.42, 0.52], [0.36, 0.5], [0.3, 0.5]],
    outcome: 'make',
    intensity: 0.6,
  },
  {
    id: 'qb-scramble',
    label: 'Scramble up the middle',
    kind: 'Scramble',
    points: [[0.5, 0.7], [0.52, 0.66], [0.5, 0.62], [0.52, 0.58]],
    outcome: 'make',
    intensity: 0.66,
  },
  {
    id: 'designed-run',
    label: 'Designed QB run, read option',
    kind: 'Run',
    points: [[0.5, 0.74], [0.46, 0.72], [0.42, 0.72], [0.4, 0.72]],
    outcome: 'make',
    intensity: 0.55,
  },
  {
    id: 'qb-sack',
    label: 'Pressure off the edge -> sack',
    kind: 'Sack',
    points: [[0.5, 0.74], [0.44, 0.76], [0.38, 0.78], [0.34, 0.78]],
    outcome: 'error',
    intensity: 0.42,
  },
  {
    id: 'goal-line-int',
    label: 'Forced throw -> interception',
    kind: 'Interception',
    points: [[0.5, 0.22], [0.48, 0.18], [0.46, 0.16], [0.46, 0.16]],
    outcome: 'error',
    intensity: 0.4,
  },
];

// --- Advanced American football metrics ----------------------------------------
const metrics: MetricRow[] = [
  { label: 'Pass yds', value: 327, unit: 'yds', delta: 41, spark: [248, 271, 263, 298, 311, 327] },
  { label: 'Rush yds', value: 58, unit: 'yds', delta: 12 },
  { label: 'Total yds', value: 385, unit: 'yds', delta: 36 },
  { label: 'Comp/Att', value: '26/35' },
  { label: 'Passer rating', value: 118.4, delta: 9.7, max: 158.3 },
  { label: 'Touchdowns', value: 3, delta: 1 },
  { label: 'Interceptions', value: 1, delta: 0 },
  { label: 'Sacks', value: 2, delta: -1 },
  { label: 'Tackles', value: 0, delta: 0 },
  { label: '3rd-down %', value: 52.4, unit: '%', delta: 6.1, max: 100 },
  { label: 'Yards/play', value: 6.4, unit: 'yds', delta: 0.8 },
  { label: 'Completion %', value: 74.3, unit: '%', delta: 3.5, max: 100 },
];

const freeGame: FreeGame = {
  id: 'americanfootball-2026-05-03',
  sport: 'americanfootball',
  title: 'Week 8, Player of the Game',
  matchup: 'Northern Sentinels vs. Coastal Mariners',
  date: '2026-05-03',
  headline:
    '327 passing yards on 26 of 35, 3 total touchdowns and a 118.4 passer rating, a quarterback masterclass that converted on 52% of third downs and answered every drive.',
  summaryMetrics: [
    { label: 'Pass yds', value: 327, unit: 'yds' },
    { label: 'Comp/Att', value: '26/35' },
    { label: 'Touchdowns', value: 3 },
    { label: 'Passer rating', value: 118.4 },
    { label: '3rd-down %', value: 52.4, unit: '%' },
    { label: 'Total yds', value: 385, unit: 'yds' },
  ],
};

const americanfootball: SportData = {
  sport: 'americanfootball',
  displayName: 'American Football',
  pitch: 'football-field',
  spatialKind: 'heatmap',
  spray,
  heatmap,
  zones,
  trajectories,
  metrics,
  trend: {
    label: 'Passing yards & total yards, last 6 weeks',
    xLabels: ['W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
    series: [
      { name: 'Pass yds', data: [248, 271, 263, 298, 311, 327], color: 'var(--color-accent1)' },
      { name: 'Total yds', data: [302, 333, 318, 352, 349, 385], color: 'var(--color-accent2)' },
    ],
  },
  freeGame,
};

export default americanfootball;
