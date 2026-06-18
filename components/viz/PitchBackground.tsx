'use client';

// Stats Empire, PitchBackground
//
// The base spatial layer. Renders an accurate, stylish SVG of a sport's
// playing surface for a given PitchType. Every other spatial primitive
// (Heatmap, SprayChart, ZoneCoverage, TrajectoryLines) overlays on top of this
// using the SAME viewBox (see geometry.ts), so markings and data align.
//
// Theming: all strokes/fills use theme CSS variables (var(--color-*)) so the
// field re-skins live across the evolved / court / precision themes. Field
// markings are decorative, hence aria-hidden; the outer <svg> carries the
// accessible label.

import { useId } from 'react';
import type { PitchType } from '@/lib/types';
import { shortId, viewBoxAttr, viewBoxFor } from './geometry';

export interface PitchBackgroundProps {
  /** Which sport's field to render. */
  pitch: PitchType;
  /** Optional extra classes for the wrapping <svg>. */
  className?: string;
}

const PITCH_LABELS: Record<PitchType, string> = {
  'baseball-diamond': 'Baseball diamond',
  'afl-oval': 'Australian football oval',
  'basketball-halfcourt': 'Basketball half-court',
  'tennis-court': 'Tennis court',
  'soccer-pitch': 'Soccer pitch',
};

/**
 * Renders the field for `pitch`. Use as the bottom layer of a stacked viz, or
 * standalone. Caller controls size via `className` (e.g. `w-full`); the SVG is
 * responsive through its viewBox.
 */
