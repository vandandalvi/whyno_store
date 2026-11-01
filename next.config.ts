import type { NextConfig } from "next";

const storageHost = process.env.AZURE_STORAGE_ACCOUNT_NAME
  ? `${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`
  : null;

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com" + (storageHost ? ` https://${storageHost}` : ""),
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com" + (process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"),
  "font-src 'self'",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.firebaseapp.com",
  "frame-src https://*.firebaseapp.com https://accounts.google.com https://apis.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: storageHost ? [{ protocol: "https", hostname: storageHost }] : [],
  },
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};
export default config;
