import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body required for signature verification

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", secret ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // completed = instant methods (cards); async_payment_succeeded = delayed
  // methods (e.g. bank debits) that confirm after checkout closes.
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const s = event.data.object as Stripe.Checkout.Session;
    const userId = s.metadata?.user_id ?? s.client_reference_id ?? null;
    if (userId && s.payment_status === "paid" && supabaseAdmin) {
      await supabaseAdmin.from("purchases").upsert(
        {
          user_id: userId,
          stripe_session_id: s.id,
          amount: s.amount_total,
          email: s.customer_details?.email ?? null,
          status: "paid",
        },
        { onConflict: "stripe_session_id" }
      );
    }
  }

  return NextResponse.json({ received: true });
}
