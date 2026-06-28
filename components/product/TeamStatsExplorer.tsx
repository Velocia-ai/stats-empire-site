'use client';

// Stats Empire, TeamStatsExplorer
//
// A coach-facing individual + team statistics explorer for the /product route.
// It puts the whole demo club (Athletic Rovers, from lib/demoTeam.ts) in front
// of a coach across three timeframe windows (per match / per week / per season)
// so the page reads as "you can track everything you need, and find it fast".
//
// Three layers, top to bottom:
//   1. Timeframe TOGGLE, a segmented radiogroup (same visual language as the
//      report's SportToggle: framer-motion pill on a shared layoutId, roving
//      tabindex, arrow-key nav, reduced-motion safe).
//   2. TEAM summary, the headline squad numbers for the active window plus a
//      record/possession strip.
//   3. INDIVIDUAL view, a scannable SORTABLE table of the roster with the key
//      coach metrics (goals, assists, shots, SoT, xG, xA, passes, pass %, key
//      passes, tackles, interceptions, duels, fouls, offsides, cards). Click a
//      row to open a player detail panel. Every player carries a "watch clips"
//      chip with a real clip count, and the section is anchored by a note that
//      every event is backed by clip-level video + AI analysis.
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
  DEMO_PLAYERS,
  DEMO_TEAM,
  TIMEFRAMES,
  playerStatsFor,
  teamStatsFor,
  type DemoPlayer,
  type PlayerStatLine,
  type Timeframe,
} from '@/lib/demoTeam';

// --- Column model ------------------------------------------------------------

/** Numeric stat keys a coach sorts and scans the roster by. */
type StatColumnKey = Exclude<keyof PlayerStatLine, never>;

interface ColumnDef {
  /** Stat field on PlayerStatLine, or a synthetic key handled specially. */
  key: StatColumnKey | 'player' | 'clips';
  /** Short header label (kept legible at comfortable desktop size). */
  label: string;
  /** Longer description for the column header tooltip / aria. */
  title: string;
  /** Render alignment. The player column is left, all stats are right. */
  align: 'left' | 'right';
  /** Format a player's value for this column in the given timeframe. */
  format?: (line: PlayerStatLine) => string;
  /** Pull the raw numeric value used for sorting. */
  sortValue?: (line: PlayerStatLine) => number;
  /** Flag the headline coach columns so they read a touch stronger. */
  emphasis?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'player', label: 'Player', title: 'Player and position', align: 'left' },
  {
    key: 'goals',
    label: 'G',
    title: 'Goals',
    align: 'right',
    emphasis: true,
    format: (l) => String(l.goals),
    sortValue: (l) => l.goals,
  },
  {
    key: 'assists',
    label: 'A',
    title: 'Assists',
    align: 'right',
    emphasis: true,
    format: (l) => String(l.assists),
    sortValue: (l) => l.assists,
  },
  {
    key: 'shots',
    label: 'Sh',
    title: 'Shots',
    align: 'right',
    format: (l) => String(l.shots),
    sortValue: (l) => l.shots,
  },
  {
    key: 'shotsOnTarget',
    label: 'SoT',
    title: 'Shots on target',
    align: 'right',
    format: (l) => String(l.shotsOnTarget),
    sortValue: (l) => l.shotsOnTarget,
  },
  {
    key: 'xG',
    label: 'xG',
    title: 'Expected goals',
    align: 'right',
    format: (l) => l.xG.toFixed(1),
    sortValue: (l) => l.xG,
  },
  {
    key: 'xA',
    label: 'xA',
    title: 'Expected assists',
    align: 'right',
    format: (l) => l.xA.toFixed(1),
    sortValue: (l) => l.xA,
  },
  {
    key: 'passes',
    label: 'Pass',
    title: 'Passes completed',
    align: 'right',
    format: (l) => l.passes.toLocaleString(),
    sortValue: (l) => l.passes,
  },
  {
    key: 'passPct',
    label: 'Pass %',
    title: 'Pass completion percentage',
    align: 'right',
    format: (l) => `${l.passPct.toFixed(1)}%`,
    sortValue: (l) => l.passPct,
  },
  {
    key: 'keyPasses',
    label: 'KP',
    title: 'Key passes',
    align: 'right',
    format: (l) => String(l.keyPasses),
    sortValue: (l) => l.keyPasses,
  },
  {
    key: 'tackles',
    label: 'Tkl',
    title: 'Tackles',
    align: 'right',
    format: (l) => String(l.tackles),
    sortValue: (l) => l.tackles,
  },
  {
    key: 'interceptions',
    label: 'Int',
    title: 'Interceptions',
    align: 'right',
    format: (l) => String(l.interceptions),
    sortValue: (l) => l.interceptions,
  },
  {
    key: 'duelsWonPct',
    label: 'Duels %',
    title: 'Duels won percentage',
    align: 'right',
    format: (l) => `${l.duelsWonPct.toFixed(0)}%`,
    sortValue: (l) => l.duelsWonPct,
  },
  {
    key: 'fouls',
    label: 'Fls',
    title: 'Fouls committed',
    align: 'right',
    format: (l) => String(l.fouls),
    sortValue: (l) => l.fouls,
  },
  {
    key: 'offsides',
    label: 'Off',
    title: 'Offsides',
    align: 'right',
    format: (l) => String(l.offsides),
    sortValue: (l) => l.offsides,
  },
];

