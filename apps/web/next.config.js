/** @type {import('next').NextConfig} */

// Allow next/image to optimise images served by the backend (generated pages,
// cover art) without hard-coding a deployment host: derive it from the public
// backend URL when available.
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const backendPattern = (() => {
  const patterns = [
    { protocol: "http", hostname: "localhost", port: "8080", pathname: "/**" },
    { protocol: "http", hostname: "127.0.0.1", port: "8080", pathname: "/**" },
    { protocol: "http", hostname: "localhost", port: "8081", pathname: "/**" },
    { protocol: "http", hostname: "127.0.0.1", port: "8081", pathname: "/**" },
  ];
  if (backendUrl) {
    try {
      const parsed = new URL(backendUrl);
      patterns.push({
        protocol: parsed.protocol.replace(":", ""),
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        pathname: "/**",
      });
    } catch {
      // ignore malformed URL — fall back to the localhost defaults above
    }
  }
  return patterns;
})();

const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Tree-shake these barrel packages per import instead of shipping them whole.
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns"],
    // Keep recently visited routes in the client router cache so navigating
    // back/forward (and revisiting pages) is instant instead of re-fetching
    // the whole route from the server every time.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  compiler: {
    // Strip noisy client console output from production bundles.
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  images: {
    minimumCacheTTL: 31536000,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...backendPattern,
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
      {
        protocol: 'https',
        hostname: 'static1.cbrimages.com',
      },
      {
        protocol: 'https',
        hostname: 'comicbook.com',
      },
      {
        protocol: 'https',
        hostname: 'freshangleng.com',
      },
      {
        protocol: 'https',
        hostname: 'v3.fal.media',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
};

export default nextConfig;
