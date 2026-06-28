'use client';

// Stats Empire, TeamStatsExplorer
//
// A coach-facing individual + team statistics explorer for the /product route.
// It is SPORT-AGNOSTIC: it maps over the DEMO_SPORTS registry (lib/demoTeam.ts)
// so the same surface drives a full soccer club (Athletic Rovers) AND a full
// basketball club (Harbor City Tide). Switching sport swaps the team identity,
// the team-summary tiles, and the player-table columns, all from config.
//
// Three layers, top to bottom:
//   1. A control row: a SPORT toggle (Soccer / Basketball) on the left and a
//      TIMEFRAME toggle (per match-or-game / per week / per season) on the
//      right. Both are segmented radiogroups in the same visual language
//      (framer-motion pill on a shared layoutId, roving tabindex, arrow-key
//      nav, reduced-motion safe, 44px targets).
//   2. TEAM summary, the headline squad numbers for the active sport + window
//      (tiles built from sport.teamMetrics) plus a record strip that branches
//      per sport (soccer: W/D/L + possession, basketball: W/L + pace).
//   3. INDIVIDUAL view, a scannable SORTABLE table of the roster built from
//      sport.columns. The 1-2 headline columns per sport read a touch stronger
//      (lime accent). Click a row to open a player detail panel. Every player
//      carries a "watch clips" chip with a real clip count, and the section is
//      anchored by a note that every event is backed by clip-level video + AI.
//
// All clip affordances are demo cues (marketing), they do not need to play.
// On brand: dark surfaces, lime accent, mono kickers, <Reveal> entrances,
// fully responsive, WCAG AA, reduced-motion safe. No em-dashes anywhere.

import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Film,
  Play,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

import Reveal from '@/components/Reveal';
import {
  DEMO_SPORTS,
  demoSportFor,
  type ColumnDef,
  type DemoSport,
  type SportPlayer,
  type StatFormat,
  type StatLine,
  type TeamMetricDef,
  type Timeframe,
  type TimeframeMeta,
} from '@/lib/demoTeam';

type SportKey = DemoSport['key'];

// --- Value formatting --------------------------------------------------------
//
// The registry hands the UI a declarative StatFormat per column/metric; the
// concrete formatter lives here so both sports render consistently.

/** Render a raw numeric value per its declared StatFormat. */
function formatStat(value: number, format: StatFormat | undefined): string {
  switch (format) {
    case 'pct':
      // Whole-number percent reads cleaner for rates that sit near integers
      // (FG%, duels), one decimal where the soccer table historically showed it.
      return `${value.toFixed(1)}%`;
    case 'decimal':
      return value.toFixed(1);
    case 'plusminus':
      return value > 0 ? `+${value}` : String(value);
    case 'int':
    default:
      return Math.round(value).toLocaleString();
  }
}

// --- Small presentational helpers -------------------------------------------

/** A play-button chip carrying a clip count, the recurring "watch clips" cue. */
function ClipChip({
  count,
  label,
  className,
}: {
  count: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-accent1/30 bg-accent1/10 px-2.5 py-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-accent1',
        className,
      )}
    >
      <Play className="h-3 w-3 fill-current" aria-hidden />
      {count.toLocaleString()}
      <span className="sr-only">{label ?? 'tagged video clips'}</span>
      {label ? (
        <span aria-hidden className="font-medium tracking-[0.06em] text-accent1/80">
          {label}
        </span>
      ) : null}
    </span>
  );
}

/** A single headline team metric tile. */
function TeamMetric({
  label,
  value,
  sub,
  accent,
  index,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  index: number;
}) {
  return (
    <Reveal
      as="div"
      index={index}
      className={clsx(
        'flex flex-col justify-between rounded-2xl border bg-surface p-4 sm:p-5',
        accent ? 'border-accent1/40 bg-accent1/[0.06]' : 'border-border',
      )}
    >
      <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p
        className={clsx(
          'mt-2 font-display font-bold leading-none tracking-tight text-[clamp(1.6rem,3vw,2.4rem)]',
          accent ? 'text-accent1' : 'text-text',
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1.5 font-body text-xs leading-snug text-muted">{sub}</p>
      ) : null}
    </Reveal>
  );
}

