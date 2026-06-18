// Stats Empire, landing section components (Court Vision identity).
//
// Full marketing page in mount order. Wrap the page in <FreemiumFlowProvider>
// so every flow-opening CTA (SiteNav, Hero, FinalCta) resolves the funnel via
// useFreemiumTrigger() with no prop drilling, or pass each an explicit
// `onStart`/`onStartFree` to open a local useFreemiumFlow().
//
//   <SiteNav />              (fixed top nav + Start Free CTA + ThemeSwitcher)
//   <Hero />                 (#top, rotating tennis/soccer/basketball tactics card)
//   <ProofStats />           <Problem /> <HowItWorks /> <WhatsInReport />
//   <HumanVsAi /> <WhyUs />
//   <MultiSportCoverage />   (#coverage, featured tennis/soccer/basketball)
//   <Faq />                  (#faq)
//   <FinalCta />             (closing CTA → freemium flow)
//   <SiteFooter />
//
// <CourtBackdrop /> is the signature animated background, reusable behind the
// hero and any section divider.

export { default as CourtBackdrop } from './CourtBackdrop';
export type { CourtBackdropProps } from './CourtBackdrop';

export { default as SiteNav } from './SiteNav';
export type { SiteNavProps, NavLink } from './SiteNav';

export { default as Hero } from './Hero';
export type { HeroProps } from './Hero';

export { default as ProofStats } from './ProofStats';

export { default as Problem } from './Problem';

export { default as HowItWorks } from './HowItWorks';

export { default as WhatsInReport } from './WhatsInReport';

export { default as HumanVsAi } from './HumanVsAi';

export { default as WhyUs } from './WhyUs';

export { default as Pricing } from './Pricing';
export type { PricingProps } from './Pricing';

export { default as MultiSportCoverage } from './MultiSportCoverage';
export type { MultiSportCoverageProps } from './MultiSportCoverage';

export { default as Faq } from './Faq';
export type { FaqProps } from './Faq';

export { default as FinalCta } from './FinalCta';
export type { FinalCtaProps } from './FinalCta';

export { default as SiteFooter } from './SiteFooter';
export type { SiteFooterProps } from './SiteFooter';
