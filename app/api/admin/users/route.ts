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

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}
