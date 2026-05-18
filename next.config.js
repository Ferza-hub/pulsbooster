/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'playwright-extra'],
  },
}

module.exports = nextConfig
