/**
 * Position ladder (separate from admin status). Every new signup starts as a
 * "Lead". A user can *request* a different position in Settings, but only an
 * admin can actually set it (in the analytics Users panel).
 */
export const POSITION_ROLES = ["Lead", "Agent", "Manager"] as const;

export type PositionRole = (typeof POSITION_ROLES)[number];

export const DEFAULT_ROLE: PositionRole = "Lead";

export function isPositionRole(r: unknown): r is PositionRole {
  return typeof r === "string" && (POSITION_ROLES as readonly string[]).includes(r);
}

/**
 * What a user can request: a Manager promotion (a position) or Admin access
 * (team-admin membership — separate from position, so you can be "Agent + Admin").
 */
export const REQUESTABLE_ROLES = ["Manager", "Admin"] as const;
export type RequestableRole = (typeof REQUESTABLE_ROLES)[number];

export function isRequestable(r: unknown): r is RequestableRole {
  return typeof r === "string" && (REQUESTABLE_ROLES as readonly string[]).includes(r);
}
