// Baseball / Softball, spray chart, batted-ball heatmap, fielding zones,
// hit-trajectory arcs.
// Coordinate convention for the baseball-diamond pitch:
//   x,y normalized 0..1. Home plate sits at the bottom-center (x≈0.5, y≈0.92).
//   The outfield fans upward; left field is small-x, right field is large-x.
//   Foul lines run from home toward the top-left and top-right corners.
//   Player profiled: a right-handed power hitter who pulls to left field.

import type {
  FreeGame,
  HeatCell,
  MetricRow,
  SpatialPoint,
  SportData,
  TrajectoryPath,
  ZonePolygon,
} from '@/lib/types';

// --- Spray chart: where batted balls landed (home plate bottom-center) --------
// value carries exit velocity (mph) so marker size encodes how hard it was hit.
const spray: SpatialPoint[] = [
  // Pulled line drives to left field (RH pull side)
  { x: 0.22, y: 0.34, outcome: 'winner', label: '2B, line drive, LF gap', value: 104.2 },
  { x: 0.18, y: 0.41, outcome: 'make', label: 'Single, LF', value: 91.8 },
  { x: 0.27, y: 0.28, outcome: 'winner', label: 'HR, pulled, 412 ft', value: 108.6 },
  { x: 0.31, y: 0.52, outcome: 'neutral', label: 'Flyout, shallow LF', value: 82.4 },
  { x: 0.24, y: 0.46, outcome: 'make', label: 'Single, LF line', value: 94.1 },
  // Up the middle
  { x: 0.5, y: 0.24, outcome: 'winner', label: 'HR, center, 419 ft', value: 110.1 },
  { x: 0.48, y: 0.46, outcome: 'make', label: 'Single, up the middle', value: 96.3 },
  { x: 0.53, y: 0.58, outcome: 'neutral', label: 'Lineout, CF', value: 99.7 },
  { x: 0.5, y: 0.78, outcome: 'error', label: 'Groundout, 6-3', value: 84.1 },
  // Opposite field to right
  { x: 0.7, y: 0.39, outcome: 'make', label: 'Double, RF line', value: 95.5 },
  { x: 0.76, y: 0.47, outcome: 'make', label: 'Single, opposite RF', value: 88.9 },
  { x: 0.68, y: 0.55, outcome: 'neutral', label: 'Flyout, RF', value: 86.2 },
  { x: 0.82, y: 0.33, outcome: 'winner', label: 'Triple, RF corner', value: 101.7 },
  { x: 0.64, y: 0.43, outcome: 'make', label: 'Single, RCF gap', value: 97.6 },
  // Infield / weak contact
  { x: 0.44, y: 0.82, outcome: 'error', label: 'Groundout, 4-3', value: 78.5 },
  { x: 0.58, y: 0.8, outcome: 'neutral', label: 'Popout, 2B', value: 71.3 },
  { x: 0.4, y: 0.86, outcome: 'error', label: 'Weak grounder, pitcher', value: 64.9 },
  { x: 0.6, y: 0.66, outcome: 'make', label: 'Infield single, RF hole', value: 89.4 },
];

