/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully static marketing site (no API routes / server actions) -> export to
  // a portable `out/` folder that can be hosted anywhere (Netlify Drop, etc.).
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
