/** @type {import('next').NextConfig} */
const BACKEND = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

module.exports = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Brauzer faqat frontend domeniga murojaat qiladi -> cookie'lar first-party (CSRF va SameSite xavfsiz)
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${BACKEND}/api/v1/:path*` },
      { source: '/media/:path*', destination: `${BACKEND}/media/:path*` },
    ];
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
      ],
    }];
  },
};
