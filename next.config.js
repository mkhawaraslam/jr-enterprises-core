module.exports = {
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
  },
  async headers() {
    return [{
      source: "/admin/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
      ],
    }];
  },
};
