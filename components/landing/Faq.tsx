'use client';

// Stats Empire, Faq
//
// An accessible accordion built from the typed FAQ content (lib/content.ts).
// Refined for calm restraint: lime is the only accent (the open item, the plus
// affordance), orange is kept out of this marketing section, and separation is
// carried by quiet border-token rules and whitespace rather than decorative
// chalk lines. Each row is a real <button> with aria-expanded / aria-controls
// wiring to its panel, so it is operable by keyboard and exposed correctly to
// assistive tech. Panels animate height via framer-motion and are reduced-motion
// safe; collapsed panels are hidden from the a11y tree.
//
// Single-open accordion (opening one closes the others). Section header entrance
// uses the shared <Reveal> primitive. All color/type comes from var(--color-*) /
// var(--font-*) tokens.

import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';

import { FAQ } from '@/lib/content';
import { Reveal } from '@/components/Reveal';

export interface FaqProps {
  /** Optional extra classes for the outer <section>. */
  className?: string;
}

export default function Faq({ className }: FaqProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  // Open the first question by default so the section never reads as empty.
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section
      id="faq"
      aria-labelledby={`${baseId}-heading`}
      className={[
        'relative scroll-mt-20 py-16 sm:py-28 lg:py-32',
        className ?? '',
      ].join(' ')}
    >
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        {/* Header */}
        <Reveal as="header" className="mb-12 text-center sm:mb-16">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-accent1">
            {FAQ.eyebrow}
          </p>
          <h2
            id={`${baseId}-heading`}
            className="mt-3 font-display font-bold tracking-tight text-[clamp(1.75rem,5vw,2.25rem)]"
          >
            {FAQ.headline}
          </h2>
        </Reveal>

        {/* Accordion */}
        <div className="border-t border-border">
          {FAQ.items.map((item, i) => {
            const open = openIndex === i;
            const headingId = `${baseId}-q-${i}`;
            const panelId = `${baseId}-a-${i}`;
            return (
              <div key={item.question} className="border-b border-border">
                <h3 className="m-0">
                  <button
                    type="button"
                    id={headingId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? -1 : i)}
                    className="group flex min-h-[44px] w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent1"
                  >
                    <span
                      className={[
                        'font-display text-base font-semibold tracking-tight transition-colors sm:text-lg',
                        open ? 'text-accent1' : 'text-text group-hover:text-accent1',
                      ].join(' ')}
                    >
                      {item.question}
                    </span>
                    {/* Plus → rotates to an "x" feel when open */}
                    <span
                      aria-hidden
                      className={[
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all',
                        open
                          ? 'border-accent1/60 bg-accent1/10 text-accent1'
                          : 'border-border text-muted group-hover:border-accent1/40 group-hover:text-accent1',
                      ].join(' ')}
                    >
                      <Plus
                        className={[
                          'h-4 w-4 transition-transform duration-300 motion-reduce:transition-none',
                          open ? 'rotate-[135deg]' : 'rotate-0',
                        ].join(' ')}
                      />
                    </span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={headingId}
                      key="content"
                      initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="relative pb-5 pl-4 pr-11">
                        {/* Quiet rule down the answer, border token (no orange) */}
                        <span
                          aria-hidden
                          className="absolute left-0 top-1 h-[calc(100%-1.5rem)] w-px bg-border"
                        />
                        <p className="font-body text-sm leading-relaxed text-muted">
                          {item.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
