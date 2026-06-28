// Stats Empire, JSON-LD structured data (schema.org).
//
// Centralises the structured data we emit into <script type="application/ld+json">
// tags. Two blocks:
//   - organizationJsonLd : site-wide Organization, injected once in the root layout.
//   - serviceJsonLd      : the human-led, AI-assisted match-analysis Service with
//                          an OfferCatalog of the real token packs, injected on
//                          /pricing.
//
// Pricing figures are derived from lib/pricing.ts (the single source of truth),
// so the structured data can never drift from the rendered pricing table.

import { TOKEN_PACKS } from '@/lib/pricing';

export const SITE_URL = 'https://stats-empire-demo.netlify.app';
const SITE_NAME = 'Stats Empire';

// Site-wide Organization. Logo points at the SVG icon emitted by app/icon.svg.
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description:
      'Human-led, AI-assisted multi-sport match intelligence. Trained analysts log every event and deliver coach-ready visual stats reports.',
    sameAs: [] as string[],
  };
}

// The core service plus an OfferCatalog built from the real token packs. Each
// pack becomes an Offer priced in USD; the Pay-Per-Match pack is the baseline
// per-match rate.
export function serviceJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Match Intelligence Report',
    serviceType: 'Multi-sport match analysis',
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    description:
      'Human-led, AI-assisted match analysis. One token covers one fully logged match report, with spatial maps, headline stats, an advanced metric table and momentum trends, turned around in 12 to 24 hours.',
    areaServed: 'Worldwide',
    url: `${SITE_URL}/pricing/`,
    offers: {
      '@type': 'OfferCatalog',
      name: 'Token packs',
      itemListElement: TOKEN_PACKS.map((pack) => ({
        '@type': 'Offer',
        name: `${pack.pack} (${pack.tokens} ${pack.tokens === 1 ? 'token' : 'tokens'})`,
        description: pack.bestFor,
        price: pack.price.toFixed(2),
        priceCurrency: 'USD',
        category: 'Match analysis tokens',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing/`,
      })),
    },
  };
}
