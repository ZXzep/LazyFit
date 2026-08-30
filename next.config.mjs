/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The AI estimator can receive a base64 photo; give server actions headroom too.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
