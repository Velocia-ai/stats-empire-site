// Stats Empire, landing page copy as typed, importable content.
// All marketing copy lives here so section components stay logic-only and copy
// stays reviewable in one place. Voice: confident, concrete, sport-agnostic but
// leaning on tennis / soccer / basketball as the flagship sports.

// --- Types -------------------------------------------------------------------

export interface CtaLink {
  label: string;
  href: string;
}

export interface Hero {
  eyebrow: string;
  headline: string;
  subhead: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
}

export interface ProofStat {
  value: string;
  label: string;
}

export interface ProblemPoint {
  /** What an automated/AI tracker gives you. */
  ai: string;
  /** What a human analyst gives you instead. */
  human: string;
}

export interface Problem {
  eyebrow: string;
  headline: string;
  subhead: string;
  points: ProblemPoint[];
}

export interface HowStep {
  step: number;
  title: string;
  description: string;
}

export interface HowItWorks {
  eyebrow: string;
  headline: string;
  subhead: string;
  steps: HowStep[];
}

export interface ReportGroup {
  /** Performance / Patterns / Progress. */
  group: string;
  blurb: string;
  items: string[];
}

export interface WhatsInReport {
  eyebrow: string;
  headline: string;
  subhead: string;
  groups: ReportGroup[];
}

export interface ComparisonRow {
  dimension: string;
  ai: string;
  human: string;
}

export interface HumanVsAi {
  eyebrow: string;
  headline: string;
  subhead: string;
  rows: ComparisonRow[];
}

export interface WhyCard {
  /** Competitor being contrasted, e.g. "vs AI trackers". */
  versus: string;
  title: string;
  description: string;
}

