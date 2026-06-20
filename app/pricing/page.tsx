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

import { BilingualStrip, Faq, Pricing } from '@/components/landing';

export const metadata = {
  title: 'Pricing, Stats Empire',
  description:
    'Simple token packs , one token covers one match , plus Leagues & Federations plans. Pay only for the matches you analyze.',
};

function PricingHero() {
  return (
    <section
      aria-labelledby="pricing-hero-heading"
      className="relative w-full overflow-hidden px-5 pb-4 pt-28 text-center sm:px-8 sm:pt-32 lg:pt-36"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-texture" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 h-52 w-[32rem] max-w-full -translate-x-1/2 rounded-full bg-accent1/[0.07] blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent1/30 bg-surface/60 px-4 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-accent1 backdrop-blur">
          Simple, match-based pricing
        </span>

        <h1
          id="pricing-hero-heading"
          className="mt-6 font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-text sm:text-5xl"
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
      {/* Short pricing intro. */}
      <PricingHero />

      {/* Token packs + Leagues & Federations, every Unlock opens the funnel. The
          bilingual capability badge sits with the offer it ships with. */}
      <Pricing className="pb-8 pt-8 sm:pb-12 sm:pt-12" />
      <BilingualStrip className="pb-14 pt-0 sm:pb-20" />

      {/* FAQ owns id="faq" so /pricing#faq lands here. */}
      <Faq className="py-14 sm:py-20" />
    </main>
  );
}
