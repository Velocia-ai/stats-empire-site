'use client';

// Stats Empire, SiteNav
//
// Sticky top navigation for the Court Vision landing page.
//   • Stats Empire wordmark (chalk-underline accent, links to top).
//   • Anchor links: How it works · Sports · Report · Pricing · FAQ.
//   • Lime "Start Free" CTA, opens the freemium funnel.
//   • <ThemeSwitcher/> for live theme access.
//   • Mobile burger → slide-down sheet with the same links + CTA.
//
// Condenses on scroll: past a threshold the bar tightens (shorter padding,
// solid translucent court-blue surface, border + blur) for a premium settle.
// Reduced-motion safe, the condense transition is a short opacity/size tween
// that the global reduced-motion rule neutralises; the mobile sheet animation
// is guarded with useReducedMotion.
//
// Flow wiring matches the rest of the suite (FinalCta): pass `onStart` to open
// a local useFreemiumFlow, or omit it and rely on the app-wide
// useFreemiumTrigger() (requires a <FreemiumFlowProvider> ancestor).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useFreemiumTrigger } from '@/components/freemium';

export interface NavLink {
  label: string;
  href: string;
}

export interface SiteNavProps {
  /**
   * Open the freemium flow. If omitted, the nav uses the app-wide
   * useFreemiumTrigger() (requires a <FreemiumFlowProvider> ancestor).
   */
  onStart?: () => void;
  /** Override the default anchor links if section ids differ. */
  links?: NavLink[];
  /** Extra classes for the outer <header>. */
  className?: string;
}

const DEFAULT_LINKS: NavLink[] = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Sports', href: '#coverage' },
  { label: 'Report', href: '#report' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function SiteNav({ onStart, links = DEFAULT_LINKS, className }: SiteNavProps) {
  // Resolve the flow opener: explicit prop wins; else fall back to the
  // app-wide trigger. The hook is always called (rules of hooks); the provider
  // returns a context value or throws if absent, so only pass no onStart when
  // a <FreemiumFlowProvider> wraps the page.
  return onStart ? (
    <SiteNavView onStart={onStart} links={links} className={className} />
  ) : (
    <SiteNavWithTrigger links={links} className={className} />
  );
}

function SiteNavWithTrigger({ links, className }: { links: NavLink[]; className?: string }) {
  const { open } = useFreemiumTrigger();
  return <SiteNavView onStart={open} links={links} className={className} />;
}

function SiteNavView({
  onStart,
  links,
  className,
}: {
  onStart: () => void;
  links: NavLink[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Condense the bar once the user scrolls past a small threshold.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile sheet is open; close on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header
      className={clsx(
        'fixed inset-x-0 top-0 z-50 transition-[padding,background-color,border-color,box-shadow] duration-300',
        scrolled
          ? 'border-b border-border bg-bg/80 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
        className,
      )}
    >
      <nav
        aria-label="Primary"
        className={clsx(
          'mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 transition-[padding] duration-300 sm:px-6 lg:px-8',
          scrolled ? 'py-2.5' : 'py-4',
        )}
      >
        {/* Wordmark */}
        <Link
          href="#top"
          onClick={() => setMenuOpen(false)}
          className="group inline-flex items-baseline gap-0.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent2"
        >
          <span className="font-display text-lg font-extrabold tracking-tight text-text">
            Stats
          </span>
          <span className="relative font-display text-lg font-extrabold tracking-tight text-accent1">
            Empire
            {/* Chalk underline that brightens on hover. */}
            <span
              aria-hidden
              className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-100 bg-accent1/40 transition-colors group-hover:bg-accent1"
            />
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3 py-2 font-mono text-[0.78rem] uppercase tracking-wider text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right cluster: theme switch + CTA (desktop) / burger (mobile) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>

          <button
            type="button"
            onClick={onStart}
            className="group hidden items-center gap-2 rounded-full bg-accent1 px-5 py-2.5 font-mono text-[0.78rem] font-semibold uppercase tracking-wider text-bg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2 sm:inline-flex"
          >
            Start Free
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>

          {/* Mobile burger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-sheet"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-text transition-colors hover:bg-surfaceAlt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-nav-sheet"
            className="md:hidden"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-t border-border bg-bg/95 px-4 pb-6 pt-2 backdrop-blur-md sm:px-6">
              <ul className="flex flex-col">
                {links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="block border-b border-border/60 py-3.5 font-mono text-sm uppercase tracking-wider text-muted transition-colors hover:text-text focus-visible:text-text"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between gap-3">
                <ThemeSwitcher />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onStart();
                  }}
                  className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent1 px-5 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-bg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
