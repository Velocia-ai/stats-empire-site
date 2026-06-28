'use client';

// =============================================================================
// LazyTrendChart, the code-split boundary for the Recharts momentum chart.
// -----------------------------------------------------------------------------
// TrendChart is the ONLY Recharts consumer in the app, and Recharts + its d3
// dependencies are a large bundle (~606KB raw / ~157KB brotli). Importing
// TrendChart statically pulled that whole chunk into the SHARED client bundle,
// so it shipped on every route, including the chart-free Home and Pricing pages
// (Recharts actually renders only inside the /product report bento and the
// freemium trial dashboard).
//
// This wrapper isolates that cost: it loads TrendChart through next/dynamic with
// `ssr: false`, so Recharts lands in its OWN async chunk that is fetched only on
// the routes that actually mount a chart. Home and Pricing no longer carry it in
// their First Load JS. `ssr: false` is also correct here because TrendChart is
// fully client-only (it reads live CSS custom properties off <html> and uses an
// IntersectionObserver-driven draw-on), and the app is a static export, so there
// is nothing meaningful to server-render for the chart anyway.
//
// While the async chunk loads, we show a sized skeleton that matches the chart's
// own box (the `h-64 sm:h-80` plot plus header room) so the surrounding layout
// does not jump. Drop-in: this component takes the SAME props as TrendChart and
// is re-exported as `TrendChart`, so existing call sites switch by changing only
// their import path.
// =============================================================================

import dynamic from 'next/dynamic';
import type { TrendSeries } from '@/lib/types';

export interface LazyTrendChartProps {
  label: string;
  xLabels: string[];
  series: TrendSeries[];
  xCaption?: string;
  peakSeriesIndex?: number | null;
}

/**
 * Sized placeholder shown while the Recharts chunk streams in. It mirrors the
 * real chart's outer card (rounded border + surface) and reserves the same
 * vertical footprint (a header strip plus the `h-64 sm:h-80` plot area that
 * TrendChart itself uses), so swapping the skeleton for the chart causes no
 * layout shift. Marked aria-hidden + role=presentation, it is purely visual.
 */
function TrendChartSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      {/* Header strip: title + subtitle placeholders. */}
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-2">
          <div className="h-4 w-40 rounded bg-border/60" />
          <div className="h-3 w-56 rounded bg-border/40" />
        </div>
        <div className="h-3 w-24 rounded bg-border/40" />
      </header>

      {/* Plot area: same height as the live chart's plot box so nothing jumps. */}
      <div className="h-64 w-full animate-pulse rounded-xl bg-border/20 sm:h-80" />
    </section>
  );
}

/**
 * TrendChart loaded on demand. `next/dynamic(..., { ssr: false })` keeps the
 * Recharts/d3 graph out of the shared bundle so it is only fetched on routes
 * that render a chart. `loading` renders the sized skeleton during the fetch.
 */
const LazyTrendChart = dynamic<LazyTrendChartProps>(
  () => import('./TrendChart').then((m) => m.TrendChart),
  {
    ssr: false,
    loading: () => <TrendChartSkeleton />,
  },
);

export { LazyTrendChart as TrendChart };
export default LazyTrendChart;
