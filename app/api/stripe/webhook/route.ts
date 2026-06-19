import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Stripe redelivers an event on any non-2xx response. We therefore return 500
// on a GENUINE fulfillment failure (so the sale isn't silently lost) and 200
// only when the event is fully handled or safely ignored.
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

  if (!supabaseAdmin) {
    // Can't fulfill without the service-role client — 503 so Stripe retries.
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }
  const admin = supabaseAdmin;

  try {
    switch (event.type) {
      // completed = instant methods (cards); async_payment_succeeded = delayed
      // methods (e.g. bank debits) that confirm after checkout closes.
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.payment_status !== "paid") break; // not actually paid yet — ignore
        let userId = s.metadata?.user_id ?? s.client_reference_id ?? null;

        // Paid signup (see /api/signup-checkout): the account doesn't exist yet
        // — payment is what creates it. The password arrives as a bcrypt hash.
        if (!userId && s.metadata?.signup === "1") {
          const em = (s.metadata.email ?? s.customer_details?.email ?? "").toLowerCase();
          if (!em) throw new Error("signup session missing email");
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
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
          } else {
            // ONLY an "already registered" error is a benign duplicate delivery.
            // Any other error is a real failure → throw so Stripe retries
            // (otherwise the customer paid and gets nothing, silently).
            const msg = (createErr?.message ?? "").toLowerCase();
            const isDuplicate =
              msg.includes("already") || msg.includes("registered") || msg.includes("exists");
            if (!isDuplicate) throw createErr ?? new Error("createUser failed");
            const { data: prof } = await admin
              .from("profiles")
              .select("id")
              .ilike("email", em)
              .maybeSingle();
            userId = (prof?.id as string) ?? null;
            if (!userId) throw new Error("createUser duplicate but no existing profile found");
          }
        }

        if (!userId) break; // nothing to fulfill (e.g. non-signup event with no user)

        // Subscriptions carry an expiry + Stripe subscription id; one-time
        // payments grant lifetime access with neither.
        let subId: string | null = null;
        let periodEnd: string | null = null;
        let status = "paid";
        let plan = "full";
        if (s.mode === "subscription" && s.subscription) {
          subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
          plan = "monthly";
          status = "active";
          try {
            const sub = await stripe.subscriptions.retrieve(subId);
            status = sub.status; // active | trialing | past_due | canceled | ...
            // As of Stripe API 2026-05-27.dahlia, current_period_end lives on
            // each subscription ITEM, not the subscription object itself.
            const end = sub.items?.data?.[0]?.current_period_end;
            if (end) periodEnd = new Date(end * 1000).toISOString();
          } catch {
            /* keep status=active; subscription.updated will reconcile the period */
          }
        }

        const { error: upErr } = await admin.from("purchases").upsert(
          {
            user_id: userId,
            stripe_session_id: s.id,
            stripe_subscription_id: subId,
            plan,
            amount: s.amount_total,
            email: s.customer_details?.email ?? s.metadata?.email ?? null,
            status,
            current_period_end: periodEnd,
          },
          { onConflict: "stripe_session_id" }
        );
        if (upErr) throw upErr; // genuine write failure → Stripe retries

        // Paid signups are created WITHOUT a confirmation email — payment is
        // what triggers it. If the user is still unconfirmed, send it now.
        try {
          const { data: u } = await admin.auth.admin.getUserById(userId);
          const userEmail = u?.user?.email ?? s.customer_details?.email ?? null;
          if (u?.user && !u.user.email_confirmed_at && userEmail) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (url && anon) {
              const r = await fetch(`${url}/auth/v1/resend`, {
                method: "POST",
                headers: { apikey: anon, "Content-Type": "application/json" },
                body: JSON.stringify({ type: "signup", email: userEmail }),
              });
              // A paying customer who never gets this email can't log in, so make
              // the failure observable (don't throw — access is already granted
              // and a webhook retry would just re-run createUser).
              if (!r.ok) {
                console.error(
                  "[stripe webhook] confirmation resend failed",
                  r.status,
                  await r.text().catch(() => "")
                );
              }
            } else {
              console.error("[stripe webhook] cannot send confirmation: Supabase URL/anon key missing");
            }
          }
        } catch (e) {
          // best-effort — access is already granted; don't fail over email
          console.error("[stripe webhook] confirmation resend threw", e);
        }
        break;
      }

      // Keep access in sync with the subscription's real state so a cancelled
      // or lapsed monthly plan actually loses access (see has_purchased()).
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
        // current_period_end is on the subscription item (API 2026-05-27.dahlia).
        const end = sub.items?.data?.[0]?.current_period_end;
        const { error } = await admin
          .from("purchases")
          .update({
            status,
            current_period_end: end ? new Date(end * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", sub.id);
        if (error) throw error;
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = (inv as unknown as { subscription?: string | { id: string } }).subscription;
        const id = typeof subId === "string" ? subId : subId?.id;
        if (id) {
          const { error } = await admin
            .from("purchases")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", id);
          if (error) throw error;
        }
        break;
      }

      default:
        break; // ignore everything else
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