// --- Batted-ball location heatmap (spray density, pull-side hot) ---------------
// 78 cells on a regular grid, masked to the fair-territory fan; gaussian-mixture
// weights concentrate on the LF pull gap with a center spike and oppo RF lobe.
const heatmap: HeatCell[] = [
  { x: 0.178, y: 0.178, weight: 0.21 }, { x: 0.25, y: 0.178, weight: 0.32 }, { x: 0.321, y: 0.178, weight: 0.38 },
  { x: 0.393, y: 0.178, weight: 0.4 }, { x: 0.464, y: 0.178, weight: 0.41 }, { x: 0.536, y: 0.178, weight: 0.37 },
  { x: 0.607, y: 0.178, weight: 0.28 }, { x: 0.678, y: 0.178, weight: 0.18 }, { x: 0.107, y: 0.25, weight: 0.2 },
  { x: 0.178, y: 0.25, weight: 0.45 }, { x: 0.25, y: 0.25, weight: 0.67 }, { x: 0.321, y: 0.25, weight: 0.74 },
  { x: 0.393, y: 0.25, weight: 0.73 }, { x: 0.464, y: 0.25, weight: 0.71 }, { x: 0.536, y: 0.25, weight: 0.64 },
  { x: 0.607, y: 0.25, weight: 0.51 }, { x: 0.678, y: 0.25, weight: 0.37 }, { x: 0.75, y: 0.25, weight: 0.27 },
  { x: 0.821, y: 0.25, weight: 0.17 }, { x: 0.107, y: 0.321, weight: 0.28 }, { x: 0.178, y: 0.321, weight: 0.61 },
  { x: 0.25, y: 0.321, weight: 0.91 }, { x: 0.321, y: 0.321, weight: 1 }, { x: 0.393, y: 0.321, weight: 0.94 },
  { x: 0.464, y: 0.321, weight: 0.86 }, { x: 0.536, y: 0.321, weight: 0.78 }, { x: 0.607, y: 0.321, weight: 0.67 },
  { x: 0.678, y: 0.321, weight: 0.58 }, { x: 0.75, y: 0.321, weight: 0.48 }, { x: 0.821, y: 0.321, weight: 0.32 },
  { x: 0.107, y: 0.393, weight: 0.26 }, { x: 0.178, y: 0.393, weight: 0.57 }, { x: 0.25, y: 0.393, weight: 0.86 },
  { x: 0.321, y: 0.393, weight: 0.97 }, { x: 0.393, y: 0.393, weight: 0.9 }, { x: 0.464, y: 0.393, weight: 0.81 },
  { x: 0.536, y: 0.393, weight: 0.74 }, { x: 0.607, y: 0.393, weight: 0.71 }, { x: 0.678, y: 0.393, weight: 0.7 },
  { x: 0.75, y: 0.393, weight: 0.61 }, { x: 0.821, y: 0.393, weight: 0.42 }, { x: 0.893, y: 0.393, weight: 0.2 },
  { x: 0.178, y: 0.464, weight: 0.37 }, { x: 0.25, y: 0.464, weight: 0.59 }, { x: 0.321, y: 0.464, weight: 0.73 },
  { x: 0.393, y: 0.464, weight: 0.74 }, { x: 0.464, y: 0.464, weight: 0.68 }, { x: 0.536, y: 0.464, weight: 0.66 },
  { x: 0.607, y: 0.464, weight: 0.69 }, { x: 0.678, y: 0.464, weight: 0.69 }, { x: 0.75, y: 0.464, weight: 0.57 },
  { x: 0.821, y: 0.464, weight: 0.37 }, { x: 0.893, y: 0.464, weight: 0.17 }, { x: 0.178, y: 0.536, weight: 0.17 },
  { x: 0.25, y: 0.536, weight: 0.31 }, { x: 0.321, y: 0.536, weight: 0.44 }, { x: 0.393, y: 0.536, weight: 0.51 },
  { x: 0.464, y: 0.536, weight: 0.51 }, { x: 0.536, y: 0.536, weight: 0.52 }, { x: 0.607, y: 0.536, weight: 0.56 },
  { x: 0.678, y: 0.536, weight: 0.53 }, { x: 0.75, y: 0.536, weight: 0.39 }, { x: 0.821, y: 0.536, weight: 0.23 },
  { x: 0.321, y: 0.607, weight: 0.22 }, { x: 0.393, y: 0.607, weight: 0.29 }, { x: 0.464, y: 0.607, weight: 0.32 },
  { x: 0.536, y: 0.607, weight: 0.34 }, { x: 0.607, y: 0.607, weight: 0.35 }, { x: 0.678, y: 0.607, weight: 0.3 },
  { x: 0.75, y: 0.607, weight: 0.19 }, { x: 0.393, y: 0.678, weight: 0.2 }, { x: 0.464, y: 0.678, weight: 0.26 },
  { x: 0.536, y: 0.678, weight: 0.27 }, { x: 0.607, y: 0.678, weight: 0.23 }, { x: 0.393, y: 0.75, weight: 0.19 },
  { x: 0.464, y: 0.75, weight: 0.25 }, { x: 0.536, y: 0.75, weight: 0.26 }, { x: 0.607, y: 0.75, weight: 0.2 },
];

// --- Fielding zone coverage (non-overlapping fan partition) --------------------
// Three outfield wedges (LF/CF/RF) share the top of the fan; the infield diamond
// sits below. value = share of batted balls hit into that zone.
const zones: ZonePolygon[] = [
  {
    id: 'lf',
    label: 'Left Field',
    points: [[0.06, 0.46], [0.1, 0.16], [0.36, 0.1], [0.4, 0.46]],
    value: 0.36,
  },
  {
    id: 'cf',
    label: 'Center Field',
    points: [[0.4, 0.46], [0.36, 0.1], [0.64, 0.1], [0.6, 0.46]],
    value: 0.31,
  },
  {
    id: 'rf',
    label: 'Right Field',
    points: [[0.6, 0.46], [0.64, 0.1], [0.9, 0.16], [0.94, 0.46]],
    value: 0.24,
  },
  {
    id: 'infield',
    label: 'Infield',
    points: [[0.4, 0.46], [0.6, 0.46], [0.7, 0.7], [0.5, 0.92], [0.3, 0.7]],
    value: 0.09,
  },
];

