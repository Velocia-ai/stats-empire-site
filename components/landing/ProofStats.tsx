'use client';

// Stats Empire, ProofStats
//
// A calm proof strip that sits directly under the hero. Each stat's numeral
// counts up gently from zero when it scrolls into view. Numerals are
// tabular-nums so they don't jitter mid-count.
//
// Refined for restraint: no grid-texture, no per-stat chalk underline, and no
// hard cell dividers, whitespace separates the figures instead. The cells
// enter with the shared <Reveal> primitive (subtle, capped stagger).
//
// Reduced-motion safe: when the user prefers reduced motion we skip the count
// and render the final value immediately (Reveal also settles statically).

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
import Reveal from '@/components/Reveal';

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
      duration: 1.0,
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
      className={clsx('relative w-full border-t border-border/60', className)}
    >
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-4 lg:gap-x-12"
      >
        {stats.map((stat, idx) => (
          <Reveal
            key={stat.label}
            index={idx}
            className="flex flex-col gap-2"
          >
            <span className="font-display text-4xl font-bold leading-none text-text sm:text-5xl">
              <span className="sr-only">{stat.value}</span>
              <CountUp value={stat.value} active={active} />
            </span>

            <p className="font-mono text-xs leading-relaxed text-muted sm:text-[0.8rem]">
              {stat.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
