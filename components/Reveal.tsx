'use client';

/*
 * Reveal, the single shared scroll-reveal primitive for Stats Empire.
 *
 * Wrap any section or element to give it one gentle, on-enter entrance:
 * a fade plus a ~12px rise over ~0.5s with a soft ease, fired ONCE when
 * the element scrolls into view. An optional `index` adds a subtle,
 * capped stagger for sibling lists/grids.
 *
 * This is intentionally the ONLY entrance-motion primitive on the site,
 * so rhythm stays consistent and we avoid competing micro-animations.
 *
 * Reduced-motion safe: when the user prefers reduced motion (or before
 * hydration / SSR), it renders the final, settled state with no transform,
 * no opacity ramp, and no transition, so content is always visible.
 */

import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react';

/**
 * DOM event handlers that framer-motion redefines with its own (incompatible)
 * signatures. Omitted from the passthrough surface so the same props object can
 * be spread onto either a plain element or a motion() element without a type
 * clash. These are drag/animation lifecycle handlers no caller needs here.
 */
type MotionConflictingProps =
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd';

export interface RevealProps
  extends Omit<ComponentPropsWithoutRef<'div'>, MotionConflictingProps> {
  children: ReactNode;
  /**
   * Sibling position, used for a subtle entrance stagger.
   * Delay = index * 0.06s, capped at 0.3s so long lists never feel slow.
   */
  index?: number;
  className?: string;
  /**
   * Rendered element/tag. Defaults to `div`. Accepts any intrinsic tag
   * (e.g. 'section', 'li', 'span') so Reveal can wrap content without
   * adding invalid markup.
   */
  as?: ElementType;
}

// Gentle, decelerating ease, matches a calm "settle into place" feel.
const EASE = [0.16, 1, 0.3, 1] as const;
const DURATION = 0.5;
const RISE = 12; // px
const STAGGER_STEP = 0.06; // s per index
const STAGGER_CAP = 0.3; // s, max total delay

export function Reveal({
  children,
  index = 0,
  className,
  as = 'div',
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // Fire a touch before the element is fully on-screen, once only.
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });

  // Build the motion component ONCE per `as` value. Calling motion() during
  // render returns a brand-new component TYPE every render, so React unmounts +
  // remounts the element on every parent re-render, resetting the once-latch and
  // REPLAYING the entrance animation. On the hero (which re-renders every ~4.2s
  // as the tactics board auto-rotates) that made the whole section look like it
  // was "reloading" while scrolling. Memoizing keeps the type stable.
  const MotionTag = useMemo(() => motion(as as ElementType), [as]);

  // Reduced motion (and pre-hydration default): render settled, no animation.
  // Passthrough DOM props (role, aria-*, etc.) are forwarded to the element.
  if (reduce) {
    const StaticTag = as as ElementType;
    return (
      <StaticTag className={className} {...rest}>
        {children}
      </StaticTag>
    );
  }

  const delay = Math.min(index * STAGGER_STEP, STAGGER_CAP);

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: RISE }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: RISE }}
      transition={{ duration: DURATION, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

export default Reveal;
