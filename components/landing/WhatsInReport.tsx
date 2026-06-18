'use client';

// Stats Empire, WhatsInReport
//
// The three pillars every report is built on: Performance / Patterns / Progress.
// Rendered as three tactics-board cards. Each card has a mono pillar index, a
// title, a one-line blurb, and a checklist of what that pillar contains, each
// item gets a small chalk tick that draws on as the card enters view.
//
// On large screens the three cards form an asymmetric "play" layout (a slight
// vertical stagger) to read as distinctive rather than a flat three-up grid.
//
// Reduced-motion safe: ticks and cards render statically.

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Activity, Repeat, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { WHATS_IN_REPORT } from '@/lib/content';
import type { WhatsInReport as WhatsInReportContent } from '@/lib/content';

interface WhatsInReportProps {
  content?: WhatsInReportContent;
  className?: string;
}

const GROUP_ICONS: LucideIcon[] = [Activity, Repeat, TrendingUp];
// gentle vertical stagger on lg+ so the trio reads as a play, not a flat grid
const GROUP_OFFSET = ['lg:mt-0', 'lg:mt-8', 'lg:mt-16'];

function ChalkTick({ show, delay }: { show: boolean; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="mt-0.5 h-4 w-4 flex-shrink-0 overflow-visible"
      fill="none"
    >
      <motion.path
        d="M2 9 L 6 13 L 14 3"
        stroke="var(--color-accent1)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        animate={show ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      />
    </svg>
  );
}

export default function WhatsInReport({ content = WHATS_IN_REPORT, className }: WhatsInReportProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px -12% 0px' });
  const show = reduce ? true : inView;

  return (
    <section
      id="whats-in-report"
      aria-labelledby="report-heading"
      className={clsx('relative w-full px-5 py-20 sm:px-8 sm:py-28', className)}
    >
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
            {content.eyebrow}
          </p>
          <h2
            id="report-heading"
            className="mt-4 font-display text-3xl font-bold leading-[1.05] text-text sm:text-4xl md:text-5xl"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {content.subhead}
          </p>
        </header>

        <div ref={ref} className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {content.groups.map((group, idx) => {
            const Icon = GROUP_ICONS[idx % GROUP_ICONS.length];
            return (
              <motion.article
                key={group.group}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={show ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className={clsx(
                  'group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-7',
                  'transition-colors hover:border-accent1/40',
                  GROUP_OFFSET[idx % GROUP_OFFSET.length],
                )}
              >
                {/* faint board grid + corner accent wash */}
                <span aria-hidden="true" className="grid-texture-fine pointer-events-none absolute inset-0" />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent1/[0.07] blur-2xl transition-opacity group-hover:bg-accent1/[0.12]"
                />

                <div className="relative flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent1/30 bg-accent1/[0.06] text-accent1">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs font-medium tabular-nums text-border">
                    0{idx + 1}
                  </span>
                </div>

                <h3 className="relative mt-5 font-display text-xl font-bold text-text">
                  {group.group}
                </h3>
                <p className="relative mt-1.5 text-sm font-medium text-accent1/90">
                  {group.blurb}
                </p>

                <ul className="relative mt-5 flex flex-col gap-3 border-t border-border pt-5">
                  {group.items.map((item, itemIdx) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <ChalkTick
                        show={show}
                        delay={idx * 0.12 + itemIdx * 0.08 + 0.3}
                      />
                      <span className="text-sm leading-relaxed text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
