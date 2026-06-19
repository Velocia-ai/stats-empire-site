'use client';

// Stats Empire, landing page (Court Vision identity).
//
// The complete single-page marketing site, assembled in a tightened narrative
// order. Every CTA labeled "Start Free" / "Unlock" / "Turn footage into wins"
// opens the one shared freemium funnel (signup → pick sport → unlock → free
// dashboard).
//
// Wiring: the whole tree is wrapped in <FreemiumFlowProvider>, which mounts a
// single <FreemiumFlow/> internally and exposes useFreemiumTrigger() to every
// descendant. So SiteNav, Hero, Pricing and FinalCta all open the SAME flow with
// zero prop-drilling, none of them need an explicit onStart. ReportBento and the
// freemium funnel create their own client boundaries; ThemeProvider lives in
// app/layout.tsx and defaults to Court Vision (data-theme="court"). ReportBento
// opens on Tennis (its default sport); Hero leads on Tennis too.
//
// Section order (also the in-page nav targets):
//   SiteNav · Hero(#top) · ProofStats · Provenance(#provenance, "how it's made")
//   · MultiSportCoverage(#coverage) · ReportBento + WhatsInReport(#report)
//   · WhyHybrid: Problem(#problem) + HumanVsAi · OpponentScouting
//   · Pricing(#pricing) + BilingualStrip · Faq(#faq) · FinalCta · SiteFooter
//
// Length: the old page ran every section at the default py-20/py-28 rhythm and
// carried three overlapping "why us" stretches (Problem, HumanVsAi, WhyUs) plus
// a standalone WhatsInReport and a free-floating BilingualStrip. This rewrite
// merges the why-us idea into ONE "Why hybrid" stretch (Problem + HumanVsAi;
// WhyUs dropped as redundant, the standalone HowItWorks dropped in favour of the
// richer Provenance pipeline), folds WhatsInReport into the report block, ties
// the bilingual badge to Pricing, and tightens vertical spacing across the
// board, roughly a third shorter with all key content preserved.

import { FreemiumFlowProvider } from '@/components/freemium';
import { ReportBento } from '@/components/report';
import {
  BilingualStrip,
  Faq,
  FinalCta,
  Hero,
  HumanVsAi,
  MultiSportCoverage,
  OpponentScouting,
  Pricing,
  Problem,
  ProofStats,
  Provenance,
  SiteFooter,
  SiteNav,
  WhatsInReport,
} from '@/components/landing';

export default function HomePage() {
  return (
    <FreemiumFlowProvider
      onBuyTokens={() => {
        // Demo stub, point at a real token-purchase route in production.
        // eslint-disable-next-line no-console
        console.log('Buy tokens clicked');
      }}
      onRegister={(creds) => {
        // Demo stub, wire to your signup endpoint / analytics.
        // eslint-disable-next-line no-console
        console.log('Registered:', creds);
      }}
    >
      {/* Fixed top nav, Start Free CTA + ThemeSwitcher (A/B/C reachable). */}
      <SiteNav />

      <main className="relative overflow-x-hidden">
        {/* Hero owns id="top", leads on Tennis, has its own CourtBackdrop. */}
        <Hero />

        {/* Single proof strip (no other stat strips on the page). */}
        <ProofStats />

        {/* How every report is made, the chain-of-custody pipeline (#provenance).
            This is the page's "how it works" explainer now that the thinner
            standalone HowItWorks has been folded away. */}
        <Provenance className="py-14 sm:py-20" />

        {/* What we cover (featured tennis/soccer/basketball). */}
        <MultiSportCoverage />

        {/* The report block: the live coach-ready report (opens on Tennis) with
            its three pillars folded directly underneath, so "what's in a report"
            reads as one continuous section rather than two. Nav "Report" target. */}
        <div id="report" className="scroll-mt-20">
          <ReportBento className="pb-4 sm:pb-6" />
          <WhatsInReport className="pt-4 sm:pt-6" />
        </div>

        {/* Why hybrid: the merged single-mode-vs-hybrid framing (Problem) flows
            straight into the dimension-by-dimension comparison (HumanVsAi). The
            old standalone WhyUs trio is folded away as redundant. */}
        <Problem className="py-14 sm:py-20" />
        <HumanVsAi className="pb-14 pt-0 sm:pb-20 sm:pt-0" />

        {/* Forward-looking pre-match opponent dossier add-on (Feature B). */}
        <OpponentScouting className="py-14 sm:py-20" />

        {/* Token packs + Leagues & Federations, every Unlock opens the flow.
            The bilingual capability badge sits with the offer it ships with. */}
        <Pricing className="pb-8 sm:pb-12" />
        <BilingualStrip className="pb-14 pt-0 sm:pb-20" />

        {/* Trimmed FAQ, then the closing CTA. */}
        <Faq className="py-14 sm:py-20" />
        <FinalCta />
      </main>

      <SiteFooter />
    </FreemiumFlowProvider>
  );
}
