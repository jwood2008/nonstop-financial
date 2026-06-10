import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe, PRICE_CENTS, PRODUCT_NAME } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
  const sb = createClient(url, anon);
  const {
    data: { user },
  } = await sb.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // already paid? don't let them buy the same lifetime access twice
  if (supabaseAdmin) {
    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "You already have access — no need to purchase again." },
        { status: 409 }
      );
    }
  }

  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
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
