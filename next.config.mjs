/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_API_URL ||  'http://localhost:5050'// 'http://localhost:7214';

const nextConfig = {
  reactStrictMode: true,
  typescript: {},
  images: { unoptimized: true },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'usb=(self)' },
        ],
      },
    ];
  },

  async rewrites() {
    console.log(BACKEND)
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/:path*`,
      },
    ];
  },
};

export default nextConfig;