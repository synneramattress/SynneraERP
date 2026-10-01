/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  async redirects() {
    return [
      // Ensure crawlers / PWABuilder always get a real document at /
      {
        source: "/",
        destination: "/auth/login/",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
