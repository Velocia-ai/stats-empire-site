// Stats Empire, robots.txt generator.
//
// Next.js App Router emits this as a static /robots.txt at build time under
// output: 'export' (it is a fully static, parameter-free metadata route), so it
// lands in out/robots.txt for crawlers. Allows all user agents and points at the
// sitemap so search engines can discover the three marketing routes.

import type { MetadataRoute } from 'next';

const SITE_URL = 'https://stats-empire-demo.netlify.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
