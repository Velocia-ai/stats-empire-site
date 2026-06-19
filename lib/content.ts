// Stats Empire, landing page copy as typed, importable content.
// All marketing copy lives here so section components stay logic-only and copy
// stays reviewable in one place. Voice: confident, modern, premium, sport-agnostic
// but leaning on tennis / soccer / basketball as the flagship sports.
//
// Positioning: a HYBRID model. AI assists (pre-tags events, speeds up logging,
// flags moments); trained human analysts log, correct, control and audit, and
// have the final say. Lead with "human-led, AI-assisted" / "AI speed, human
// judgment". Never knock Western pricing; frame value positively against opaque,
// seat-based enterprise contracts. Express turnaround is 12h to 24h.

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
  /** What a single-mode approach (pure-AI auto-tracking) leaves you with. */
  ai: string;
  /** What the hybrid, human-led + AI-assisted approach delivers instead. */
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
  /** Contrast tag, e.g. "vs pure-AI tools". */
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

// Feature A, provenance pipeline + trust badge.
export interface ProvenanceStep {
  stage: string;
  /** Who or what owns this stage. */
  owner: 'AI' | 'Analyst' | 'Senior';
  description: string;
}

export interface Provenance {
  eyebrow: string;
  headline: string;
  subhead: string;
  steps: ProvenanceStep[];
  /** Compact trust badge shown near the report / hero. */
  badge: {
    primary: string;
    secondary: string;
  };
}

// Feature B, forward-looking opponent scouting add-on.
export interface OpponentScouting {
  eyebrow: string;
  headline: string;
  subhead: string;
  /** Tag positioning it as a premium add-on. */
  badge: string;
  items: string[];
  cta: CtaLink;
}

// Feature C, bilingual EN + Simplified Chinese report delivery.
export interface BilingualReports {
  eyebrow: string;
  headline: string;
  subhead: string;
  /** Compact badge / feature line. */
  badge: string;
}

// --- Hero --------------------------------------------------------------------

export const HERO: Hero = {
  eyebrow: 'Human-led, AI-assisted match intelligence',
  headline: 'AI speed. Human judgment. One coach-ready report.',
  subhead:
    'AI pre-tags the match, trained analysts log, correct and control every event, and a senior analyst signs off. You get a clean visual report you can trust, built for tennis, soccer and basketball, available across five sports.',
  primaryCta: { label: 'See a free sample report', href: '#free-game' },
  secondaryCta: { label: 'View pricing', href: '#pricing' },
};

// --- Proof stats -------------------------------------------------------------

export const PROOF_STATS: ProofStat[] = [
  { value: 'Human-verified', label: 'Every report logged and corrected by a trained analyst' },
  { value: 'Senior-audited', label: 'A senior analyst reviews and signs off before delivery' },
  { value: '12-24h', label: 'Express turnaround available on any match' },
  { value: '5', label: 'Sports covered, led by tennis, soccer & basketball' },
];

// --- Problem (why hybrid beats single-mode) ----------------------------------

export const PROBLEM: Problem = {
  eyebrow: 'Why hybrid wins',
  headline: 'Pure AI misses the match. Manual-only is slow and costly.',
  subhead:
    'Automated tracking is fast but reads pixels, not tactics, and it breaks on real-world footage. Manual-only charting is accurate but eats hours and budget. We combine both: AI does the heavy lifting, trained analysts supply the judgment and audit, so you get speed and context at once.',
  points: [
    {
      ai: 'Counts events but cannot tell you why a pattern is happening.',
      human: 'AI pre-tags the events; an analyst adds intent, pressure, positioning and shot selection on top.',
    },
    {
      ai: 'Confuses players, loses the ball in clutter and breaks on broadcast camera cuts.',
      human: 'AI flags the moments, then a trained analyst follows every player and phase and corrects what the model gets wrong.',
    },
    {
      ai: 'Outputs a raw data dump you still have to interpret and trust on faith.',
      human: 'A senior analyst audits the log and signs off, so the report is coach-ready and verified.',
    },
    {
      ai: 'Manual-only charting is accurate but burns a weekend and a real budget per match.',
      human: 'AI assist cuts the logging time, so you get the same human rigor in 12 to 24 hours.',
    },
  ],
};

