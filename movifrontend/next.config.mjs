/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*', // Match all API routes
        destination: 'http://localhost:8000/api/:path*', // Proxy to backend
      },
    ];
  },
  images: {
    domains: ['m.media-amazon.com'], // Add allowed image hostnames here
  },
};

export default nextConfig;