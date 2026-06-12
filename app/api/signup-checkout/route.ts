import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { stripe, PRICE_CENTS, PRODUCT_NAME, MONTHLY_CENTS, MONTHLY_PRODUCT_NAME } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Paid signup: NO account is created here. The form details ride along in
 * the Stripe Checkout session's metadata (password as a bcrypt hash, never
 * plaintext), and the webhook creates the account + sends the confirmation
 * email only after payment succeeds. Abandoned checkouts leave nothing
 * behind, so the same email can simply try again.
 * (NonStop team emails never come here — their signup is free and client-side.)
 */
export async function POST(req: NextRequest) {
  if (!stripe || !supabaseAdmin) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const birthdate = String(body?.birthdate ?? "");
  const age = Number(body?.age ?? 0);
  const monthly = body?.plan === "monthly";

  if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  if (email.endsWith("@nonstopglobal.co"))
    return NextResponse.json({ error: "NonStop team emails sign up free — no payment needed." }, { status: 400 });

  // Free-listed agency emails never pay (rpc missing = migration not run yet → not free)
  const { data: freeFlag } = await supabaseAdmin.rpc("is_free_email", { p_email: email });
  if (freeFlag === true)
    return NextResponse.json(
      { error: "This email has free team access — just create the account, no payment needed." },
      { status: 400 }
    );

  // Only a real (already created) account blocks the email — accounts only
  // exist after a successful payment or a NonStop signup.
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists — log in instead." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: monthly ? "subscription" : "payment",
    customer_email: email,
    metadata: {
      signup: "1",
      name,
      email,
      age: String(age || ""),
      birthdate,
      password_hash: passwordHash,
    },
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
    success_url: `${origin}/signup?status=paid&email=${encodeURIComponent(email)}`,
    cancel_url: `${origin}/signup?status=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