// --- How it works (4 steps) --------------------------------------------------

export const HOW_IT_WORKS: HowItWorks = {
  eyebrow: 'How it works',
  headline: 'From footage to verified report in four steps.',
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
      title: 'AI pre-tags the footage',
      description:
        'Our models pre-tag events and flag key moments, giving the analyst a fast, structured starting point instead of a blank timeline.',
    },
    {
      step: 3,
      title: 'A human analyst logs and corrects',
      description:
        'A trained analyst who knows your sport reviews every tag, fixes what AI gets wrong and adds the context AI cannot see: pressure, intent and decisions.',
    },
    {
      step: 4,
      title: 'A senior analyst audits and delivers',
      description:
        'A senior analyst reviews and signs off, then a clean, coach-ready visual report lands in your account: spatial maps, patterns and trends.',
    },
  ],
};

// --- Provenance pipeline + trust badge (Feature A) ---------------------------

export const PROVENANCE: Provenance = {
  eyebrow: 'How every report is made',
  headline: 'Logged by humans. Sharpened by AI. Signed off by a senior.',
  subhead:
    'Every report runs through the same chain of custody, so you always know exactly how the numbers were made and who stands behind them.',
  steps: [
    {
      stage: 'A human logs the match',
      owner: 'Analyst',
      description:
        'A trained analyst watches the full match and logs every point, event and pattern the way a coach would. People do the work and have the final say on what the data means.',
    },
    {
      stage: 'AI sharpens quality control',
      owner: 'AI',
      description:
        'We run specialized AI tools across every log to strengthen quality control, so nothing slips through. The numbers stay human-led, just double-checked.',
    },
    {
      stage: 'A senior signs off',
      owner: 'Senior',
      description:
        'A senior analyst audits the log against the footage and signs off before anything reaches you. Verified, not just generated.',
    },
  ],
  badge: {
    primary: 'Human-verified',
    secondary: 'Senior-audited',
  },
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

// --- Opponent scouting add-on (Feature B) ------------------------------------

export const OPPONENT_SCOUTING: OpponentScouting = {
  eyebrow: 'Look forward, not just back',
  headline: 'Walk into the next match knowing their game.',
  subhead:
    'Opponent scouting is a forward-looking pre-match dossier on your next opponent. Same hybrid pipeline, pointed at the team you are about to face, so your game plan is built on patterns, not hunches.',
  badge: 'Premium add-on',
  items: [
    'Tendencies and go-to patterns under pressure',
    'Recurring set-piece and routine habits to prepare for',
    'Weaknesses and matchups you can exploit',
    'Formation, rotation and personnel shifts to expect',
    'A clear, coach-ready plan your squad can rehearse before kickoff',
  ],
  cta: { label: 'Add opponent scouting', href: '#pricing' },
};

// --- Bilingual EN + 中文 reports (Feature C) ---------------------------------

export const BILINGUAL_REPORTS: BilingualReports = {
  eyebrow: 'Built for international squads',
  headline: 'Every report, in English and 中文.',
  subhead:
    'Reports are delivered in both English and Simplified Chinese, so coaches, analysts and athletes read the same insight in their own language with nothing lost in translation.',
  badge: 'EN + 中文 delivery',
};

// --- Hybrid vs pure-AI comparison --------------------------------------------

export const HUMAN_VS_AI: HumanVsAi = {
  eyebrow: 'Hybrid vs pure AI',
  headline: 'Why human-led, AI-assisted wins where it counts.',
  subhead:
    'Side by side on the dimensions coaches care about most.',
  rows: [
    {
      dimension: 'Tactical context',
      ai: 'Events without meaning',
      human: 'Analyst adds pressure, intent and decisions',
    },
    {
      dimension: 'Quality control',
      ai: 'Trust the model on faith',
      human: 'Human-verified, senior-audited before delivery',
    },
    {
      dimension: 'Footage requirements',
      ai: 'Clean multi-camera, calibrated',
      human: 'Any footage, phone, fixed cam, broadcast',
    },
    {
      dimension: 'Accuracy in clutter',
      ai: 'Breaks on occlusion and camera cuts',
      human: 'Analyst corrects what the model misses',
    },
    {
      dimension: 'Output',
      ai: 'Raw data dump to interpret yourself',
      human: 'Coach-ready visual report, EN + 中文',
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
  headline: 'Human judgment, AI speed, pricing you can read.',
  subhead:
    'We pair AI assist with trained analysts, then price it so any squad can afford pro-grade analysis.',
  cards: [
    {
      versus: 'vs pure-AI tools',
      title: 'Verified, not just generated',
      description:
        'AI alone misses tactical context and breaks on real footage. We use AI to move fast, then a trained analyst logs and corrects and a senior signs off, so the report reflects what actually happened.',
    },
    {
      versus: 'vs DIY',
      title: 'Your coaches coach, we do the logging',
      description:
        'Hand-charting a single match eats hours your staff do not have. Send us the footage and get a finished, verified report back in 12 to 24 hours instead of burning a weekend on video.',
    },
    {
      versus: 'vs enterprise contracts',
      title: 'Transparent pricing, no lock-in',
      description:
        'Skip the seat-based, contact-sales contracts of the big platforms. Pay per match with clear token pricing, draw from one shared balance, and scale up or down whenever you want.',
    },
  ],
};

// --- FAQ ---------------------------------------------------------------------

export const FAQ: Faq = {
  eyebrow: 'Questions',
  headline: 'Everything you need to know.',
  items: [
    {
      question: 'Is this AI or human analysis?',
      answer:
        'Both, by design. AI pre-tags the match and flags key moments, a trained analyst logs and corrects every event, and a senior analyst audits and signs off. The human has the final say, so you get AI speed with human judgment.',
    },
    {
      question: 'How does the token model work?',
      answer:
        'One token equals one fully verified match report. Buy tokens in packs, draw from a single shared balance across your whole squad, and tokens roll over for 12 months.',
    },
    {
      question: 'How fast do I get my report?',
      answer:
        'Standard delivery is included with every token. If you need it sooner, Express turnaround of 12 to 24 hours is available for +1 token per match.',
    },
    {
      question: 'What footage do you need from me?',
      answer:
        'Whatever you already have, full-match video from a phone, a fixed camera or a broadcast feed. No calibration, multi-camera rigs or special setup required.',
    },
    {
      question: 'Which sports do you cover?',
      answer:
        'Tennis, soccer and basketball lead our coverage and are supported most deeply. Baseball/softball and Australian Football are also available.',
    },
    {
      question: 'Do you work with leagues and federations?',
      answer:
        'Yes. Beyond per-match tokens, our Leagues and Federations offering adds a custom portal, a league-wide stat and leaderboard hub, per-club human-led analysis and senior-audited reports, with dedicated account management. Talk to us for custom pricing.',
    },
  ],
};

// --- Final CTA ---------------------------------------------------------------

export const FINAL_CTA: FinalCta = {
  eyebrow: 'Ready when you are',
  headline: 'Send us one match. See what human-verified analysis looks like.',
  subhead:
    'AI speed, human judgment, delivered in 12 to 24 hours. Start with a single token or talk to us about an academy-wide license.',
  primaryCta: { label: 'Get started', href: '#pricing' },
  secondaryCta: { label: 'Talk to partnerships', href: 'mailto:partnerships@statsempire.com' },
};

// --- Footer ------------------------------------------------------------------

export const FOOTER: Footer = {
  tagline: 'Human-led, AI-assisted match intelligence across tennis, soccer, basketball and more.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'How it works', href: '#provenance' },
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
