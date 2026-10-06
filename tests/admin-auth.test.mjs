import assert from "node:assert/strict";
import test from "node:test";
import {
  adminRobots, getWorkspaceRole, isAdminRoute,
  signInErrorMessage, signInToWorkspace, validateSignIn,
} from "../utils/adminAuth.js";

test("optional role metadata recognizes admin and staff only in protected app metadata", () => {
  assert.equal(getWorkspaceRole({ app_metadata: { role: "admin" } }), "admin");
  assert.equal(getWorkspaceRole({ app_metadata: { role: "staff" } }), "staff");
  for (const user of [null, {}, { app_metadata: { role: "owner" } }, { app_metadata: { role: "ADMIN" } }, { user_metadata: { role: "admin" } }]) {
    assert.equal(getWorkspaceRole(user), null);
  }
  assert.equal(getWorkspaceRole({ user_metadata: { role: "admin" }, app_metadata: { role: "staff" } }), "staff");
});

test("only the admin route prefix receives noindex and nofollow", () => {
  assert.deepEqual(adminRobots, { index: false, follow: false });
  for (const path of ["/admin", "/admin/login", "/admin/team/123", "/admin?x=1", "/admin#account"]) assert.ok(isAdminRoute(path));
  for (const path of ["/", "/administrator", "/products/admin", "", undefined]) assert.equal(isAdminRoute(path), false);
});

test("email and password validation does not impose a new password policy or trim passwords", () => {
  assert.deepEqual(Object.keys(validateSignIn({ email: "", password: "" })), ["email", "password"]);
  for (const email of ["invalid", "buyer@", "buyer @example.com", "a".repeat(250) + "@example.com"]) {
    assert.ok(validateSignIn({ email, password: "x" }).email);
  }
  assert.deepEqual(validateSignIn({ email: " staff@example.com ", password: "  pass phrase  " }), {});
  assert.deepEqual(validateSignIn({ email: "staff@example.com", password: "x" }), {});
});

test("authentication errors are safe, non-enumerating messages", () => {
  assert.equal(signInErrorMessage({ code: "invalid_credentials", message: "user alice@example.com not found" }), "Your email or password is incorrect.");
  assert.equal(signInErrorMessage({ status: 400 }), "Your email or password is incorrect.");
  assert.equal(signInErrorMessage({ status: 401 }), "Your email or password is incorrect.");
  assert.match(signInErrorMessage({ status: 429 }), /Too many sign-in attempts/);
  assert.match(signInErrorMessage({ code: "over_request_rate_limit" }), /Too many sign-in attempts/);
  assert.equal(signInErrorMessage({ message: "internal secret" }), "Unable to sign in. Please try again.");
});

function authFixture(response, cleanupThrows = false) {
  const calls = [];
  return {
    calls,
    client: { auth: {
      signInWithPassword: async (credentials) => { calls.push(["signIn", credentials]); return response; },
      signOut: async (options) => { calls.push(["signOut", options]); if (cleanupThrows) throw new Error("unavailable"); return { error: null }; },
    } },
  };
}

test("valid admin and staff accounts sign in with exact passwords", async () => {
  for (const role of ["admin", "staff"]) {
    const fixture = authFixture({ data: { session: {}, user: { id: "user-id", app_metadata: { role } } }, error: null });
    assert.deepEqual(await signInToWorkspace(fixture.client, { email: " staff@example.com ", password: " exact password " }), { error: null });
    assert.deepEqual(fixture.calls, [["signIn", { email: "staff@example.com", password: " exact password " }]]);
  }
});

test("invalid credentials do not return session data or proceed with authorization", async () => {
  const fixture = authFixture({ data: null, error: { code: "invalid_credentials" } });
  assert.deepEqual(await signInToWorkspace(fixture.client, { email: "staff@example.com", password: "wrong" }), { error: "Your email or password is incorrect." });
  assert.equal(fixture.calls.length, 1);
});

test("valid sessions sign in without a supported or assigned role", async () => {
  for (const user of [
    { id: "user-id" },
    { id: "user-id", app_metadata: {} },
    { id: "user-id", user_metadata: { role: "admin" } },
    { id: "user-id", app_metadata: { role: "owner" } },
  ]) {
    const fixture = authFixture({ data: { session: {}, user }, error: null });
    assert.deepEqual(await signInToWorkspace(fixture.client, { email: "staff@example.com", password: "test" }), { error: null });
    assert.equal(fixture.calls.length, 1);
  }
});

test("incomplete sessions are denied and cleared locally", async () => {
  for (const data of [
    null,
    { session: null, user: { id: "user-id", app_metadata: { role: "admin" } } },
    { session: {}, user: null },
    { session: {}, user: {} },
  ]) {
    const fixture = authFixture({ data, error: null });
    assert.deepEqual(await signInToWorkspace(fixture.client, { email: "staff@example.com", password: "test" }), { error: "Unable to sign in. Please try again." });
    assert.deepEqual(fixture.calls[1], ["signOut", { scope: "local" }]);
  }
});

test("incomplete sessions cannot sign in even when local-session cleanup fails", async () => {
  const fixture = authFixture({ data: { session: null, user: { id: "user-id" } }, error: null }, true);
  assert.deepEqual(await signInToWorkspace(fixture.client, { email: "staff@example.com", password: "test" }), { error: "Unable to sign in. Please try again." });
});
