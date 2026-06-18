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
//
// Each renderer draws in its pitch's own viewBox pixel units (see geometry.ts
// VIEWBOXES). Proportions are kept close to the real surfaces so each field is
// recognisable at a glance. Lines are crisp (1-1.5px hairlines for inner marks,
// slightly heavier for the outer boundary); a single accent2 hero line per
// sport adds Court Vision colour without clutter.

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
        {/* Soft vignette to lift the playing surface off the page background. */}
        <radialGradient id={`${uid}-turf`} cx="50%" cy="45%" r="78%">
          <stop offset="0%" stopColor="var(--color-surface-alt)" />
          <stop offset="100%" stopColor="var(--color-surface)" />
        </radialGradient>
      </defs>
      <g aria-hidden="true" strokeOpacity={FIELD_STROKE_OPACITY}>{renderField(pitch, view.width, view.height, uid)}</g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Field renderers. Each returns the decorative markings for one PitchType,
// drawn in the pitch's own viewBox pixel units.
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
// SURFACE / SURFACE_ALT, subtle in/out playing-area fills.
// LINE, muted hairline for inner markings; LINE_STRONG, boundary + key lines.
// ACCENT, single Court Vision hero colour per sport.
const SURFACE = 'var(--color-surface)';
const SURFACE_ALT = 'var(--color-surface-alt)';
const LINE = 'var(--color-muted)';
// Field markings use the bright text colour so chalk lines actually read on the
// dark turf (muted was too faint). The whole field group is drawn at reduced
// stroke-opacity (see FIELD_STROKE_OPACITY) so it stays crisp, not harsh.
const LINE_STRONG = 'var(--color-text)';
const ACCENT = 'var(--color-accent2)';
const FIELD_STROKE_OPACITY = 0.7;

// Stroke weights (viewBox units are ~1000-wide, so these read ~1.5-2 device px).
const W_BOUNDARY = 3.4;
const W_KEY = 2.4;
const W_HAIR = 1.8;

interface FieldProps {
  w: number;
  h: number;
  uid: string;
}

