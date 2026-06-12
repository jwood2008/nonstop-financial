import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

/** Server-side Stripe client. Null until STRIPE_SECRET_KEY is set. */
export const stripe = key ? new Stripe(key) : null;

/** One-time full-access price in cents (change here or via env). $2,000 default. */
export const PRICE_CENTS = Number(process.env.PRICE_CENTS ?? 200000);

/** Monthly price in cents (change here or via env). $75 placeholder until Jay confirms. */
export const MONTHLY_CENTS = Number(process.env.MONTHLY_CENTS ?? 7500);

export const PRODUCT_NAME = "NonStop Financial — Producer Access (Full)";
export const MONTHLY_PRODUCT_NAME = "NonStop Financial — Producer Access (Monthly)";
