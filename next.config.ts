import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Backend: Supabase (auth + Postgres), Stripe checkout/webhook, Resend email —
     all via server routes under app/api. No extra Next config needed today. */
};

export default nextConfig;
