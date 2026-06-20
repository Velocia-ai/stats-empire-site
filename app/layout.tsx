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
import './globals.css';

// Display / body fonts shared across themes.
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

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

// Monospace fonts (theme-specific). Weight required for the non-variable families.
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-space-mono',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
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

export const metadata: Metadata = {
  title: 'Stats Empire, Multi-Sport Match Intelligence',
  description:
    'Human analysts watch full footage and tag every event like a coach would, then deliver a coach-ready visual stats report.',
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
        <ThemeProvider>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
