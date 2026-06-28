// Stats Empire, Pricing route (/pricing) , the plans.
//
// The shared chrome (SiteNav + global ThemeSwitcher, SiteFooter) and the
// app-wide freemium funnel come from app/layout.tsx via <AppProviders>, so this
// page composes the plan sections. Every "Unlock" / token CTA inside <Pricing>
// resolves the funnel via useFreemiumTrigger().
//
// Section order:
//   PricingHero(#top) · Pricing(#pricing, token packs + Leagues & Federations)
//   · BilingualStrip · Faq(#faq)
//
// The FAQ owns id="faq" so the nav's "FAQ" link (/pricing#faq) lands here. The
// story + value live on the home page (/); the product showcase lives on
// /product.

import type { Metadata } from 'next';

import { BilingualStrip, Faq, Pricing } from '@/components/landing';
import { serviceJsonLd } from '@/lib/jsonld';

const PRICING_DESCRIPTION =
  'Simple token packs, one token covers one match, plus Leagues and Federations plans. Pay only for the matches you analyze, from $49 down to $29 per match.';

// Title runs through the root template (-> "... | Stats Empire"). openGraph and
// twitter inherit root defaults, overriding only title/description/URL. The
// stray spaces before commas in the old description are removed here.
export const metadata: Metadata = {
  title: 'Pricing: Pay-Per-Match Token Packs',
  description: PRICING_DESCRIPTION,
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing: Pay-Per-Match Token Packs | Stats Empire',
    description: PRICING_DESCRIPTION,
    url: '/pricing',
    // Per-route openGraph replaces (does not merge) the root block, so the
    // shared og.png must be repeated here or the page would ship no OG image.
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Stats Empire, human-led multi-sport match intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing: Pay-Per-Match Token Packs | Stats Empire',
    description: PRICING_DESCRIPTION,
    images: ['/og.png'],
  },
};

function PricingHero() {
  return (
    <section
      aria-labelledby="pricing-hero-heading"
      className="relative w-full overflow-hidden px-5 pb-4 pt-28 text-center sm:px-8 sm:pt-32 lg:pt-36"
    >
      {/* One soft atmospheric glow, the single accent on this hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 h-52 w-[32rem] max-w-full -translate-x-1/2 rounded-full bg-accent1/[0.05] blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-muted backdrop-blur">
          Simple, match-based pricing
        </span>

        <h1
          id="pricing-hero-heading"
          className="mt-6 font-display text-[clamp(2rem,6vw,3rem)] font-extrabold leading-[1.04] tracking-tight text-text"
        >
          Pay for the matches you analyze. Nothing else.
        </h1>

        <p className="mx-auto mt-5 max-w-xl font-body text-base leading-relaxed text-muted sm:text-lg">
          One token covers one full match report. Buy a pack, or scale up with a
          Leagues and Federations plan. No seats, no setup fees, no software for
          your staff to run.
        </p>
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <main className="relative overflow-x-hidden">
      {/* Service + token-pack Offer structured data, built from lib/pricing.ts so
          it cannot drift from the rendered pricing table. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd()) }}
      />

      {/* Short pricing intro. */}
      <PricingHero />

      {/* Token packs + Leagues & Federations, every Unlock opens the funnel. The
          bilingual capability badge sits with the offer it ships with, tucked
          beneath the packs so the two read as one stretch. */}
      <Pricing className="pb-8 pt-8 sm:pb-12 sm:pt-12" />
      <BilingualStrip className="pb-16 pt-0 sm:pb-28 lg:pb-32" />

      {/* FAQ owns id="faq" so /pricing#faq lands here. */}
      <Faq />
    </main>
  );
}
