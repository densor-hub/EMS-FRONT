/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
   // Enable WebUSB in Next.js
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Feature-Policy',
            value: "usb 'self'",
          },
        ],
      },
    ];
  }
}

export default nextConfig
