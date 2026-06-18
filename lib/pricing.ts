// Stats Empire, pricing model (token packs + academy site license).
// Single source of truth for every pricing surface (packs grid, license tiers,
// add-ons, delivery/rollover notes, Western charting anchor). Numbers are taken
// verbatim from the official pitch deck, do not "round" or recompute them.

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

// One annual enterprise license tier (academies / clubs / federations).
export interface AcademyTier {
  /** Tier name, e.g. "Moderate". */
  name: string;
  /** Annual license cost in USD (approximate, see `display`). */
  perYear: number;
  /** Matches covered per year at this tier. */
  matchesPerYear: number;
  /** Effective per-match price in USD at this tier. */
  perMatch: number;
  /** Flagged as the recommended tier in the UI. */
  highlighted?: boolean;
  /** Pre-formatted "~$X/yr" string for display (these figures are approximate). */
  display: string;
}

// Standard vs express delivery contract.
export interface Delivery {
  /** Headline for the standard (included) turnaround. */
  standard: string;
  /** Express upgrade note (24h = +1 token). */
  express: string;
}

// --- Token packs -------------------------------------------------------------
// Per-match price drops $49 -> $29 as volume scales.

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

// --- Academy site license (enterprise, annual) -------------------------------
// Per-player works out to ~$5-50/yr depending on roster size and volume.

export const ACADEMY_TIERS: AcademyTier[] = [
  {
    name: 'Pilot',
    perYear: 20_400,
    matchesPerYear: 600,
    perMatch: 34,
    display: '~$20,400/yr',
  },
  {
    name: 'Moderate',
    perYear: 87_000,
    matchesPerYear: 3_000,
    perMatch: 29,
    highlighted: true,
    display: '~$87,000/yr',
  },
  {
    name: 'Full Rollout',
    perYear: 200_000,
    matchesPerYear: 8_000,
    perMatch: 25,
    display: '~$200,000/yr',
  },
];

// Everything bundled into an Academy Site License.
export const LICENSE_INCLUDES: string[] = [
  'Dedicated logging team assigned to your academy',
  'Priority turnaround on every report',
  'Academy-wide analytics dashboard',
  'Per-coach and per-squad accounts',
  'Onboarding and dedicated account management',
  'Roster pricing of roughly $5-50 per player, per year',
];

// --- Delivery, rollover, add-ons, market anchor ------------------------------

export const DELIVERY: Delivery = {
  standard: 'Standard delivery included with every token.',
  express: 'Need it overnight? Express 24-hour turnaround is +1 token per match.',
};

export const ROLLOVER: string =
  'Tokens roll over for 12 months and never expire mid-season. One account, one shared token balance across your whole squad.';

export const ADDONS: string[] = [
  'Opponent scouting reports',
  'Multi-match progress trends',
];

export const WESTERN_ANCHOR: string =
  'Typical Western human match-charting runs $100+ per match. Stats Empire starts at $49 and drops to $29 as you scale.';
