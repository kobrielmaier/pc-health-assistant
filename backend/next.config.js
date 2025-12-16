/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable edge runtime for streaming endpoints
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
