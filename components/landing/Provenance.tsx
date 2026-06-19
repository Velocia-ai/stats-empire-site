'use client';

// Stats Empire, Provenance (Feature A)
//
// "How every report is made", the chain of custody that makes the hybrid model
// tangible: AI pre-tags -> a trained analyst logs & corrects -> a senior analyst
// audits & signs off. Rendered as three numbered stages joined by a chalk
// trajectory that draws itself on scroll, the same coach-sketching-a-play motif
// the rest of the suite uses (HowItWorks / WhyUs).
//
// Each stage carries an owner pill (AI / Analyst / Senior). AI reads cool
// (accent2 / orange), the human stages read warm and confident (accent1 / lime),
// because the human has the final say. The compact PROVENANCE.badge
// ("Human-verified / Senior-audited") is also exported on its own as
// <ProvenanceBadge /> so it can sit near the hero or the report.
//
// All colour/type via var(--color-*) tokens. Reduced-motion safe: the path and
// all content render statically when reduced motion is requested.

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Cpu, UserCheck, ShieldCheck, BadgeCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { PROVENANCE } from '@/lib/content';
import type {
  Provenance as ProvenanceContent,
  ProvenanceStep,
} from '@/lib/content';

export interface ProvenanceProps {
  /** Optional override; defaults to the canonical PROVENANCE copy. */
  content?: ProvenanceContent;
  className?: string;
}

// Per-owner visual treatment. AI is the cool assist; the two human stages are
// the warm, confident accent1 the rest of the site uses for "human-led".
const OWNER_META: Record<
  ProvenanceStep['owner'],
  { icon: LucideIcon; tone: 'cool' | 'warm' }
> = {
  AI: { icon: Cpu, tone: 'cool' },
  Analyst: { icon: UserCheck, tone: 'warm' },
  Senior: { icon: ShieldCheck, tone: 'warm' },
};

// ---------------------------------------------------------------------------
// Compact trust badge, exported standalone so it can sit near the hero/report.
// ---------------------------------------------------------------------------

export interface ProvenanceBadgeProps {
  /** Override the two-part badge copy; defaults to PROVENANCE.badge. */
  badge?: ProvenanceContent['badge'];
  className?: string;
}

export function ProvenanceBadge({
  badge = PROVENANCE.badge,
  className,
}: ProvenanceBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border border-accent1/40 bg-accent1/[0.08] px-3 py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-accent1',
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="text-text">{badge.primary}</span>
      <span aria-hidden="true" className="text-border">
        /
      </span>
      <span className="text-text">{badge.secondary}</span>
    </span>
  );
}

export default function Provenance({
  content = PROVENANCE,
  className,
}: ProvenanceProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px -15% 0px' });
  const show = reduce ? true : inView;

  return (
    <section
      id="provenance"
      aria-labelledby="provenance-heading"
      className={clsx('relative w-full px-5 py-20 sm:px-8 sm:py-28', className)}
    >
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
            {content.eyebrow}
          </p>
          <h2
            id="provenance-heading"
            className="mt-4 font-display text-3xl font-bold leading-[1.05] text-text sm:text-4xl md:text-5xl"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {content.subhead}
          </p>

          {/* Compact trust badge, the same one that can sit near the hero. */}
          <div className="mt-6">
            <ProvenanceBadge badge={content.badge} />
          </div>
        </header>

        <div ref={ref} className="relative mt-16">
          {/* Desktop chalk trajectory threading the three stages, left to right. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 60"
            preserveAspectRatio="none"
            className="absolute left-0 top-7 hidden h-14 w-full overflow-visible md:block"
          >
            <motion.path
              d="M60 30 C 260 -8, 380 68, 540 30 S 800 -8, 940 30"
              fill="none"
              stroke="var(--color-accent1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="6 8"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={show ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
            <motion.path
              d="M920 18 L 942 30 L 920 42"
              fill="none"
              stroke="var(--color-accent2)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { opacity: 1 } : { opacity: 0 }}
              animate={show ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : 1.4 }}
            />
          </svg>

          <ol className="relative grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
            {/* Mobile chalk rail running down the left of the stages. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 40 1000"
              preserveAspectRatio="none"
              className="absolute left-[27px] top-8 h-[calc(100%-3rem)] w-10 overflow-visible md:hidden"
            >
              <motion.path
                d="M20 8 L 20 992"
                fill="none"
                stroke="var(--color-accent1)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="5 9"
                initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                animate={show ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 1.3, ease: 'easeInOut' }}
              />
            </svg>

            {content.steps.map((step, idx) => {
              const meta = OWNER_META[step.owner];
              const Icon = meta.icon;
              const cool = meta.tone === 'cool';
              return (
                <motion.li
                  key={step.stage}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={show ? { opacity: 1, y: 0 } : undefined}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.18 + 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative flex items-start gap-4 md:flex-col md:items-start md:gap-5"
                >
                  {/* Numbered chalk node */}
                  <div className="relative z-10 flex-shrink-0">
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'flex h-14 w-14 items-center justify-center rounded-2xl border bg-bg',
                        cool
                          ? 'border-accent2/40 shadow-[0_0_0_4px_var(--color-bg),0_0_24px_-4px_var(--color-accent2)]'
                          : 'border-accent1/40 shadow-[0_0_0_4px_var(--color-bg),0_0_24px_-4px_var(--color-accent1)]',
                      )}
                    >
                      <Icon
                        className={clsx('h-6 w-6', cool ? 'text-accent2' : 'text-accent1')}
                        strokeWidth={1.75}
                      />
                    </span>
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent2 font-mono text-xs font-bold text-bg">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="pt-0.5 md:pt-2">
                    {/* Owner pill: AI = cool, Analyst/Senior = warm. */}
                    <span
                      className={clsx(
                        'inline-flex w-fit items-center rounded-full px-2.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em]',
                        cool
                          ? 'bg-accent2/15 text-accent2'
                          : 'bg-accent1/15 text-accent1',
                      )}
                    >
                      {step.owner === 'AI'
                        ? 'AI assist'
                        : step.owner === 'Senior'
                        ? 'Senior analyst'
                        : 'Human analyst'}
                    </span>
                    <h3 className="mt-3 font-display text-lg font-bold leading-snug text-text">
                      {step.stage}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {step.description}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
