// Basketball, half-court. Shot chart (made/missed by location), shot-zone
// heatmap, defensive coverage zones, drive trajectories.
// Coordinate convention for the basketball-halfcourt pitch:
//   x,y normalized 0..1. The hoop/basket sits at bottom-center (x≈0.5, y≈0.86).
//   The half-court line is the top (y≈0). The three-point arc bows up from the
//   baseline; x≈0.5 is straight on; left/right corners are x≈0.08 / x≈0.92.
//   Player profiled: a high-usage wing scorer (rim + corner + above-break diet).

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
  { x: 0.42, y: 0.83, outcome: 'make', label: 'Reverse layup', value: 2 },
  { x: 0.58, y: 0.85, outcome: 'make', label: 'Putback', value: 2 },
  // Mid-range
  { x: 0.32, y: 0.66, outcome: 'make', label: 'Mid-range pull-up', value: 2 },
  { x: 0.68, y: 0.64, outcome: 'miss', label: 'Mid-range fade', value: 2 },
  { x: 0.42, y: 0.58, outcome: 'make', label: 'Elbow jumper', value: 2 },
  { x: 0.58, y: 0.6, outcome: 'miss', label: 'Baseline turnaround', value: 2 },
  { x: 0.5, y: 0.62, outcome: 'make', label: 'Free-throw-line jumper', value: 2 },
  // Three-point, corners
  { x: 0.09, y: 0.72, outcome: 'make', label: 'Corner 3, left', value: 3 },
  { x: 0.91, y: 0.72, outcome: 'make', label: 'Corner 3, right', value: 3 },
  { x: 0.12, y: 0.68, outcome: 'miss', label: 'Corner 3, left', value: 3 },
  { x: 0.88, y: 0.7, outcome: 'make', label: 'Corner 3, right', value: 3 },
  // Three-point, wings / top
  { x: 0.24, y: 0.5, outcome: 'make', label: 'Wing 3, left', value: 3 },
  { x: 0.76, y: 0.5, outcome: 'miss', label: 'Wing 3, right', value: 3 },
  { x: 0.5, y: 0.42, outcome: 'make', label: 'Top-of-key 3', value: 3 },
  { x: 0.5, y: 0.38, outcome: 'make', label: 'Deep 3, pull-up', value: 3 },
  { x: 0.36, y: 0.46, outcome: 'miss', label: 'Wing 3, left', value: 3 },
  { x: 0.64, y: 0.46, outcome: 'make', label: 'Wing 3, right', value: 3 },
];

