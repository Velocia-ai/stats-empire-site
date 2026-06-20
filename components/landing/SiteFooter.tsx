'use client';

// Stats Empire, SiteFooter
//
// The site footer, Court Vision identity. A "chalk wordmark" (with a drawn
// underline that strokes on when the footer enters view), the typed FOOTER nav
// columns, a contact block (partnerships email + domain), and a legal line.
//
// Pure presentation off the typed FOOTER content; the only motion is the
// wordmark underline draw-on, guarded by useReducedMotion(). All color/type via
// var(--color-*) / var(--font-*) tokens.

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Mail, Globe } from 'lucide-react';

import { FOOTER } from '@/lib/content';

// Internal app routes (and in-route anchors) go through next/link for client
// navigation; external links (mailto:, http) stay as plain anchors.
function isInternalHref(href: string): boolean {
  return href.startsWith('/') || href.startsWith('#');
}

export interface SiteFooterProps {
  /** Optional extra classes for the outer <footer>. */
  className?: string;
}

export default function SiteFooter({ className }: SiteFooterProps) {
  const reduce = useReducedMotion();

  return (
    <footer
      role="contentinfo"
      className={[
        'relative border-t border-border px-6 pb-12 pt-16',
        className ?? '',
      ].join(' ')}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-texture-fine opacity-50" />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand + tagline + contact */}
          <div className="max-w-sm">
            <div className="inline-block">
              <span className="font-display text-2xl font-bold tracking-tight text-text">
                Stats<span className="text-accent1">Empire</span>
              </span>
              {/* Chalk underline that draws on */}
              <svg
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
                className="mt-1 h-1.5 w-full"
                aria-hidden
              >
                <motion.path
                  d="M 0 3 Q 25 0, 50 3 T 100 3"
                  fill="none"
                  stroke="var(--color-accent2)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: reduce ? 0 : 0.9, ease: 'easeInOut' }}
                />
              </svg>
            </div>

            <p className="mt-4 font-body text-sm leading-relaxed text-muted">
              {FOOTER.tagline}
            </p>

            <ul className="mt-6 space-y-3" role="list">
              <li>
                <a
                  href={`mailto:${FOOTER.partnershipsEmail}`}
                  className="inline-flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-accent1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  {FOOTER.partnershipsEmail}
                </a>
              </li>
              <li>
                <a
                  href={`https://${FOOTER.domain}`}
                  className="inline-flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-accent1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  {FOOTER.domain}
                </a>
              </li>
            </ul>
          </div>

          {/* Nav columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER.columns.map((col) => (
              <div key={col.title}>
                <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.25em] text-accent1">
                  {col.title}
                </h2>
                <ul className="mt-4 space-y-2.5" role="list">
                  {col.links.map((link) => {
                    const className =
                      'font-body text-sm text-muted transition-colors hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent2';
                    return (
                      <li key={link.label}>
                        {isInternalHref(link.href) ? (
                          <Link href={link.href} className={className}>
                            {link.label}
                          </Link>
                        ) : (
                          <a href={link.href} className={className}>
                            {link.label}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Legal line */}
        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted">
            {FOOTER.legal}
          </p>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">
            Human-tagged match intelligence
          </p>
        </div>
      </div>
    </footer>
  );
}
