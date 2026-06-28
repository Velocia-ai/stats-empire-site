// Stats Empire, sitemap.xml generator.
//
// Next.js App Router emits this as a static /sitemap.xml at build time under
// output: 'export' (static, parameter-free metadata route), landing in
// out/sitemap.xml. Lists the three marketing routes: Home, Product, Pricing.
// Home carries the highest priority; the three are the entire public surface.

import type { MetadataRoute } from 'next';

const SITE_URL = 'https://stats-empire-demo.netlify.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/product/`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/pricing/`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