// --- Shot-zone frequency heatmap (rim + corners + wings + top of key hot) ------
// 79 cells on a regular grid; gaussian-mixture weights bloom into the classic
// "rim + three-point hot zones, dead mid-range" map.
const heatmap: HeatCell[] = [
  { x: 0.464, y: 0.321, weight: 0.15 }, { x: 0.536, y: 0.321, weight: 0.15 }, { x: 0.178, y: 0.393, weight: 0.13 },
  { x: 0.25, y: 0.393, weight: 0.2 }, { x: 0.393, y: 0.393, weight: 0.19 }, { x: 0.464, y: 0.393, weight: 0.51 },
  { x: 0.536, y: 0.393, weight: 0.51 }, { x: 0.607, y: 0.393, weight: 0.19 }, { x: 0.75, y: 0.393, weight: 0.19 },
  { x: 0.821, y: 0.393, weight: 0.12 }, { x: 0.178, y: 0.464, weight: 0.32 }, { x: 0.25, y: 0.464, weight: 0.5 },
  { x: 0.321, y: 0.464, weight: 0.25 }, { x: 0.393, y: 0.464, weight: 0.19 }, { x: 0.464, y: 0.464, weight: 0.44 },
  { x: 0.536, y: 0.464, weight: 0.44 }, { x: 0.607, y: 0.464, weight: 0.19 }, { x: 0.678, y: 0.464, weight: 0.24 },
  { x: 0.75, y: 0.464, weight: 0.47 }, { x: 0.821, y: 0.464, weight: 0.3 }, { x: 0.178, y: 0.536, weight: 0.33 },
  { x: 0.25, y: 0.536, weight: 0.51 }, { x: 0.321, y: 0.536, weight: 0.29 }, { x: 0.393, y: 0.536, weight: 0.12 },
  { x: 0.607, y: 0.536, weight: 0.12 }, { x: 0.678, y: 0.536, weight: 0.27 }, { x: 0.75, y: 0.536, weight: 0.48 },
  { x: 0.821, y: 0.536, weight: 0.32 }, { x: 0.036, y: 0.607, weight: 0.12 }, { x: 0.107, y: 0.607, weight: 0.26 },
  { x: 0.178, y: 0.607, weight: 0.22 }, { x: 0.25, y: 0.607, weight: 0.26 }, { x: 0.321, y: 0.607, weight: 0.32 },
  { x: 0.393, y: 0.607, weight: 0.26 }, { x: 0.607, y: 0.607, weight: 0.24 }, { x: 0.678, y: 0.607, weight: 0.3 },
  { x: 0.75, y: 0.607, weight: 0.24 }, { x: 0.821, y: 0.607, weight: 0.21 }, { x: 0.893, y: 0.607, weight: 0.24 },
  { x: 0.036, y: 0.678, weight: 0.32 }, { x: 0.107, y: 0.678, weight: 0.63 }, { x: 0.178, y: 0.678, weight: 0.25 },
  { x: 0.321, y: 0.678, weight: 0.25 }, { x: 0.393, y: 0.678, weight: 0.3 }, { x: 0.464, y: 0.678, weight: 0.19 },
  { x: 0.536, y: 0.678, weight: 0.19 }, { x: 0.607, y: 0.678, weight: 0.28 }, { x: 0.678, y: 0.678, weight: 0.24 },
  { x: 0.821, y: 0.678, weight: 0.23 }, { x: 0.893, y: 0.678, weight: 0.59 }, { x: 0.964, y: 0.678, weight: 0.3 },
  { x: 0.036, y: 0.75, weight: 0.34 }, { x: 0.107, y: 0.75, weight: 0.67 }, { x: 0.178, y: 0.75, weight: 0.25 },
  { x: 0.321, y: 0.75, weight: 0.14 }, { x: 0.393, y: 0.75, weight: 0.37 }, { x: 0.464, y: 0.75, weight: 0.62 },
  { x: 0.536, y: 0.75, weight: 0.62 }, { x: 0.607, y: 0.75, weight: 0.37 }, { x: 0.678, y: 0.75, weight: 0.14 },
  { x: 0.821, y: 0.75, weight: 0.23 }, { x: 0.893, y: 0.75, weight: 0.63 }, { x: 0.964, y: 0.75, weight: 0.33 },
  { x: 0.036, y: 0.821, weight: 0.15 }, { x: 0.107, y: 0.821, weight: 0.29 }, { x: 0.321, y: 0.821, weight: 0.15 },
  { x: 0.393, y: 0.821, weight: 0.53 }, { x: 0.464, y: 0.821, weight: 1 }, { x: 0.536, y: 0.821, weight: 1 },
  { x: 0.607, y: 0.821, weight: 0.54 }, { x: 0.678, y: 0.821, weight: 0.15 }, { x: 0.893, y: 0.821, weight: 0.28 },
  { x: 0.964, y: 0.821, weight: 0.14 }, { x: 0.393, y: 0.893, weight: 0.31 }, { x: 0.464, y: 0.893, weight: 0.58 },
  { x: 0.536, y: 0.893, weight: 0.58 }, { x: 0.607, y: 0.893, weight: 0.31 }, { x: 0.464, y: 0.964, weight: 0.12 },
  { x: 0.536, y: 0.964, weight: 0.12 },
];

