// Basketball, half-court. Shot chart (made/missed by location), shot-zone
// heatmap, defensive coverage zones, drive trajectories.
// Coordinate convention for the basketball-halfcourt pitch:
//   x,y normalized 0..1. The hoop/basket sits at bottom-center (x≈0.5, y≈0.9).
//   The half-court line is the top (y≈0). The three-point arc bows up from the
//   baseline; x≈0.5 is straight on; left/right corners are x≈0.08 / x≈0.92.

import type {
  FreeGame,
  HeatCell,
  MetricRow,
  SpatialPoint,
  SportData,
  TrajectoryPath,
  ZonePolygon,
} from '@/lib/types';

// --- Shot chart: makes and misses by location ---------------------------------
const spray: SpatialPoint[] = [
  // At the rim
  { x: 0.5, y: 0.84, outcome: 'make', label: 'Dunk', value: 2 },
  { x: 0.46, y: 0.8, outcome: 'make', label: 'Layup', value: 2 },
  { x: 0.55, y: 0.82, outcome: 'miss', label: 'Contested layup', value: 2 },
  { x: 0.5, y: 0.78, outcome: 'make', label: 'Floater', value: 2 },
  // Mid-range
  { x: 0.32, y: 0.66, outcome: 'make', label: 'Mid-range pull-up', value: 2 },
  { x: 0.68, y: 0.64, outcome: 'miss', label: 'Mid-range fade', value: 2 },
  { x: 0.42, y: 0.58, outcome: 'make', label: 'Elbow jumper', value: 2 },
  { x: 0.58, y: 0.6, outcome: 'miss', label: 'Baseline turnaround', value: 2 },
  // Three-point, corners
  { x: 0.09, y: 0.72, outcome: 'make', label: 'Corner 3, left', value: 3 },
  { x: 0.91, y: 0.72, outcome: 'make', label: 'Corner 3, right', value: 3 },
  { x: 0.12, y: 0.68, outcome: 'miss', label: 'Corner 3, left', value: 3 },
  // Three-point, wings / top
  { x: 0.24, y: 0.5, outcome: 'make', label: 'Wing 3, left', value: 3 },
  { x: 0.76, y: 0.5, outcome: 'miss', label: 'Wing 3, right', value: 3 },
  { x: 0.5, y: 0.42, outcome: 'make', label: 'Top-of-key 3', value: 3 },
  { x: 0.5, y: 0.38, outcome: 'make', label: 'Deep 3, pull-up', value: 3 },
  { x: 0.36, y: 0.46, outcome: 'miss', label: 'Wing 3, left', value: 3 },
];

// --- Shot-zone frequency heatmap (rim + corners hot) --------------------------
const heatmap: HeatCell[] = [
  { x: 0.5, y: 0.82, weight: 0.97 }, { x: 0.44, y: 0.8, weight: 0.82 }, { x: 0.56, y: 0.8, weight: 0.79 },
  { x: 0.5, y: 0.42, weight: 0.71 }, { x: 0.09, y: 0.72, weight: 0.66 }, { x: 0.91, y: 0.72, weight: 0.63 },
  { x: 0.24, y: 0.5, weight: 0.54 }, { x: 0.76, y: 0.5, weight: 0.51 },
  { x: 0.34, y: 0.64, weight: 0.38 }, { x: 0.66, y: 0.64, weight: 0.35 },
  { x: 0.42, y: 0.58, weight: 0.31 }, { x: 0.58, y: 0.58, weight: 0.29 },
];

// --- Defensive coverage zones -------------------------------------------------
const zones: ZonePolygon[] = [
  {
    id: 'paint',
    label: 'Paint',
    points: [[0.38, 0.95], [0.62, 0.95], [0.62, 0.62], [0.38, 0.62]],
    value: 0.62,
  },
  {
    id: 'midrange',
    label: 'Mid-range',
    points: [[0.22, 0.62], [0.78, 0.62], [0.72, 0.4], [0.28, 0.4]],
    value: 0.18,
  },
  {
    id: 'left-corner',
    label: 'Left Corner 3',
    points: [[0.02, 0.95], [0.18, 0.95], [0.18, 0.66], [0.02, 0.66]],
    value: 0.41,
  },
  {
    id: 'right-corner',
    label: 'Right Corner 3',
    points: [[0.82, 0.95], [0.98, 0.95], [0.98, 0.66], [0.82, 0.66]],
    value: 0.39,
  },
  {
    id: 'top-arc',
    label: 'Above the Break 3',
    points: [[0.18, 0.5], [0.82, 0.5], [0.7, 0.28], [0.3, 0.28]],
    value: 0.48,
  },
];

// --- Drive trajectories (perimeter -> rim) ------------------------------------
const trajectories: TrajectoryPath[] = [
  {
    id: 'drive-baseline',
    points: [[0.24, 0.5], [0.2, 0.62], [0.3, 0.74], [0.46, 0.8]],
    outcome: 'make',
    intensity: 0.88,
  },
  {
    id: 'drive-middle',
    points: [[0.5, 0.4], [0.5, 0.55], [0.5, 0.68], [0.5, 0.82]],
    outcome: 'make',
    intensity: 0.82,
  },
  {
    id: 'drive-kickout',
    points: [[0.62, 0.5], [0.56, 0.64], [0.5, 0.72], [0.09, 0.72]],
    outcome: 'winner',
    intensity: 0.66,
  },
];

// --- Advanced basketball metrics ----------------------------------------------
const metrics: MetricRow[] = [
  { label: 'PTS', value: 28, delta: 3, spark: [21, 24, 22, 26, 27, 28] },
  { label: 'eFG%', value: 58.4, unit: '%', delta: 2.1, max: 100 },
  { label: 'TS%', value: 62.7, unit: '%', delta: 1.8, max: 100 },
  { label: 'AST', value: 7, delta: 1 },
  { label: 'REB', value: 6, delta: -1 },
  { label: '+/-', value: '+14', delta: 8 },
  { label: 'Usage Rate', value: 29.3, unit: '%', delta: 1.2, max: 100 },
  { label: '3PT%', value: 41.2, unit: '%', delta: 3.4, max: 100 },
  { label: 'AST/TO', value: 3.5, delta: 0.6 },
];

const freeGame: FreeGame = {
  id: 'bk-2026-03-11',
  sport: 'basketball',
  title: 'Primetime, Efficiency Clinic',
  matchup: 'Metro Voltage vs. Summit Kings',
  date: '2026-03-11',
  headline:
    '28 points on 62.7% true shooting with 7 assists and a +14, five made threes on a night the corner-three diet paid off.',
  summaryMetrics: [
    { label: 'PTS', value: 28 },
    { label: 'TS%', value: 62.7, unit: '%' },
    { label: 'AST', value: 7 },
    { label: '3PM', value: 5 },
    { label: '+/-', value: '+14' },
    { label: 'Usage', value: 29.3, unit: '%' },
  ],
};

const basketball: SportData = {
  sport: 'basketball',
  displayName: 'Basketball',
  pitch: 'basketball-halfcourt',
  spatialKind: 'shot',
  spray,
  heatmap,
  zones,
  trajectories,
  metrics,
  trend: {
    label: 'Points & True Shooting %, last 6 games',
    xLabels: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
    series: [
      { name: 'PTS', data: [21, 24, 22, 26, 27, 28], color: 'var(--color-accent1)' },
      { name: 'TS%', data: [56.1, 58.9, 57.4, 60.2, 61.5, 62.7], color: 'var(--color-accent2)' },
    ],
  },
  freeGame,
};

export default basketball;
