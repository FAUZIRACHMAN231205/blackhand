import type { NextConfig } from "next";
import { LEGACY_REDIRECTS } from "./app/lib/routes";

const nextConfig: NextConfig = {
  // Feed, Collection, Dashboard, Album Saya, Pesanan Saya and Settings were
  // merged into Karya and Akun; their old addresses keep working.
  async redirects() {
    return LEGACY_REDIRECTS.map((r) => ({ ...r, permanent: true }));
  },
  async headers() {
    return [
      {
        // The browser must always check for a new service worker, or a bug in
        // one version could stick on installed phones.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        // Fetched fresh at each service-worker install.
        source: "/offline.html",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
