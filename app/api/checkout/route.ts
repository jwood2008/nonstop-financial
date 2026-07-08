import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, PRICE_CENTS, PRODUCT_NAME, MONTHLY_CENTS, MONTHLY_PRODUCT_NAME } from "@/lib/stripe";
import { PAYMENTS_ENABLED } from "@/lib/flags";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Payments are turned off — the gate is locked. Keep the code, refuse checkout.
  if (!PAYMENTS_ENABLED) {
    return NextResponse.json({ error: "Payments are currently disabled — access is free." }, { status: 403 });
  }
  if (!stripe) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  // identify the user from their Supabase access token
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  // Carry the user's token so auth.uid() resolves inside has_purchased() below.
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
  } = await sb.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Already have access? Block re-purchase for EITHER plan — has_purchased()
  // is true for a lifetime payment OR an active/trialing subscription, so a
  // monthly subscriber can't also buy the one-time plan (and vice versa).
  const { data: alreadyHasAccess } = await sb.rpc("has_purchased");
  if (alreadyHasAccess === true) {
    return NextResponse.json(
      { error: "You already have access — no need to purchase again." },
      { status: 409 }
    );
  }

  // plan: "full" (one-time, default) or "monthly" (subscription)
  const body = await req.json().catch(() => ({}));
  const monthly = body?.plan === "monthly";

  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: monthly ? "subscription" : "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    line_items: [
      {
        quantity: 1,
        price_data: monthly
          ? {
              currency: "usd",
              unit_amount: MONTHLY_CENTS,
              recurring: { interval: "month" },
              product_data: { name: MONTHLY_PRODUCT_NAME },
            }
          : {
              currency: "usd",
              unit_amount: PRICE_CENTS,
              product_data: { name: PRODUCT_NAME },
            },
      },
    ],
    success_url: `${origin}/upgrade?status=success`,
    cancel_url: `${origin}/upgrade?status=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
