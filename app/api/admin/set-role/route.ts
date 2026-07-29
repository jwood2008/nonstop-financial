import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isPositionRole, POSITION_ROLES } from "@/lib/roles";
import { sendPositionApprovedEmail } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Admin-only: set a user's position (and clear any pending request). Gated to
 * admins (owner or sub-admin); runs as service role so the role-protect trigger
 * lets the change through.
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

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
  const { data: caller } = await supabaseAdmin
    .from("app_admins")
    .select("role")
    .eq("email", callerEmail)
    .maybeSingle();
  if (!caller) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body?.userId ?? "").trim();
  const role = String(body?.role ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "Missing user." }, { status: 400 });
  }
  if (!isPositionRole(role)) {
    return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  }

  // one role per person: admins are 'Admin', full stop — they can't also
  // hold a pipeline position. Remove their admin access first.
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("email, name, role")
    .eq("id", userId)
    .maybeSingle();
  if (target?.email) {
    const { data: targetAdmin } = await supabaseAdmin
      .from("app_admins")
      .select("email")
      .eq("email", target.email.toLowerCase())
      .maybeSingle();
    if (targetAdmin) {
      return NextResponse.json(
        { error: "This user is an Admin. Remove their admin access first." },
        { status: 409 }
      );
    }
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role, requested_role: null })
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Tell them they were approved. Only on a real step up the pipeline: denying
  // a request re-sets someone's current role (a no-op), and nobody wants an
  // email announcing they've been moved back down.
  const rank = (r: string) => POSITION_ROLES.indexOf(r as (typeof POSITION_ROLES)[number]);
  const promoted = rank(role) > rank(String(target?.role ?? "Lead"));
  if (!promoted || !target?.email) {
    return NextResponse.json({ ok: true, role, emailed: false });
  }

  const { sent, error: emailErr } = await sendPositionApprovedEmail({
    to: target.email,
    name: target.name ?? undefined,
    role,
    appUrl: req.headers.get("origin") ?? req.nextUrl.origin,
  });
  if (!sent) console.warn("[set-role] approval email failed:", emailErr);

  // the promotion itself already succeeded — a failed email is a warning,
  // not an error, but the admin should know it didn't go out
  return NextResponse.json({ ok: true, role, emailed: sent, emailError: sent ? undefined : emailErr });
}
