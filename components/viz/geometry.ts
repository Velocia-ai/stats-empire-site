// Stats Empire, shared spatial-viz geometry.
//
// Every spatial primitive (PitchBackground, Heatmap, SprayChart, ZoneCoverage,
// TrajectoryLines) renders into the SAME SVG coordinate space for a given
// PitchType, so overlays line up pixel-for-pixel when stacked.
//
// The contract: all spatial data uses a NORMALIZED 0..1 coordinate space
//   x: 0 = left edge of the field,   1 = right edge
//   y: 0 = TOP of the field,         1 = bottom
// Each PitchType picks a viewBox whose aspect ratio matches the real surface.
// `project()` maps a normalized (x,y) to a pixel point inside that viewBox.
//
// This module is plain TypeScript (no React) so it can be imported by every
// viz component and shared without re-computation.

import type { PitchType } from '@/lib/types';

/** A pixel rectangle describing an SVG viewBox: `0 0 width height`. */
export interface ViewBox {
  width: number;
  height: number;
}

/**
 * Per-pitch viewBox dimensions. Aspect ratios approximate the real playing
 * surfaces so that field markings read as correct to someone who knows the
 * sport. Values are in abstract SVG units (we keep them ~1000-wide for crisp
 * stroke math); the SVG scales responsively via `viewBox` + 100% width.
 */
const VIEWBOXES: Record<PitchType, ViewBox> = {
  // Baseball: square-ish frame, diamond rotated 45° inside it.
  'baseball-diamond': { width: 1000, height: 1000 },
  // AFL: oval, wider than tall (~165m x 135m → ~1.22:1).
  'afl-oval': { width: 1000, height: 820 },
  // Basketball half-court: 50ft wide x 47ft deep → ~1.06:1, baseline at top.
  'basketball-halfcourt': { width: 1000, height: 940 },
  // Tennis: full singles/doubles court seen lengthwise, taller than wide.
  'tennis-court': { width: 720, height: 1000 },
  // Soccer: full pitch, landscape (~105m x 68m → ~1.55:1).
  'soccer-pitch': { width: 1000, height: 645 },
};

/** Returns the viewBox dimensions for a pitch. */
export function viewBoxFor(pitch: PitchType): ViewBox {
  return VIEWBOXES[pitch];
}

/** Returns the `viewBox` attribute string for an `<svg>`. */
export function viewBoxAttr(pitch: PitchType): string {
  const { width, height } = VIEWBOXES[pitch];
  return `0 0 ${width} ${height}`;
}

/** A projector closes over a pitch's viewBox and maps 0..1 → pixels. */
export interface Projector {
  readonly view: ViewBox;
  /** Map normalized x (0..1) → pixel x. */
  px: (x: number) => number;
  /** Map normalized y (0..1) → pixel y. */
  py: (y: number) => number;
  /** Map a normalized point → pixel point. */
  point: (x: number, y: number) => readonly [number, number];
}

/**
 * Build a projector for a pitch. All viz components call this once and reuse
 * `px`/`py`/`point` so their geometry is guaranteed consistent with the field.
 */
export function makeProjector(pitch: PitchType): Projector {
  const view = VIEWBOXES[pitch];
  const px = (x: number) => clamp01(x) * view.width;
  const py = (y: number) => clamp01(y) * view.height;
  return {
    view,
    px,
    py,
    point: (x: number, y: number) => [px(x), py(y)] as const,
  };
}

/** Clamp a value into [0, 1]; guards against out-of-range fixture data. */
export function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Convert an array of normalized polygon/line points into an SVG `points`
 * (or path-ready) array of pixel tuples.
 */
export function projectPoints(
  proj: Projector,
  points: ReadonlyArray<readonly [number, number]>,
): Array<[number, number]> {
  return points.map(([x, y]) => [proj.px(x), proj.py(y)]);
}

/** Stable, dependency-free hash → used to derive deterministic ids for <defs>. */
export function shortId(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Unsigned hex, trimmed, safe for SVG id / url(#...) references.
  return (h >>> 0).toString(36);
}
