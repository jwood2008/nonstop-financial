import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isPositionRole } from "@/lib/roles";

export const runtime = "nodejs";

/**
 * A signed-in user requests a different position. This only sets
 * `requested_role` on their own profile — it never changes the actual `role`
 * (an admin does that). Passing an empty role cancels a pending request.
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
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = String(body?.role ?? "").trim();
  const requested = raw === "" ? null : raw;
  if (requested !== null && !isPositionRole(requested)) {
    return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ requested_role: requested })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, requested_role: requested });
}
