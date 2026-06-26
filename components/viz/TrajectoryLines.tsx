'use client';

// Stats Empire, TrajectoryLines
//
// Draws smooth, curved, *directional* paths between sequences of points:
// baseball hit arcs, American football pass/run lines, basketball drives, tennis
// rallies, soccer pass-network edges. Each play reads on its own:
//   - COLOUR ENCODES THE PLAY `kind` (NOT outcome sentiment). The distinct
//     sport-specific kinds present (tennis "Forehand winner / Serve / Volley",
//     soccer "Pass / Through ball / Cross", football "Deep pass / Sack / Run",
//     etc.) are each assigned one stable, visually-distinct hue from a
//     theme-harmonized categorical palette. A line, its arrowhead, its origin
//     dot and its legend swatch all share that one colour, so you can tell every
//     kind apart at a glance.
//   - a hollow ORIGIN dot marks where the play starts and a triangular
//     ARROWHEAD marks where it ends, so direction is unambiguous,
//   - `intensity` drives stroke weight + opacity so volume/quality read at a
//     glance.
//
// INTERACTIVE LEGEND: the legend rows are real, keyboard-accessible toggle
// buttons (role="checkbox" / aria-checked). Every kind is ON by default.
// Clicking a kind toggles ONLY that kind, so the viewer can isolate one play
// type ("Forehand winner") or select several to compare; de-selected kinds dim
// right out. An "All" control resets to everything on, and is also offered as a
// "Show only X" affordance whenever exactly one kind is left active. Hovering a
// legend row (or a line) highlights that kind and surfaces its label.
//
// d3 generates the path `d` strings (line + curve); React renders them. When
// `animate` is on AND the chart scrolls into view, framer-motion traces each
// stroke ON in sequence (staggered) with a bright travelling head riding the
// leading edge. Lines ALWAYS settle fully visible (the draw-on only animates
// pathLength/opacity in, never out). Reduced-motion-safe: prefers-reduced-motion
// renders everything fully drawn with no animation and no head.

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { line, curveCatmullRom } from 'd3-shape';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { Outcome, PitchType, TrajectoryPath } from '@/lib/types';
import { makeProjector, projectPoints, viewBoxAttr } from './geometry';

/** Which corner the interactive legend docks to, so it never covers the plays. */
export type LegendPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface TrajectoryLinesProps {
  /** Paths as ordered point lists in normalized 0..1 space. */
  paths: TrajectoryPath[];
  /** Pitch whose coordinate space the paths live in. */
  pitch: PitchType;
  /** Run a draw-on stroke animation (reduced-motion safe). Default false. */
  animate?: boolean;
  /**
   * Corner the legend docks to. A translucent panel in the chosen corner keeps
   * the legend out of the way of the drawn paths. Default 'top-left' (back-
   * compat with existing consumers).
   */
  legendPlacement?: LegendPlacement;
  /**
   * When true the legend can be collapsed to a single compact chip (so it never
   * obscures the field) and expanded on demand. Default false (always expanded).
   */
  legendCollapsible?: boolean;
  /** Optional extra classes for the <svg>. */
  className?: string;
}

// --- Categorical palette -----------------------------------------------------
//
// A fixed, deterministic set of ~10 visually distinct hues, ordered so adjacent
// kinds never read as the same colour. Tuned to sit on the dark Court Vision
// backgrounds (all themes use a near-black bg) with enough saturation/lightness
// to stay legible against the pitch and against each other. Hues are spaced
// around the wheel (lime, cyan, sky, violet, magenta, amber, orange, teal,
// warm-red, green) so even 8+ kinds in one sport stay tellable apart.
//
// The FIRST slot uses the live theme accent so the chart always feels keyed to
// the active theme; the rest are explicit hex so they never collapse onto each
// other when a theme swaps its accents.
const PALETTE: readonly string[] = [
  'var(--color-accent1)', // theme primary (lime / lime / green)
  '#22d3ee', // cyan
  '#60a5fa', // sky blue
  '#a78bfa', // violet
  '#f472b6', // magenta / pink
  '#fbbf24', // amber
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#f87171', // warm red
  '#4ade80', // green
];

// Sanitize a kind label into an id-safe token for marker/def ids + React keys.
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'kind';
}