export default function PitchBackground({ pitch, className }: PitchBackgroundProps) {
  const view = viewBoxFor(pitch);
  // Unique id namespace so multiple instances on one page don't collide in
  // <defs> gradient/clip references. useId() is stable across SSR/CSR (no
  // hydration mismatch) and unique per instance; shortId keeps it id-safe.
  const reactId = useId();
  const uid = shortId(`pitch-${pitch}-${reactId}`);

  return (
    <svg
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={PITCH_LABELS[pitch]}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        {/* Soft vignette to lift the field off the page background. */}
        <radialGradient id={`${uid}-turf`} cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="var(--color-surface-alt)" />
          <stop offset="100%" stopColor="var(--color-surface)" />
        </radialGradient>
      </defs>
      <g aria-hidden="true">{renderField(pitch, view.width, view.height, uid)}</g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Field renderers. Each returns the decorative markings for one PitchType,
// drawn in the pitch's own viewBox pixel units. Common styling: surface fill
// for the playing area, border-colored line work, accent2 for a single hero
// accent line per sport.
// ---------------------------------------------------------------------------

function renderField(pitch: PitchType, w: number, h: number, uid: string) {
  switch (pitch) {
    case 'baseball-diamond':
      return <BaseballField w={w} h={h} uid={uid} />;
    case 'afl-oval':
      return <AflField w={w} h={h} uid={uid} />;
    case 'basketball-halfcourt':
      return <BasketballField w={w} h={h} uid={uid} />;
    case 'tennis-court':
      return <TennisField w={w} h={h} uid={uid} />;
    case 'soccer-pitch':
      return <SoccerField w={w} h={h} uid={uid} />;
  }
}

// Shared stroke styling tokens.
const LINE = 'var(--color-border)';
const LINE_STRONG = 'var(--color-muted)';
const ACCENT = 'var(--color-accent2)';

interface FieldProps {
  w: number;
  h: number;
  uid: string;
}

// --- Baseball: diamond rotated 45°, infield, outfield arc, foul lines. -----
function BaseballField({ w, h, uid }: FieldProps) {
  const homeX = w / 2;
  const homeY = h * 0.88; // home plate near the bottom
  const baseSpan = w * 0.3; // half-diagonal of the infield diamond
  const second = { x: homeX, y: homeY - baseSpan * 2 };
  const first = { x: homeX + baseSpan, y: homeY - baseSpan };
  const third = { x: homeX - baseSpan, y: homeY - baseSpan };
  const mound = { x: homeX, y: homeY - baseSpan * 1.15 };

  // Outfield fence arc (centered on home). Foul lines run at 45° from home.
  const SIN45 = Math.SQRT1_2; // = √2/2
  const fenceR = baseSpan * 2.65;
  const foulLen = fenceR * 1.02;
  const foulRightX = homeX + foulLen * SIN45;
  const foulLeftX = homeX - foulLen * SIN45;
  const foulY = homeY - foulLen * SIN45;

  return (
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      {/* Outfield grass */}
      <path
        d={`M ${homeX} ${homeY} L ${foulRightX} ${foulY} A ${fenceR} ${fenceR} 0 0 0 ${foulLeftX} ${foulY} Z`}
        fill={`url(#${uid}-turf)`}
        stroke={LINE}
        strokeWidth={2}
      />
      {/* Infield dirt diamond */}
      <polygon
        points={`${homeX},${homeY} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y}`}
        fill="var(--color-surface)"
        stroke={LINE_STRONG}
        strokeWidth={2.5}
      />
      {/* Infield arc (grass cutout) */}
      <path
        d={`M ${third.x} ${third.y} A ${baseSpan * 1.45} ${baseSpan * 1.45} 0 0 0 ${first.x} ${first.y}`}
        stroke={LINE}
        strokeWidth={1.5}
        opacity={0.7}
      />
      {/* Foul lines */}
      <line x1={homeX} y1={homeY} x2={foulRightX} y2={foulY} stroke={LINE_STRONG} strokeWidth={2} />
      <line x1={homeX} y1={homeY} x2={foulLeftX} y2={foulY} stroke={LINE_STRONG} strokeWidth={2} />
      {/* Bases */}
      {[first, second, third].map((b, i) => (
        <rect
          key={i}
          x={b.x - 9}
          y={b.y - 9}
          width={18}
          height={18}
          transform={`rotate(45 ${b.x} ${b.y})`}
          fill={LINE_STRONG}
        />
      ))}
      {/* Pitcher's mound */}
      <circle cx={mound.x} cy={mound.y} r={14} fill="var(--color-surface-alt)" stroke={LINE_STRONG} strokeWidth={2} />
      {/* Home plate (accent) */}
      <path
        d={`M ${homeX - 11} ${homeY - 6} L ${homeX + 11} ${homeY - 6} L ${homeX + 11} ${homeY + 3} L ${homeX} ${homeY + 12} L ${homeX - 11} ${homeY + 3} Z`}
        fill={ACCENT}
      />
    </g>
  );
}

// --- AFL: oval boundary, centre square, centre circle, 50m arcs. -----------
function AflField({ w, h, uid }: FieldProps) {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w * 0.47;
  const ry = h * 0.47;
  const sq = w * 0.1; // half centre square
  const circleR = w * 0.06;

  // 50m arcs near each end (top & bottom of the oval lengthwise).
  const arcR = w * 0.26;
  return (
    <g fill="none" strokeLinecap="round">
      {/* Turf */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-turf)`} stroke={LINE_STRONG} strokeWidth={3} />
      {/* Centre square */}
      <rect x={cx - sq} y={cy - sq} width={sq * 2} height={sq * 2} stroke={LINE} strokeWidth={2} />
      {/* Centre circle + centre line */}
      <circle cx={cx} cy={cy} r={circleR} stroke={LINE_STRONG} strokeWidth={2} />
      <line x1={cx - circleR} y1={cy} x2={cx + circleR} y2={cy} stroke={LINE_STRONG} strokeWidth={2} />
      {/* Forward (top) goal square + 50 arc */}
      <line x1={cx - sq * 0.7} y1={cy - ry} x2={cx + sq * 0.7} y2={cy - ry + 18} stroke={ACCENT} strokeWidth={2.5} opacity={0.85} />
      <path
        d={`M ${cx - arcR} ${cy - ry + ry * 0.02} A ${arcR} ${arcR} 0 0 1 ${cx + arcR} ${cy - ry + ry * 0.02}`}
        stroke={LINE}
        strokeWidth={2}
      />
      {/* Back (bottom) 50 arc */}
      <path
        d={`M ${cx - arcR} ${cy + ry - ry * 0.02} A ${arcR} ${arcR} 0 0 0 ${cx + arcR} ${cy + ry - ry * 0.02}`}
        stroke={LINE}
        strokeWidth={2}
      />
      {/* Goal posts hint (top, accent) */}
      <line x1={cx - 22} y1={cy - ry - 4} x2={cx - 22} y2={cy - ry + 22} stroke={ACCENT} strokeWidth={3} />
      <line x1={cx + 22} y1={cy - ry - 4} x2={cx + 22} y2={cy - ry + 22} stroke={ACCENT} strokeWidth={3} />
    </g>
  );
}

// --- Basketball half-court: baseline at top, key, free-throw, 3pt arc. -----
function BasketballField({ w, h, uid }: FieldProps) {
  const left = w * 0.05;
  const right = w * 0.95;
  const top = h * 0.05;
  const bottom = h * 0.97; // half-court line at the bottom
  const cx = w / 2;

  const keyW = w * 0.32;
  const keyTop = top;
  const keyBottom = top + h * 0.42; // free-throw line distance
  const ftR = keyW / 2;

  // 3pt geometry: corners straight then arc.
  const cornerInset = w * 0.06;
  const threeStraightBottom = top + h * 0.18;
  const threeR = w * 0.42;
  const hoopY = top + h * 0.06;

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Court floor */}
      <rect x={left} y={top} width={right - left} height={bottom - top} fill={`url(#${uid}-turf)`} stroke={LINE_STRONG} strokeWidth={3} />
      {/* Half-court arc + line */}
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={LINE_STRONG} strokeWidth={2.5} />
      <path d={`M ${cx - w * 0.12} ${bottom} A ${w * 0.12} ${w * 0.12} 0 0 1 ${cx + w * 0.12} ${bottom}`} stroke={LINE} strokeWidth={2} />
      {/* The key (paint) */}
      <rect x={cx - keyW / 2} y={keyTop} width={keyW} height={keyBottom - keyTop} stroke={LINE} strokeWidth={2} fill="var(--color-surface)" opacity={0.55} />
      {/* Free-throw circle */}
      <path d={`M ${cx - ftR} ${keyBottom} A ${ftR} ${ftR} 0 0 0 ${cx + ftR} ${keyBottom}`} stroke={LINE} strokeWidth={2} />
      <path d={`M ${cx - ftR} ${keyBottom} A ${ftR} ${ftR} 0 0 1 ${cx + ftR} ${keyBottom}`} stroke={LINE} strokeWidth={1.5} strokeDasharray="6 8" opacity={0.6} />
      {/* 3-point line */}
      <line x1={cx - threeR} y1={top} x2={cx - threeR} y2={threeStraightBottom} stroke={ACCENT} strokeWidth={2.5} />
      <line x1={cx + threeR} y1={top} x2={cx + threeR} y2={threeStraightBottom} stroke={ACCENT} strokeWidth={2.5} />
      <path
        d={`M ${cx - threeR} ${threeStraightBottom} A ${threeR} ${threeR} 0 0 0 ${cx + threeR} ${threeStraightBottom}`}
        stroke={ACCENT}
        strokeWidth={2.5}
      />
      {/* Backboard + hoop */}
      <line x1={cx - 30} y1={hoopY - 14} x2={cx + 30} y2={hoopY - 14} stroke={LINE_STRONG} strokeWidth={3} />
      <circle cx={cx} cy={hoopY} r={9} stroke={ACCENT} strokeWidth={2.5} />
      {/* Restricted area */}
      <path d={`M ${cx - 26} ${hoopY} A 26 26 0 0 0 ${cx + 26} ${hoopY}`} stroke={LINE} strokeWidth={1.5} opacity={0.6} />
    </g>
  );
}

// --- Tennis: full court lengthwise, service boxes, net, centre marks. ------
function TennisField({ w, h, uid }: FieldProps) {
  const left = w * 0.08;
  const right = w * 0.92;
  const top = h * 0.05;
  const bottom = h * 0.95;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  // Doubles alley insets → singles sidelines.
  const alley = (right - left) * 0.11;
  const sglLeft = left + alley;
  const sglRight = right - alley;

  // Service lines: a fraction of half-court from the net.
  const halfLen = (bottom - top) / 2;
  const svcTop = cy - halfLen * 0.46;
  const svcBottom = cy + halfLen * 0.46;

  return (
    <g fill="none" strokeLinecap="square">
      {/* Court surface */}
      <rect x={left} y={top} width={right - left} height={bottom - top} fill={`url(#${uid}-turf)`} stroke={LINE_STRONG} strokeWidth={3} />
      {/* Singles sidelines */}
      <line x1={sglLeft} y1={top} x2={sglLeft} y2={bottom} stroke={LINE} strokeWidth={2} />
      <line x1={sglRight} y1={top} x2={sglRight} y2={bottom} stroke={LINE} strokeWidth={2} />
      {/* Service lines (between singles sidelines) */}
      <line x1={sglLeft} y1={svcTop} x2={sglRight} y2={svcTop} stroke={LINE} strokeWidth={2} />
      <line x1={sglLeft} y1={svcBottom} x2={sglRight} y2={svcBottom} stroke={LINE} strokeWidth={2} />
      {/* Centre service line */}
      <line x1={cx} y1={svcTop} x2={cx} y2={svcBottom} stroke={LINE} strokeWidth={2} />
      {/* Centre marks on baselines */}
      <line x1={cx} y1={top} x2={cx} y2={top + 16} stroke={LINE} strokeWidth={2} />
      <line x1={cx} y1={bottom - 16} x2={cx} y2={bottom} stroke={LINE} strokeWidth={2} />
      {/* Net (accent) */}
      <line x1={left - 10} y1={cy} x2={right + 10} y2={cy} stroke={ACCENT} strokeWidth={3} />
      <line x1={left - 10} y1={cy} x2={right + 10} y2={cy} stroke={LINE_STRONG} strokeWidth={1} strokeDasharray="2 5" />
    </g>
  );
}

// --- Soccer: pitch, halfway line, centre circle, penalty + goal areas. -----
function SoccerField({ w, h, uid }: FieldProps) {
  const left = w * 0.04;
  const right = w * 0.96;
  const top = h * 0.06;
  const bottom = h * 0.94;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const fieldH = bottom - top;
  const circleR = w * 0.09;

  // Penalty box: spans ~40% of pitch width, ~16% of length.
  const penH = (right - left) * 0.4;
  const penD = (right - left) * 0.16;
  const goalH = (right - left) * 0.18;
  const goalD = (right - left) * 0.06;

  const penArc = (right - left) * 0.1;

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Turf */}
      <rect x={left} y={top} width={right - left} height={fieldH} fill={`url(#${uid}-turf)`} stroke={LINE_STRONG} strokeWidth={3} />
      {/* Halfway line + centre circle + spot */}
      <line x1={left} y1={cy} x2={right} y2={cy} stroke={LINE} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={circleR} stroke={LINE} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3} fill={LINE_STRONG} />
      {/* Left goal (attacking), accent penalty arc */}
      <PenaltyEnd
        side="left"
        cx={cx}
        edge={left}
        cy={cy}
        penH={penH}
        penD={penD}
        goalH={goalH}
        goalD={goalD}
        penArc={penArc}
        accent
      />
      {/* Right goal */}
      <PenaltyEnd
        side="right"
        cx={cx}
        edge={right}
        cy={cy}
        penH={penH}
        penD={penD}
        goalH={goalH}
        goalD={goalD}
        penArc={penArc}
      />
    </g>
  );
}

