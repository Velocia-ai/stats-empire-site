'use client';

// Stats Empire, WhatsInReport
//
// The three pillars every report is built on: Performance / Patterns / Progress.
// Rendered as three calm tactics-board cards. Each card has a mono pillar index,
// a title, a one-line blurb, and a checklist of what that pillar contains.
//
// Entrances use the shared <Reveal> primitive (fade + gentle rise, once, subtle
// index stagger). There is no perpetual motion, no chalk-draw flourish and no
// per-card texture/glow, so the trio reads as quiet and composed. Whitespace,
// not borders, separates the cards.

import { Activity, Check, Repeat, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { WHATS_IN_REPORT } from '@/lib/content';
import type { WhatsInReport as WhatsInReportContent } from '@/lib/content';
import Reveal from '@/components/Reveal';

interface WhatsInReportProps {
  content?: WhatsInReportContent;
  className?: string;
}

const GROUP_ICONS: LucideIcon[] = [Activity, Repeat, TrendingUp];

export default function WhatsInReport({ content = WHATS_IN_REPORT, className }: WhatsInReportProps) {
  return (
    <section
      id="whats-in-report"
      aria-labelledby="report-heading"
      className={clsx('relative w-full py-16 sm:py-28 lg:py-32', className)}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal as="header" className="mb-12 max-w-2xl sm:mb-16">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1 lg:text-[0.8125rem]">
            {content.eyebrow}
          </p>
          <h2
            id="report-heading"
            className="mt-4 font-display font-bold leading-[1.1] tracking-tight text-text text-[clamp(1.75rem,5vw,3.5rem)]"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg lg:text-[1.1875rem]">
            {content.subhead}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
          {content.groups.map((group, idx) => {
            const Icon = GROUP_ICONS[idx % GROUP_ICONS.length];
            return (
              <Reveal
                as="article"
                index={idx}
                key={group.group}
                className="group relative flex flex-col rounded-3xl border border-border bg-surface p-6 transition-colors hover:border-accent1/30 sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surfaceAlt text-accent1">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs font-medium tabular-nums text-muted/60">
                    0{idx + 1}
                  </span>
                </div>

                <h3 className="mt-5 font-display text-xl font-bold text-text lg:text-2xl">
                  {group.group}
                </h3>
                <p className="mt-1.5 text-sm font-medium text-muted lg:text-base">
                  {group.blurb}
                </p>

                <ul className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent1"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                      <span className="text-sm leading-relaxed text-muted lg:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
