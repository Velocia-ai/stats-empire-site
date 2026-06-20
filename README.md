# Stats Empire

Marketing site for **Stats Empire** — multi-sport, human-led + AI-assisted match intelligence. Trained analysts log and audit full-match footage (with AI assisting capture and flagging) and deliver coach-ready statistical reports and spatial visualizations.

**Live:** https://stats-empire-demo.netlify.app

## Stack
- Next.js 14 (App Router) · React 18 · TypeScript
- Tailwind CSS · framer-motion
- D3 (heatmaps, spray/shot charts, zone coverage, trajectories) · Recharts (trends)
- Static export (`output: 'export'`) deployed on Netlify

## Develop
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to ./out
```

## Structure
- `app/` — App Router pages + layout (3 switchable brand themes, default "Court Vision")
- `components/landing/` — marketing sections
- `components/viz/` — sport-agnostic D3/Recharts primitives + per-sport pitch backgrounds
- `components/freemium/` — free-trial onboarding flow
- `components/report/` — sport-toggle "Coach-Ready Report" bento
- `lib/sports/` — per-sport adapters + realistic mock data
- `lib/content.ts`, `lib/pricing.ts` — copy + offers

Sports covered: tennis, soccer, basketball, baseball/softball, American Football.
