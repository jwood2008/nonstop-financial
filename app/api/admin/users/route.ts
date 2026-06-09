import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * Admin-only: list every signed-up user (name + email) for the analytics
 * Users panel. Uses the service-role client to read past profiles RLS, after
 * verifying the caller is an admin (owner or sub-admin).
 */
export async function GET(req: NextRequest) {
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

  // caller must be an admin (owner or sub-admin)
  const { data: caller } = await supabaseAdmin
    .from("app_admins")
    .select("role")
    .eq("email", callerEmail)
    .maybeSingle();
  if (!caller) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  // Prefer the role columns; fall back if the migration hasn't been run yet.
  let users: unknown[] | null = null;
  const withRoles = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, created_at, role, requested_role")
    .order("created_at", { ascending: false });
  if (withRoles.error) {
    const basic = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, created_at")
      .order("created_at", { ascending: false });
    if (basic.error) {
      return NextResponse.json({ error: basic.error.message }, { status: 500 });
    }
    users = basic.data;
  } else {
    users = withRoles.data;
  }

  // mark which users are admins (owner or sub-admin) so the list can filter them
  const { data: admins } = await supabaseAdmin.from("app_admins").select("email");
  const adminSet = new Set((admins ?? []).map((a) => a.email.toLowerCase()));
  const withAdmin = (users ?? []).map((u) => {
    const row = u as { email?: string };
    return { ...row, is_admin: adminSet.has((row.email ?? "").toLowerCase()) };
  });

  return NextResponse.json({ users: withAdmin });
}
