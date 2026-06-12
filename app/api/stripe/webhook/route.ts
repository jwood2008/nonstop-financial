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
    let userId = s.metadata?.user_id ?? s.client_reference_id ?? null;

    // Paid signup (see /api/signup-checkout): the account doesn't exist yet —
    // payment is what creates it. The password arrives as a bcrypt hash.
    if (!userId && s.metadata?.signup === "1" && s.payment_status === "paid" && supabaseAdmin) {
      const em = (s.metadata.email ?? s.customer_details?.email ?? "").toLowerCase();
      if (em) {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: em,
          password_hash: s.metadata.password_hash,
          email_confirm: false, // the confirmation email goes out below
          user_metadata: {
            name: s.metadata.name ?? "",
            age: Number(s.metadata.age ?? 0) || null,
            birthdate: s.metadata.birthdate ?? "",
            manager_id: "",
          },
        });
        if (created?.user) {
          userId = created.user.id;
        } else if (createErr) {
          // duplicate webhook delivery (or retry) — the user already exists
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .ilike("email", em)
            .maybeSingle();
          userId = (prof?.id as string) ?? null;
        }
      }
    }

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

      // Paid signups are created WITHOUT a confirmation email (see
      // /api/signup-checkout) — payment is what triggers it. If the user
      // is still unconfirmed, send the confirmation email now.
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
        const userEmail = u?.user?.email ?? s.customer_details?.email ?? null;
        if (u?.user && !u.user.email_confirmed_at && userEmail) {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (url && anon) {
            await fetch(`${url}/auth/v1/resend`, {
              method: "POST",
              headers: { apikey: anon, "Content-Type": "application/json" },
              body: JSON.stringify({ type: "signup", email: userEmail }),
            });
          }
        }
      } catch {
        // never fail the webhook over the email — access is already granted
      }
    }
  }

  return NextResponse.json({ received: true });
}