type SortKey = Exclude<ColumnDef['key'], 'player'>;
type SortDir = 'asc' | 'desc';

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

// --- Timeframe toggle (segmented radiogroup, SportToggle visual language) ----

function TimeframeToggle({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (id: Timeframe) => void;
}) {
  const prefersReduced = useReducedMotion();
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = TIMEFRAMES.findIndex((t) => t.id === value);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (index + 1) % TIMEFRAMES.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (index - 1 + TIMEFRAMES.length) % TIMEFRAMES.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = TIMEFRAMES.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    onChange(TIMEFRAMES[next].id);
    btnRefs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Select stats timeframe"
      className="inline-flex max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-surface p-1 sm:gap-1 sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TIMEFRAMES.map((tf, i) => {
        const selected = tf.id === value;
        return (
          <button
            key={tf.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (activeIndex === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(tf.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={clsx(
              'relative isolate inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors sm:px-5 sm:text-xs sm:tracking-[0.08em]',
              selected ? 'text-bg' : 'text-muted hover:text-text',
            )}
          >
            {selected ? (
              <motion.span
                layoutId="timeframe-toggle-pill"
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full bg-accent1"
                transition={
                  prefersReduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34 }
                }
              />
            ) : null}
            {tf.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Player detail panel -----------------------------------------------------

/** Position long names for the detail panel header. */
const POSITION_LABEL: Record<DemoPlayer['position'], string> = {
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
};

interface DetailStat {
  label: string;
  value: string;
}

function buildDetailStats(line: PlayerStatLine): DetailStat[] {
  return [
    { label: 'Minutes', value: line.minutes.toLocaleString() },
    { label: 'Goals', value: String(line.goals) },
    { label: 'Assists', value: String(line.assists) },
    { label: 'Shots', value: String(line.shots) },
    { label: 'On target', value: String(line.shotsOnTarget) },
    { label: 'xG', value: line.xG.toFixed(2) },
    { label: 'xA', value: line.xA.toFixed(2) },
    { label: 'Passes', value: line.passes.toLocaleString() },
    { label: 'Pass %', value: `${line.passPct.toFixed(1)}%` },
    { label: 'Key passes', value: String(line.keyPasses) },
    { label: 'Dribbles', value: String(line.dribbles) },
    { label: 'Tackles', value: String(line.tackles) },
    { label: 'Interceptions', value: String(line.interceptions) },
    { label: 'Recoveries', value: String(line.recoveries) },
    { label: 'Duels won', value: `${line.duelsWon} (${line.duelsWonPct.toFixed(0)}%)` },
    { label: 'Fouls', value: String(line.fouls) },
    { label: 'Fouls won', value: String(line.foulsWon) },
    { label: 'Offsides', value: String(line.offsides) },
    { label: 'Cards', value: `${line.yellow}Y ${line.red}R` },
  ];
}

function PlayerDetailPanel({
  player,
  timeframe,
  timeframeLabel,
  onClose,
}: {
  player: DemoPlayer;
  timeframe: Timeframe;
  timeframeLabel: string;
  onClose: () => void;
}) {
  const line = playerStatsFor(player, timeframe);
  const detail = buildDetailStats(line);

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
              {POSITION_LABEL[player.position]} · {timeframeLabel}
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
            Every goal, shot, duel and off-ball run for {player.name.split(' ')[0]} is
            tagged to video, then cross-checked by AI before a senior analyst signs off.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full bg-accent1 px-5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-bg transition-colors hover:bg-accent1/90"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          Watch {line.clips} clips
        </button>
      </div>
    </Reveal>
  );
}

// --- Main component ----------------------------------------------------------

export interface TeamStatsExplorerProps {
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

export default function TeamStatsExplorer({ className }: TeamStatsExplorerProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('match');
  const [sortKey, setSortKey] = useState<SortKey>('goals');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const team = DEMO_TEAM;
  const teamLine = teamStatsFor(timeframe);
  const activeMeta = TIMEFRAMES.find((t) => t.id === timeframe) ?? TIMEFRAMES[0];

  // Sorted roster for the active timeframe. The player column sorts by name;
  // every other column sorts by its numeric value. Ties fall back to shirt
  // number so the order is always deterministic.
  const rows = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortKey);
    const sorted = [...DEMO_PLAYERS].sort((a, b) => {
      const la = playerStatsFor(a, timeframe);
      const lb = playerStatsFor(b, timeframe);
      let diff = 0;
      if (sortKey === 'clips') {
        diff = la.clips - lb.clips;
      } else if (col?.sortValue) {
        diff = col.sortValue(la) - col.sortValue(lb);
      }
      if (diff === 0) return a.number - b.number;
      return sortDir === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [timeframe, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Sensible default direction: high-to-low for counting stats.
      setSortDir('desc');
    }
  }

  const selectedPlayer = selectedId
    ? DEMO_PLAYERS.find((p) => p.id === selectedId) ?? null
    : null;

  const record = `${teamLine.wins}W ${teamLine.draws}D ${teamLine.losses}L`;

  return (
    <section
      id="stats-explorer"
      aria-labelledby="stats-explorer-heading"
      className={clsx('relative w-full scroll-mt-24 py-16 sm:py-28 lg:py-32', className)}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section header + timeframe toggle. */}
        <Reveal as="header" className="mb-10 sm:mb-14">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1 sm:text-[0.8125rem] lg:text-[0.9375rem]">
            Individual + team tracking
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2
                id="stats-explorer-heading"
                className="font-display font-bold leading-[1.1] tracking-tight text-text text-[clamp(1.75rem,5vw,4.25rem)]"
              >
                Track every player, every number, at a glance.
              </h2>
              <p className="mt-5 font-body text-base leading-relaxed text-muted sm:text-lg lg:text-[1.3125rem]">
                The whole squad in one view: goals, shots, xG, passing, duels, fouls,
                offsides and more. Switch the window from a single match to the full
                season, sort any column, and open a player to go deeper. Every number
                traces back to clip-level video.
              </p>
            </div>
            <div className="shrink-0">
              <TimeframeToggle value={timeframe} onChange={setTimeframe} />
              <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
                {activeMeta.blurb}
              </p>
            </div>
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
                  Possession
                </p>
                <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-text">
                  {teamLine.possessionPct.toFixed(0)}%
                </p>
              </div>
              <ClipChip count={teamLine.clips} label="clips" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <TeamMetric
              index={0}
              accent
              label="Goals for"
              value={String(teamLine.goalsFor)}
              sub={`${teamLine.goalsAgainst} against`}
            />
            <TeamMetric
              index={1}
              label="Team xG"
              value={teamLine.xG.toFixed(1)}
              sub={`${teamLine.xGA.toFixed(1)} xGA`}
            />
            <TeamMetric
              index={2}
              label="Shots"
              value={String(teamLine.shots)}
              sub={`${teamLine.shotsOnTarget} on target`}
            />
            <TeamMetric
              index={3}
              label="Pass %"
              value={`${teamLine.passPct.toFixed(1)}%`}
              sub={`${teamLine.passes.toLocaleString()} passes`}
            />
            <TeamMetric
              index={4}
              label="Duels won"
              value={`${teamLine.duelsWonPct.toFixed(0)}%`}
              sub={`${teamLine.recoveries.toLocaleString()} recoveries`}
            />
            <TeamMetric
              index={5}
              label="Clean sheets"
              value={String(teamLine.cleanSheets)}
              sub={`${teamLine.matchesPlayed} ${teamLine.matchesPlayed === 1 ? 'match' : 'matches'}`}
            />
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
              Sorted by {COLUMNS.find((c) => c.key === sortKey)?.title ?? 'goals'}
            </span>
          </div>

          <div className="overflow-x-auto [scrollbar-width:thin]">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <caption className="sr-only">
                Athletic Rovers player statistics for {activeMeta.label.toLowerCase()}. Click a
                column header to sort, click a row to open player detail.
              </caption>
              <thead>
                <tr className="border-b border-border">
                  {COLUMNS.map((col) => {
                    const isSorted = col.key !== 'player' && col.key === sortKey;
                    const ariaSort = isSorted
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none';
                    if (col.key === 'player') {
                      return (
                        <th
                          key={col.key}
                          scope="col"
                          className="sticky left-0 z-10 bg-surface px-5 py-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted sm:text-xs"
                        >
                          {col.label}
                        </th>
                      );
                    }
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        aria-sort={ariaSort}
                        className="px-2 py-3 text-right sm:px-3"
                      >
                        <button
                          type="button"
                          onClick={() => onSort(col.key as SortKey)}
                          title={col.title}
                          className={clsx(
                            'group inline-flex min-h-[32px] items-center justify-end gap-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.08em] transition-colors sm:text-xs',
                            isSorted ? 'text-accent1' : 'text-muted hover:text-text',
                            col.emphasis && !isSorted ? 'text-text/80' : '',
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
                    className="px-3 py-3 text-right font-mono text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted sm:text-xs"
                  >
                    Clips
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((player) => {
                  const line = playerStatsFor(player, timeframe);
                  const isSelected = player.id === selectedId;
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
                      {COLUMNS.filter((c) => c.key !== 'player').map((col) => {
                        const isSortedCol = col.key === sortKey;
                        const value = col.format ? col.format(line) : '';
                        return (
                          <td
                            key={col.key}
                            className={clsx(
                              'px-2 py-3 text-right font-display text-sm tabular-nums tracking-tight sm:px-3 sm:text-base',
                              isSortedCol ? 'text-accent1' : 'text-text',
                              col.emphasis ? 'font-bold' : 'font-medium',
                            )}
                          >
                            {value}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5 font-mono text-xs font-semibold text-accent1">
                          <Play className="h-3 w-3 fill-current" aria-hidden />
                          {line.clips}
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
              key={selectedPlayer.id}
              player={selectedPlayer}
              timeframe={timeframe}
              timeframeLabel={activeMeta.label}
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
            <ClipChip count={teamLine.clips} label="clips ready" />
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
