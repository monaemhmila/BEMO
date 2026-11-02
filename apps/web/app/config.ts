const isProduction = process.env.NODE_ENV === "production";

// The web container cannot reach a backend through its own localhost. Keep the
// local default convenient for development, but make a production build safe
// even when the Compose build arg was omitted.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (isProduction ? "https://api.monpetithero.shop" : "http://localhost:8080");
export const CLOUDFLARE_URL = "https://pub-b2acac8ef6a84c39b35165219b664570.r2.dev";
