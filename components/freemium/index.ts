// Stats Empire, freemium onboarding funnel.
//
// Zero-friction flow: register → select sport → unlock → free-trial dashboard.
// Mount <FreemiumFlow /> once near the app root (or use <FreemiumFlowProvider>),
// and open it from any CTA via the hooks. The whole funnel screams "100% free".

export { default as FreemiumFlow } from './FreemiumFlow';
export {
  useFreemiumFlow,
  useFreemiumTrigger,
  FreemiumFlowProvider,
} from './FreemiumFlow';
export type { FreemiumFlowProps, UseFreemiumFlow } from './FreemiumFlow';

export { default as SignupModal } from './SignupModal';
export type { SignupModalProps, SignupCredentials } from './SignupModal';

export { default as SportSelector } from './SportSelector';
export type { SportSelectorProps } from './SportSelector';

export { default as UnlockFreeGame } from './UnlockFreeGame';
export type { UnlockFreeGameProps } from './UnlockFreeGame';

export { default as FreeTrialDashboard } from './FreeTrialDashboard';
export type { FreeTrialDashboardProps } from './FreeTrialDashboard';
