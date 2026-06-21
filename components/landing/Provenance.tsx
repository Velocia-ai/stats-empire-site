'use client';

// Stats Empire, Provenance (Feature A)
//
// "How every report is made", the chain of custody that makes the hybrid model
// tangible: you upload the match -> a trained analyst logs & corrects -> AI
// sharpens quality control -> a senior analyst audits & signs off. Rendered as
// numbered stages joined by a chalk trajectory that draws itself on scroll, the
// same coach-sketching-a-play motif the rest of the suite uses (HowItWorks /
// WhyUs).
//
// Each stage carries an owner pill (Client / AI / Analyst / Senior). The client
// upload and AI read neutral (muted / border), the human stages read warm and
// confident (accent1 / lime), because the human has the final say. The compact
// PROVENANCE.badge
// ("Human-verified / Senior-audited") is also exported on its own as
// <ProvenanceBadge /> so it can sit near the hero or the report.
//
// All colour/type via var(--color-*) tokens. Reduced-motion safe: every stage
// renders statically (via the shared <Reveal>) when reduced motion is requested.
//
// Refined for restraint: the connecting chalk trajectories have been removed
// (noisy decorative flourishes), and orange is kept out of the marketing
// chrome, the input stages (Client/AI) read neutral while the two human
// stages carry the single lime highlight, so lime never competes with orange
// here. Stages enter with the shared <Reveal> primitive.

import Reveal from '@/components/Reveal';
import { Upload, Cpu, UserCheck, ShieldCheck, BadgeCheck } from 'lucide-react';
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

// Per-owner visual treatment. The Client upload and AI are the cool input/assist
// stages; the two human stages are the warm, confident accent1 the rest of the
// site uses for "human-led".
const OWNER_META: Record<
  ProvenanceStep['owner'],
  { icon: LucideIcon; tone: 'cool' | 'warm' }
> = {
  Client: { icon: Upload, tone: 'cool' },
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
  return (
    <section
      id="provenance"
      aria-labelledby="provenance-heading"
      className={clsx('relative w-full px-5 py-16 sm:px-8 sm:py-28 lg:py-32', className)}
    >
      <div className="mx-auto max-w-6xl">
        <Reveal as="header" className="mb-12 max-w-2xl sm:mb-16">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-accent1">
            {content.eyebrow}
          </p>
          <h2
            id="provenance-heading"
            className="mt-4 font-display font-bold leading-[1.08] text-text [font-size:clamp(1.875rem,4.5vw,3rem)]"
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
        </Reveal>

        <ol className="grid grid-cols-1 gap-x-8 gap-y-10 sm:gap-x-8 md:grid-cols-2 lg:grid-cols-4">
          {content.steps.map((step, idx) => {
            const meta = OWNER_META[step.owner];
            const Icon = meta.icon;
            // Human stages carry the single lime highlight; input stages
            // (Client/AI) read neutral so lime stays rationed and orange
            // never enters the marketing chrome.
            const warm = meta.tone === 'warm';
            return (
              <Reveal
                as="li"
                key={step.stage}
                index={idx}
                className="relative flex items-start gap-4 md:flex-col md:items-start md:gap-5"
              >
                {/* Numbered node */}
                <div className="relative z-10 flex-shrink-0">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'flex h-14 w-14 items-center justify-center rounded-2xl border bg-bg',
                      warm
                        ? 'border-accent1/40 shadow-[0_0_0_4px_var(--color-bg),0_0_18px_-6px_var(--color-accent1)]'
                        : 'border-border',
                    )}
                  >
                    <Icon
                      className={clsx('h-6 w-6', warm ? 'text-accent1' : 'text-muted')}
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface font-mono text-xs font-bold text-muted">
                    {idx + 1}
                  </span>
                </div>

                <div className="pt-0.5 md:pt-2">
                  {/* Owner pill: human stages lime, input stages neutral. */}
                  <span
                    className={clsx(
                      'inline-flex w-fit items-center rounded-full px-2.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em]',
                      warm
                        ? 'bg-accent1/15 text-accent1'
                        : 'bg-surfaceAlt text-muted',
                    )}
                  >
                    {step.owner === 'Client'
                      ? 'You'
                      : step.owner === 'AI'
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
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