// Plain-language fallback labels when a path has no `kind`, bucketed by outcome
// so the legend still reads in words rather than blanks. Used only as a last
// resort; real fixtures carry sport-specific `kind`s.
function fallbackKind(outcome: Outcome | undefined): string {
  switch (outcome) {
    case 'winner':
      return 'Scoring play';
    case 'make':
      return 'Completed';
    case 'miss':
      return 'Missed';
    case 'error':
      return 'Error';
    default:
      return 'Other';
  }
}

// A legend row: one distinct `kind` present in the data, with its assigned
// categorical colour. `key` is stable per kind (slug + index) for React keys and
// marker ids; `kind` is the toggle identity used by the selection set.
interface LegendEntry {
  key: string;
  /** The exact kind string, used both as the displayed label and toggle id. */
  kind: string;
  color: string;
  /** How many paths carry this kind (shown as a small count chip). */
  count: number;
}

// Build the legend from the distinct `kind` values actually present, in first-
// seen order, and assign each one the next palette colour. A path with no `kind`
// falls back to an outcome-bucket word so it still groups + colours sensibly.
// Colour is keyed off the kind's first-seen position, so it is deterministic and
// stable for a given data set (re-render safe, SSR safe).
function buildLegend(paths: TrajectoryPath[]): LegendEntry[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const p of paths) {
    const kind = p.kind?.trim() || fallbackKind(p.outcome);
    if (!counts.has(kind)) order.push(kind);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return order.map((kind, i) => ({
    key: `${slug(kind)}-${i}`,
    kind,
    color: PALETTE[i % PALETTE.length],
    count: counts.get(kind) ?? 0,
  }));
}

