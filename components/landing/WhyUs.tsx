'use client';

// Stats Empire, WhyUs
//
// Three positioning cards: vs AI trackers / vs doing it yourself / vs premium
// Western services (WHY_US.cards). Each card carries a mono "versus" tag, a
// title, and a paragraph. The middle card, our core price-vs-quality story, 
// is visually elevated (lime accent1 border + glow) so the eye lands on it.
//
// Court Vision signature: each card draws a chalk "play arc" along its top edge
// on scroll-in, like three set plays chalked side by side. Reduced-motion safe.

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ScanLine, Clock, BadgeDollarSign } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { WHY_US } from '@/lib/content';
import type { WhyUs as WhyUsContent } from '@/lib/content';

interface WhyUsProps {
  content?: WhyUsContent;
  className?: string;
}

const CARD_ICONS: LucideIcon[] = [ScanLine, Clock, BadgeDollarSign];

export default function WhyUs({ content = WHY_US, className }: WhyUsProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px -12% 0px' });
  const show = reduce ? true : inView;

  return (
    <section
      id="why-us"
      aria-labelledby="why-heading"
      className={clsx('relative w-full px-5 py-20 sm:px-8 sm:py-28', className)}
    >
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
            {content.eyebrow}
          </p>
          <h2
            id="why-heading"
            className="mt-4 font-display text-3xl font-bold leading-[1.05] text-text sm:text-4xl md:text-5xl"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {content.subhead}
          </p>
        </header>

        <div ref={ref} className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {content.cards.map((card, idx) => {
            const Icon = CARD_ICONS[idx % CARD_ICONS.length];
            const featured = idx === 1; // price/quality story leads the trio
            return (
              <motion.article
                key={card.versus}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={show ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className={clsx(
                  'group relative flex flex-col overflow-hidden rounded-3xl p-6 sm:p-8',
                  featured
                    ? 'border border-accent1/45 bg-accent1/[0.05] shadow-[0_0_40px_-12px_var(--color-accent1)] md:-mt-4 md:mb-4'
                    : 'border border-border bg-surface',
                  'transition-colors',
                  !featured && 'hover:border-accent1/40',
                )}
              >
                <span aria-hidden="true" className="grid-texture-fine pointer-events-none absolute inset-0" />

                {/* chalk play arc along the top edge */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 24"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-x-0 top-0 h-6 w-full overflow-visible"
                >
                  <motion.path
                    d="M8 18 C 90 2, 210 2, 292 18"
                    fill="none"
                    stroke={featured ? 'var(--color-accent1)' : 'var(--color-accent2)'}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray={featured ? '0.1 0' : '5 7'}
                    initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={show ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: 0.8, delay: idx * 0.12 + 0.2, ease: 'easeInOut' }}
                  />
                </svg>

                <div className="relative flex items-center justify-between">
                  <span
                    className={clsx(
                      'flex h-11 w-11 items-center justify-center rounded-xl border',
                      featured
                        ? 'border-accent1/40 bg-accent1/10 text-accent1'
                        : 'border-border bg-surfaceAlt text-muted',
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span
                    className={clsx(
                      'rounded-full px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em]',
                      featured
                        ? 'bg-accent1/15 text-accent1'
                        : 'bg-surfaceAlt text-muted',
                    )}
                  >
                    {card.versus}
                  </span>
                </div>

                <h3 className="relative mt-6 font-display text-xl font-bold leading-snug text-text">
                  {card.title}
                </h3>
                <p className="relative mt-3 text-sm leading-relaxed text-muted">
                  {card.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
