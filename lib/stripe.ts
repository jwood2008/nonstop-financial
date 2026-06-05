import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

/** Server-side Stripe client. Null until STRIPE_SECRET_KEY is set. */
export const stripe = key ? new Stripe(key) : null;

/** One-time price in cents (change here or via env). $497 default. */
export const PRICE_CENTS = Number(process.env.PRICE_CENTS ?? 49700);

export const PRODUCT_NAME = "NonStop Financial — Producer Access (Lifetime)";
