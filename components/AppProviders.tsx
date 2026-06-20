'use client';

// Stats Empire, AppProviders
//
// The single client boundary that wraps EVERY route. It mounts the app-wide
// freemium funnel once (via <FreemiumFlowProvider>, which internally renders a
// single <FreemiumFlow/>) and lays out the shared chrome shown on all pages:
//
//   <SiteNav/>   fixed top nav, Start Free CTA + global <ThemeSwitcher/>
//   {children}   the per-route page (Home / Product / Pricing)
//   <SiteFooter/>
//
// Because the provider lives here at the layout level, every "Start Free" /
// "Unlock" / sample-report CTA anywhere in the tree resolves the SAME funnel
// through useFreemiumTrigger() with zero prop drilling, on every route. The
// register / buy-tokens callbacks are demo stubs; wire them to real endpoints
// in production.
//
// Kept as a thin client component so app/layout.tsx can stay a server component
// (fonts, metadata, data-theme="court" at SSR).

import { FreemiumFlowProvider } from '@/components/freemium';
import { SiteFooter, SiteNav } from '@/components/landing';

export default function AppProviders({ children }: { children: React.ReactNode }) {
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
      {/* Fixed top nav, shown on every route (Start Free CTA + ThemeSwitcher). */}
      <SiteNav />

      {children}

      {/* Shared footer, shown on every route. */}
      <SiteFooter />
    </FreemiumFlowProvider>
  );
}
