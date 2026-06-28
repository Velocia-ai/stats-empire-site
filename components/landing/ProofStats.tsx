'use client';

// Stats Empire, ProofStats
//
// A premium proof strip that sits directly under the hero. Each stat now lives
// in its own high-contrast card (solid surface + border + soft shadow) so the
// figures stay crisply legible over the animated court background instead of
// washing out against it. Each card carries an icon, a small uppercase kicker
// for hierarchy, a large value and a one-line claim. One card per row reads as
// the accent ("hero") stat in lime to anchor the eye.
//
// Where the value contains a number, its numeral counts up gently from zero
// when it scrolls into view (tabular-nums so it doesn't jitter mid-count).
//
// Reduced-motion safe: when the user prefers reduced motion we skip the count
// and render the final value immediately. The shared <Reveal> primitive owns
// the entrance fade and keeps opacity REACT-controlled, so the framer count-up
// (which only drives the displayed number, a different property) can never
// override the resting visible state.

import { useEffect, useRef, useState } from 'react';
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  animate,
} from 'framer-motion';
import clsx from 'clsx';
import {
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { PROOF_STATS } from '@/lib/content';
import type { ProofStat } from '@/lib/content';
import Reveal from '@/components/Reveal';

interface ProofStatsProps {
  /** Optional override; defaults to the canonical PROOF_STATS copy. */
  stats?: ProofStat[];
  className?: string;
}

// Map the declarative icon key (kept in lib/content) to a concrete lucide icon
// here, where React/JSX lives. Falls back to the audit shield.
const ICONS: Record<NonNullable<ProofStat['icon']>, LucideIcon> = {
  logged: ClipboardCheck,
  audited: ShieldCheck,
  turnaround: Timer,
  sports: Trophy,
};

// The AI-assist proof point ships with no `icon` key (the content `icon` union
// has no AI member and lib/content is not ours to extend), so we resolve its
// glyph here. Any accent card that omits an icon is the human+AI "second pass"
// card and gets the Sparkles mark, keeping it visually distinct from the
// ShieldCheck audit card rather than colliding with it on the shared fallback.
function resolveIcon(stat: ProofStat): LucideIcon {
  if (stat.icon) return ICONS[stat.icon];
  if (stat.accent) return Sparkles;
  return ShieldCheck;
}

// Split a display value like "100%", "$29", "24h", "5" into the parts we need
// to animate: a numeric target plus the prefix/suffix glyphs that frame it.
function parseStat(value: string): {
  prefix: string;
  target: number;
  suffix: string;
  decimals: number;
} {
  const match = value.match(/^(\D*)([\d.,]+)(.*)$/);
  if (!match) return { prefix: '', target: 0, suffix: value, decimals: 0 };
  const [, prefix, rawNum, suffix] = match;
  const cleaned = rawNum.replace(/,/g, '');
  const decimals = cleaned.includes('.') ? cleaned.split('.')[1].length : 0;
  return { prefix, target: Number(cleaned), suffix, decimals };
}

function CountUp({
  value,
  active,
}: {
  value: string;
  active: boolean;
}) {
  const reduce = useReducedMotion();
  const { prefix, target, suffix, decimals } = parseStat(value);
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(target);
      return;
    }
    if (!active) return;
    const controls = animate(mv, target, {
      duration: 1.0,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [active, reduce, target, mv]);

  // Text-only proof points (e.g. "Senior audit") have no number to count up.
  // Render them as-is so we never prepend a meaningless "0".
  if (!/\d/.test(value)) {
    return <span aria-hidden="true">{value}</span>;
  }

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span className="tabular-nums" aria-hidden="true">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default function ProofStats({ stats = PROOF_STATS, className }: ProofStatsProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px -15% 0px' });
  const active = reduce ? true : inView;

  return (
    <section
      aria-label="Proof in numbers"
      className={clsx('relative w-full border-t border-border/60', className)}
    >
      {/* Wider shell (max-w-7xl) plus a five-up track on wide screens give every
          card real horizontal room: stacked on mobile, two-up on tablet, and all
          five across past 1120px without an orphan card or cramped gutters. The
          accent AI card sits mid-row in the source order, anchoring the human+AI
          second-pass story between the human logging and the senior sign-off. */}
      <div
        ref={ref}
        className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-16 sm:grid-cols-2 sm:px-8 sm:py-20 lg:gap-7 lg:py-24 [@media(min-width:1120px)]:grid-cols-5"
      >
        {stats.map((stat, idx) => {
          const Icon = resolveIcon(stat);
          return (
            <Reveal
              key={stat.label}
              index={idx}
              className={clsx(
                'group relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl border p-7 shadow-lg backdrop-blur-sm transition-colors lg:p-8',
                stat.accent
                  ? 'border-accent1/55 bg-accent1/[0.09] shadow-accent1/10'
                  : 'border-border bg-surface/85 hover:border-muted/60',
              )}
            >
              {/* The accent card wears a soft lime corner-glow so the human+AI
                  second pass reads as a first-class part of the story, not just
                  a tinted clone of the neutral cards. */}
              {stat.accent ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent1/20 blur-2xl"
                />
              ) : null}

              {/* Icon chip + uppercase kicker, the hierarchy row. */}
              <div className="relative flex items-center gap-3">
                <span
                  aria-hidden
                  className={clsx(
                    'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
                    stat.accent
                      ? 'border-accent1/45 bg-accent1/15 text-accent1'
                      : 'border-border bg-surfaceAlt text-accent1',
                  )}
                >
                  <Icon className="h-[1.4rem] w-[1.4rem]" strokeWidth={2} />
                </span>
                {stat.kicker ? (
                  <span
                    className={clsx(
                      'font-mono text-[0.72rem] font-semibold uppercase tracking-[0.22em]',
                      stat.accent ? 'text-accent1' : 'text-muted',
                    )}
                  >
                    {stat.kicker}
                  </span>
                ) : null}
              </div>

              {/* The headline figure, large and bold for real presence. */}
              <span
                className={clsx(
                  'relative font-display text-[2.65rem] font-extrabold leading-none tracking-tight sm:text-5xl lg:text-[3.4rem]',
                  stat.accent ? 'text-accent1' : 'text-text',
                )}
              >
                <span className="sr-only">{stat.value}</span>
                <CountUp value={stat.value} active={active} />
              </span>

              {/* One-line claim. Higher-contrast than before so it reads over
                  the animated background, not washed out. */}
              <p className="relative font-body text-[0.97rem] leading-relaxed text-text/80">
                {stat.label}
              </p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
