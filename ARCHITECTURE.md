# Stats Empire, Architecture

A Next.js 14 (App Router) demo that turns full-game footage into a **coach-ready
visual report** across 5 sports. This document maps the component tree, the
data flow, exactly where **D3** is used versus **Recharts**, the 3-theme token
system, the sport-toggle morph mechanism, and how to run it.

---

## 1. Run instructions

```bash
cd stats-empire-app
npm install        # ~480 packages, pinned versions
npm run dev        # dev server → http://localhost:3000
```

Other scripts:

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Next dev server (HMR)                         |
| `npm run build`      | Production build (`/` prerenders static)      |
| `npm run start`      | Serve the production build                    |
| `npm run type-check` | `tsc --noEmit`, strict, zero-error contract  |
| `npm run lint`       | `next lint` (`next/core-web-vitals`)          |

**Routes:** the marketing site is split into **three prerendered pages** in the
**Court Vision** identity (the default theme), assembled from the
`components/landing/*`, `components/report/*` and `components/product/*` sections.
The shared chrome and the flagship freemium funnel live in the layout so they are
identical on every route:

| Route       | File                   | Role                | Sections |
|-------------|------------------------|---------------------|----------|
| `/`         | `app/page.tsx`         | **Home, the story + value** | Hero(`#top`, + trust badge) · ProofStats · Provenance(`#provenance`, how it's made) · MultiSportCoverage(`#coverage`) · WhyHybrid: Problem(`#problem`) + HumanVsAi · OpponentScouting · FinalCta |
| `/product`  | `app/product/page.tsx` | **Product showcase** | ProductHero(`#top`) · [ReportBento(default Tennis) + WhatsInReport](`#report`) · FreeSampleCta(`#free-game`) |
| `/pricing`  | `app/pricing/page.tsx` | **The plans**       | PricingHero(`#top`) · Pricing(`#pricing`, token packs + Leagues & Federations) · BilingualStrip · Faq(`#faq`) |

Shared, layout-level surfaces (in `app/layout.tsx` → `<AppProviders/>`, shown on
all three routes):

- **Freemium flow**, every CTA labeled **Start Free / Unlock / Try a free game**
  opens the single `<FreemiumFlow/>` (signup → pick sport → unlock → free-trial
  dashboard). `<AppProviders/>` wraps every page in `<FreemiumFlowProvider>`,
  which mounts the flow once and exposes `useFreemiumTrigger()` to every CTA on
  any route, so no section needs an explicit `onStart` (zero prop-drilling).
- **`<SiteNav/>`** is fixed at the top and embeds the global `<ThemeSwitcher/>`
  (A/B/C); Court Vision (**B**) is active by default, A/Evolved and C/Precision
  still switchable. Its links are real routes via `next/link`: Home `/`, Product
  `/product`, Pricing `/pricing`, How it works `/#provenance`, FAQ `/pricing#faq`.
- **`<SiteFooter/>`** with route-aware nav columns (internal links via
  `next/link`, `mailto:` as plain anchors).

**Report bento** (`<ReportBento/>`, `#report` on `/product`) has a live 5-sport
toggle and **opens on Tennis** (the lead featured sport). `WhatsInReport` (the
three report pillars) is folded directly beneath it under the shared `#report`
wrapper so the report reads as one continuous section.

**Why hybrid** (on `/`): `Problem` (single-mode vs hybrid framing) flows straight
into `HumanVsAi` (the dimension-by-dimension table). The old standalone `WhyUs`
trio and the thinner `HowItWorks` are still exported from
`components/landing/index.ts` but are not mounted; the richer `Provenance`
chain-of-custody pipeline carries the "how it works" explainer and owns the nav's
*How it works* link (→ `/#provenance`).

In-page nav anchors still scroll smoothly (`html { scroll-behavior: smooth;
scroll-padding-top: 5rem }` in `globals.css`, offsetting the fixed nav; both
neutralised under `prefers-reduced-motion`). Cross-page links go through
`next/link`: the home hero's sample-report button → `/product`; the product hero
→ `/pricing`; home/product/pricing cross-link each other.

The preview port is `8754` via `.claude/launch.json` (`stats-empire-app`).

---

## 2. Component tree

```
app/layout.tsx  (Server Component)              ◀── shared by ALL routes
│  • loads 6 Google fonts via next/font → CSS variables
│  • <html data-theme="court" suppressHydrationWarning>   ◀── Court Vision = default
│  └─ <ThemeProvider>  (client: React context + localStorage + html[data-theme])
│     └─ <AppProviders/>  ("use client", the single shared shell)
│        │
│        └─ <FreemiumFlowProvider>  mounts ONE <FreemiumFlow/> + exposes
│           │                       useFreemiumTrigger() to every CTA, every route
│           │
│           ├─ <SiteNav/>     fixed top; next/link routes + Start Free CTA +
│           │                 global <ThemeSwitcher/> (A/B/C; Court=B) + mobile sheet
│           │
│           ├─ {children}     ◀── the per-route page (one of the three below)
│           │
│           ├─ <SiteFooter/>  wordmark + route-aware nav columns + contact + legal
│           │
│           └─ <FreemiumFlow/>  ("use client"), mounted by the provider
│               ├─ register  → <SignupModal/>        (dialog, focus trap, "100% FREE")
│               ├─ select    → <SportSelector/>      (5-sport radiogroup; leads tennis/
│               │                                      soccer/basketball via SPORTS order)
│               ├─ unlock    → <UnlockFreeGame/>     (padlock → unlock reveal animation)
│               └─ dashboard → <FreeTrialDashboard/> (real viz primitives + soft upsell)
│                    ├─ StatTiles, MetricTable, TrendChart
│                    └─ PitchBackground + spatial layer chosen by spatialKind
│
├─ app/page.tsx          /         HOME (server composition)
│   └─ <main>
│       ├─ <Hero sampleHref="/product"/>  #top, CourtBackdrop + rotating card;
│       │                                 Start Free → flow, sample → /product
│       ├─ <ProofStats/>            count-up proof strip
│       ├─ <Provenance/>            #provenance, 4-step chain-of-custody pipeline
│       ├─ <MultiSportCoverage/>    #coverage, featured tennis/soccer/basketball
│       ├─ <Problem/>               #problem  ┐ Why hybrid
│       ├─ <HumanVsAi/>             comparison ┘  (single merged stretch)
│       ├─ <OpponentScouting/>      pre-match dossier add-on → flow
│       └─ <FinalCta/>              "Turn footage into wins." → flow
│
├─ app/product/page.tsx  /product  PRODUCT (server composition)
│   └─ <main>
│       ├─ <ProductHero/>  ("use client") #top, short intro; "Try a free game" → flow,
│       │                                 cross-links to /pricing
│       ├─ <div id="report">                ◀── nav "Report" target (scroll-mt-24)
│       │   ├─ <ReportBento defaultSport="tennis"/>  ("use client"), opens on TENNIS
│       │   │    ├─ <SportToggle/>   WAI-ARIA radiogroup, 5 sports, layoutId pill
│       │   │    └─ 6-col bento grid of <BentoTile/> (each body keyed on `sport`)
│       │   │         ├─ HERO spatial → PitchBackground + (SprayChart│Heatmap│TrajectoryLines)
│       │   │         ├─ Headline     → StatTiles (first 4 metrics)
│       │   │         ├─ Zone control → PitchBackground + ZoneCoverage
│       │   │         ├─ Trajectories → PitchBackground + TrajectoryLines
│       │   │         ├─ Form trend   → TrendChart   ◀── the ONLY Recharts surface
│       │   │         └─ Advanced     → MetricTable (full metric set)
│       │   └─ <WhatsInReport/>      Performance/Patterns/Progress pillars
│       └─ <FreeSampleCta/>  ("use client") #free-game, "Unlock a free game" → flow
│
└─ app/pricing/page.tsx  /pricing  PRICING (server composition)
    └─ <main>
        ├─ PricingHero()              #top, short inline header (server)
        ├─ <Pricing/>                 #pricing, token packs + Leagues & Federations;
        │                             every Unlock CTA → flow (lib/pricing.ts)
        ├─ <BilingualStrip/>          bilingual capability badge
        └─ <Faq/>                     #faq, accessible accordion
```

`ThemeProvider` (theme) and `FreemiumFlowProvider` (funnel open-state) are the
two app-wide contexts, both established once in the layout so they span every
route. Every "Start Free / Unlock / Try a free game" CTA across `SiteNav`,
`Hero`, `ProductHero`, `FreeSampleCta`, `Pricing`, `OpponentScouting` and
`FinalCta` resolves the **same** flow via `useFreemiumTrigger()`, no `onStart`
prop-drilling. `ReportBento` owns only its local `sport` state; the funnel owns
its step state. The three page files are plain server compositions; the
`'use client'` boundary lives in `AppProviders` and in the individual interactive
sections.

---

## 3. Data flow: types → adapters → primitives → features

```
lib/types.ts                     ← the single source of truth (contracts)
   │   SportData, SpatialPoint, HeatCell, ZonePolygon, TrajectoryPath,
   │   MetricRow, TrendSeries, FreeGame, SportMeta, SportKey, PitchType, Outcome
   ▼
lib/sports/*.ts                  ← per-sport adapters (mock fixtures)
   │   baseball / americanfootball / basketball / tennis / soccer each `export default SportData`
   │   lib/sports/index.ts exposes:
   │     • SPORTS: SportMeta[]              (ordered list for nav/toggle/grid)
   │     • getSportData(key): SportData     (Record-backed registry lookup)
   ▼
components/viz/*                  ← presentational primitives (pure, no fetching)
   │   geometry.ts  → makeProjector(pitch) maps normalized 0..1 → SVG pixels
   │   PitchBackground, Heatmap, SprayChart, ZoneCoverage, TrajectoryLines (D3)
   │   StatTiles, MetricTable (server-safe), TrendChart (Recharts)
   ▼
components/report/* + components/freemium/*   ← feature surfaces
       call getSportData() / SPORTS, then feed SportData fields into the
       primitives. They own UX state (sport, funnel step); never own data.
```

Every coordinate in `SportData.spray / heatmap / zones / trajectories` is
**normalized 0..1** on the pitch. `geometry.makeProjector(pitch)`
(`components/viz/geometry.ts:69`) projects those into the per-pitch viewBox so
`PitchBackground` and any data layer **stack pixel-for-pixel** inside a
`relative` container.

Field-to-primitive mapping (driven by `SportData.spatialKind`):

| `spatialKind` | sport(s)        | hero primitive                       |
| ------------- | --------------- | ------------------------------------ |
| `spray`       | baseball, tennis| `SprayChart mode="spray"`            |
| `shot`        | basketball      | `SprayChart mode="shot"`             |
| `heatmap`     | americanfootball| `Heatmap`                            |
| `passmap`     | soccer          | `TrajectoryLines animate`            |

---

## 4. D3 vs Recharts, exactly where each is used

**Rule of thumb:** D3 powers the **bespoke spatial SVG** (scales, shapes,
color ramps, geometry); React renders every element as JSX, D3 never mutates
React-owned DOM. **Recharts** powers the **one conventional time-series chart**
(the form-trend area chart).

### D3 (spatial viz, `components/viz/`)

| File                         | D3 modules / line refs                                                                                                           | Used for                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `SprayChart.tsx`             | `d3-shape` `symbol*` (`:16`), `d3-scale` `scaleSqrt` (`:17`, applied `:98`), `d3-array` `extent` (`:18`, `:96`), `symbol()` path (`:108`) | mark size by `value`; colorblind-safe symbol shapes per `Outcome`        |
| `Heatmap.tsx`                | `d3-interpolate` `interpolateRgb`/`quantize` (`:14`, ramp `:56`), `d3-scale` `scaleQuantize` (`:15`, `:51`), `d3-array` `max` (`:16`, `:49`) | quantized intensity buckets over an accent-opacity ramp                  |
| `ZoneCoverage.tsx`           | `d3-scale` `scaleQuantize` (`:14`, `:54`), `d3-array` `extent` (`:15`, `:51`), `d3-polygon` `polygonCentroid` (`:16`, `:61`)      | polygon shading by `value`; centroid for label/value placement            |
| `TrajectoryLines.tsx`        | `d3-shape` `line` + `curveCatmullRom` (`:16`, generator `:60`, `.curve(...alpha(0.6))` `:63`)                                    | smooth curved path generation; React renders the `<path d=...>`          |
| `geometry.ts`                | *(no D3)*, plain TS projector (`makeProjector` `:69`, `viewBoxAttr` `:49`)                                                       | normalized 0..1 → viewBox pixel mapping shared by all layers             |

`PitchBackground.tsx` is hand-authored SVG (no D3, no Recharts); it uses
`useId()` for its gradient `<defs>` namespace to stay SSR/CSR-stable.

### Recharts (the single chart, `components/viz/TrendChart.tsx`)

| Concern              | Line ref(s)                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| import               | `recharts` (`:28`), `AreaChart` (`:22`), `ResponsiveContainer` (`:24`), Area/Grid/Axis/Tooltip |
| chart render         | `<ResponsiveContainer>` (`:184`) → `<AreaChart>` (`:185` … `:245`)           |
| live theme re-color  | `useThemeColors()` (`:62`) resolves `--color-*` off `document.documentElement`; a `MutationObserver` on `data-theme` (`:79`) re-resolves on every A/B/C switch (Recharts SVG can't inherit Tailwind utilities) |

`TrendChart` is the **only** Recharts consumer. It is rendered in two places, 
the ReportBento "Form trend" tile and the FreeTrialDashboard, both feeding it
`data.trend.{label,xLabels,series}`.

---

## 5. The 3-theme token system

Themes are pure **CSS variables**, swapped by a single `data-theme` attribute on
`<html>`. No component reads a theme value to pick a color, they all use
token-mapped Tailwind utilities, so re-theming is instant and global.

```
app/globals.css           [data-theme="evolved" | "court" | "precision"] blocks
   set --color-bg / surface / surfaceAlt / text / muted / border / accent1 /
   accent2  and  --font-display / body / mono
        │
tailwind.config.ts        maps utilities → variables, e.g.
   colors.bg = var(--color-bg), colors.accent1 = var(--color-accent1),
   fontFamily.display = var(--font-display)
        │
components                use only `bg-bg text-text accent1 font-display` etc.
        │
ThemeProvider.tsx         sets document.documentElement.dataset.theme = theme
   (client) + persists to localStorage key 'stats-empire-theme'
        │
ThemeSwitcher.tsx         A/B/C radiogroup → setTheme('evolved'|'court'|'precision')
```

| Theme (switch) | bg        | accent1   | accent2   | display / body / mono             |
| -------------- | --------- | --------- | --------- | --------------------------------- |
| **A** evolved  | `#0A0E16` | `#C6F432` | `#22B8E6` | Archivo / Inter / Space Mono      |
| **B** court    | `#0B0F14` | `#E6FF3A` | `#FF5A3C` | Archivo / Inter / IBM Plex Mono   |
| **C** precision| `#0A0B0D` | `#3DDC97` | `#E8B14C` | Space Grotesk / Inter / JetBrains |

**Default theme, Court Vision (B).** `ThemeProvider.DEFAULT_THEME = 'court'` and
`app/layout.tsx` sets `data-theme="court"` at SSR (with `suppressHydrationWarning`),
so the **first paint is already Court Vision** with no flash. `ThemeSwitcher`
shows **B / Court** active by default; A/Evolved and C/Precision remain
switchable, and `ThemeProvider` re-applies any persisted choice after mount
(localStorage `stats-empire-theme`). The CSS `:root` block still mirrors
`evolved` as a token fallback, but the rendered app starts on `court`. The 6
next/font families are loaded once in the layout as
`--font-*` CSS vars; each theme's `--font-mono`/`--font-display` token points at
the appropriate one. The Recharts chart, which can't inherit utilities, mirrors
this via `useThemeColors()` + a `MutationObserver` (see §4).

---

## 6. Sport-toggle morph mechanism

`ReportBento` (`components/report/ReportBento.tsx`) owns a single
`useState<SportKey>` (`:140`). The whole report is derived from it:

```
SportToggle.onChange(key) ──▶ setSport(key)
        │
        ▼
data = useMemo(() => getSportData(sport), [sport])   // ReportBento.tsx:143
        │
        ├─ pitch = data.pitch
        ├─ HeroSpatial picks the primitive by data.spatialKind   (:77, :206)
        ├─ StatTiles ← data.metrics.slice(0,4)                    (:222)
        ├─ ZoneCoverage ← data.zones                             (:233)
        ├─ TrajectoryLines ← data.trajectories                   (:250)
        ├─ TrendChart ← data.trend                               (:268)
        └─ MetricTable ← data.metrics                            (:290)
```

**Why it doesn't stall:** the bento **grid and tile frames stay mounted** across
sport changes. Only each tile's **body** remounts and cross-fades, via
`<BentoTile contentKey={sport}>` (`BentoTile.tsx`), a keyed `framer-motion`
fade-in with **no `AnimatePresence` exit**. An earlier `AnimatePresence
mode="wait"` approach stalled because nested viz animations held the exit open;
keying the body without an exit transition fixed it. Reduced-motion users get an
instant swap.

`SportToggle` itself is a WAI-ARIA radiogroup with roving tabindex + arrow/
Home/End keys; the active marker is a `framer-motion` pill (`layoutId=
"sport-toggle-pill"`) that slides between options (snaps under reduced-motion).

The same `spatialKind`-driven selection runs in `FreeTrialDashboard` so the
freemium dashboard renders the correct spatial layer per sport too.

---

## 7. Client / server boundaries

| Module                         | Boundary        | Why                                            |
| ------------------------------ | --------------- | ---------------------------------------------- |
| `app/layout.tsx`               | Server          | font loading, metadata, `data-theme="court"`   |
| `app/page.tsx` `/product` `/pricing` | Server    | plain section compositions (no hooks of their own) |
| `components/AppProviders.tsx`  | **Client**      | shared shell: mounts the funnel + SiteNav/SiteFooter on every route |
| `components/product/*`         | Client          | ProductHero + FreeSampleCta (funnel CTAs)      |
| `components/landing/*`         | Client          | section UI + scroll/in-view + framer-motion     |
| `FreemiumFlowProvider`         | Client          | app-wide funnel open-state via `useFreemiumTrigger()` |
| `ThemeProvider/ThemeSwitcher`  | Client          | context + localStorage + DOM attribute         |
| `ReportBento/SportToggle/BentoTile` | Client     | `useState`, framer-motion                      |
| `freemium/*`                   | Client          | dialog, focus trap, funnel state, animation    |
| viz spatial primitives         | Client          | D3 scales + framer-motion (TrajectoryLines)    |
| `StatTiles`, `MetricTable`     | Server-safe     | pure presentational (renderable in RSC)        |
| `TrendChart`                   | Client          | Recharts + runtime theme color resolution      |
| `lib/types.ts`, `lib/sports/*` | Server/shared   | plain data + types, no React                   |

---

## 8. Stack (pinned)

`next@14.2.30`, `react`/`react-dom@18.3.1`, `typescript@5.6.3` (strict),
`tailwindcss@3.4.17`, `d3@7.9.0` (+ `@types/d3@7.4.3`), `recharts@2.15.4`,
`framer-motion@11.18.2`, `clsx@2.1.1`, `lucide-react@0.469.0`.

**Verified:** `npm run type-check` (tsc --noEmit, exit 0, zero errors) and
`npm run build` (compiled successfully) pass green. The build prerenders all
three marketing routes as static content: `/` (Home), `/product` (Product
showcase) and `/pricing` (Pricing), plus `/_not-found`, with Court Vision as the
default theme.
