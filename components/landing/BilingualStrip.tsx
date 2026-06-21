'use client';

// Stats Empire, BilingualStrip (Feature C)
//
// A small, standalone strip stating the bilingual report-delivery capability:
// every report ships in English AND Simplified Chinese (中文). This is a
// CAPABILITY badge, not a translation of the site, the marketing copy itself
// stays English per the brief; only the delivered report is bilingual.
//
// Ships two exports:
//   • <BilingualStrip />, a full-width banded strip (headline + subhead + badge),
//     a light divider between heavier sections.
//   • <BilingualBadge />, the compact "Reports in English + 简体中文" pill on its
//     own, droppable into the hero, the report bento, or a footer line.
//
// All colour/type via var(--color-*) tokens; entrance via the shared <Reveal>
// primitive, reduced-motion safe.

import { Languages } from 'lucide-react';
import clsx from 'clsx';
import { BILINGUAL_REPORTS } from '@/lib/content';
import type { BilingualReports } from '@/lib/content';
import { Reveal } from '@/components/Reveal';

// ---------------------------------------------------------------------------
// Compact badge, exported standalone so it can sit in the hero / report / footer.
// ---------------------------------------------------------------------------

export interface BilingualBadgeProps {
  /** Override the badge label; defaults to BILINGUAL_REPORTS.badge. */
  label?: string;
  className?: string;
}

export function BilingualBadge({
  label = BILINGUAL_REPORTS.badge,
  className,
}: BilingualBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-text',
        className,
      )}
    >
      <Languages className="h-3.5 w-3.5 shrink-0 text-accent1" aria-hidden="true" />
      {/* lang attr so screen readers / browsers treat 中文 correctly. */}
      <span>
        Reports in English + <span lang="zh-Hans">简体中文</span>
      </span>
    </span>
  );
}

export interface BilingualStripProps {
  /** Optional override; defaults to the canonical BILINGUAL_REPORTS copy. */
  content?: BilingualReports;
  className?: string;
}

export default function BilingualStrip({
  content = BILINGUAL_REPORTS,
  className,
}: BilingualStripProps) {
  return (
    <section
      aria-label="Bilingual report delivery"
      className={clsx('relative w-full py-16 sm:py-20', className)}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="relative flex flex-col items-start gap-6 rounded-3xl border border-border bg-surface/60 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <div className="relative">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
              {content.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold leading-snug text-text sm:text-2xl">
              {/* 中文 lives in the headline copy; tag the run for correct rendering. */}
              Every report, in English and{' '}
              <span lang="zh-Hans" className="text-accent1">
                中文
              </span>
              .
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              {content.subhead}
            </p>
          </div>

          <div className="relative shrink-0">
            <BilingualBadge label={content.badge} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
