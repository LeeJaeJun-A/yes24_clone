/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/main/default.aspx',
        destination: '/main/default',
      },
      {
        source: '/24/Category/Display/:code',
        destination: '/Product/Category/Display/:code',
      },
      {
        source: '/Event/:path*',
        destination: '/event/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Powered-By', value: 'ASP.NET' },
          { key: 'X-AspNet-Version', value: '4.0.30319' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
