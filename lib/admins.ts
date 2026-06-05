/**
 * ADMIN ASSIGNMENT — "the backend"
 * --------------------------------
 * There is no auth yet (login just drops you into the app). To grant someone
 * admin powers, add their email to this list. When real auth (Supabase) is
 * added later, this same list can be moved into the database / RLS policies
 * without changing the rest of the app.
 *
 * You can also flip roles live from the floating Role Switcher in the bottom-
 * right corner of any in-app page.
 */
// Bootstrap OWNERS — top-tier admins who can add/remove sub-admins. Source of
// truth when Supabase isn't configured, and the seed for the app_admins table
// (supabase/admins.sql). Sub-admins added at runtime live in Supabase, not here.
export const ADMIN_EMAILS: string[] = [
  "greg@lecgroup.com",
  "jay@nonstopfinancial.com",
  "admin@nonstopfinancial.com",
];

/** The identity used by the fake "click to login" flow. */
export const DEMO_EMAIL = "greg@lecgroup.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
