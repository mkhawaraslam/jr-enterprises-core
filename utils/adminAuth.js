export const workspaceRoles = ["admin", "staff"];
export const adminRobots = { index: false, follow: false };
export const accessDeniedMessage = "Your account does not have access to this workspace. Contact your administrator.";
export const authUnavailableMessage = "Sign-in is temporarily unavailable. Please contact your administrator.";

export function isAdminRoute(path) {
  return /^\/admin(?:[/?#]|$)/.test(path || "");
}

export function getWorkspaceRole(user) {
  const role = user?.app_metadata?.role;
  return workspaceRoles.includes(role) ? role : null;
}

export function validateSignIn(values) {
  const errors = {};
  const email = values.email.trim();
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Enter your password.";
  return errors;
}

export function signInErrorMessage(error) {
  if (error?.code === "over_request_rate_limit" || error?.status === 429) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  if (error?.code === "invalid_credentials" || error?.status === 400 || error?.status === 401) {
    return "Your email or password is incorrect.";
  }
  return "Unable to sign in. Please try again.";
}

export async function signInToWorkspace(client, values) {
  const { data, error } = await client.auth.signInWithPassword({
    email: values.email.trim(),
    password: values.password,
  });
  if (error) return { error: signInErrorMessage(error) };
  if (!data?.session || !data?.user?.id) {
    try {
      await client.auth.signOut({ scope: "local" });
    } catch {
      // The server guard still denies access if session cleanup cannot reach Auth.
    }
    return { error: signInErrorMessage() };
  }
  return { error: null };
}
