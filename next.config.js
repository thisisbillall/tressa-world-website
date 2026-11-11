/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 640, 750],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' }
    ]
  },
  // Digital menu: a static app in public/menu with one page per space, for the
  // table QR codes (?table=12 marks the table). Each space reads its own menu
  // from public/menu/data/<space>.js; /menu and /menu/aura use the full menu.
  async rewrites() {
    return [
      { source: '/menu', destination: '/menu/index.html' },
      { source: '/menu/:venue(soul|unwind|sky|aura)', destination: '/menu/:venue/index.html' }
    ];
  }
};
module.exports = nextConfig;