// ---------------------------------------------------------------------------
// Baseball: home plate bottom-centre, foul lines up-left/up-right at ~45°,
// infield dirt diamond (1B right, 2B top, 3B left), pitcher's mound centre,
// outfield grass with a smooth fence arc across the top.
// ---------------------------------------------------------------------------
function BaseballField({ w, h, uid }: FieldProps) {
  const homeX = w / 2;
  const homeY = h * 0.9; // home plate near the bottom
  const baseSpan = w * 0.27; // half-diagonal of the infield diamond (home→2B = 2x)

  const second = { x: homeX, y: homeY - baseSpan * 2 };
  const first = { x: homeX + baseSpan, y: homeY - baseSpan };
  const third = { x: homeX - baseSpan, y: homeY - baseSpan };
  const mound = { x: homeX, y: homeY - baseSpan * 1.0 }; // centre of the diamond

  // Foul lines run at 45° up-left and up-right from home; the fence is a smooth
  // arc centred on home, joining the two foul poles.
  const SIN45 = Math.SQRT1_2; // √2/2
  const fenceR = baseSpan * 3.05;
  const foulRightX = homeX + fenceR * SIN45;
  const foulLeftX = homeX - fenceR * SIN45;
  const foulY = homeY - fenceR * SIN45;

  return (
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      {/* Fair territory: outfield grass wedge (home → foul poles → fence arc). */}
      <path
        d={`M ${homeX} ${homeY} L ${foulRightX} ${foulY} A ${fenceR} ${fenceR} 0 0 0 ${foulLeftX} ${foulY} Z`}
        fill={`url(#${uid}-turf)`}
        stroke={LINE}
        strokeWidth={W_KEY}
      />
      {/* Infield dirt: square spanning the basepaths, sitting on home plate. */}
      <polygon
        points={`${homeX},${homeY} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y}`}
        fill={SURFACE_ALT}
        stroke={LINE_STRONG}
        strokeWidth={W_KEY}
      />
      {/* Grass infield cut-out (the curved edge behind the basepaths). */}
      <path
        d={`M ${third.x} ${third.y} A ${baseSpan * 1.5} ${baseSpan * 1.5} 0 0 0 ${first.x} ${first.y}`}
        fill={`url(#${uid}-turf)`}
        stroke="none"
      />
      {/* Basepaths (diamond outline drawn over the cut-out). */}
      <polygon
        points={`${homeX},${homeY} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y}`}
        fill="none"
        stroke={LINE_STRONG}
        strokeWidth={W_KEY}
      />
      {/* Foul lines (the chalk lines down each line, accent hero colour). */}
      <line x1={homeX} y1={homeY} x2={foulRightX} y2={foulY} stroke={ACCENT} strokeWidth={W_KEY} />
      <line x1={homeX} y1={homeY} x2={foulLeftX} y2={foulY} stroke={ACCENT} strokeWidth={W_KEY} />
      {/* Bases: 1B, 2B, 3B as small rotated squares. */}
      {[first, second, third].map((b, i) => (
        <rect
          key={i}
          x={b.x - 9}
          y={b.y - 9}
          width={18}
          height={18}
          transform={`rotate(45 ${b.x} ${b.y})`}
          fill={SURFACE}
          stroke={LINE_STRONG}
          strokeWidth={W_HAIR}
        />
      ))}
      {/* Pitcher's mound at the centre of the diamond. */}
      <circle cx={mound.x} cy={mound.y} r={16} fill={SURFACE} stroke={LINE_STRONG} strokeWidth={W_HAIR} />
      <rect x={mound.x - 4} y={mound.y - 2} width={8} height={4} fill={LINE_STRONG} />
      {/* Home plate (pentagon). */}
      <path
        d={`M ${homeX - 11} ${homeY - 7} L ${homeX + 11} ${homeY - 7} L ${homeX + 11} ${homeY + 2} L ${homeX} ${homeY + 12} L ${homeX - 11} ${homeY + 2} Z`}
        fill={LINE_STRONG}
        stroke={LINE_STRONG}
        strokeWidth={W_HAIR}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// AFL: a true oval filling the frame, centre square + centre circle, two 50m
// arcs (top & bottom), and 4 goal/behind posts at each end. Attacks vertically.
// ---------------------------------------------------------------------------
function AflField({ w, h, uid }: FieldProps) {
  const cx = w / 2;
  const cy = h / 2;
  // Leave a margin top & bottom so the goal posts (which poke OUTSIDE the goal
  // line) render inside the viewBox instead of being clipped.
  const rx = w * 0.46;
  const ry = h * 0.42;
  const sq = w * 0.1; // half the centre square (real square ≈ 50m on a ~165m ground)
  const innerR = w * 0.055; // centre circle (outer of the two real circles)
  const innerR2 = w * 0.03;

  // 50m arcs sit a fixed distance in front of each goal line, bowing toward the
  // centre. Drawn as a quadratic curve whose endpoints sit near the goal line.
  const goalTopY = cy - ry;
  const goalBottomY = cy + ry;
  const arcHalfW = rx * 0.62; // half-width of each 50m arc's chord
  const arcDepth = ry * 0.3; // how far the arc bows in from the goal line

  // Post spacing: 4 posts (2 tall goal, 2 shorter behind) straddling the goal
  // mouth. Posts poke OUTWARD from the goal line (behind the goal).
  const goalGap = w * 0.05; // between the two inner goal posts
  const behindGap = w * 0.135; // between the two outer behind posts
  const goalPostLen = h * 0.075;
  const behindPostLen = h * 0.055;

  const posts = (yLine: number, dir: 1 | -1) => {
    const xs = [-behindGap, -goalGap, goalGap, behindGap].map((d) => cx + d);
    return xs.map((x, i) => {
      const isGoal = i === 1 || i === 2;
      const len = isGoal ? goalPostLen : behindPostLen;
      return (
        <line
          key={i}
          x1={x}
          y1={yLine}
          x2={x}
          y2={yLine - dir * len}
          stroke={isGoal ? ACCENT : LINE_STRONG}
          strokeWidth={isGoal ? 5 : 3}
          strokeOpacity={isGoal ? 1 : 0.9}
          strokeLinecap="round"
        />
      );
    });
  };

  return (
    <g fill="none" strokeLinecap="round">
      {/* Turf oval + boundary line. */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-turf)`} stroke={LINE_STRONG} strokeWidth={W_BOUNDARY} />
      {/* Centre square. */}
      <rect x={cx - sq} y={cy - sq} width={sq * 2} height={sq * 2} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      {/* Centre circle (double) + centre line. */}
      <circle cx={cx} cy={cy} r={innerR} stroke={LINE_STRONG} strokeWidth={W_HAIR} />
      <circle cx={cx} cy={cy} r={innerR2} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <line x1={cx - innerR} y1={cy} x2={cx + innerR} y2={cy} stroke={LINE_STRONG} strokeWidth={W_HAIR} />
      {/* 50m arc, forward (top) end. Endpoints on the goal line, bowing inward. */}
      <path
        d={`M ${cx - arcHalfW} ${goalTopY + ry * 0.05} Q ${cx} ${goalTopY + arcDepth} ${cx + arcHalfW} ${goalTopY + ry * 0.05}`}
        stroke={LINE_STRONG}
        strokeWidth={W_KEY}
      />
      {/* 50m arc, back (bottom) end. */}
      <path
        d={`M ${cx - arcHalfW} ${goalBottomY - ry * 0.05} Q ${cx} ${goalBottomY - arcDepth} ${cx + arcHalfW} ${goalBottomY - ry * 0.05}`}
        stroke={LINE_STRONG}
        strokeWidth={W_KEY}
      />
      {/* Goal/behind posts at both ends (top is the attacking end → accent). */}
      {posts(goalTopY, 1)}
      {posts(goalBottomY, -1)}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Basketball half-court: baseline at the bottom with backboard + rim, painted
// key/lane + free-throw circle (dashed back half), restricted-area arc under
// the rim, three-point line (straight corners then arc), and the half centre-
// circle arc at the top (the half-court line).
// ---------------------------------------------------------------------------
function BasketballField({ w, h, uid }: FieldProps) {
  const left = w * 0.06;
  const right = w * 0.94;
  const top = h * 0.04; // half-court line near the top
  const baseline = h * 0.94; // baseline / endline near the bottom
  const cx = w / 2;

  // The key (lane): 16ft wide, free-throw line 19ft from baseline. Scale to
  // the drawn court (≈ 50ft x 47ft → court width = right-left, depth baseline-top).
  const courtW = right - left;
  const courtD = baseline - top;
  const keyW = courtW * 0.36;
  const ftLineY = baseline - courtD * 0.4; // free-throw line
  const ftR = keyW / 2;

  // Hoop / backboard sit just inside the baseline.
  const backboardY = baseline - courtD * 0.06;
  const hoopY = backboardY + 14;
  const restrictedR = courtW * 0.085;

  // Three-point line: straight segments in the corners, then a top arc.
  const cornerInset = courtW * 0.05;
  const tpLeft = left + cornerInset;
  const tpRight = right - cornerInset;
  const cornerStraightY = baseline - courtD * 0.18; // where corners meet the arc
  const tpR = courtW * 0.46;

  // Half-court circle (only the lower half shows on the floor).
  const centreR = courtW * 0.12;

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Court floor. */}
      <rect x={left} y={top} width={courtW} height={courtD} fill={`url(#${uid}-turf)`} stroke={LINE_STRONG} strokeWidth={W_BOUNDARY} />
      {/* Half-court line (top) + half centre circle bowing down into play. */}
      <line x1={left} y1={top} x2={right} y2={top} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <path d={`M ${cx - centreR} ${top} A ${centreR} ${centreR} 0 0 0 ${cx + centreR} ${top}`} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      {/* Painted key / lane. */}
      <rect
        x={cx - keyW / 2}
        y={ftLineY}
        width={keyW}
        height={baseline - ftLineY}
        fill={SURFACE_ALT}
        stroke={LINE_STRONG}
        strokeWidth={W_KEY}
      />
      {/* Free-throw circle: solid front half (toward baseline), dashed back half. */}
      <path d={`M ${cx - ftR} ${ftLineY} A ${ftR} ${ftR} 0 0 0 ${cx + ftR} ${ftLineY}`} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <path
        d={`M ${cx - ftR} ${ftLineY} A ${ftR} ${ftR} 0 0 1 ${cx + ftR} ${ftLineY}`}
        stroke={LINE_STRONG}
        strokeWidth={W_HAIR}
        strokeDasharray="7 8"
      />
      {/* Three-point line: corners straight, then the arc up top. */}
      <line x1={tpLeft} y1={baseline} x2={tpLeft} y2={cornerStraightY} stroke={ACCENT} strokeWidth={W_KEY} />
      <line x1={tpRight} y1={baseline} x2={tpRight} y2={cornerStraightY} stroke={ACCENT} strokeWidth={W_KEY} />
      <path
        d={`M ${tpLeft} ${cornerStraightY} A ${tpR} ${tpR} 0 0 1 ${tpRight} ${cornerStraightY}`}
        stroke={ACCENT}
        strokeWidth={W_KEY}
      />
      {/* Restricted-area arc under the rim. */}
      <path
        d={`M ${cx - restrictedR} ${hoopY} A ${restrictedR} ${restrictedR} 0 0 1 ${cx + restrictedR} ${hoopY}`}
        stroke={LINE_STRONG}
        strokeWidth={W_HAIR}
      />
      {/* Backboard + rim, just inside the baseline. */}
      <line x1={cx - 32} y1={backboardY} x2={cx + 32} y2={backboardY} stroke={LINE_STRONG} strokeWidth={W_BOUNDARY} />
      <line x1={cx} y1={backboardY} x2={cx} y2={hoopY - 9} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <circle cx={cx} cy={hoopY} r={9} stroke={ACCENT} strokeWidth={W_KEY} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Tennis: full doubles court top-down. Doubles outer lines, singles sidelines,
// baselines top & bottom, net across the middle (dashed), service lines +
// service boxes split by the centre service line into deuce/ad, centre marks.
// ---------------------------------------------------------------------------
function TennisField({ w, h, uid }: FieldProps) {
  // Real doubles court is 36ft x 78ft (1 : 2.17). Derive the court height from
  // the available frame height (with margin) and the width from the true 36:78
  // ratio, so the court always fits inside the viewBox and stays in proportion.
  const top = h * 0.05;
  const bottom = h * 0.95;
  const courtH = bottom - top;
  const courtW = courtH * (36 / 78); // keep true 36:78 proportion
  const left = (w - courtW) / 2;
  const right = left + courtW;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2; // the net

  // Doubles alleys: singles court is 27ft of the 36ft width → alley = 4.5ft each.
  const alley = courtW * (4.5 / 36);
  const sglLeft = left + alley;
  const sglRight = right - alley;

  // Service line is 21ft from the net (net→baseline = 39ft).
  const svcOffset = (courtH / 2) * (21 / 39);
  const svcTop = cy - svcOffset;
  const svcBottom = cy + svcOffset;

  const mark = courtH * 0.018; // centre mark stub length

  return (
    <g fill="none" strokeLinecap="square">
      {/* Court surface + doubles boundary. */}
      <rect x={left} y={top} width={courtW} height={courtH} fill={`url(#${uid}-turf)`} stroke={LINE_STRONG} strokeWidth={W_BOUNDARY} />
      {/* Singles sidelines. */}
      <line x1={sglLeft} y1={top} x2={sglLeft} y2={bottom} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <line x1={sglRight} y1={top} x2={sglRight} y2={bottom} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      {/* Service lines (run only between the singles sidelines). */}
      <line x1={sglLeft} y1={svcTop} x2={sglRight} y2={svcTop} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <line x1={sglLeft} y1={svcBottom} x2={sglRight} y2={svcBottom} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      {/* Centre service line: splits each half into deuce / ad boxes. */}
      <line x1={cx} y1={svcTop} x2={cx} y2={svcBottom} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      {/* Centre marks on each baseline. */}
      <line x1={cx} y1={top} x2={cx} y2={top + mark} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <line x1={cx} y1={bottom - mark} x2={cx} y2={bottom} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      {/* Net across the middle (hero accent, dashed) + posts overhanging. */}
      <line x1={left - w * 0.04} y1={cy} x2={right + w * 0.04} y2={cy} stroke={ACCENT} strokeWidth={W_KEY} strokeDasharray="9 6" />
      <line x1={left - w * 0.04} y1={cy - 6} x2={left - w * 0.04} y2={cy + 6} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <line x1={right + w * 0.04} y1={cy - 6} x2={right + w * 0.04} y2={cy + 6} stroke={LINE_STRONG} strokeWidth={W_KEY} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Soccer: full pitch top-down, attacking vertically. Touchlines + goal lines,
// halfway line, centre circle + spot, both penalty boxes + 6-yard goal areas +
// penalty spots + penalty arcs (the D), corner arcs, and goals at both ends.
// ---------------------------------------------------------------------------
function SoccerField({ w, h, uid }: FieldProps) {
  const left = w * 0.07;
  const right = w * 0.93;
  const top = h * 0.04;
  const bottom = h * 0.96;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const pitchW = right - left;
  const pitchH = bottom - top;
  const centreR = pitchW * 0.16;

  // Penalty area: 44yd wide x 18yd deep on a 68m x 105m pitch.
  const penW = pitchW * 0.58;
  const penD = pitchH * 0.16;
  // Goal area (6-yard box): 20yd wide x 6yd deep.
  const goalAreaW = pitchW * 0.28;
  const goalAreaD = pitchH * 0.06;
  // Penalty spot 12yd from goal; arc radius 10yd centred on the spot.
  const spotOffset = pitchH * 0.105;
  const penArcR = pitchW * 0.13;
  // Goal mouth + net depth poking outside the goal line.
  const goalW = pitchW * 0.16;
  const goalDepth = pitchH * 0.02;
  const cornerR = pitchW * 0.035;

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Turf + touchlines / goal lines. */}
      <rect x={left} y={top} width={pitchW} height={pitchH} fill={`url(#${uid}-turf)`} stroke={LINE_STRONG} strokeWidth={W_BOUNDARY} />
      {/* Halfway line, centre circle + spot. */}
      <line x1={left} y1={cy} x2={right} y2={cy} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <circle cx={cx} cy={cy} r={centreR} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      <circle cx={cx} cy={cy} r={3} fill={LINE_STRONG} />
      {/* Corner arcs (all four corners). */}
      <path d={`M ${left + cornerR} ${top} A ${cornerR} ${cornerR} 0 0 0 ${left} ${top + cornerR}`} stroke={LINE_STRONG} strokeWidth={W_HAIR} />
      <path d={`M ${right - cornerR} ${top} A ${cornerR} ${cornerR} 0 0 1 ${right} ${top + cornerR}`} stroke={LINE_STRONG} strokeWidth={W_HAIR} />
      <path d={`M ${left} ${bottom - cornerR} A ${cornerR} ${cornerR} 0 0 0 ${left + cornerR} ${bottom}`} stroke={LINE_STRONG} strokeWidth={W_HAIR} />
      <path d={`M ${right} ${bottom - cornerR} A ${cornerR} ${cornerR} 0 0 1 ${right - cornerR} ${bottom}`} stroke={LINE_STRONG} strokeWidth={W_HAIR} />
      {/* Top goal end (attacking end → accent goal). */}
      <GoalEnd
        cx={cx}
        line={top}
        dir={1}
        penW={penW}
        penD={penD}
        goalAreaW={goalAreaW}
        goalAreaD={goalAreaD}
        spotOffset={spotOffset}
        penArcR={penArcR}
        goalW={goalW}
        goalDepth={goalDepth}
        accent
      />
      {/* Bottom goal end. */}
      <GoalEnd
        cx={cx}
        line={bottom}
        dir={-1}
        penW={penW}
        penD={penD}
        goalAreaW={goalAreaW}
        goalAreaD={goalAreaD}
        spotOffset={spotOffset}
        penArcR={penArcR}
        goalW={goalW}
        goalDepth={goalDepth}
      />
    </g>
  );
}

// A soccer goal-end cluster (penalty area, 6-yard box, penalty spot + arc/D,
// and the goal frame). `dir` = +1 for the top end (boxes extend downward into
// the pitch), -1 for the bottom end (boxes extend upward).
function GoalEnd({
  cx,
  line,
  dir,
  penW,
  penD,
  goalAreaW,
  goalAreaD,
  spotOffset,
  penArcR,
  goalW,
  goalDepth,
  accent = false,
}: {
  cx: number;
  line: number;
  dir: 1 | -1;
  penW: number;
  penD: number;
  goalAreaW: number;
  goalAreaD: number;
  spotOffset: number;
  penArcR: number;
  goalW: number;
  goalDepth: number;
  accent?: boolean;
}) {
  // Box rects are drawn from the goal line inward by `dir`.
  const penY = dir === 1 ? line : line - penD;
  const gaY = dir === 1 ? line : line - goalAreaD;
  const spotY = line + dir * spotOffset;
  const penEdge = line + dir * penD; // inner edge of the penalty area
  const goalFrame = accent ? ACCENT : LINE_STRONG;

  // Penalty arc (the D): only the part outside the penalty box is visible.
  // Centred on the penalty spot, joining the box edge symmetrically.
  const dx = penArcR * 0.78;
  const arcLeftX = cx - dx;
  const arcRightX = cx + dx;
  const sweep = dir === 1 ? 1 : 0;

  return (
    <g>
      {/* Penalty area. */}
      <rect x={cx - penW / 2} y={penY} width={penW} height={penD} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      {/* 6-yard goal area. */}
      <rect x={cx - goalAreaW / 2} y={gaY} width={goalAreaW} height={goalAreaD} stroke={LINE_STRONG} strokeWidth={W_KEY} />
      {/* Penalty spot. */}
      <circle cx={cx} cy={spotY} r={2.5} fill={LINE_STRONG} />
      {/* Penalty arc / D, bows away from the goal, outside the box. */}
      <path
        d={`M ${arcLeftX} ${penEdge} A ${penArcR} ${penArcR} 0 0 ${sweep} ${arcRightX} ${penEdge}`}
        stroke={accent ? ACCENT : LINE_STRONG}
        strokeWidth={W_KEY}
      />
      {/* Goal frame poking outside the goal line. */}
      <rect
        x={cx - goalW / 2}
        y={dir === 1 ? line - goalDepth : line}
        width={goalW}
        height={goalDepth}
        fill={SURFACE_ALT}
        stroke={goalFrame}
        strokeWidth={accent ? W_BOUNDARY : W_KEY}
      />
    </g>
  );
}