// --- Segmented toggle (shared radiogroup primitive) --------------------------
//
// One generic, accessible segmented control used for BOTH the sport toggle and
// the timeframe toggle so they read as a matched set. WAI-ARIA radiogroup
// pattern: roving tabindex, arrow/Home/End nav, framer pill on a per-instance
// layoutId, reduced-motion safe (the pill snaps instead of sliding). 44px tall.

interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  layoutId,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  /** Unique per toggle so the two pills animate independently. */
  layoutId: string;
}) {
  const prefersReduced = useReducedMotion();
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = options.findIndex((o) => o.id === value);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (index - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = options.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    onChange(options[next].id);
    btnRefs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-surface p-1 sm:gap-1 sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((opt, i) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (activeIndex === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(opt.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={clsx(
              'relative isolate inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors sm:px-5 sm:text-xs sm:tracking-[0.08em]',
              selected ? 'text-bg' : 'text-muted hover:text-text',
            )}
          >
            {selected ? (
              <motion.span
                layoutId={layoutId}
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full bg-accent1"
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34 }
                }
              />
            ) : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Player detail panel -----------------------------------------------------
//
// Built generically from the active sport's columns: the panel lists every
// stat the table can show (plus minutes/clips), reading values straight off the
// player's StatLine for the window. No sport-specific field access.

/** Long position names, looked up per sport for the detail header. */
const POSITION_LABEL: Record<string, string> = {
  // Soccer
  GK: 'Goalkeeper',
  RB: 'Right back',
  CB: 'Centre back',
  LB: 'Left back',
  CDM: 'Defensive midfield',
  CM: 'Central midfield',
  CAM: 'Attacking midfield',
  RW: 'Right wing',
  LW: 'Left wing',
  ST: 'Striker',
  // Basketball
  PG: 'Point guard',
  SG: 'Shooting guard',
  SF: 'Small forward',
  PF: 'Power forward',
  C: 'Center',
};

interface DetailStat {
  label: string;
  value: string;
}

/**
 * Detail rows for a player, derived from the sport's stat columns. Minutes lead
 * (every sport's StatLine carries them), then each real stat column in table
 * order, formatted by its declared StatFormat.
 */
function buildDetailStats(line: StatLine, columns: ColumnDef[]): DetailStat[] {
  const rows: DetailStat[] = [];
  if (typeof line.minutes === 'number') {
    rows.push({ label: 'Minutes', value: Math.round(line.minutes).toLocaleString() });
  }
  for (const col of columns) {
    if (col.key === 'player' || col.key === 'clips' || col.key === 'minutes') continue;
    const raw = line[col.key];
    if (typeof raw !== 'number') continue;
    rows.push({ label: col.title, value: formatStat(raw, col.format) });
  }
  return rows;
}

function PlayerDetailPanel({
  player,
  timeframe,
  timeframeLabel,
  columns,
  onClose,
}: {
  player: SportPlayer;
  timeframe: Timeframe;
  timeframeLabel: string;
  columns: ColumnDef[];
  onClose: () => void;
}) {
  const line = player.stats[timeframe];
  const detail = buildDetailStats(line, columns);
  const positionLabel = POSITION_LABEL[player.position] ?? player.position;
  const clips = typeof line.clips === 'number' ? line.clips : 0;

  return (
    <Reveal
      as="aside"
      role="region"
      aria-label={`${player.name} detail`}
      className="rounded-3xl border border-accent1/30 bg-surface p-5 sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent1/40 bg-accent1/10 font-display text-lg font-bold text-accent1"
          >
            {player.number}
          </span>
          <div>
            <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-text sm:text-2xl">
              {player.name}
            </h3>
            <p className="mt-0.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
              {positionLabel} · {timeframeLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player detail"
          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent1/40 hover:text-text"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {detail.map((d) => (
          <div key={d.label} className="border-l border-border pl-3">
            <dt className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
              {d.label}
            </dt>
            <dd className="mt-1 font-display text-lg font-bold tabular-nums text-text">
              {d.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-surfaceAlt/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Film className="mt-0.5 h-5 w-5 shrink-0 text-accent1" aria-hidden />
          <p className="font-body text-sm leading-snug text-muted">
            Every possession, shot and off-ball action for {player.name.split(' ')[0]} is
            tagged to video, then cross-checked by AI before a senior analyst signs off.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-accent1 px-5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-bg transition-colors hover:bg-accent1/90"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          Watch {clips} clips
        </button>
      </div>
    </Reveal>
  );
}

// --- Team record strip (per sport) -------------------------------------------
//
// Soccer carries wins/draws/losses + possessionPct; basketball carries
// wins/losses + possessions (pace). We read the keys present on the active
// team line and label the second stat per sport.

function TeamRecordStrip({
  sportKey,
  teamLine,
}: {
  sportKey: SportKey;
  teamLine: StatLine;
}) {
  const record =
    sportKey === 'basketball'
      ? `${teamLine.wins}W ${teamLine.losses}L`
      : `${teamLine.wins}W ${teamLine.draws}D ${teamLine.losses}L`;

  const secondLabel = sportKey === 'basketball' ? 'Pace' : 'Possession';
  const secondValue =
    sportKey === 'basketball'
      ? `${Math.round(teamLine.possessions)} poss`
      : `${(teamLine.possessionPct ?? 0).toFixed(0)}%`;

  const clips = typeof teamLine.clips === 'number' ? teamLine.clips : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
          Record
        </p>
        <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-text">
          {record}
        </p>
      </div>
      <div>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
          {secondLabel}
        </p>
        <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-text">
          {secondValue}
        </p>
      </div>
      <ClipChip count={clips} label="clips" />
    </div>
  );
}

// --- Main component ----------------------------------------------------------

type SortDir = 'asc' | 'desc';

/** Seed sort key for a sport: first headline stat column, else first stat. */
function defaultSortKey(columns: ColumnDef[]): string {
  const headline = columns.find((c) => c.key !== 'player' && c.headline);
  if (headline) return headline.key;
  const firstStat = columns.find((c) => c.key !== 'player');
  return firstStat?.key ?? 'clips';
}

export interface TeamStatsExplorerProps {
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

export default function TeamStatsExplorer({ className }: TeamStatsExplorerProps) {
  const [sportKey, setSportKey] = useState<SportKey>('soccer');
  const [timeframe, setTimeframe] = useState<Timeframe>('match');
  // Sort is keyed by column key (a string). 'player' is excluded; 'clips' is
  // always sortable. Seeded to the active sport's headline column.
  const [sortKey, setSortKey] = useState<string>(() =>
    defaultSortKey(demoSportFor('soccer').columns),
  );
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sport = useMemo(() => demoSportFor(sportKey), [sportKey]);
  const { team, players, columns, teamMetrics, timeframes } = sport;

  // Active timeframe meta for the chosen sport. Soccer/basketball share the
  // same timeframe ids, so a sport switch never invalidates the timeframe.
  const activeMeta: TimeframeMeta =
    timeframes.find((t) => t.id === timeframe) ?? timeframes[0];

  const teamLine = team.stats[timeframe];

  // Stat columns (everything except the synthetic player cell). The clips
  // column is appended separately so it is always last and always present.
  const statColumns = useMemo(
    () => columns.filter((c) => c.key !== 'player'),
    [columns],
  );

  // Switching sport: swap to the new sport and reseed the sort to that sport's
  // headline column so the table opens on a sensible, high-to-low view.
  function onSportChange(next: SportKey) {
    setSportKey(next);
    setSortKey(defaultSortKey(demoSportFor(next).columns));
    setSortDir('desc');
    setSelectedId(null);
  }

  // Sorted roster for the active sport + timeframe. Stats sort by their numeric
  // value off the StatLine; ties fall back to shirt number for determinism.
  const rows = useMemo(() => {
    return [...players].sort((a, b) => {
      const la = a.stats[timeframe];
      const lb = b.stats[timeframe];
      const va = typeof la[sortKey] === 'number' ? la[sortKey] : 0;
      const vb = typeof lb[sortKey] === 'number' ? lb[sortKey] : 0;
      const diff = va - vb;
      if (diff === 0) return a.number - b.number;
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [players, timeframe, sortKey, sortDir]);

  function onSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Sensible default direction: high-to-low for counting stats.
      setSortDir('desc');
    }
  }

  const selectedPlayer = selectedId
    ? players.find((p) => p.id === selectedId) ?? null
    : null;

  const sortedColumnTitle =
    sortKey === 'clips'
      ? 'tagged clips'
      : columns.find((c) => c.key === sortKey)?.title ?? 'stats';

  // Sport options for the toggle, from the registry order.
  const sportOptions = DEMO_SPORTS.map((s) => ({ id: s.key, label: s.label }));
  const timeframeOptions = timeframes.map((t) => ({ id: t.id, label: t.label }));

  return (
    <section
      id="stats-explorer"
      aria-labelledby="stats-explorer-heading"
      className={clsx('relative w-full scroll-mt-24 py-16 sm:py-28 lg:py-32', className)}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header. */}
        <Reveal as="header" className="mb-8 sm:mb-10">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1 sm:text-[0.8125rem] lg:text-[0.9375rem]">
            Individual + team tracking
          </p>
          <div className="mt-4 max-w-2xl">
            <h2
              id="stats-explorer-heading"
              className="font-display font-bold leading-[1.1] tracking-tight text-text text-[clamp(1.75rem,5vw,4.25rem)]"
            >
              Track every player, every number, at a glance.
            </h2>
            <p className="mt-5 font-body text-base leading-relaxed text-muted sm:text-lg lg:text-[1.3125rem]">
              The whole squad in one view, in any sport you run. Switch between
              clubs, move the window from a single game to the full season, sort any
              column, and open a player to go deeper. Every number traces back to
              clip-level video.
            </p>
          </div>
        </Reveal>

        {/* Control row: sport toggle (left) + timeframe toggle (right). */}
        <Reveal
          as="div"
          className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p className="mb-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted">
              Sport
            </p>
            <SegmentedToggle
              options={sportOptions}
              value={sportKey}
              onChange={onSportChange}
              ariaLabel="Select sport"
              layoutId="explorer-sport-pill"
            />
          </div>
          <div className="lg:text-right">
            <p className="mb-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted lg:pr-1">
              Timeframe
            </p>
            <SegmentedToggle
              options={timeframeOptions}
              value={timeframe}
              onChange={setTimeframe}
              ariaLabel="Select stats timeframe"
              layoutId="explorer-timeframe-pill"
            />
            <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
              {activeMeta.blurb}
            </p>
          </div>
        </Reveal>

        {/* Team summary card. */}
        <Reveal as="div" className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent1/40 bg-accent1/10 font-display text-base font-bold text-accent1"
              >
                {team.badgeInitials}
              </span>
              <div>
                <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-text sm:text-2xl">
                  {team.name}
                </h3>
                <p className="mt-0.5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted">
                  {team.formation} · {team.coach} · {team.competition}
                </p>
              </div>
            </div>
            <TeamRecordStrip sportKey={sportKey} teamLine={teamLine} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {teamMetrics.map((m: TeamMetricDef, i) => {
              const raw = teamLine[m.key];
              const value =
                typeof raw === 'number' ? formatStat(raw, m.format) : '0';
              return (
                <TeamMetric
                  key={m.key}
                  index={i}
                  accent={m.accent}
                  label={m.label}
                  value={value}
                  sub={m.sub?.(teamLine)}
                />
              );
            })}
          </div>
        </Reveal>

        {/* Individual roster table. */}
        <Reveal as="div" className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-text sm:text-xl">
                Player breakdown
              </h3>
              <p className="mt-1 font-body text-sm text-muted">
                Tap a column to sort. Select a player for the full picture.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 self-start font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted sm:self-auto">
              <ArrowUpDown className="h-3.5 w-3.5 text-accent1" aria-hidden />
              Sorted by {sortedColumnTitle}
            </span>
          </div>

          <div className="overflow-x-auto [scrollbar-width:thin]">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <caption className="sr-only">
                {team.name} player statistics for {activeMeta.label.toLowerCase()}. Click
                a column header to sort, click a row to open player detail.
              </caption>
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-surface px-5 py-3.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted sm:text-xs"
                  >
                    Player
                  </th>
                  {statColumns.map((col) => {
                    const isSorted = col.key === sortKey;
                    const ariaSort = isSorted
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none';
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={ariaSort}
                        className="px-2 py-3.5 text-right sm:px-3"
                      >
                        <button
                          type="button"
                          onClick={() => onSort(col.key)}
                          title={col.title}
                          className={clsx(
                            'group inline-flex min-h-[32px] items-center justify-end gap-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors sm:text-xs',
                            isSorted
                              ? 'text-accent1'
                              : col.headline
                                ? 'text-text/80 hover:text-text'
                                : 'text-muted hover:text-text',
                          )}
                        >
                          {col.label}
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ChevronUp className="h-3 w-3" aria-hidden />
                            ) : (
                              <ChevronDown className="h-3 w-3" aria-hidden />
                            )
                          ) : (
                            <ArrowUpDown
                              className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60"
                              aria-hidden
                            />
                          )}
                        </button>
                      </th>
                    );
                  })}
                  <th
                    scope="col"
                    aria-sort={sortKey === 'clips' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="px-3 py-3.5 text-right"
                  >
                    <button
                      type="button"
                      onClick={() => onSort('clips')}
                      title="Tagged video clips"
                      className={clsx(
                        'group inline-flex min-h-[32px] items-center justify-end gap-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors sm:text-xs',
                        sortKey === 'clips' ? 'text-accent1' : 'text-muted hover:text-text',
                      )}
                    >
                      Clips
                      {sortKey === 'clips' ? (
                        sortDir === 'asc' ? (
                          <ChevronUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown
                          className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60"
                          aria-hidden
                        />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((player) => {
                  const line = player.stats[timeframe];
                  const isSelected = player.id === selectedId;
                  const clips = typeof line.clips === 'number' ? line.clips : 0;
                  return (
                    <tr
                      key={player.id}
                      onClick={() => setSelectedId(isSelected ? null : player.id)}
                      aria-selected={isSelected}
                      className={clsx(
                        'cursor-pointer border-b border-border/60 transition-colors last:border-b-0',
                        isSelected ? 'bg-accent1/[0.06]' : 'hover:bg-surfaceAlt/40',
                      )}
                    >
                      <th
                        scope="row"
                        className={clsx(
                          'sticky left-0 z-10 px-5 py-3 text-left font-normal transition-colors',
                          isSelected ? 'bg-[#16202c]' : 'bg-surface',
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surfaceAlt/60 font-mono text-xs font-semibold text-muted"
                          >
                            {player.number}
                          </span>
                          <span className="flex flex-col">
                            <span className="font-display text-sm font-semibold text-text sm:text-base">
                              {player.name}
                            </span>
                            <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
                              {player.position}
                              {player.starter ? '' : ' · sub'}
                            </span>
                          </span>
                        </span>
                      </th>
                      {statColumns.map((col) => {
                        const isSortedCol = col.key === sortKey;
                        const raw = line[col.key];
                        const value =
                          typeof raw === 'number' ? formatStat(raw, col.format) : '';
                        return (
                          <td
                            key={col.key}
                            className={clsx(
                              'px-2 py-3 text-right font-display text-sm tabular-nums tracking-tight sm:px-3 sm:text-base',
                              isSortedCol
                                ? 'text-accent1'
                                : col.headline
                                  ? 'text-accent1/90'
                                  : 'text-text',
                              col.headline ? 'font-bold' : 'font-medium',
                            )}
                          >
                            {value}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5 font-mono text-xs font-semibold text-accent1">
                          <Play className="h-3 w-3 fill-current" aria-hidden />
                          {clips}
                          <span className="sr-only">tagged clips, click row to watch</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Player detail panel (opens on row select). */}
        {selectedPlayer ? (
          <div className="mt-6">
            <PlayerDetailPanel
              key={`${sportKey}-${selectedPlayer.id}`}
              player={selectedPlayer}
              timeframe={timeframe}
              timeframeLabel={activeMeta.label}
              columns={columns}
              onClose={() => setSelectedId(null)}
            />
          </div>
        ) : null}

        {/* Clip-by-clip video + AI provenance note. */}
        <Reveal
          as="div"
          className="mt-6 flex flex-col gap-4 rounded-3xl border border-border bg-surfaceAlt/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"
        >
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent1/30 bg-accent1/10 text-accent1"
            >
              <Film className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="flex flex-wrap items-center gap-2 font-display text-base font-bold tracking-tight text-text sm:text-lg">
                Clip-by-clip video, behind every number
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent1/30 bg-accent1/10 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-accent1">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  AI verified
                </span>
              </p>
              <p className="mt-1.5 max-w-xl font-body text-sm leading-relaxed text-muted">
                Every event in this table is tagged to match footage, double-checked by
                specialized AI, then signed off by a senior analyst. Click any player to
                pull their clips for the selected window.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <ClipChip
              count={typeof teamLine.clips === 'number' ? teamLine.clips : 0}
              label="clips ready"
            />
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-accent1" aria-hidden />
              Human log + AI + sign-off
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
