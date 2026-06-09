import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isPositionRole } from "@/lib/roles";

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

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ role, requested_role: null })
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role });
}
