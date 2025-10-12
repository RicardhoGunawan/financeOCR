/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // ⛔️ Tambahkan ini untuk mengabaikan folder Supabase functions
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'https://deno.land/std@0.168.0/http/server.ts': 'commonjs2',
      });
    }

    // Abaikan seluruh folder supabase/functions agar tidak dibuild
    config.module.rules.push({
      test: /\.ts$/,
      include: /supabase\/functions/,
      use: 'null-loader',
    });

    return config;
  },
};

module.exports = nextConfig;
