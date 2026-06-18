'use client';

// Stats Empire, HowItWorks
//
// Four numbered steps (Upload → Assign human logger → Tag → Report) laid out as
// a play diagram. A single chalk trajectory threads through all four step nodes
// and draws itself on scroll, exactly like a coach sketching the sequence of a
// play onto the tactics board. The arc runs horizontally across the row on
// desktop and vertically down the left rail on mobile.
//
// Each step is a numbered node with a glowing chalk ring; the connecting path
// uses framer-motion pathLength so it animates as one continuous stroke.
//
// Reduced-motion safe: the full path + all content render statically.

import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Upload, UserCheck, Tags, FileBarChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { HOW_IT_WORKS } from '@/lib/content';
import type { HowItWorks as HowItWorksContent } from '@/lib/content';

interface HowItWorksProps {
  content?: HowItWorksContent;
  className?: string;
}

const STEP_ICONS: LucideIcon[] = [Upload, UserCheck, Tags, FileBarChart];

export default function HowItWorks({ content = HOW_IT_WORKS, className }: HowItWorksProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px -15% 0px' });
  const show = reduce ? true : inView;

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className={clsx('relative w-full px-5 py-20 sm:px-8 sm:py-28', className)}
    >
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
            {content.eyebrow}
          </p>
          <h2
            id="how-heading"
            className="mt-4 font-display text-3xl font-bold leading-[1.05] text-text sm:text-4xl md:text-5xl"
          >
            {content.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {content.subhead}
          </p>
        </header>

        <div ref={ref} className="relative mt-16">
          {/* ---- Desktop chalk trajectory (horizontal across the top of nodes) ---- */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1000 60"
            preserveAspectRatio="none"
            className="absolute left-0 top-7 hidden h-14 w-full overflow-visible lg:block"
          >
            <motion.path
              d="M40 30 C 200 -10, 280 70, 460 30 S 720 -10, 960 30"
              fill="none"
              stroke="var(--color-accent1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="6 8"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={show ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
            />
            <motion.path
              d="M940 18 L 962 30 L 940 42"
              fill="none"
              stroke="var(--color-accent2)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { opacity: 1 } : { opacity: 0 }}
              animate={show ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : 1.5 }}
            />
          </svg>

          <ol className="relative grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* ---- Mobile/tablet chalk rail (vertical down the left of the nodes) ---- */}
            <svg
              aria-hidden="true"
              viewBox="0 0 40 1000"
              preserveAspectRatio="none"
              className="absolute left-[27px] top-8 h-[calc(100%-3rem)] w-10 overflow-visible sm:left-[calc(50%-1px)] lg:hidden"
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
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
            </svg>

            {content.steps.map((step, idx) => {
              const Icon = STEP_ICONS[idx % STEP_ICONS.length];
              return (
                <motion.li
                  key={step.step}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  animate={show ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: 0.5, delay: idx * 0.18 + 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-start gap-4 sm:flex-col sm:items-start sm:gap-5"
                >
                  {/* Numbered chalk node */}
                  <div className="relative z-10 flex-shrink-0">
                    <span
                      aria-hidden="true"
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent1/40 bg-bg shadow-[0_0_0_4px_var(--color-bg),0_0_24px_-4px_var(--color-accent1)]"
                    >
                      <Icon className="h-6 w-6 text-accent1" strokeWidth={1.75} />
                    </span>
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent2 font-mono text-xs font-bold text-bg">
                      {step.step}
                    </span>
                  </div>

                  <div className="pt-0.5 sm:pt-2">
                    <h3 className="font-display text-lg font-bold leading-snug text-text">
                      {step.title}
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
