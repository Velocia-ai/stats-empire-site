'use client';

// Stats Empire, ProofStats
//
// A punchy proof strip that sits directly under the hero. Each stat's numeral
// counts up from zero when it scrolls into view, then a chalk underline draws
// itself across the figure, the Court Vision "coach drawing on the board"
// signature. Numerals are tabular-nums + mono so they don't jitter mid-count.
//
// Reduced-motion safe: when the user prefers reduced motion we skip the count
// and render the final value immediately, and the chalk underline is shown
// static (no draw-on).

import { useEffect, useRef, useState } from 'react';
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  animate,
} from 'framer-motion';
import clsx from 'clsx';
import { PROOF_STATS } from '@/lib/content';
import type { ProofStat } from '@/lib/content';
import { ChalkUnderline } from './ChalkLines';

interface ProofStatsProps {
  /** Optional override; defaults to the canonical PROOF_STATS copy. */
  stats?: ProofStat[];
  className?: string;
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
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [active, reduce, target, mv]);

  // Text-only proof points (e.g. "Human-verified") have no number to count up.
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
      className={clsx('relative w-full border-y border-border bg-surface/40', className)}
    >
      {/* faint tactics-board grid behind the figures */}
      <div aria-hidden="true" className="grid-texture pointer-events-none absolute inset-0" />

      <div
        ref={ref}
        className="relative mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden lg:grid-cols-4"
      >
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className={clsx(
              'group relative flex flex-col gap-2 px-5 py-8 sm:px-7 sm:py-10',
              // chalk dividers between cells, themed via border color
              'before:absolute before:inset-y-6 before:left-0 before:w-px before:bg-border',
              idx % 2 === 0 && 'before:hidden sm:before:block',
              'lg:before:block',
              idx === 0 && 'lg:before:hidden',
            )}
          >
            <div className="relative inline-flex flex-col">
              <span className="font-display text-4xl font-bold leading-none text-text sm:text-5xl">
                <span className="sr-only">{stat.value}</span>
                <CountUp value={stat.value} active={active} />
              </span>

              {/* chalk underline draws on after the count settles */}
              <span className="mt-2 block w-full max-w-[5.5rem]">
                <ChalkUnderline delay={0.5 + idx * 0.08} />
              </span>
            </div>

            <p className="font-mono text-xs leading-relaxed text-muted sm:text-[0.8rem]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
