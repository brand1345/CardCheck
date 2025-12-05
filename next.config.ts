import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["siffqleeymcnchoivjqu.supabase.co"], // 👈 add this
  },
  reactCompiler: true,
};

export default nextConfig;