export default function TrajectoryLines({
  paths,
  pitch,
  animate = false,
  legendPlacement = 'top-left',
  legendCollapsible = false,
  className,
}: TrajectoryLinesProps) {
  const proj = useMemo(() => makeProjector(pitch), [pitch]);
  const prefersReduced = useReducedMotion();
  // Draw-on fires when the chart is requested to animate AND has scrolled into
  // view, once. Reduced motion disables it entirely (paths render fully drawn).
  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px -12% 0px' });
  const shouldAnimate = animate && inView && !prefersReduced;
  // Unique per-instance prefix so marker / def ids never collide when several
  // TrajectoryLines render on one page (Hero + ReportBento + Freemium).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const glowId = `tl-glow-${uid}`;

  // Legend derived from the distinct sport-specific `kind` values present, each
  // mapped to one stable categorical colour. Drives the lines' colour, the
  // arrowhead markers, and the interactive toggle UI.
  const legend = useMemo(() => buildLegend(paths), [paths]);
  // kind -> legend entry, so each path resolves its colour + arrowhead.
  const legendByKind = useMemo(() => {
    const m = new Map<string, LegendEntry>();
    for (const e of legend) m.set(e.kind, e);
    return m;
  }, [legend]);

  // --- Interactive selection ---------------------------------------------------
  // `selected` holds the kinds currently switched ON. `null` means "all on"
  // (the default and reset state), so we never have to enumerate every kind up
  // front and selection survives data changes gracefully. A kind is visible iff
  // selection is null OR the set contains it.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  // The kind currently hovered/focused (line or legend row), for the highlight
  // state. null = nothing hovered.
  const [hovered, setHovered] = useState<string | null>(null);
  // Collapsed legend state (only meaningful when `legendCollapsible`). Collapsed
  // shrinks the panel to a single compact chip so the field is fully clear.
  const [legendCollapsed, setLegendCollapsed] = useState(false);

  const isOn = useCallback(
    (kind: string) => selected === null || selected.has(kind),
    [selected],
  );

  // Toggle ONE kind on/off. Starting from "all on", the first click isolates the
  // behaviour the user expects: clicking a kind turns just that one off (the rest
  // stay on). Clicking it again turns it back on. We materialize the full set on
  // first interaction so subsequent toggles are pure add/remove.
  const toggle = useCallback(
    (kind: string) => {
      setSelected((prev) => {
        const base = prev ?? new Set(legend.map((e) => e.kind));
        const next = new Set(base);
        if (next.has(kind)) next.delete(kind);
        else next.add(kind);
        // If everything ends up on again, collapse back to the "all" sentinel.
        if (next.size === legend.length) return null;
        // Never allow an empty selection (nothing visible is a dead end); a click
        // that would clear the last kind instead isolates that kind.
        if (next.size === 0) return new Set([kind]);
        return next;
      });
    },
    [legend],
  );

  // "Show only this kind" / "Show all" affordance per row: clicking the count
  // chip isolates that kind; if it is already the sole active kind, it resets.
  const isolate = useCallback(
    (kind: string) => {
      setSelected((prev) => {
        if (prev && prev.size === 1 && prev.has(kind)) return null; // reset
        return new Set([kind]);
      });
    },
    [],
  );

  const resetAll = useCallback(() => setSelected(null), []);
  const allOn = selected === null;

  const { lines, view } = useMemo(() => {
    const v = proj.view;
    if (paths.length === 0) return { lines: [] as BuiltLine[], view: v };
    // Catmull-Rom passes through every point with gentle curvature → reads as a
    // natural flight/run path rather than straight segments.
    const gen = line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveCatmullRom.alpha(0.6));

    const built: BuiltLine[] = paths.map((p, i) => {
      const pts = projectPoints(proj, p.points);
      const d = gen(pts) ?? '';
      const intensity = clampUnit(p.intensity ?? 0.6);
      const first = pts[0];
      const last = pts[pts.length - 1];
      const kind = p.kind?.trim() || fallbackKind(p.outcome);
      const entry = legendByKind.get(kind);
      const color = entry?.color ?? PALETTE[0];
      const markerKey = entry?.key ?? slug(kind);
      // Orientation of the final segment, to seat/orient nothing extra but keep
      // the arrowhead direction implicit in the path (markerEnd uses auto).
      const prev = pts[pts.length - 2] ?? first;
      const angle = last && prev ? Math.atan2(last[1] - prev[1], last[0] - prev[0]) : 0;
      return {
        id: p.id ?? `traj-${i}`,
        label: p.label ?? kind,
        kind,
        d,
        markerKey,
        color,
        // Map intensity → stroke weight (1.4..4.6) and opacity (0.45..0.96).
        width: 1.4 + intensity * 3.2,
        baseOpacity: 0.45 + intensity * 0.51,
        intensity,
        start: first,
        end: last,
        angle,
      };
    });
    return { lines: built, view: v };
  }, [paths, proj, legendByKind]);

  // Stagger animation start so paths trace in sequence, not all at once.
  const stagger = 0.1;
  const drawDur = 0.8;

  const { width: vw, height: vh } = view;
  // Geometry scale: most viewBoxes are ~1000 wide; tennis is 540. Derive sizes
  // from the smaller axis so dots/markers stay proportional per pitch.
  const unit = Math.min(vw, vh) / 1000;
  const originR = 7 * unit;
  const headR = 5.5 * unit;

  // Accessible summary: which kinds are present and how many of each, plus the
  // current selection, so screen readers get the gist + interactive state.
  const ariaLabel = useMemo(() => {
    const parts = legend.map((e) => `${e.count} ${e.kind}`);
    const sel = allOn
      ? 'all kinds shown'
      : `showing ${legend.filter((e) => isOn(e.kind)).map((e) => e.kind).join(', ') || 'none'}`;
    return `Trajectory lines: ${paths.length} plays across ${legend.length} kinds (${parts.join(
      ', ',
    )}). ${sel}. Use the legend to toggle kinds.`;
  }, [legend, paths.length, allOn, isOn]);

  // --- Interactive legend geometry (HTML overlay via foreignObject) ------------
  // Rendering the legend as real HTML <button>s inside a <foreignObject> keeps
  // it locked to the field coordinate space (so it aligns across every consumer
  // exactly like the old in-SVG legend) while giving native focus, keyboard and
  // ARIA semantics that an <svg>-only control can't.
  //
  // READABILITY: a foreignObject's CSS px are SVG USER units, so they get scaled
  // DOWN by preserveAspectRatio when the ~1000-unit viewBox is fit into a small
  // tile (typically 2-3x downscale). The old `Math.max(13, 26*unit)` therefore
  // rendered genuinely tiny on screen. We instead size the legend as a fixed
  // FRACTION of the viewBox width, so it stays a consistent, comfortably-readable
  // share of the rendered tile on every pitch regardless of how far it downscales.
  // ~3.4% of width lands near a real ~14-16px once the tile is laid out, with a
  // generous floor so even a tightly-capped box never collapses to micro-type.
  const legendFont = Math.max(28, vw * 0.034);
  const foPad = legendFont * 0.5;

  return (
    <svg
      ref={ref}
      viewBox={viewBoxAttr(pitch)}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        {/* Coloured glow so a stroke lifts off the pitch like a broadcast graphic.
            Kept subtle (small blur, partial opacity) so it reads premium, not neon. */}
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={2.2 * unit} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* One arrowhead marker per legend kind, baked in that kind's colour.
            `context-stroke` would be ideal but isn't universal, so we reference
            the matching marker per path by its legend key. */}
        {legend.map((e) => (
          <marker
            key={e.key}
            id={`${uid}-arrow-${e.key}`}
            viewBox="0 0 10 10"
            refX="7.5"
            refY="5"
            markerWidth="6.5"
            markerHeight="6.5"
            orient="auto-start-reverse"
            markerUnits="strokeWidth"
          >
            <path d="M0.5,0.6 L9.2,5 L0.5,9.4 L3,5 Z" fill={e.color} />
          </marker>
        ))}
      </defs>

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* WHOLE-PLAY GROUPS. Each play (its dark casing, its coloured line WITH
            the directional arrowhead marker, its travelling head, and its hollow
            origin dot) lives inside ONE <g> whose opacity is React-controlled
            from the selection + hover state. Putting the toggle opacity on the
            GROUP, not the individual elements, is what makes on/off unmistakable:
            the arrowhead marker is part of this subtree, so it dims together with
            its line and dot as a single unit (markerEnd does not reliably inherit
            a sibling path's own opacity across browsers, but it DOES fade with an
            ancestor <g opacity>). framer only ever animates pathLength / the head
            offset / the dot pop scale, never opacity, so a finished WAAPI run can
            never stomp the inline group opacity. */}
        {lines.map((l, i) => {
          const on = isOn(l.kind);
          const isHot = hovered === l.kind;
          const anyHover = hovered !== null;
          // Per-PLAY opacity (drives the whole group incl. the arrowhead):
          //  - OFF  → decisively faint (0.06) so on/off is obvious at a glance.
          //  - ON, something else hovered → softly muted (0.34) to push it back.
          //  - ON + hovered, or ON + nothing hovered → full strength.
          const groupOpacity = !on ? 0.06 : anyHover && !isHot ? 0.34 : 1;
          // Within an ON play we still let intensity read via per-stroke opacity,
          // but the GROUP opacity is what the toggle drives. Hover bumps weight.
          const lineOpacity = l.baseOpacity;
          const casingOpacity = 0.55;
          const dotOpacity = isHot ? 1 : Math.max(l.baseOpacity, 0.7);
          const restWidth = isHot && on ? l.width + 1.4 * unit : l.width;
          const casingWidth = l.width + 2.4 * unit;
          return (
            <g
              key={l.id}
              // The single source of truth for show/hide. Inline style (not a
              // framer target) so the toggle always wins over any finished anim.
              // A toggled-OFF play also stops capturing pointer events so its
              // faint ghost never intercepts hovers meant for the visible plays.
              style={{
                opacity: groupOpacity,
                transition: 'opacity 0.25s ease',
                pointerEvents: on ? 'auto' : 'none',
              }}
              onMouseEnter={() => setHovered(l.kind)}
              onMouseLeave={() => setHovered((h) => (h === l.kind ? null : h))}
            >
              {/* Dark casing: a slightly wider bg-coloured line so distinct-colour
                  paths stay crisp where they cross. */}
              {shouldAnimate ? (
                <motion.path
                  d={l.d}
                  stroke="var(--color-bg)"
                  strokeWidth={casingWidth}
                  strokeOpacity={casingOpacity}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    pathLength: { duration: drawDur, ease: 'easeInOut', delay: i * stagger },
                  }}
                />
              ) : (
                <path
                  d={l.d}
                  stroke="var(--color-bg)"
                  strokeWidth={casingWidth}
                  strokeOpacity={casingOpacity}
                />
              )}

              {/* Coloured line in the kind colour, carrying the matching
                  directional arrowhead via markerEnd. Because the arrowhead is a
                  child of this group, it dims with the line when toggled OFF. */}
              {shouldAnimate ? (
                <motion.path
                  d={l.d}
                  stroke={l.color}
                  strokeWidth={restWidth}
                  strokeOpacity={lineOpacity}
                  filter={`url(#${glowId})`}
                  markerEnd={`url(#${uid}-arrow-${l.markerKey})`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    pathLength: { duration: drawDur, ease: 'easeInOut', delay: i * stagger },
                    strokeWidth: { duration: 0.18 },
                  }}
                  style={{ cursor: 'pointer', transition: 'stroke-width 0.18s ease' }}
                />
              ) : (
                <path
                  d={l.d}
                  stroke={l.color}
                  strokeWidth={restWidth}
                  strokeOpacity={lineOpacity}
                  filter={`url(#${glowId})`}
                  markerEnd={`url(#${uid}-arrow-${l.markerKey})`}
                  style={{ cursor: 'pointer', transition: 'stroke-width 0.18s ease' }}
                />
              )}

              {/* Travelling head: a bright dot rides the leading edge as the
                  stroke draws on, then fades. Animation only. */}
              {shouldAnimate && l.d ? (
                <motion.circle
                  r={headR}
                  cx={0}
                  cy={0}
                  fill={l.color}
                  filter={`url(#${glowId})`}
                  initial={{ opacity: 0, offsetDistance: '0%' }}
                  animate={{ opacity: [0, 1, 1, 0], offsetDistance: '100%' }}
                  transition={{
                    offsetDistance: { duration: drawDur, ease: 'easeInOut', delay: i * stagger },
                    opacity: {
                      duration: drawDur,
                      delay: i * stagger,
                      times: [0, 0.12, 0.86, 1],
                      ease: 'linear',
                    },
                  }}
                  style={{ offsetPath: `path('${l.d}')`, offsetRotate: '0deg' }}
                />
              ) : null}

              {/* Origin dot: a hollow node marking where the play begins. Shares
                  the group opacity, so it appears/disappears with the play. */}
              {l.start ? (
                <motion.circle
                  cx={l.start[0]}
                  cy={l.start[1]}
                  r={originR}
                  fill="var(--color-bg)"
                  stroke={l.color}
                  strokeWidth={2 * unit}
                  fillOpacity={1}
                  strokeOpacity={dotOpacity}
                  initial={shouldAnimate ? { scale: 0.4 } : false}
                  animate={shouldAnimate ? { scale: 1 } : undefined}
                  style={{ transformOrigin: `${l.start[0]}px ${l.start[1]}px` }}
                  transition={
                    shouldAnimate
                      ? { duration: 0.3, delay: i * stagger, ease: [0.16, 1, 0.3, 1] }
                      : undefined
                  }
                />
              ) : null}
            </g>
          );
        })}

        {/* Hover label: when a kind is hovered/focused, surface the play label of
            the (first) hovered line just past its destination, in that kind's
            colour, so the highlight is also legible. */}
        {(() => {
          if (!hovered) return null;
          const hot = lines.find((l) => l.kind === hovered && l.end && isOn(l.kind));
          if (!hot || !hot.end) return null;
          return (
            <HoverLabel
              x={hot.end[0]}
              y={hot.end[1]}
              angle={hot.angle}
              text={hot.label}
              color={hot.color}
              unit={unit}
              view={view}
            />
          );
        })()}
      </g>

      {/* Interactive legend: real HTML toggle buttons inside a foreignObject so
          they stay locked to the field coordinate space (aligned across all
          consumers) yet keyboard + screen-reader accessible. The foreignObject
          spans the full field; an inner flex wrapper docks the compact panel
          into the chosen CORNER so it never covers the drawn plays. The wrapper
          itself ignores pointer events (only the panel re-enables them), so the
          empty field area stays fully hoverable. */}
      {legend.length > 0 && (
        <foreignObject
          x={foPad}
          y={foPad}
          width={vw - foPad * 2}
          height={vh - foPad * 2}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              // Dock the panel into the requested corner.
              justifyContent: legendPlacement.endsWith('right') ? 'flex-end' : 'flex-start',
              alignItems: legendPlacement.startsWith('bottom') ? 'flex-end' : 'flex-start',
              pointerEvents: 'none',
            }}
          >
            <LegendPanel
              legend={legend}
              isOn={isOn}
              allOn={allOn}
              hovered={hovered}
              onToggle={toggle}
              onIsolate={isolate}
              onReset={resetAll}
              onHover={setHovered}
              fontPx={legendFont}
              collapsible={legendCollapsible}
              collapsed={legendCollapsible && legendCollapsed}
              onToggleCollapsed={() => setLegendCollapsed((c) => !c)}
            />
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

