import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  partialPrefetching: true,
  // PDFs read their fonts and images from disk (src/lib/pdf); pdfkit stays a server package.
  outputFileTracingIncludes: { "/app/**/pdf": ["./src/lib/pdf/fonts/*", "./src/lib/pdf/assets/*"], "/dev/agent/statement": ["./src/lib/pdf/fonts/*", "./src/lib/pdf/assets/*"] },
  serverExternalPackages: ["pdfkit", "web-push"],
};

export default nextConfig;