// A soccer goal-end cluster (penalty box, goal box, penalty spot + arc).
// `side` controls whether boxes extend right (left end) or left (right end).
function PenaltyEnd({
  side,
  edge,
  cy,
  penH,
  penD,
  goalH,
  goalD,
  penArc,
  accent = false,
}: {
  side: 'left' | 'right';
  cx: number;
  edge: number;
  cy: number;
  penH: number;
  penD: number;
  goalH: number;
  goalD: number;
  penArc: number;
  accent?: boolean;
}) {
  const dir = side === 'left' ? 1 : -1;
  const penX = side === 'left' ? edge : edge - penD;
  const goalX = side === 'left' ? edge : edge - goalD;
  const spotX = edge + dir * penD * 0.66;
  const arcColor = accent ? ACCENT : LINE;

  return (
    <g>
      <rect x={penX} y={cy - penH / 2} width={penD} height={penH} stroke={LINE} strokeWidth={2} />
      <rect x={goalX} y={cy - goalH / 2} width={goalD} height={goalH} stroke={LINE} strokeWidth={2} />
      <circle cx={spotX} cy={cy} r={2.5} fill={LINE_STRONG} />
      {/* Penalty arc, only the portion outside the box shows. */}
      <path
        d={
          side === 'left'
            ? `M ${edge + penD} ${cy - penArc * 0.7} A ${penArc} ${penArc} 0 0 1 ${edge + penD} ${cy + penArc * 0.7}`
            : `M ${edge - penD} ${cy - penArc * 0.7} A ${penArc} ${penArc} 0 0 0 ${edge - penD} ${cy + penArc * 0.7}`
        }
        stroke={arcColor}
        strokeWidth={2}
        opacity={accent ? 0.85 : 1}
      />
      {/* Goal frame accent */}
      <line
        x1={edge}
        y1={cy - goalH / 2}
        x2={edge}
        y2={cy + goalH / 2}
        stroke={accent ? ACCENT : LINE_STRONG}
        strokeWidth={accent ? 3 : 2}
      />
    </g>
  );
}
