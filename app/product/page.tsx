// Stats Empire, Product route (/product) , the product showcase.
//
// The shared chrome (SiteNav + global ThemeSwitcher, SiteFooter) and the
// app-wide freemium funnel come from app/layout.tsx via <AppProviders>, so this
// page just composes the showcase sections. The report bento opens on Tennis
// (the lead featured sport) and morphs across all five via its SportToggle.
//
// Section order:
//   ProductHero(#top) · ReportBento(#report, default Tennis) · WhatsInReport
//   · FreeSampleCta(#free-game, opens the funnel)
//
// Cross-links: the hero crosses to /pricing; the free-sample CTA and the funnel
// it opens deliver the actual try-a-game experience. The story + value live on
// the home page (/); the plans live on /pricing.

import { ReportBento } from '@/components/report';
import { WhatsInReport } from '@/components/landing';
import { FreeSampleCta, ProductHero, TeamStatsExplorer } from '@/components/product';

export const metadata = {
  title: 'Product, Stats Empire',
  description:
    'See the coach-ready report: spatial maps, headline stats, an advanced metric table and a momentum trend, then try a real match free.',
};

export default function ProductPage() {
  return (
    <main className="relative overflow-x-hidden">
      {/* Short product intro + "Try a free game" funnel CTA. */}
      <ProductHero />

      {/* The live coach-ready report (opens on Tennis) with its three pillars
          underneath. Each section carries its own consistent vertical rhythm,
          so the two read as a calm pair with room to breathe between them.
          Nav "Report" target. */}
      <div id="report" className="scroll-mt-24">
        <ReportBento defaultSport="tennis" className="pb-0" />
        <WhatsInReport className="pt-0" />
      </div>

      {/* Coach-facing individual + team stats explorer (#stats-explorer): the
          full demo squad across three timeframe windows, a sortable roster
          table and a clip-by-clip video + AI provenance note. Sits after the
          report pillars, before the closing CTA. */}
      <TeamStatsExplorer />

      {/* Closing free-sample CTA (#free-game), opens the freemium funnel. */}
      <FreeSampleCta />
    </main>
  );
}
