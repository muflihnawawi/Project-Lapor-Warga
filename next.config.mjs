/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mysql2', 'exceljs', 'bcryptjs'],
  },
};
export default nextConfig;