// Shape of a fully resolved, render-ready line.
interface BuiltLine {
  id: string;
  label: string;
  kind: string;
  d: string;
  markerKey: string;
  color: string;
  width: number;
  baseOpacity: number;
  intensity: number;
  start: [number, number] | undefined;
  end: [number, number] | undefined;
  angle: number;
}

// --- Interactive legend panel (HTML) ----------------------------------------
//
// Each row is a role="checkbox" button: click or Space/Enter toggles its kind.
// The whole panel scales off `fontPx` (sized by the parent as a fraction of the
// viewBox width) so it stays comfortably readable once the SVG downscales into
// its tile. We re-enable pointer events here (the parent foreignObject lets them
// pass).
function LegendPanel({
  legend,
  isOn,
  allOn,
  hovered,
  onToggle,
  onIsolate,
  onReset,
  onHover,
  fontPx,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
}: {
  legend: LegendEntry[];
  isOn: (kind: string) => boolean;
  allOn: boolean;
  hovered: string | null;
  onToggle: (kind: string) => void;
  onIsolate: (kind: string) => void;
  onReset: () => void;
  onHover: (kind: string | null) => void;
  /**
   * Base font size in SVG user units, computed by the parent as a fraction of
   * the viewBox width so the panel stays comfortably readable after the SVG is
   * downscaled into its tile. All internal spacing scales off this.
   */
  fontPx: number;
  /** Allow collapsing the panel down to a single compact chip. */
  collapsible?: boolean;
  /** Whether the panel is currently collapsed (only when `collapsible`). */
  collapsed?: boolean;
  /** Toggle collapsed state. */
  onToggleCollapsed?: () => void;
}) {
  const onCount = legend.filter((e) => isOn(e.kind)).length;

  // Collapsed: render only a compact pill that expands the legend on click, so
  // the field is fully clear. The pill shows the kind colours as a swatch strip
  // so the legend identity is still hinted while collapsed.
  if (collapsible && collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={false}
        aria-label={`Show plays legend (${legend.length} kinds)`}
        title="Show legend"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: `${0.4 * fontPx}px`,
          padding: `${0.35 * fontPx}px ${0.55 * fontPx}px`,
          borderRadius: `${0.5 * fontPx}px`,
          background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
          border: '1px solid var(--color-border)',
          backdropFilter: 'blur(4px)',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: `${0.7 * fontPx}px`,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-muted)',
          cursor: 'pointer',
          pointerEvents: 'auto',
          boxShadow: '0 4px 18px color-mix(in srgb, var(--color-bg) 60%, transparent)',
        }}
      >
        <span style={{ display: 'inline-flex', gap: `${0.18 * fontPx}px` }} aria-hidden="true">
          {legend.slice(0, 6).map((e) => (
            <span
              key={e.key}
              style={{
                width: `${0.55 * fontPx}px`,
                height: `${0.55 * fontPx}px`,
                borderRadius: '2px',
                background: isOn(e.kind) ? e.color : 'transparent',
                border: `1.5px solid ${e.color}`,
              }}
            />
          ))}
        </span>
        Plays
      </button>
    );
  }

  return (
    <div
      // foreignObject children need the XHTML namespace; React adds it for known
      // HTML tags automatically. pointerEvents re-enabled just on the panel.
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: `${0.35 * fontPx}px`,
        padding: `${0.6 * fontPx}px`,
        borderRadius: `${0.55 * fontPx}px`,
        background: 'color-mix(in srgb, var(--color-surface) 86%, transparent)',
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(4px)',
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: `${fontPx}px`,
        lineHeight: 1.2,
        color: 'var(--color-text)',
        pointerEvents: 'auto',
        boxShadow: '0 4px 18px color-mix(in srgb, var(--color-bg) 60%, transparent)',
        maxWidth: `${22 * fontPx}px`,
      }}
      role="group"
      aria-label="Toggle play kinds"
    >
      {/* Header row: title + reset-all control. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: `${0.6 * fontPx}px`,
          paddingBottom: `${0.25 * fontPx}px`,
          borderBottom: '1px solid var(--color-border)',
          marginBottom: `${0.15 * fontPx}px`,
        }}
      >
        <span
          style={{
            fontSize: `${0.7 * fontPx}px`,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-muted)',
          }}
        >
          Plays
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${0.3 * fontPx}px` }}>
          <button
            type="button"
            onClick={onReset}
            disabled={allOn}
            aria-label="Show all kinds"
            style={{
              font: 'inherit',
              fontSize: `${0.66 * fontPx}px`,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: allOn ? 'default' : 'pointer',
              color: allOn ? 'var(--color-muted)' : 'var(--color-accent1)',
              background: 'transparent',
              border: `1px solid ${allOn ? 'var(--color-border)' : 'var(--color-accent1)'}`,
              borderRadius: `${0.4 * fontPx}px`,
              padding: `${0.12 * fontPx}px ${0.45 * fontPx}px`,
              opacity: allOn ? 0.5 : 1,
              transition: 'opacity 0.2s ease, color 0.2s ease, border-color 0.2s ease',
            }}
          >
            All
          </button>
          {/* Collapse control: shrinks the panel to a compact chip so it never
              obscures the plays. Only rendered when the consumer opts in. */}
          {collapsible ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={true}
              aria-label="Hide plays legend"
              title="Hide legend"
              style={{
                font: 'inherit',
                lineHeight: 0,
                cursor: 'pointer',
                color: 'var(--color-muted)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: `${0.4 * fontPx}px`,
                padding: `${0.12 * fontPx}px ${0.3 * fontPx}px`,
                transition: 'color 0.2s ease, border-color 0.2s ease',
              }}
            >
              {/* Minus / collapse glyph, sized off the font scale. */}
              <svg
                width={0.8 * fontPx}
                height={0.8 * fontPx}
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 8h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {legend.map((e) => {
        const on = isOn(e.kind);
        const isHot = hovered === e.kind;
        const soleActive = on && onCount === 1;
        return (
          <div
            key={e.key}
            style={{ display: 'flex', alignItems: 'center', gap: `${0.35 * fontPx}px` }}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`${e.kind}, ${e.count} ${e.count === 1 ? 'play' : 'plays'}${
                on ? ', shown' : ', hidden'
              }`}
              onClick={() => onToggle(e.kind)}
              onMouseEnter={() => onHover(e.kind)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(e.kind)}
              onBlur={() => onHover(null)}
              style={{
                flex: '1 1 auto',
                display: 'flex',
                alignItems: 'center',
                gap: `${0.5 * fontPx}px`,
                // Generous tap target: the row is always at least ~1.6em tall so
                // it is comfortable to click/tap even after the SVG downscales.
                minHeight: `${1.65 * fontPx}px`,
                font: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                // ON rows carry a faint tint so the checked state reads even at a
                // glance; hover lifts it further. OFF rows stay flat + struck out.
                background: isHot
                  ? 'color-mix(in srgb, var(--color-surface-alt) 90%, transparent)'
                  : on
                    ? 'color-mix(in srgb, var(--color-surface-alt) 45%, transparent)'
                    : 'transparent',
                border: `1px solid ${
                  isHot ? 'var(--color-border)' : 'transparent'
                }`,
                borderRadius: `${0.4 * fontPx}px`,
                padding: `${0.32 * fontPx}px ${0.45 * fontPx}px`,
                opacity: on ? 1 : 0.45,
                transition: 'opacity 0.2s ease, background 0.15s ease, border-color 0.15s ease',
              }}
            >
              {/* Swatch: solid in the kind colour when on, hollow when off, so the
                  on/off state is obvious at a glance. */}
              <span
                aria-hidden="true"
                style={{
                  flex: '0 0 auto',
                  width: `${0.9 * fontPx}px`,
                  height: `${0.9 * fontPx}px`,
                  borderRadius: '3px',
                  background: on ? e.color : 'transparent',
                  border: `2px solid ${e.color}`,
                  boxShadow: on
                    ? `0 0 ${0.5 * fontPx}px color-mix(in srgb, ${e.color} 70%, transparent)`
                    : 'none',
                  transition: 'background 0.2s ease, box-shadow 0.2s ease',
                }}
              />
              <span
                style={{
                  flex: '1 1 auto',
                  whiteSpace: 'nowrap',
                  // Use the longhand `textDecorationLine` (not the `textDecoration`
                  // shorthand) so it never conflicts with `textDecorationColor`
                  // across re-renders (React warns about mixing shorthand +
                  // longhand for the same property).
                  textDecorationLine: on ? 'none' : 'line-through',
                  textDecorationColor: 'var(--color-muted)',
                }}
              >
                {e.kind}
              </span>
            </button>

            {/* Count chip doubles as an "isolate / reset" control: click to show
                only this kind; click again (when it is the sole active kind) to
                show all. */}
            <button
              type="button"
              onClick={() => onIsolate(e.kind)}
              onMouseEnter={() => onHover(e.kind)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(e.kind)}
              onBlur={() => onHover(null)}
              aria-label={
                soleActive ? `Showing only ${e.kind}. Show all kinds` : `Show only ${e.kind}`
              }
              title={soleActive ? 'Show all' : `Show only ${e.kind}`}
              style={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                font: 'inherit',
                fontSize: `${0.72 * fontPx}px`,
                cursor: 'pointer',
                minWidth: `${1.5 * fontPx}px`,
                minHeight: `${1.5 * fontPx}px`,
                textAlign: 'center',
                color: soleActive ? 'var(--color-bg)' : 'var(--color-muted)',
                background: soleActive ? e.color : 'color-mix(in srgb, var(--color-surface-alt) 80%, transparent)',
                border: `1px solid ${soleActive ? e.color : 'var(--color-border)'}`,
                borderRadius: `${0.35 * fontPx}px`,
                padding: `${0.1 * fontPx}px ${0.3 * fontPx}px`,
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {e.count}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Renders the hover callout: a small dashed connector + a rounded chip with the
// play label, nudged to stay inside the viewBox, in the kind colour.
function HoverLabel({
  x,
  y,
  angle,
  text,
  color,
  unit,
  view,
}: {
  x: number;
  y: number;
  angle: number;
  text: string;
  color: string;
  unit: number;
  view: { width: number; height: number };
}) {
  const fontSize = 26 * unit;
  const padX = 12 * unit;
  const padY = 8 * unit;
  // Rough text width estimate (monospace ≈ 0.6em per char) for the chip width.
  const chipW = text.length * fontSize * 0.6 + padX * 2;
  const chipH = fontSize + padY * 2;
  // Offset the chip a bit beyond the arrow tip, continuing its direction.
  const off = 18 * unit;
  let cx = x + Math.cos(angle) * off;
  let cy = y + Math.sin(angle) * off;
  // Clamp the chip so it never spills outside the field frame.
  const margin = 6 * unit;
  let chipX = cx - chipW / 2;
  let chipY = cy - chipH / 2;
  chipX = Math.max(margin, Math.min(chipX, view.width - chipW - margin));
  chipY = Math.max(margin, Math.min(chipY, view.height - chipH - margin));
  cx = chipX + chipW / 2;
  cy = chipY + chipH / 2;

  return (
    <g aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <line
        x1={x}
        y1={y}
        x2={cx}
        y2={cy}
        stroke={color}
        strokeWidth={1.5 * unit}
        strokeOpacity={0.7}
        strokeDasharray={`${3 * unit} ${3 * unit}`}
      />
      <rect
        x={chipX}
        y={chipY}
        width={chipW}
        height={chipH}
        rx={chipH / 2}
        fill="var(--color-surface)"
        fillOpacity={0.95}
        stroke={color}
        strokeWidth={1.5 * unit}
      />
      <text
        x={chipX + chipW / 2}
        y={chipY + chipH / 2}
        fontSize={fontSize}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        fill="var(--color-text)"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {text}
      </text>
    </g>
  );
}

function clampUnit(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