// --- Hit-trajectory arcs (home plate -> landing) ------------------------------
// outcome tints (winner = extra-base/HR, make = hit, error = out), intensity
// drives stroke weight + opacity.
const trajectories: TrajectoryPath[] = [
  {
    id: 'hr-center',
    label: 'HR to center, 419 ft',
    kind: 'Home run',
    points: [[0.5, 0.92], [0.5, 0.6], [0.5, 0.35], [0.5, 0.24]],
    outcome: 'winner',
    intensity: 0.96,
  },
  {
    id: 'hr-pull',
    label: 'HR pulled to LF, 412 ft',
    kind: 'Home run',
    points: [[0.5, 0.92], [0.42, 0.62], [0.33, 0.4], [0.27, 0.28]],
    outcome: 'winner',
    intensity: 0.9,
  },
  {
    id: 'triple-rf',
    label: 'Triple, RF corner',
    kind: 'Double',
    points: [[0.5, 0.92], [0.62, 0.66], [0.74, 0.46], [0.82, 0.33]],
    outcome: 'winner',
    intensity: 0.8,
  },
  {
    id: 'double-lf-gap',
    label: 'Double, LF gap line drive',
    kind: 'Line drive',
    points: [[0.5, 0.92], [0.4, 0.66], [0.3, 0.46], [0.22, 0.34]],
    outcome: 'winner',
    intensity: 0.72,
  },
  {
    id: 'single-up-middle',
    label: 'Single, up the middle',
    kind: 'Single',
    points: [[0.5, 0.92], [0.49, 0.72], [0.49, 0.56], [0.48, 0.46]],
    outcome: 'make',
    intensity: 0.6,
  },
  {
    id: 'single-oppo-rf',
    label: 'Single, opposite-field RF',
    kind: 'Single',
    points: [[0.5, 0.92], [0.6, 0.7], [0.7, 0.54], [0.76, 0.47]],
    outcome: 'make',
    intensity: 0.54,
  },
  {
    id: 'flyout-lf',
    label: 'Flyout, shallow LF',
    kind: 'Fly out',
    points: [[0.5, 0.92], [0.43, 0.72], [0.36, 0.58], [0.31, 0.52]],
    outcome: 'error',
    intensity: 0.42,
  },
  {
    id: 'groundout',
    label: 'Groundout, 6-3',
    kind: 'Ground out',
    points: [[0.5, 0.92], [0.5, 0.86], [0.5, 0.81], [0.5, 0.78]],
    outcome: 'error',
    intensity: 0.36,
  },
];

// --- Advanced batting metrics -------------------------------------------------
const metrics: MetricRow[] = [
  { label: 'AVG', value: '.318', delta: 0.012, spark: [0.291, 0.298, 0.305, 0.31, 0.314, 0.318] },
  { label: 'OBP', value: '.402', delta: 0.009, spark: [0.371, 0.382, 0.39, 0.395, 0.399, 0.402] },
  { label: 'SLG', value: '.587', delta: 0.034, spark: [0.512, 0.531, 0.548, 0.562, 0.574, 0.587] },
  { label: 'OPS', value: '.989', delta: 0.043 },
  { label: 'wOBA', value: '.394', delta: 0.013 },
  { label: 'RBI', value: 84, delta: 6 },
  { label: 'Exit Velo', value: 91.4, unit: 'mph', delta: 1.8, max: 120 },
  { label: 'Launch Angle', value: 14.2, unit: '°', delta: -0.6, max: 50 },
  { label: 'Hard-Hit %', value: 49.6, unit: '%', delta: 3.1, max: 100 },
  { label: 'Barrel %', value: 12.8, unit: '%', delta: 1.4, max: 100 },
  { label: 'Pull %', value: 44.7, unit: '%', delta: 2.2, max: 100 },
  { label: 'Whiff %', value: 22.5, unit: '%', delta: -1.9, max: 100 },
];

const freeGame: FreeGame = {
  id: 'bb-2026-04-19',
  sport: 'baseball',
  title: 'Series Opener, Walk-off Special',
  matchup: 'Riverside Sluggers vs. Harbor City Tides',
  date: '2026-04-19',
  headline:
    '3-for-5 with two homers and a walk-off double, 110.1 mph max exit velo drove a 419-ft shot to dead center.',
  summaryMetrics: [
    { label: 'Hits', value: 3 },
    { label: 'Home Runs', value: 2 },
    { label: 'RBI', value: 5 },
    { label: 'Max Exit Velo', value: 110.1, unit: 'mph' },
    { label: 'Avg Launch Angle', value: 18.4, unit: '°' },
    { label: 'WPA', value: '+0.61' },
  ],
};

const baseball: SportData = {
  sport: 'baseball',
  displayName: 'Baseball / Softball',
  pitch: 'baseball-diamond',
  spatialKind: 'spray',
  spray,
  heatmap,
  zones,
  trajectories,
  metrics,
  trend: {
    label: 'Rolling 6-game wOBA & Exit Velo',
    xLabels: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
    series: [
      { name: 'wOBA', data: [0.341, 0.358, 0.372, 0.366, 0.381, 0.394], color: 'var(--color-accent1)' },
      { name: 'Exit Velo (mph)', data: [88.9, 89.7, 90.4, 90.1, 91.0, 91.4], color: 'var(--color-accent2)' },
    ],
  },
  freeGame,
};

export default baseball;
