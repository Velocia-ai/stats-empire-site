// Stats Empire, Home route (/) , the story + value.
//
// The shared chrome (SiteNav with the global ThemeSwitcher, SiteFooter) and the
// app-wide freemium funnel live in app/layout.tsx via <AppProviders>, so this
// page is a thin server-rendered composition of marketing sections. Every CTA
// that opens the funnel (Hero, OpponentScouting, FinalCta) resolves it through
// useFreemiumTrigger() with no prop drilling.
//
// Cross-links: the hero's sample-report button points at /product (the product
// showcase); the in-page "How it works" nav target is the Provenance pipeline
// at #provenance.
//
// Section order:
//   Hero(#top, + trust badge) · ProofStats · Provenance(#provenance, how it's
//   made) · MultiSportCoverage(#coverage) · Why hybrid: Problem(#problem) +
//   HumanVsAi · OpponentScouting · FinalCta
//
// The deeper product showcase (report bento, what's in a report, free sample)
// lives on /product; the plans live on /pricing. This keeps the home page
// focused on the story and value, and reasonably short.

import {
  FinalCta,
  Hero,
  HumanVsAi,
  MultiSportCoverage,
  OpponentScouting,
  Problem,
  ProofStats,
  Provenance,
} from '@/components/landing';

export default function HomePage() {
  return (
    <main className="relative overflow-x-hidden">
      {/* Hero owns id="top", leads on Tennis, has its own CourtBackdrop. The
          sample-report button crosses over to the product showcase. */}
      <Hero sampleHref="/product" />

      {/* Single proof strip. */}
      <ProofStats />

      {/* How every report is made, the chain-of-custody pipeline (#provenance).
          This is the page's "how it works" explainer. */}
      <Provenance className="py-14 sm:py-20" />

      {/* What we cover (featured tennis/soccer/basketball). */}
      <MultiSportCoverage />

      {/* Why hybrid: the single-mode-vs-hybrid framing (Problem) flows straight
          into the dimension-by-dimension comparison (HumanVsAi). */}
      <Problem className="py-14 sm:py-20" />
      <HumanVsAi className="pb-14 pt-0 sm:pb-20 sm:pt-0" />

      {/* Forward-looking pre-match opponent dossier add-on (Feature B). */}
      <OpponentScouting className="py-14 sm:py-20" />

      {/* Closing CTA, opens the freemium flow. */}
      <FinalCta />
    </main>
  );
}
