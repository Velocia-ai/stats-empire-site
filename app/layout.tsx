import type { Metadata, Viewport } from 'next';
import {
  Archivo,
  Inter,
  Space_Mono,
  Space_Grotesk,
  IBM_Plex_Mono,
  JetBrains_Mono,
} from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import AppProviders from '@/components/AppProviders';
import { organizationJsonLd } from '@/lib/jsonld';
import './globals.css';

// FONT PRELOAD STRATEGY
// ---------------------
// The default (first-paint) theme is "court", whose families are Archivo
// (display), Inter (body) and IBM Plex Mono (mono). Only those three are
// above-the-fold, so only they keep preload: true. The other three families
// belong to the non-default "evolved" / "precision" themes and only load if the
// visitor switches theme, so they set preload: false. This trims ~9 force-
// preloaded woff2 files down to the 2-3 critical ones without losing any theme.

// Above-the-fold (default "court" theme): preloaded.
const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
});

// Non-default themes only (loaded on theme switch): not preloaded.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-space-grotesk',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-space-mono',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-jetbrains-mono',
});

const fontVars = [
  archivo.variable,
  inter.variable,
  spaceGrotesk.variable,
  spaceMono.variable,
  ibmPlexMono.variable,
  jetbrainsMono.variable,
].join(' ');

// metadataBase makes every relative OG/Twitter/canonical URL resolve against the
// live domain, and lets the file-based app/opengraph-image.tsx be picked up as
// the default social image for every route. siteName + a single default
// openGraph/twitter block here flow down to /product and /pricing, which only
// override title/description/url/canonical.
const SITE_URL = 'https://stats-empire-demo.netlify.app';
const SITE_DESCRIPTION =
  'Human analysts watch full footage and tag every event like a coach would, then deliver a coach-ready visual stats report. Human-led, AI-assisted, multi-sport.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Stats Empire, Human-Led Multi-Sport Match Intelligence',
    template: '%s | Stats Empire',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'Stats Empire',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Stats Empire, Human-Led Multi-Sport Match Intelligence',
    description: SITE_DESCRIPTION,
    url: '/',
    siteName: 'Stats Empire',
    type: 'website',
    locale: 'en_US',
    // Explicit committed PNG (public/og.png -> out/og.png), served with a real
    // image/png Content-Type by the host. The extension matters: an extensionless
    // metadata-route file is served as application/octet-stream, which Facebook
    // and LinkedIn reject. width/height/type let scrapers skip a fetch.
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
    title: 'Stats Empire, Human-Led Multi-Sport Match Intelligence',
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  // Court Vision bg, matches the default data-theme="court".
  themeColor: '#0b0f14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // data-theme defaults to 'court' (Court Vision is the brand identity), so the
  // first paint is already on-brand. ThemeProvider updates it on the client
  // after reading localStorage. suppressHydrationWarning guards that swap.
  //
  // AppProviders is the shared client shell for EVERY route: it mounts the
  // app-wide freemium funnel once and renders the SiteNav (with the global
  // ThemeSwitcher) + SiteFooter around the per-page children, so the "Start
  // Free" CTA works identically on Home, Product and Pricing.
  return (
    <html lang="en" data-theme="court" className={fontVars} suppressHydrationWarning>
      <body>
        {/* Site-wide Organization structured data. dangerouslySetInnerHTML is the
            standard, safe way to emit JSON-LD: the payload is our own static,
            JSON.stringify-escaped object, no user input. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <ThemeProvider>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
