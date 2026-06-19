// Stats Empire, pricing model (self-serve token packs + custom Leagues offering).
// Single source of truth for every pricing surface (packs grid, leagues tier,
// add-ons, delivery/rollover notes, value statement). Numbers are taken
// verbatim from the official pitch deck, do not "round" or recompute them.
//
// Positioning: human-led, AI-assisted. AI pre-tags events and flags moments,
// trained human analysts do the final logging, control, review and audit. The
// human has the final say. Value is framed positively, transparent pay-per-match
// token pricing vs opaque, seat-based "contact sales" enterprise contracts.

// --- Types -------------------------------------------------------------------

// One row in the pay-as-you-scale token-pack ladder.
export interface TokenPack {
  /** Pack name, e.g. "Academy". */
  pack: string;
  /** Tokens included; 1 token = 1 fully logged match report. */
  tokens: number;
  /** Total price in USD for the pack. */
  price: number;
  /** Effective per-match price in USD (price / tokens). */
  perMatch: number;
  /** Headline discount vs the $49 pay-per-match baseline; 0 on the baseline pack. */
  save: number;
  /** Flagged as the recommended pack in the UI. */
  mostPopular?: boolean;
  /** Short "who this is for" line for the pack card. */
  bestFor: string;
}

// A recurring highlight-reel cadence inside the Leagues offering.
export interface HighlightCadence {
  /** Cadence name, e.g. "Weekly". */
  name: string;
  /** What lands on this cadence. */
  description: string;
}

// The custom Leagues & Federations offering (premium, biggest-deal tier).
// Pricing is bespoke, so this carries no numbers, only what is included plus a CTA.
export interface LeagueOffering {
  /** Tier name shown in the UI. */
  name: string;
  /** One-line positioning for the tier. */
  tagline: string;
  /** Everything bundled into a league deal. */
  includes: string[];
  /** Highlight-reel cadences available league-wide. */
  cadences: HighlightCadence[];
  /** Pricing note; bespoke, not a fixed figure. */
  priceNote: string;
  /** Short note clarifying that terms are bespoke. */
  note: string;
  /** Call-to-action label. */
  cta: string;
}

// Standard vs express delivery contract.
export interface Delivery {
  /** Headline for the standard (included) turnaround. */
  standard: string;
  /** Express upgrade note. */
  express: string;
}

// --- Token packs -------------------------------------------------------------
// Self-serve, per-club tier. Per-match price drops $49 -> $29 as volume scales.

export const TOKEN_PACKS: TokenPack[] = [
  {
    pack: 'Pay-Per-Match',
    tokens: 1,
    price: 49,
    perMatch: 49,
    save: 0,
    bestFor: 'A single match, no commitment, the baseline rate.',
  },
  {
    pack: 'Starter',
    tokens: 10,
    price: 440,
    perMatch: 44,
    save: 10,
    bestFor: 'One athlete or a short season block.',
  },
  {
    pack: 'Squad',
    tokens: 50,
    price: 1_950,
    perMatch: 39,
    save: 20,
    bestFor: 'A full squad sharing one token balance.',
  },
  {
    pack: 'Academy',
    tokens: 200,
    price: 6_800,
    perMatch: 34,
    save: 30,
    mostPopular: true,
    bestFor: 'Multi-team academies logging week in, week out.',
  },
  {
    pack: 'Elite',
    tokens: 500,
    price: 14_500,
    perMatch: 29,
    save: 40,
    bestFor: 'High-volume programs at the lowest per-match rate.',
  },
];

// --- Leagues & Federations (custom, premium tier) ----------------------------
// Replaces the old academy/site-license enterprise tiers. A full league
// solution, the biggest-deal tier above the self-serve token packs.

export const LEAGUE_OFFERING: LeagueOffering = {
  name: 'Leagues & Federations',
  tagline: 'A complete, human-led intelligence platform for your entire competition.',
  includes: [
    'A custom league website and portal, branded to your competition',
    'A league-wide stat and leaderboard hub across every club and player',
    'Human-led, AI-assisted per-match analysis for every club in the league',
    'Senior-audited reports, with trained analysts having the final say',
    'Dedicated account management and league-wide onboarding',
  ],
  cadences: [
    {
      name: 'Weekly',
      description: 'Automated highlight reels every matchweek, ready to share.',
    },
    {
      name: 'Monthly',
      description: 'Monthly highlight packages capturing the best of the round.',
    },
    {
      name: 'Seasonal',
      description: 'Season-long highlight films and award-night showreels.',
    },
  ],
  priceNote: 'Custom pricing, additional terms apply.',
  note: 'Scoped to your competition, league size and cadence. Additional terms apply.',
  cta: 'Talk to us',
};

// --- Delivery, rollover, add-ons, value statement ----------------------------

export const DELIVERY: Delivery = {
  standard: 'Express delivery in 12h to 24h, included with every token.',
  express: 'Human-led, AI-assisted logging, turned around in 12h to 24h.',
};

export const ROLLOVER: string =
  'Tokens roll over for 12 months and never expire mid-season. One account, one shared token balance across your whole squad.';

export const ADDONS: string[] = [
  'Opponent scouting reports',
  'Multi-match progress trends',
];

export const VALUE_STATEMENT: string =
  'Transparent, pay-per-match token pricing, no seat-based "contact sales" enterprise contracts. Pro-grade, human-led analysis, accessible to every club, with no lock-in.';
