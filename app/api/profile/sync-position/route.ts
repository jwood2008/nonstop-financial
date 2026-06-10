import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const NONSTOP_DOMAIN = "nonstopglobal.co";

/**
 * Self-heal a user's position: anyone with a NonStop email still on the default
 * "Lead" tier is bumped to "Agent". Never touches Agent/Manager (so it won't
 * undo an admin's promotion). Runs with the service role (the role-protect
 * trigger only lets the service role change `role`). Called on login.
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
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const current = prof?.role ?? "Lead";

  const isNonStop =
    user.email.toLowerCase().split("@")[1] === NONSTOP_DOMAIN;

  // only auto-adjust the default Lead tier
  if (current === "Lead" && isNonStop) {
    await supabaseAdmin
      .from("profiles")
      .update({ role: "Agent" })
      .eq("id", user.id);
    return NextResponse.json({ role: "Agent" });
  }

  return NextResponse.json({ role: current });
}
