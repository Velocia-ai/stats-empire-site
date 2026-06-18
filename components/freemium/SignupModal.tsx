'use client';

// Stats Empire, SignupModal
//
// Step 1 of the zero-friction freemium flow. An accessible dialog (role=dialog,
// aria-modal, focus trap, Esc-to-close, backdrop click) with a deliberately
// minimal name/email form. The single loudest message on screen is the
// "100% FREE, NO CARD REQUIRED" badge: the whole point of the funnel is to
// remove friction and fear before the user has typed a single character.
//
// Theme-tokenized (var(--color-*) via Tailwind utilities) and reduced-motion
// safe through framer-motion's useReducedMotion.

import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Lock, Mail, ShieldCheck, Sparkles, User, X } from 'lucide-react';

export interface SignupCredentials {
  name: string;
  email: string;
}

export interface SignupModalProps {
  /** Controls visibility. */
  open: boolean;
  /** Fired when the user dismisses (Esc, backdrop, or close button). */
  onClose: () => void;
  /** Fired with the captured credentials on a valid submit. */
  onComplete: (credentials: SignupCredentials) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tab-focusable elements inside the dialog, for the focus trap.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function SignupModal({ open, onClose, onComplete }: SignupModalProps) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const freeBadgeId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const nameValid = name.trim().length >= 2;
  const formValid = emailValid && nameValid;

  // Esc to close + focus trap (Tab cycling) while open.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const nodes = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  // On open: remember the trigger, focus the first field. On close: restore.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Defer to ensure the field is mounted/painted.
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 20);

    // Lock body scroll behind the modal.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!formValid) return;
    onComplete({ name: name.trim(), email: email.trim() });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18 }}
          onKeyDown={onKeyDown}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close sign-up"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-bg/80 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={`${freeBadgeId} ${descId}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            {/* Accent top edge */}
            <div className="h-1 w-full bg-gradient-to-r from-accent1 via-accent2 to-accent1" />

            <div className="grid-texture-fine pointer-events-none absolute inset-0" aria-hidden />

            <div className="relative p-6 sm:p-8">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surfaceAlt hover:text-text"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>

              {/* LOUD free badge, the hero message of the whole funnel */}
              <div
                id={freeBadgeId}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent1/40 bg-accent1/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-accent1"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                100% Free, No Card Required
              </div>

              <h2
                id={titleId}
                className="font-display text-2xl font-bold leading-tight text-text sm:text-3xl"
              >
                Claim your free game
                <span className="block text-accent1">analysis.</span>
              </h2>

              <p id={descId} className="mt-2 text-sm leading-relaxed text-muted">
                Create a free account and instantly unlock a fully-analyzed game in the
                sport of your choice. No payment, no trial countdown, just the data.
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                <Field
                  ref={firstFieldRef}
                  icon={<User className="h-4 w-4" aria-hidden />}
                  label="Your name"
                  type="text"
                  autoComplete="name"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={setName}
                  invalid={touched && !nameValid}
                  errorText="Enter at least 2 characters."
                />
                <Field
                  icon={<Mail className="h-4 w-4" aria-hidden />}
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={setEmail}
                  invalid={touched && !emailValid}
                  errorText="Enter a valid email address."
                />

                <motion.button
                  type="submit"
                  whileHover={reduce ? undefined : { scale: 1.015 }}
                  whileTap={reduce ? undefined : { scale: 0.985 }}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent1 px-5 py-3.5 font-display text-base font-bold text-bg transition-shadow hover:shadow-[0_0_0_3px_var(--color-accent1)]/20"
                >
                  Create my free account
                  <Check className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </motion.button>
              </form>

              {/* Reassurance footer, reinforce free + no commitment */}
              <ul className="mt-5 grid grid-cols-1 gap-2 text-xs text-muted sm:grid-cols-2">
                <Reassure icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}>
                  No credit card, ever
                </Reassure>
                <Reassure icon={<Lock className="h-3.5 w-3.5" aria-hidden />}>
                  We never sell your data
                </Reassure>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Internal field component (named exports kept minimal) -------------------

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
  errorText: string;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { icon, label, type, autoComplete, placeholder, value, onChange, invalid, errorText },
  ref,
) {
  const id = useId();
  const errId = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {icon}
        </span>
        <input
          ref={ref}
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={invalid ? errId : undefined}
          className={[
            'w-full rounded-xl border bg-bg py-3 pl-10 pr-3 text-sm text-text placeholder:text-muted/60',
            'transition-colors focus:outline-none focus-visible:border-accent1',
            invalid ? 'border-accent2' : 'border-border',
          ].join(' ')}
        />
      </div>
      {invalid && (
        <p id={errId} className="mt-1.5 text-xs text-accent2">
          {errorText}
        </p>
      )}
    </div>
  );
});

function Reassure({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-accent1">{icon}</span>
      {children}
    </li>
  );
}
