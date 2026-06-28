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

import type { Metadata } from 'next';

const PRODUCT_DESCRIPTION =
  'See the coach-ready match report: spatial maps, headline stats, an advanced metric table and a momentum trend, then try a real match free.';

// Title is run through the root template (-> "... | Stats Empire"), so the base
// stays keyword-led and short. openGraph/twitter inherit the root defaults and
// override only title, description and the per-route URL/canonical.
export const metadata: Metadata = {
  title: 'Product: Coach-Ready Match Reports',
  description: PRODUCT_DESCRIPTION,
  alternates: {
    canonical: '/product',
  },
  openGraph: {
    title: 'Product: Coach-Ready Match Reports | Stats Empire',
    description: PRODUCT_DESCRIPTION,
    url: '/product',
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
    title: 'Product: Coach-Ready Match Reports | Stats Empire',
    description: PRODUCT_DESCRIPTION,
    images: ['/og.png'],
  },
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
