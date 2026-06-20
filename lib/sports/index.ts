// Sport registry, single import surface for all per-sport fixtures.
// SPORTS drives navigation/menus; getSportData(key) resolves the full dataset.

import type { SportData, SportKey, SportMeta } from '@/lib/types';

import baseball from './baseball';
import americanfootball from './americanfootball';
import basketball from './basketball';
import tennis from './tennis';
import soccer from './soccer';

// Ordered list for nav, sport pickers, and the home grid.
// Featured sports (tennis, soccer, basketball) lead; baseball & American
// Football stay available but secondary. Keep this order in sync with
// FEATURED_SPORTS below.
export const SPORTS: SportMeta[] = [
  {
    key: 'tennis',
    name: 'Tennis',
    tagline: 'Serve placement, rally patterns & winners-to-errors balance.',
  },
  {
    key: 'soccer',
    name: 'Soccer',
    tagline: 'Pass networks, xG shot maps & positional heatmaps.',
  },
  {
    key: 'basketball',
    name: 'Basketball',
    tagline: 'Shot charts, true-shooting efficiency & drive trajectories.',
  },
  {
    key: 'americanfootball',
    name: 'American Football',
    tagline: 'Passing charts, field-position heat & red-zone efficiency.',
  },
  {
    key: 'baseball',
    name: 'Baseball / Softball',
    tagline: 'Spray charts, strike-zone heat & exit-velo analytics.',
  },
];

// Flagship sports, featured most prominently across the site (hero rotation,
// coverage section, report-toggle default, freemium default).
export const FEATURED_SPORTS: SportKey[] = ['tennis', 'soccer', 'basketball'];

// Registry map, keep keys in sync with SportKey.
const REGISTRY: Record<SportKey, SportData> = {
  baseball,
  americanfootball,
  basketball,
  tennis,
  soccer,
};

export function getSportData(key: SportKey): SportData {
  return REGISTRY[key];
}

export { baseball, americanfootball, basketball, tennis, soccer };
