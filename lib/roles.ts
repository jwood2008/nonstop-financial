/**
 * The role pipeline: Lead → Agent → Manager → Admin. One role per person.
 * POSITION_ROLES are the assignable team positions (analytics Users panel);
 * 'Admin' is granted via the admin list instead (Settings → Team admins),
 * which forces the profile role to Admin and clears any team ties.
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
