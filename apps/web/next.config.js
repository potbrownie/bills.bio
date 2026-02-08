const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed 'output: export' - it disables API routes and server features
  // For static export, use: npm run build && npm run export
  experimental: {
    turbo: {
      root: path.join(__dirname),
    },
  },
}

module.exports = nextConfig
