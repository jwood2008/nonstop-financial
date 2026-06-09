/**
 * Transactional email via Resend (https://resend.com) — server-only.
 *
 * Uses Resend's REST API directly (no SDK dependency). Sending is best-effort:
 * if RESEND_API_KEY isn't set we no-op and report `sent: false` so callers can
 * still succeed (e.g. an admin is added even when email isn't configured).
 *
 *   RESEND_API_KEY    Resend → API Keys
 *   ADMIN_EMAIL_FROM  verified sender, e.g. "NonStop Financial <team@yourdomain>"
 *                     (defaults to Resend's onboarding sender for testing)
 */

const FROM =
  process.env.ADMIN_EMAIL_FROM || "NonStop Financial <onboarding@resend.dev>";

type SendResult = { sent: boolean; error?: string };

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "RESEND_API_KEY not set" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

/** Email a newly-granted sub-admin that they now have admin access. */
export function sendAdminGrantedEmail(opts: {
  to: string;
  appUrl: string;
  invitedBy?: string;
}): Promise<SendResult> {
  const { to, appUrl, invitedBy } = opts;
  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;
  const by = invitedBy ? ` by ${invitedBy}` : "";
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#18181b">
    <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#ff5f1f">NonStop Financial</div>
    <h1 style="font-size:22px;margin:12px 0 8px">You've been granted admin access</h1>
    <p style="font-size:15px;line-height:1.6;color:#3f3f46">
      You were added as an <strong>admin</strong> on the NonStop Financial training
      platform${by}. Admins can manage curriculum content and see team progress.
    </p>
    <p style="margin:24px 0">
      <a href="${loginUrl}"
         style="background:#ff5f1f;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;display:inline-block">
        Sign in to the platform
      </a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#71717a">
      Sign in with <strong>${to}</strong>. If you don't have an account yet, sign up
      with that same email and your admin access applies automatically.
    </p>
  </div>`;
  return send(to, "You've been granted admin access — NonStop Financial", html);
}
