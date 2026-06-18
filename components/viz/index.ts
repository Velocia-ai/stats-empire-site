// Stats Empire, spatial viz primitive library.
//
// Sport-agnostic SVG primitives that all overlay onto the SAME normalized
// 0..1 coordinate space (see geometry.ts) for a given PitchType, so they stack
// pixel-for-pixel. Compose them (PitchBackground at the bottom, data layers on
// top) inside a relatively-positioned, absolutely-stacked container.

export { default as PitchBackground } from './PitchBackground';
export type { PitchBackgroundProps } from './PitchBackground';

export { default as Heatmap } from './Heatmap';
export type { HeatmapProps } from './Heatmap';

export { default as SprayChart } from './SprayChart';
export type { SprayChartProps } from './SprayChart';

export { default as ZoneCoverage } from './ZoneCoverage';
export type { ZoneCoverageProps } from './ZoneCoverage';

export { default as TrajectoryLines } from './TrajectoryLines';
export type { TrajectoryLinesProps } from './TrajectoryLines';

// Shared geometry helpers, exported for components that compose these
// primitives (e.g. report/freemium layers) and need the same projection.
export {
  makeProjector,
  viewBoxFor,
  viewBoxAttr,
  projectPoints,
  clamp01,
  shortId,
} from './geometry';
export type { Projector, ViewBox } from './geometry';
