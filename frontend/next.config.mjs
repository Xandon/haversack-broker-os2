/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@haversack/shared'],
  output: 'standalone',
};

export default nextConfig;
