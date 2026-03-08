import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.app",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default withNextIntl(nextConfig)
