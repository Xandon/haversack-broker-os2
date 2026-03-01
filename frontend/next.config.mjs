/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@haversack/shared'],
  eslint: {
    dirs: ['src'],
  },
};

export default nextConfig;
