// How to run: deno test supabase/functions/claim-firm
import { assert, assertEquals, assertMatch, assertNotEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ensureProvenUser, randomPassword, type AuthUserState, type UserDeps } from "./user.ts";

const EMAIL = "info@firma.com";
const USER_ID = "0a1b2c3d-1111-4222-8333-444455556666";
const SIGNED_IN = "2026-10-01T09:00:00Z";

interface FakeOptions {
  /** Ids returned by successive findUserId calls; the last one repeats. */
  lookups?: Array<string | null>;
  user?: AuthUserState | null;
  getError?: boolean;
  updateError?: boolean;
  createResult?: { id: string } | null;
}

function fakeDeps(options: FakeOptions = {}) {
  const lookups = options.lookups ?? [USER_ID];
  const updates: Array<{ id: string; attributes: { password: string; email_confirm: boolean } }> = [];
  const creates: Array<{ email: string; email_confirm: boolean }> = [];
  let lookupCount = 0;

  const deps: UserDeps = {
    findUserId: () => Promise.resolve(lookups[Math.min(lookupCount++, lookups.length - 1)]),
    auth: {
      getUserById: () =>
        Promise.resolve(
          options.getError
            ? { data: { user: null }, error: { message: "boom" } }
            : { data: { user: options.user ?? null }, error: null },
        ),
      updateUserById: (id, attributes) => {
        updates.push({ id, attributes });
        return Promise.resolve({ error: options.updateError ? { message: "boom" } : null });
      },
      createUser: (attributes) => {
        creates.push(attributes);
        return Promise.resolve(
          options.createResult
            ? { data: { user: options.createResult }, error: null }
            : { data: { user: null }, error: { message: "User already registered" } },
        );
      },
    },
  };
  return { deps, updates, creates };
}

Deno.test("randomPassword is long, random and satisfies a complexity rule", () => {
  const first = randomPassword();
  assert(first.length >= 40);
  assertMatch(first, /[a-z]/);
  assertMatch(first, /[A-Z]/);
  assertMatch(first, /\d/);
  assertMatch(first, /[^A-Za-z0-9]/);
  assertNotEquals(first, randomPassword());
});

Deno.test("an unconfirmed account (the pre-registered one) gets its password replaced before it is adopted", async () => {
  const { deps, updates } = fakeDeps({ user: { email_confirmed_at: null, last_sign_in_at: null } });

  assertEquals(await ensureProvenUser(deps, EMAIL), USER_ID);

  assertEquals(updates.length, 1);
  assertEquals(updates[0].id, USER_ID);
  assertEquals(updates[0].attributes.email_confirm, true);
  assert(updates[0].attributes.password.length >= 40, "a random password replaces whatever was set at sign-up");
});

Deno.test("every adoption of an unconfirmed account draws a different password", async () => {
  const first = fakeDeps({ user: { email_confirmed_at: undefined, last_sign_in_at: undefined } });
  const second = fakeDeps({ user: { email_confirmed_at: undefined, last_sign_in_at: undefined } });
  await ensureProvenUser(first.deps, EMAIL);
  await ensureProvenUser(second.deps, EMAIL);
  assertNotEquals(first.updates[0].attributes.password, second.updates[0].attributes.password);
});

Deno.test("a confirmed account that never signed in is reset as well", async () => {
  const { deps, updates } = fakeDeps({ user: { email_confirmed_at: SIGNED_IN, last_sign_in_at: null } });
  assertEquals(await ensureProvenUser(deps, EMAIL), USER_ID);
  assertEquals(updates.length, 1);
});

Deno.test("an unconfirmed account with a recorded sign-in time is still reset", async () => {
  const { deps, updates } = fakeDeps({ user: { email_confirmed_at: null, last_sign_in_at: SIGNED_IN } });
  assertEquals(await ensureProvenUser(deps, EMAIL), USER_ID);
  assertEquals(updates.length, 1);
});

Deno.test("an account that has signed in before keeps its credentials", async () => {
  const { deps, updates, creates } = fakeDeps({ user: { email_confirmed_at: SIGNED_IN, last_sign_in_at: SIGNED_IN } });
  assertEquals(await ensureProvenUser(deps, EMAIL), USER_ID);
  assertEquals(updates.length, 0);
  assertEquals(creates.length, 0);
});

Deno.test("the account is not adopted when its password could not be replaced", async () => {
  const { deps } = fakeDeps({ user: { email_confirmed_at: null, last_sign_in_at: null }, updateError: true });
  await assertRejects(() => ensureProvenUser(deps, EMAIL), Error, "user_reset_failed");
});

Deno.test("the account is not adopted when its state cannot be read", async () => {
  const failed = fakeDeps({ getError: true });
  await assertRejects(() => ensureProvenUser(failed.deps, EMAIL), Error, "user_lookup_failed");
  const missing = fakeDeps({ user: null });
  await assertRejects(() => ensureProvenUser(missing.deps, EMAIL), Error, "user_lookup_failed");
  assertEquals(failed.updates.length + missing.updates.length, 0);
});

Deno.test("an unknown address gets a new confirmed user without a password", async () => {
  const { deps, updates, creates } = fakeDeps({ lookups: [null], createResult: { id: "new-user" } });
  assertEquals(await ensureProvenUser(deps, EMAIL), "new-user");
  assertEquals(creates, [{ email: EMAIL, email_confirm: true }]);
  assertEquals(updates.length, 0);
});

Deno.test("a user created in parallel is adopted through the same rules, not trusted as it is", async () => {
  // The lookup finds nobody, createUser loses the race, and the second lookup finds an unconfirmed sign-up.
  const { deps, updates } = fakeDeps({ lookups: [null, USER_ID], user: { email_confirmed_at: null, last_sign_in_at: null } });
  assertEquals(await ensureProvenUser(deps, EMAIL), USER_ID);
  assertEquals(updates.length, 1);
  assertEquals(updates[0].id, USER_ID);
});

Deno.test("gives up when the user can neither be found nor created", async () => {
  const { deps } = fakeDeps({ lookups: [null] });
  await assertRejects(() => ensureProvenUser(deps, EMAIL), Error, "user_create_failed");
});
