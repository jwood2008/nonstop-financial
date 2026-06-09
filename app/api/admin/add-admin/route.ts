import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAdminGrantedEmail } from "@/lib/email";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Owner-only: add a sub-admin and email them that they've been granted access.
 * Mirrors the `add_admin` RPC's rules (owner-gated, idempotent) but runs
 * server-side so it can also send the notification email via Resend.
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  // 1. identify the caller from their Supabase access token
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const {
    data: { user },
  } = await createClient(url, anon).auth.getUser(token);
  const callerEmail = user?.email?.toLowerCase();
  if (!callerEmail) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // 2. caller must be an owner
  const { data: caller } = await supabaseAdmin
    .from("app_admins")
    .select("role")
    .eq("email", callerEmail)
    .maybeSingle();
  if (caller?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can add admins." }, { status: 403 });
  }

  // 3. validate the target email
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // 4. add as sub-admin (don't downgrade an existing owner)
  const { error: insertErr } = await supabaseAdmin
    .from("app_admins")
    .upsert(
      { email, role: "admin", added_by: callerEmail },
      { onConflict: "email", ignoreDuplicates: true }
    );
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // 5. notify them (best-effort — never fails the grant)
  const appUrl = req.headers.get("origin") ?? req.nextUrl.origin;
  const { sent, error: emailErr } = await sendAdminGrantedEmail({
    to: email,
    appUrl,
    invitedBy: callerEmail,
  });

  return NextResponse.json({ ok: true, emailed: sent, emailError: emailErr ?? null });
}
