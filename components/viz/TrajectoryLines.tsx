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
  // ARIA semantics that an <svg>-only control can't. The box auto-sizes to the
  // content; we pin it top-left with a small inset.
  const foPad = 14 * unit;

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
        {/* Dark casing under each stroke: a slightly wider bg-coloured line so
            distinct-colour paths stay crisp and separated where they cross.
            Casing tracks the same visibility/dim state as its line. */}
        {lines.map((l, i) => {
          const on = isOn(l.kind);
          const casingOpacity = on ? 0.55 : 0.05;
          return shouldAnimate ? (
            <motion.path
              key={`${l.id}-casing`}
              d={l.d}
              stroke="var(--color-bg)"
              strokeWidth={l.width + 2.4 * unit}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                pathLength: { duration: drawDur, ease: 'easeInOut', delay: i * stagger },
              }}
              // strokeOpacity is React-controlled (selection-driven), NOT framer,
              // so a finished framer/WAAPI animation can never override the toggle.
              style={{ strokeOpacity: casingOpacity, transition: 'stroke-opacity 0.25s ease' }}
            />
          ) : (
            <path
              key={`${l.id}-casing`}
              d={l.d}
              stroke="var(--color-bg)"
              strokeWidth={l.width + 2.4 * unit}
              style={{ strokeOpacity: casingOpacity, transition: 'stroke-opacity 0.25s ease' }}
            />
          );
        })}

        {/* Paths, each in its kind colour with a matching directional arrowhead.
            Visibility/dim + hover-emphasis are driven by the selection + hover
            state. The draw-on animates pathLength/opacity IN once; the resting
            opacity afterwards is controlled via the `animate` target so a line
            NEVER ends hidden. */}
        {lines.map((l, i) => {
          const on = isOn(l.kind);
          const isHot = hovered === l.kind;
          const anyHover = hovered !== null;
          // Resting opacity: dim hard when toggled off; when something is hovered,
          // lift the hovered kind and softly mute the rest; otherwise base.
          const restOpacity = !on
            ? 0.08
            : anyHover
              ? isHot
                ? Math.min(1, l.baseOpacity + 0.25)
                : l.baseOpacity * 0.4
              : l.baseOpacity;
          const restWidth = isHot && on ? l.width + 1.4 * unit : l.width;
          const common = {
            stroke: l.color,
            filter: `url(#${glowId})`,
            markerEnd: `url(#${uid}-arrow-${l.markerKey})`,
            onMouseEnter: () => setHovered(l.kind),
            onMouseLeave: () => setHovered((h) => (h === l.kind ? null : h)),
            style: { cursor: 'pointer' as const },
          };
          return shouldAnimate ? (
            <motion.path
              key={l.id}
              d={l.d}
              strokeWidth={restWidth}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                pathLength: { duration: drawDur, ease: 'easeInOut', delay: i * stagger },
                strokeWidth: { duration: 0.18 },
              }}
              stroke={common.stroke}
              filter={common.filter}
              markerEnd={common.markerEnd}
              onMouseEnter={common.onMouseEnter}
              onMouseLeave={common.onMouseLeave}
              // opacity React-controlled (selection/hover), NOT framer, so toggling
              // a kind reliably dims it (a finished framer animation cannot override).
              style={{ ...common.style, opacity: restOpacity, transition: 'opacity 0.25s ease, stroke-width 0.18s ease' }}
            />
          ) : (
            <path
              key={l.id}
              d={l.d}
              strokeWidth={restWidth}
              style={{
                ...common.style,
                opacity: restOpacity,
                transition: 'opacity 0.25s ease, stroke-width 0.18s ease',
              }}
              stroke={common.stroke}
              filter={common.filter}
              markerEnd={common.markerEnd}
              onMouseEnter={common.onMouseEnter}
              onMouseLeave={common.onMouseLeave}
            />
          );
        })}

        {/* Travelling head: a bright dot rides the leading edge of each visible
            stroke as it draws on, then fades, so the eye follows the play's
            direction. Only while animating, only for on + real paths. */}
        {shouldAnimate &&
          lines.map((l, i) =>
            l.d && isOn(l.kind) ? (
              <motion.circle
                key={`${l.id}-head`}
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
            ) : null,
          )}

        {/* Origin dots, a hollow node where each play begins so the start of
            every arrow is unambiguous even when paths overlap. Shares the line's
            colour + visibility. */}
        {lines.map((l, i) => {
          if (!l.start) return null;
          const on = isOn(l.kind);
          const isHot = hovered === l.kind;
          const dotOpacity = !on ? 0.1 : isHot ? 1 : Math.max(l.baseOpacity, 0.7);
          return (
            <motion.circle
              key={`${l.id}-origin`}
              cx={l.start[0]}
              cy={l.start[1]}
              r={originR}
              fill="var(--color-bg)"
              stroke={l.color}
              strokeWidth={2 * unit}
              initial={shouldAnimate ? { scale: 0.4 } : false}
              animate={shouldAnimate ? { scale: 1 } : undefined}
              // opacity React-controlled (selection-driven); only the pop scale is
              // framer, so toggling a kind reliably dims its origin dot too.
              style={{
                transformOrigin: `${l.start[0]}px ${l.start[1]}px`,
                opacity: dotOpacity,
                transition: 'opacity 0.25s ease',
              }}
              transition={
                shouldAnimate
                  ? { duration: 0.3, delay: on ? i * stagger : 0, ease: [0.16, 1, 0.3, 1] }
                  : undefined
              }
            />
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
              unit={unit}
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
// The whole panel scales with `unit` so it matches the SVG's pitch sizing. We
// re-enable pointer events here (the parent foreignObject lets them pass).
function LegendPanel({
  legend,
  isOn,
  allOn,
  hovered,
  onToggle,
  onIsolate,
  onReset,
  onHover,
  unit,
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
  unit: number;
  /** Allow collapsing the panel down to a single compact chip. */
  collapsible?: boolean;
  /** Whether the panel is currently collapsed (only when `collapsible`). */
  collapsed?: boolean;
  /** Toggle collapsed state. */
  onToggleCollapsed?: () => void;
}) {
  // Scale typography/spacing off `unit` so the panel reads the same physical
  // size on every pitch (tennis viewBox is smaller, so unit is smaller there).
  // Bumped a clear step (floor 11→13, 22→26) so the in-SVG legend reads
  // comfortably on desktop, where the capped pitch box left it undersized.
  const fontPx = Math.max(13, 26 * unit);
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
                font: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
                background: isHot
                  ? 'color-mix(in srgb, var(--color-surface-alt) 90%, transparent)'
                  : 'transparent',
                border: `1px solid ${
                  isHot ? 'var(--color-border)' : 'transparent'
                }`,
                borderRadius: `${0.4 * fontPx}px`,
                padding: `${0.2 * fontPx}px ${0.4 * fontPx}px`,
                opacity: on ? 1 : 0.42,
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
                  textDecoration: on ? 'none' : 'line-through',
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
                font: 'inherit',
                fontSize: `${0.68 * fontPx}px`,
                cursor: 'pointer',
                minWidth: `${1.4 * fontPx}px`,
                textAlign: 'center',
                color: soleActive ? 'var(--color-bg)' : 'var(--color-muted)',
                background: soleActive ? e.color : 'color-mix(in srgb, var(--color-surface-alt) 80%, transparent)',
                border: `1px solid ${soleActive ? e.color : 'var(--color-border)'}`,
                borderRadius: `${0.35 * fontPx}px`,
                padding: `${0.08 * fontPx}px ${0.3 * fontPx}px`,
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
