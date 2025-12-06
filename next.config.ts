// next.config.ts

const nextConfig = {
  images: {
    // still fine, you’ll just get a deprecation warning about domains vs remotePatterns
    domains: ["siffqleeymcnchoivjqu.supabase.co"],
  },
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
