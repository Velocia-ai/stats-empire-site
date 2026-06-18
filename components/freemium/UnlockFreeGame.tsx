'use client';

// Stats Empire, UnlockFreeGame
//
// Step 3 of the freemium flow: the dopamine beat. The user sees the specific
// game they're about to get (title / matchup / headline) sealed behind a
// padlock, then presses "Unlock Your Free Game". A short, tactile animation
// (lock springs open, accent burst, glints) plays, then onUnlocked() fires to
// reveal the dashboard.
//
// The whole component screams FREE: the CTA, the badge, and the post-unlock
// confirmation all say it. Reduced-motion users skip straight to the unlocked
// state with no animation but the same copy.

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Gift, Lock, PartyPopper, Sparkles, Unlock, Zap } from 'lucide-react';
import { getSportData } from '@/lib/sports';
import type { SportKey } from '@/lib/types';

export interface UnlockFreeGameProps {
  /** Which sport's free game to tease + unlock. */
  sport: SportKey;
  /** Fired once the unlock animation completes (or immediately if reduced-motion). */
  onUnlocked: () => void;
}

type Phase = 'sealed' | 'unlocking' | 'unlocked';

export default function UnlockFreeGame({ sport, onUnlocked }: UnlockFreeGameProps) {
  const reduce = useReducedMotion();
  const data = getSportData(sport);
  const game = data.freeGame;

  const [phase, setPhase] = useState<Phase>('sealed');
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  function startUnlock() {
    if (phase !== 'sealed') return;
    if (reduce) {
      // No animation, flip straight to unlocked, then advance.
      setPhase('unlocked');
      timers.current.push(window.setTimeout(onUnlocked, 250));
      return;
    }
    setPhase('unlocking');
    timers.current.push(window.setTimeout(() => setPhase('unlocked'), 850));
    timers.current.push(window.setTimeout(onUnlocked, 1700));
  }

  const unlocking = phase === 'unlocking';
  const unlocked = phase === 'unlocked';

  return (
    <section
      aria-labelledby="unlock-title"
      className="mx-auto flex w-full max-w-lg flex-col items-center text-center"
    >
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent1/40 bg-accent1/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-accent1">
        <Gift className="h-3.5 w-3.5" aria-hidden />
        Your free game is ready
      </div>

      <h2 id="unlock-title" className="font-display text-2xl font-bold text-text sm:text-3xl">
        {data.displayName}
      </h2>

      {/* The padlock / unlock medallion */}
      <div className="relative my-8 flex h-40 w-40 items-center justify-center">
        {/* Radiating rings on unlock */}
        <AnimatePresence>
          {unlocked && !reduce && (
            <>
              {[0, 1, 2].map((r) => (
                <motion.span
                  key={r}
                  aria-hidden
                  className="absolute rounded-full border border-accent1"
                  initial={{ width: 96, height: 96, opacity: 0.6 }}
                  animate={{ width: 200, height: 200, opacity: 0 }}
                  transition={{ duration: 0.9, delay: r * 0.12, ease: 'easeOut' }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Pulsing glow */}
        <motion.span
          aria-hidden
          className="absolute h-28 w-28 rounded-full bg-accent1 blur-2xl"
          animate={
            reduce
              ? { opacity: 0.18 }
              : { opacity: unlocked ? 0.35 : unlocking ? [0.15, 0.4, 0.15] : 0.12 }
          }
          transition={{ duration: 0.8, repeat: unlocking ? Infinity : 0 }}
        />

        {/* Medallion */}
        <motion.div
          className={[
            'relative flex h-24 w-24 items-center justify-center rounded-full border-2',
            unlocked ? 'border-accent1 bg-accent1/15' : 'border-border bg-surface',
          ].join(' ')}
          animate={
            reduce
              ? undefined
              : unlocking
                ? { rotate: [0, -8, 8, -6, 6, 0] }
                : unlocked
                  ? { scale: [1, 1.12, 1] }
                  : {}
          }
          transition={{ duration: unlocking ? 0.7 : 0.4 }}
        >
          <AnimatePresence mode="wait">
            {!unlocked ? (
              <motion.span
                key="lock"
                initial={false}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -20 }}
                transition={{ duration: 0.2 }}
                className="text-muted"
              >
                <Lock className="h-9 w-9" aria-hidden />
              </motion.span>
            ) : (
              <motion.span
                key="unlock"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                className="text-accent1"
              >
                <Unlock className="h-9 w-9" aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sparkle burst on unlock */}
        <AnimatePresence>
          {unlocked && !reduce && (
            <>
              {SPARKS.map((s, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="absolute text-accent2"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.05, ease: 'easeOut' }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.span>
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* The game teaser card */}
      <div className="w-full rounded-2xl border border-border bg-surface p-5 text-left">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{game.date}</p>
        <h3 className="mt-1 font-display text-lg font-bold text-text">{game.title}</h3>
        <p className="text-sm text-accent2">{game.matchup}</p>
        <p
          className={[
            'mt-3 text-sm leading-relaxed text-muted transition',
            unlocked ? '' : 'select-none blur-[3px]',
          ].join(' ')}
          aria-hidden={!unlocked}
        >
          {game.headline}
        </p>
      </div>

      {/* CTA / status */}
      <div className="mt-6 min-h-[3.5rem] w-full">
        <AnimatePresence mode="wait">
          {!unlocked ? (
            <motion.button
              key="cta"
              type="button"
              onClick={startUnlock}
              disabled={unlocking}
              initial={false}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              whileHover={reduce || unlocking ? undefined : { scale: 1.02 }}
              whileTap={reduce || unlocking ? undefined : { scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent1 px-6 py-4 font-display text-base font-bold text-bg shadow-lg transition-shadow disabled:cursor-wait disabled:opacity-90"
            >
              {unlocking ? (
                <>
                  <Zap className="h-5 w-5 animate-pulse" aria-hidden />
                  Unlocking…
                </>
              ) : (
                <>
                  <Unlock className="h-5 w-5" aria-hidden />
                  Unlock your free game
                </>
              )}
            </motion.button>
          ) : (
            <motion.p
              key="done"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 font-display text-base font-bold text-accent1"
            >
              <PartyPopper className="h-5 w-5" aria-hidden />
              Unlocked, free, forever. Loading your dashboard…
            </motion.p>
          )}
        </AnimatePresence>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted">
          No card · No charge · No catch
        </p>
      </div>
    </section>
  );
}

// Sparkle target offsets (px) radiating from the medallion center.
const SPARKS = [
  { x: -54, y: -40 },
  { x: 56, y: -34 },
  { x: -46, y: 44 },
  { x: 50, y: 46 },
  { x: 0, y: -64 },
  { x: 0, y: 62 },
];