// --- Shot-zone coverage (non-overlapping partition of the half court) ----------
// Paint, two corner-3 strips, the mid-range ring above the paint, and the
// above-the-break 3 region. value = shot share from that zone.
const zones: ZonePolygon[] = [
  {
    id: 'paint',
    label: 'Paint',
    points: [[0.37, 0.96], [0.63, 0.96], [0.63, 0.62], [0.37, 0.62]],
    value: 0.42,
  },
  {
    id: 'left-corner',
    label: 'Left Corner 3',
    points: [[0.02, 0.96], [0.19, 0.96], [0.19, 0.62], [0.02, 0.62]],
    value: 0.18,
  },
  {
    id: 'right-corner',
    label: 'Right Corner 3',
    points: [[0.81, 0.96], [0.98, 0.96], [0.98, 0.62], [0.81, 0.62]],
    value: 0.17,
  },
  {
    id: 'midrange',
    label: 'Mid-range',
    points: [[0.19, 0.62], [0.81, 0.62], [0.81, 0.4], [0.19, 0.4]],
    value: 0.09,
  },
  {
    id: 'top-arc',
    label: 'Above the Break 3',
    points: [[0.19, 0.4], [0.81, 0.4], [0.81, 0.04], [0.19, 0.04]],
    value: 0.36,
  },
];

// --- Drive / shot-creation trajectories ---------------------------------------
// outcome tints (make/winner = bucket or assist, miss = stop), intensity drives
// stroke weight + opacity.
const trajectories: TrajectoryPath[] = [
  {
    id: 'drive-baseline',
    label: 'Baseline drive -> layup',
    points: [[0.24, 0.5], [0.2, 0.62], [0.3, 0.74], [0.46, 0.8]],
    outcome: 'make',
    intensity: 0.9,
  },
  {
    id: 'drive-middle',
    label: 'Middle drive -> dunk',
    points: [[0.5, 0.4], [0.5, 0.55], [0.5, 0.68], [0.5, 0.83]],
    outcome: 'make',
    intensity: 0.86,
  },
  {
    id: 'drive-kickout-corner',
    label: 'Drive & kick -> corner 3',
    points: [[0.62, 0.5], [0.56, 0.64], [0.4, 0.72], [0.09, 0.72]],
    outcome: 'winner',
    intensity: 0.78,
  },
  {
    id: 'transition-pullup',
    label: 'Transition pull-up 3',
    points: [[0.5, 0.12], [0.5, 0.26], [0.5, 0.38], [0.5, 0.42]],
    outcome: 'make',
    intensity: 0.7,
  },
  {
    id: 'pnr-snake',
    label: 'Pick-and-roll snake -> floater',
    points: [[0.7, 0.42], [0.58, 0.52], [0.5, 0.66], [0.5, 0.78]],
    outcome: 'make',
    intensity: 0.66,
  },
  {
    id: 'spot-up-relocate',
    label: 'Relocate -> wing 3',
    points: [[0.5, 0.66], [0.4, 0.58], [0.3, 0.52], [0.24, 0.5]],
    outcome: 'make',
    intensity: 0.58,
  },
  {
    id: 'drive-contested-miss',
    label: 'Contested drive -> blocked',
    points: [[0.36, 0.46], [0.4, 0.6], [0.46, 0.72], [0.52, 0.8]],
    outcome: 'miss',
    intensity: 0.46,
  },
  {
    id: 'skip-pass-right',
    label: 'Skip pass -> right corner',
    points: [[0.24, 0.5], [0.5, 0.56], [0.74, 0.66], [0.91, 0.72]],
    outcome: 'winner',
    intensity: 0.62,
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
  { label: 'FT%', value: 87.5, unit: '%', delta: 1.1, max: 100 },
  { label: 'AST/TO', value: 3.5, delta: 0.6 },
  { label: 'Rim FG%', value: 71.4, unit: '%', delta: 4.2, max: 100 },
  { label: 'Pts / Shot', value: 1.42, delta: 0.09 },
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
    { label: 'Usage Rate', value: 29.3, unit: '%' },
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
