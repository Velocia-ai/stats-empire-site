'use client';

// Stats Empire, FreemiumFlow
//
// The orchestrator for the zero-friction onboarding funnel. Owns the step state
// machine and animates between steps:
//
//   register  → SignupModal       (capture name/email, scream "100% FREE")
//   select    → SportSelector     (pick 1 of 5 sports)
//   unlock    → UnlockFreeGame     (satisfying unlock reveal)
//   dashboard → FreeTrialDashboard (full-depth viz + soft token upsell)
//
// Exports:
//   • <FreemiumFlow/>, drop-in funnel; render once near the app root.
//   • useFreemiumFlow(), returns { open, ...props } to wire a CTA button
//                              to the flow without prop-drilling.
//
// The signup step renders as a modal overlay; once registered, the remaining
// steps render in a full-screen funnel surface with animated transitions.
// Reduced-motion safe; theme-tokenized throughout.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import type { SportKey } from '@/lib/types';
import SignupModal, { type SignupCredentials } from './SignupModal';
import SportSelector from './SportSelector';
import UnlockFreeGame from './UnlockFreeGame';
import FreeTrialDashboard from './FreeTrialDashboard';

type Step = 'register' | 'select' | 'unlock' | 'dashboard';

export interface FreemiumFlowProps {
  /** Controls whether the funnel surface is shown. */
  open: boolean;
  /** Close/dismiss the entire funnel. */
  onClose: () => void;
  /** Optional hook for the dashboard's "Buy tokens" CTA. */
  onBuyTokens?: () => void;
  /** Optional analytics callback when registration completes. */
  onRegister?: (credentials: SignupCredentials) => void;
}

export default function FreemiumFlow({
  open,
  onClose,
  onBuyTokens,
  onRegister,
}: FreemiumFlowProps) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>('register');
  const [sport, setSport] = useState<SportKey | null>(null);

  const reset = useCallback(() => {
    setStep('register');
    setSport(null);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Reset after the exit animation so re-opening starts clean.
    window.setTimeout(reset, 300);
  }, [onClose, reset]);

  const handleRegister = useCallback(
    (creds: SignupCredentials) => {
      onRegister?.(creds);
      setStep('select');
    },
    [onRegister],
  );

  const handleSelect = useCallback((key: SportKey) => {
    setSport(key);
    setStep('unlock');
  }, []);

  const handleUnlocked = useCallback(() => setStep('dashboard'), []);

  const handleRestart = useCallback(() => {
    setSport(null);
    setStep('select');
  }, []);

  if (!open) return null;

  // The signup step is the modal itself; the surface behind it stays empty
  // until the user registers (keeps focus squarely on the free offer).
  const showSurface = step !== 'register';

  return (
    <div className="fixed inset-0 z-40">
      {/* Signup modal overlay (its own backdrop + focus trap) */}
      <SignupModal open={step === 'register'} onClose={handleClose} onComplete={handleRegister} />

      <AnimatePresence>
        {showSurface && (
          <motion.div
            className="absolute inset-0 overflow-y-auto bg-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <div className="grid-texture-fine pointer-events-none fixed inset-0" aria-hidden />

            {/* Funnel chrome: progress + back + close */}
            <div className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                  {(step === 'unlock' || step === 'select') && (
                    <button
                      type="button"
                      onClick={step === 'unlock' ? handleRestart : () => setStep('register')}
                      aria-label="Go back"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surfaceAlt hover:text-text"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  <StepDots step={step} />
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surfaceAlt hover:text-text"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            {/* Step body */}
            <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
                  transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {step === 'select' && (
                    <SportSelector value={sport} onSelect={handleSelect} />
                  )}
                  {step === 'unlock' && sport && (
                    <UnlockFreeGame sport={sport} onUnlocked={handleUnlocked} />
                  )}
                  {step === 'dashboard' && sport && (
                    <FreeTrialDashboard
                      sport={sport}
                      onBuyTokens={onBuyTokens}
                      onRestart={handleRestart}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Step progress indicator ------------------------------------------------

const STEP_ORDER: Step[] = ['register', 'select', 'unlock', 'dashboard'];
const STEP_LABELS: Record<Step, string> = {
  register: 'Sign up',
  select: 'Pick sport',
  unlock: 'Unlock',
  dashboard: 'Dashboard',
};

function StepDots({ step }: { step: Step }) {
  const activeIndex = STEP_ORDER.indexOf(step);
  return (
    <ol className="flex items-center gap-2" aria-label="Onboarding progress">
      {STEP_ORDER.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={[
                'flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
                active ? 'text-accent1' : done ? 'text-text' : 'text-muted',
              ].join(' ')}
            >
              <span
                aria-hidden
                className={[
                  'h-2 w-2 rounded-full transition-colors',
                  active ? 'bg-accent1' : done ? 'bg-text' : 'bg-border',
                ].join(' ')}
              />
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </span>
            {i < STEP_ORDER.length - 1 && (
              <span className="hidden h-px w-4 bg-border sm:inline-block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// --- Hook to open the flow from a CTA ---------------------------------------
//
// Two ways to wire a CTA:
//
//   1) Local (single CTA + flow in the same tree):
//        const flow = useFreemiumFlow();
//        <button onClick={flow.open}>Start free</button>
//        <FreemiumFlow {...flow.flowProps} />
//
//   2) App-wide (CTA anywhere under <FreemiumFlowProvider>):
//        wrap the app in <FreemiumFlowProvider>, render the trigger with
//        useFreemiumTrigger().open, and the provider mounts the flow for you.

export interface UseFreemiumFlow {
  /** Whether the flow is currently open. */
  isOpen: boolean;
  /** Open the flow at the first step. */
  open: () => void;
  /** Close the flow. */
  close: () => void;
  /** Spread onto <FreemiumFlow {...flowProps} />. */
  flowProps: Pick<FreemiumFlowProps, 'open' | 'onClose'>;
}

export function useFreemiumFlow(): UseFreemiumFlow {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return useMemo(
    () => ({ isOpen, open, close, flowProps: { open: isOpen, onClose: close } }),
    [isOpen, open, close],
  );
}

// --- Optional app-wide provider so any CTA can open the single flow ---------

interface FreemiumTriggerContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const FreemiumTriggerContext = createContext<FreemiumTriggerContextValue | null>(null);

export function FreemiumFlowProvider({
  children,
  onBuyTokens,
  onRegister,
}: {
  children: ReactNode;
  onBuyTokens?: () => void;
  onRegister?: (credentials: SignupCredentials) => void;
}) {
  const flow = useFreemiumFlow();
  const value = useMemo<FreemiumTriggerContextValue>(
    () => ({ open: flow.open, close: flow.close, isOpen: flow.isOpen }),
    [flow.open, flow.close, flow.isOpen],
  );
  return (
    <FreemiumTriggerContext.Provider value={value}>
      {children}
      <FreemiumFlow
        {...flow.flowProps}
        onBuyTokens={onBuyTokens}
        onRegister={onRegister}
      />
    </FreemiumTriggerContext.Provider>
  );
}

/** Open the app-wide flow from any descendant of <FreemiumFlowProvider>. */
export function useFreemiumTrigger(): FreemiumTriggerContextValue {
  const ctx = useContext(FreemiumTriggerContext);
  if (!ctx) {
    throw new Error('useFreemiumTrigger must be used within a <FreemiumFlowProvider>');
  }
  return ctx;
}
