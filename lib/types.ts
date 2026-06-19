// Stats Empire, shared domain contracts.
// Downstream feature components, sport fixtures, and viz primitives all import
// from this module. Keep these shapes stable; changing them is a breaking change.

export type ThemeKey = 'evolved' | 'court' | 'precision';

export type SportKey = 'baseball' | 'afl' | 'basketball' | 'tennis' | 'soccer';

export type PitchType =
  | 'baseball-diamond'
  | 'afl-oval'
  | 'basketball-halfcourt'
  | 'tennis-court'
  | 'soccer-pitch';

export type Outcome = 'make' | 'miss' | 'winner' | 'error' | 'neutral';

// x,y normalized 0..1 on the pitch
export interface SpatialPoint {
  x: number;
  y: number;
  value?: number;
  outcome?: Outcome;
  label?: string;
}

// 0..1 grid coords, weight 0..1
export interface HeatCell {
  x: number;
  y: number;
  weight: number;
}

// points normalized 0..1
export interface ZonePolygon {
  id: string;
  label: string;
  points: [number, number][];
  value: number;
}

export interface TrajectoryPath {
  id: string;
  /** Optional human-readable name for the play (e.g. "Key pass -> assist"). */
  label?: string;
  /**
   * Sport-specific play type in that sport's own vocabulary (e.g. tennis
   * "Forehand winner", soccer "Through ball", basketball "Catch & shoot").
   * TrajectoryLines derives its legend from the distinct `kind` values present,
   * falling back to `outcome` when absent. Colour stays keyed off `outcome`.
   */
  kind?: string;
  points: [number, number][];
  outcome?: Outcome;
  intensity?: number;
}

export interface MetricRow {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  max?: number;
  spark?: number[];
}

export interface TrendSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface SportData {
  sport: SportKey;
  displayName: string;
  pitch: PitchType;
  spatialKind: 'spray' | 'shot' | 'heatmap' | 'passmap';
  spray: SpatialPoint[];
  heatmap: HeatCell[];
  zones: ZonePolygon[];
  trajectories: TrajectoryPath[];
  metrics: MetricRow[];
  trend: { label: string; xLabels: string[]; series: TrendSeries[] };
  freeGame: FreeGame;
}

export interface FreeGame {
  id: string;
  sport: SportKey;
  title: string;
  matchup: string;
  date: string;
  headline: string;
  summaryMetrics: MetricRow[];
}

// icon handled in UI via lucide
export interface SportMeta {
  key: SportKey;
  name: string;
  tagline: string;
}
