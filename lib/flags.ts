/**
 * Master switch for the paid-subscription experience: Stripe checkout, the
 * plan pickers, the /upgrade pricing screen, and the content paywall.
 *
 * OFF for now — everyone gets full access for free, nobody is shown a payment
 * screen, and the Stripe checkout endpoints refuse to open a session. All of
 * the payment code stays in place and untouched; flip this to `true` to bring
 * paid access back. (When re-enabling, also flip the server-side DB paywall
 * switch — see the nsf-paywall-switch note.)
 */
export const PAYMENTS_ENABLED = false;
