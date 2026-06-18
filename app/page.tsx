'use client';

// Stats Empire, landing page (Court Vision identity).
//
// The complete single-page marketing site, assembled in narrative order. Every
// CTA labeled "Start Free" / "Unlock" / "Turn footage into wins" opens the one
// shared freemium funnel (signup → pick sport → unlock → free dashboard).
//
// Wiring: the whole tree is wrapped in <FreemiumFlowProvider>, which mounts a
// single <FreemiumFlow/> internally and exposes useFreemiumTrigger() to every
// descendant. So SiteNav, Hero, Pricing and FinalCta all open the SAME flow with
// zero prop-drilling, none of them need an explicit onStart. ReportBento and the
// freemium funnel create their own client boundaries; ThemeProvider lives in
// app/layout.tsx and defaults to Court Vision (data-theme="court").
//
// Section order (also the in-page nav targets):
//   SiteNav · Hero(#top) · ProofStats · Problem(#problem) · HowItWorks(#how-it-works)
//   · MultiSportCoverage(#coverage) · ReportBento(#report) · WhatsInReport(#whats-in-report)
//   · HumanVsAi(#human-vs-ai) · Pricing(#pricing) · WhyUs(#why-us) · FinalCta · Faq(#faq)
//   · SiteFooter

import { FreemiumFlowProvider } from '@/components/freemium';
import { ReportBento } from '@/components/report';
import {
  Faq,
  FinalCta,
  Hero,
  HowItWorks,
  HumanVsAi,
  MultiSportCoverage,
  Pricing,
  Problem,
  ProofStats,
  SiteFooter,
  SiteNav,
  WhatsInReport,
  WhyUs,
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
        {/* Hero owns id="top" and its own immersive CourtBackdrop. */}
        <Hero />

        {/* Proof strip → problem framing → how it works. */}
        <ProofStats />
        <Problem />
        <HowItWorks />

        {/* What we cover (featured tennis/soccer/basketball). */}
        <MultiSportCoverage />

        {/* The live coach-ready report, opens on Tennis. Nav "Report" target. */}
        <div id="report" className="scroll-mt-20">
          <ReportBento />
        </div>

        {/* The three report pillars, the human-vs-AI table, then pricing. */}
        <WhatsInReport />
        <HumanVsAi />

        {/* Full token packs + academy site license. Every Unlock → flow. */}
        <Pricing />

        {/* Positioning, then the closing CTA. */}
        <WhyUs />
        <FinalCta />

        {/* FAQ closes the page. */}
        <Faq />
      </main>

      <SiteFooter />
    </FreemiumFlowProvider>
  );
}
