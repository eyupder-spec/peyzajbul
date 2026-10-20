// Calculator estimate token as the lead form carries it. Pure module: no Deno globals.
//
// public.save_estimate (20261021090000_calc_estimates.sql) hands the calculator a 16 character token; the form
// puts it into create-lead as `est`. create-lead keeps it on the lead (leads.estimate_token) and verify-otp
// links the estimate to the lead once the code is confirmed. The same rule is enforced in the browser by
// parseEstimateToken in src/lib/leadFormData.ts; a parity test in validate.test.ts keeps both patterns equal.

export const ESTIMATE_TOKEN_PATTERN = /^[a-z0-9]{16}$/i;

/** The token in canonical lower-case form (as save_estimate generates it), or undefined for anything else. */
export function parseEstimateToken(value: unknown): string | undefined {
  return typeof value === "string" && ESTIMATE_TOKEN_PATTERN.test(value) ? value.toLowerCase() : undefined;
}
