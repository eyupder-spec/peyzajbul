/**
 * The auth user behind a claim, registration or login whose e-mail address was just proven with a one-time code.
 *
 * Supabase Auth sign-up is open, and a firm's listed address is public, so anyone can create an UNCONFIRMED
 * account for it with a password of their own choosing. When the real owner later proves the address, that
 * account must not become the owner's with the stranger's password still attached: the "Şifrem var" login
 * would hand the stranger the firm panel. So an account that never completed a sign-in (unconfirmed, or
 * confirmed but never used) gets a random password nobody knows before it is adopted. An account that has
 * signed in before is a real, used account (a legacy firm owner) and keeps its credentials.
 *
 * Only structural types and no Deno globals besides the Web Crypto API, so user_test.ts can drive it with fakes.
 */

/** The fields of an auth user this module looks at. */
export interface AuthUserState {
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
}

/** The part of supabase.auth.admin this module uses. */
export interface UserAdminApi {
  getUserById(id: string): PromiseLike<{ data: { user: AuthUserState | null }; error: { message: string } | null }>;
  updateUserById(
    id: string,
    attributes: { password: string; email_confirm: boolean },
  ): PromiseLike<{ error: { message: string } | null }>;
  createUser(attributes: {
    email: string;
    email_confirm: boolean;
  }): PromiseLike<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
}

export interface UserDeps {
  auth: UserAdminApi;
  /** Id of the auth user with this address, or null. */
  findUserId(email: string): Promise<string | null>;
}

/**
 * 32 random bytes as base64url (256 bits), plus a fixed tail so the value also satisfies a configured password
 * complexity rule (upper case, lower case, digit, symbol). The tail adds no entropy and is not a secret.
 */
export function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encoded}-Aa1!`;
}

/** True for an account that never completed a sign-in, whose credentials therefore came from somebody else. */
function hasUnprovenCredentials(user: AuthUserState): boolean {
  return !user.email_confirmed_at || !user.last_sign_in_at;
}

async function adoptExistingUser(deps: UserDeps, id: string): Promise<string> {
  const { data, error } = await deps.auth.getUserById(id);
  if (error || !data.user) throw new Error("user_lookup_failed");

  if (hasUnprovenCredentials(data.user)) {
    // generateLink only issues a sign-in token for a confirmed address, and the code just proved this one. An
    // account that never signed in has no session to revoke; replacing the password removes the only
    // credential a previous registrant could still hold.
    const { error: updateError } = await deps.auth.updateUserById(id, {
      password: randomPassword(),
      email_confirm: true,
    });
    if (updateError) throw new Error("user_reset_failed");
  }
  return id;
}

/** The auth user for an address whose control was just proven. Fails closed: a user is never adopted half-cleaned. */
export async function ensureProvenUser(deps: UserDeps, email: string): Promise<string> {
  // Two rounds: a parallel request (or a sign-up) may create the user between the lookup and the insert, and
  // that user goes through the same adoption rules instead of being trusted as it is.
  for (let round = 0; round < 2; round++) {
    const existingId = await deps.findUserId(email);
    if (existingId) return await adoptExistingUser(deps, existingId);

    const { data, error } = await deps.auth.createUser({ email, email_confirm: true });
    if (!error && data.user) return data.user.id;
    console.error("[claim-firm] createUser failed:", error?.message);
  }
  throw new Error("user_create_failed");
}