export interface WhyUs {
  eyebrow: string;
  headline: string;
  subhead: string;
  cards: WhyCard[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Faq {
  eyebrow: string;
  headline: string;
  items: FaqItem[];
}

export interface FinalCta {
  eyebrow: string;
  headline: string;
  subhead: string;
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
}

export interface FooterColumn {
  title: string;
  links: CtaLink[];
}

export interface Footer {
  tagline: string;
  columns: FooterColumn[];
  contactEmail: string;
  partnershipsEmail: string;
  domain: string;
  legal: string;
}

// --- Hero --------------------------------------------------------------------

export const HERO: Hero = {
  eyebrow: 'Human-tagged match intelligence',
  headline: 'Real analysts watch the full match. You get the report.',
  subhead:
    'Stats Empire pairs every match you send us with a trained human analyst who tags the footage end to end, then delivers a coach-ready visual report. Built for tennis, soccer and basketball, available across five sports.',
  primaryCta: { label: 'See a free sample report', href: '#free-game' },
  secondaryCta: { label: 'View pricing', href: '#pricing' },
};

// --- Proof stats -------------------------------------------------------------

export const PROOF_STATS: ProofStat[] = [
  { value: '5', label: 'Sports covered, led by tennis, soccer & basketball' },
  { value: '100%', label: 'Of every match tagged by a human analyst' },
  { value: '$29', label: 'Per match at scale, vs $100+ Western charting' },
  { value: '24h', label: 'Express turnaround available on any match' },
];

// --- Problem (AI vs human) ---------------------------------------------------

export const PROBLEM: Problem = {
  eyebrow: 'The problem with automated stats',
  headline: 'AI trackers see pixels. They miss the match.',
  subhead:
    'Automated tracking is fast and cheap, and it falls apart exactly where it matters: tactical context, broken-down footage, and the moments that decide a tennis tiebreak, a soccer transition or a basketball possession.',
  points: [
    {
      ai: 'Confuses players, loses the ball in clutter, and breaks on broadcast camera cuts.',
      human: 'A trained analyst follows every player and every phase, frame by frame.',
    },
    {
      ai: 'Counts events but cannot tell you why a pattern is happening.',
      human: 'Tags intent and context, pressure, positioning, shot selection, decisions.',
    },
    {
      ai: 'Needs clean, calibrated multi-camera setups most teams will never have.',
      human: 'Works from the footage you already have: one phone, one fixed camera, broadcast.',
    },
    {
      ai: 'Outputs a raw data dump you still have to interpret yourself.',
      human: 'Delivers a coach-ready visual report your squad can read in minutes.',
    },
  ],
};

// --- How it works (4 steps) --------------------------------------------------

export const HOW_IT_WORKS: HowItWorks = {
  eyebrow: 'How it works',
  headline: 'From footage to coach-ready report in four steps.',
  subhead:
    'One token, one match. Upload what you have and we handle the rest, no calibration, no setup, no software for your staff to learn.',
  steps: [
    {
      step: 1,
      title: 'Upload your match',
      description:
        'Send full-match footage from any source, phone, fixed camera or broadcast. One token covers one match.',
    },
    {
      step: 2,
      title: 'We assign a human logger',
      description:
        'A trained analyst who knows your sport is matched to your match and owns it from first whistle to last.',
    },
    {
      step: 3,
      title: 'Every moment gets tagged',
      description:
        'The analyst logs the full match by hand, serves, passes, shots, possessions, pressure and context, not just box-score events.',
    },
    {
      step: 4,
      title: 'You get a visual report',
      description:
        'A clean, coach-ready report lands in your account: spatial maps, patterns and trends your squad can act on.',
    },
  ],
};

// --- What's in the report ----------------------------------------------------

export const WHATS_IN_REPORT: WhatsInReport = {
  eyebrow: 'Inside every report',
  headline: 'Performance, patterns and progress, read in minutes.',
  subhead:
    'Each report is built around three things a coach actually uses: how the match went, what kept happening, and how it ties into the bigger picture.',
  groups: [
    {
      group: 'Performance',
      blurb: 'What happened, measured cleanly.',
      items: [
        'Match metrics with clear deltas vs prior matches',
        'Spatial maps, serve placement, shot charts, pass networks, heatmaps',
        'Efficiency and outcome breakdowns (winners vs errors, makes vs misses)',
        'Zone-by-zone coverage across the pitch or court',
      ],
    },
    {
      group: 'Patterns',
      blurb: 'What kept happening, and why.',
      items: [
        'Recurring tactical patterns and tendencies',
        'Rally, transition and possession sequences',
        'Strengths to lean on and weaknesses to fix',
        'Opponent tendencies when scouting reports are added on',
      ],
    },
    {
      group: 'Progress',
      blurb: 'How it fits the bigger picture.',
      items: [
        'Trends tracked across multiple matches over time',
        'Athlete and squad development curves',
        'Before-and-after views on the things you are coaching',
        'Season-long benchmarks you can hold the squad to',
      ],
    },
  ],
};

// --- Human vs AI comparison --------------------------------------------------

export const HUMAN_VS_AI: HumanVsAi = {
  eyebrow: 'Human vs AI',
  headline: 'Why a human analyst wins where it counts.',
  subhead:
    'Side by side on the dimensions coaches care about most.',
  rows: [
    {
      dimension: 'Tactical context',
      ai: 'None, events without meaning',
      human: 'Full context: pressure, intent, decisions',
    },
    {
      dimension: 'Footage requirements',
      ai: 'Clean multi-camera, calibrated',
      human: 'Any footage, phone, fixed cam, broadcast',
    },
    {
      dimension: 'Accuracy in clutter',
      ai: 'Breaks on occlusion and camera cuts',
      human: 'Follows every player through the chaos',
    },
    {
      dimension: 'Output',
      ai: 'Raw data dump to interpret yourself',
      human: 'Coach-ready visual report',
    },
    {
      dimension: 'Sport coverage',
      ai: 'One sport, one rigid model',
      human: 'Tennis, soccer, basketball and more',
    },
    {
      dimension: 'Setup for your staff',
      ai: 'Software, calibration, training',
      human: 'Upload and done, nothing to learn',
    },
  ],
};

// --- Why us (3 cards) --------------------------------------------------------

export const WHY_US: WhyUs = {
  eyebrow: 'Why Stats Empire',
  headline: 'The accuracy of a human, at a price that scales.',
  subhead:
    'We sit exactly where automated tools and premium analysts both fall short.',
  cards: [
    {
      versus: 'vs AI trackers',
      title: 'Real understanding, not pixel-counting',
      description:
        'AI trackers miss tactical context and break on real-world footage. Our analysts tag intent and meaning, so the report reflects what actually happened in the match.',
    },
    {
      versus: 'vs DIY',
      title: 'Your coaches coach, we do the logging',
      description:
        'Hand-charting a single match eats hours your staff do not have. Send us the footage and get a finished, coach-ready report back instead of burning a weekend on video.',
    },
    {
      versus: 'vs premium services',
      title: 'Pro-grade analysis without the pro-grade invoice',
      description:
        'Western human match-charting runs $100+ per match. Stats Empire delivers the same human rigor from $49, dropping to $29 per match as you scale.',
    },
  ],
};

// --- FAQ ---------------------------------------------------------------------

export const FAQ: Faq = {
  eyebrow: 'Questions',
  headline: 'Everything you need to know.',
  items: [
    {
      question: 'How does the token model work?',
      answer:
        'One token equals one fully logged match report. Buy tokens in packs, draw from a single shared balance across your whole squad, and tokens roll over for 12 months.',
    },
    {
      question: 'Which sports do you cover?',
      answer:
        'Tennis, soccer and basketball lead our coverage and are supported most deeply. Baseball/softball and Australian Football are also available.',
    },
    {
      question: 'What footage do you need from me?',
      answer:
        'Whatever you already have, full-match video from a phone, a fixed camera or a broadcast feed. No calibration, multi-camera rigs or special setup required.',
    },
    {
      question: 'How fast do I get my report?',
      answer:
        'Standard delivery is included with every token. If you need it overnight, Express 24-hour turnaround is available for +1 token per match.',
    },
    {
      question: 'Is everything really tagged by a human?',
      answer:
        'Yes. Every match is logged end to end by a trained analyst who knows your sport, never an automated model. That is the whole point.',
    },
    {
      question: 'Do tokens expire?',
      answer:
        'Tokens roll over for 12 months, so an off-season or a light stretch never costs you. One account holds one shared balance for the entire squad.',
    },
    {
      question: 'Can I add opponent scouting or progress tracking?',
      answer:
        'Yes. Opponent scouting reports and multi-match progress trends are available as add-ons on top of your standard match reports.',
    },
    {
      question: 'Do you work with academies and clubs?',
      answer:
        'Absolutely. Our annual Academy Site License adds a dedicated logging team, priority turnaround, an academy-wide dashboard, per-coach and per-squad accounts, and full onboarding, at roughly $5-50 per player, per year.',
    },
  ],
};

// --- Final CTA ---------------------------------------------------------------

export const FINAL_CTA: FinalCta = {
  eyebrow: 'Ready when you are',
  headline: 'Send us one match. See what a human analyst catches.',
  subhead:
    'Start with a single token or talk to us about an academy-wide license. Either way, your first coach-ready report is closer than your next training session.',
  primaryCta: { label: 'Get started', href: '#pricing' },
  secondaryCta: { label: 'Talk to partnerships', href: 'mailto:partnerships@statsempire.com' },
};

// --- Footer ------------------------------------------------------------------

export const FOOTER: Footer = {
  tagline: 'Human-tagged match intelligence across tennis, soccer, basketball and more.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'How it works', href: '#how-it-works' },
        { label: "What's in a report", href: '#report' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Free sample report', href: '#free-game' },
      ],
    },
    {
      title: 'Sports',
      links: [
        { label: 'Tennis', href: '#tennis' },
        { label: 'Soccer', href: '#soccer' },
        { label: 'Basketball', href: '#basketball' },
        { label: 'All sports', href: '#coverage' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'Partnerships', href: 'mailto:partnerships@statsempire.com' },
        { label: 'Academy licenses', href: '#pricing' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
  ],
  contactEmail: 'partnerships@statsempire.com',
  partnershipsEmail: 'partnerships@statsempire.com',
  domain: 'statsempire.com',
  legal: `© ${new Date().getFullYear()} Stats Empire. All rights reserved.`,
};
