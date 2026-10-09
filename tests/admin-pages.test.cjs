const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const babel = require("@babel/core");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { parse } = require("next/dist/compiled/node-html-parser");
const ssr = require("@supabase/ssr");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const normalize = (value) => JSON.parse(JSON.stringify(value));

function createLoader({ env = {}, sdk = {}, router = {}, window, react = React } = {}) {
  const cache = new Map();
  const load = (file) => {
    const fullPath = path.resolve(root, file);
    if (cache.has(fullPath)) return cache.get(fullPath).exports;
    const module = { exports: {} };
    cache.set(fullPath, module);
    const { code } = babel.transformSync(fs.readFileSync(fullPath, "utf8"), {
      babelrc: false, configFile: false,
      presets: [[require("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]],
      plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")],
    });
    vm.runInNewContext(code, {
      module, exports: module.exports, process: { env }, URL, Map, window,
      require(name) {
        if (name === "react") return react;
        if (name === "@supabase/ssr") return { ...ssr, ...sdk };
        if (name === "next/router") return { useRouter: () => router };
        if (name === "next/head") return { __esModule: true, default: "head" };
        if (name === "next/image") return { __esModule: true, default: () => null };
        if (/\.(css|png)$/.test(name)) return {};
        if (name.startsWith(".")) {
          const resolved = path.resolve(path.dirname(fullPath), name);
          if (/\.(json|cjs)$/.test(resolved)) return require(resolved);
          return load(fs.existsSync(resolved) ? resolved : resolved + ".js");
        }
        return require(name);
      },
    });
    return module.exports;
  };
  return load;
}

function context(cookie = "", query = {}) {
  const headers = new Map();
  return { req: { headers: { cookie } }, query, res: {
    setHeader: (name, value) => headers.set(name.toLowerCase(), value),
    getHeader: (name) => headers.get(name.toLowerCase()),
  }, headers };
}

function setupAuth(response) {
  const creations = [];
  const state = { response, writes: null, calls: 0 };
  const load = createLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key", NODE_ENV: "production" },
    sdk: { createServerClient: (url, key, options) => {
      creations.push({ url, key, options });
      return { auth: { getUser: async () => {
        state.calls += 1;
        if (state.writes) options.cookies.setAll(state.writes, { "Cache-Control": "public, max-age=100" });
        if (state.response instanceof Error) throw state.response;
        return state.response;
      } } };
    } },
  });
  return { load, state, creations };
}

function userResponse(role) {
  return { data: { user: { id: "verified-user-id", email: "staff@example.com", app_metadata: { role, private: "do not expose" }, user_metadata: { role: "admin" } } }, error: null };
}

test("missing and invalid Supabase settings fail closed without crashing", async () => {
  for (const env of [{}, { NEXT_PUBLIC_SUPABASE_URL: "javascript:alert(1)", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key" }, { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_secret_private" }]) {
    const load = createLoader({ env });
    const result = await load("lib/supabase/server.js").getWorkspaceAccess(context());
    assert.equal(result.status, "unavailable");
    const login = await load("pages/admin/login.js").getServerSideProps(context());
    assert.equal(login.props.unavailable, true);
    const workspace = await load("pages/admin/index.js").getServerSideProps(context());
    assert.equal(workspace.redirect.destination, "/admin/login");
    const dashboard = await load("pages/admin/dashboard.js").getServerSideProps(context());
    assert.equal(dashboard.redirect.destination, "/admin/login");
  }
});

test("server access validates with getUser and returns only safe account fields", async () => {
  for (const role of ["admin", "staff"]) {
    const fixture = setupAuth(userResponse(role));
    const ctx = context("sb-project-auth-token=forged-cookie");
    const result = await fixture.load("lib/supabase/server.js").getWorkspaceAccess(ctx);
    assert.deepEqual(normalize(result), { status: "authorized", user: { id: "verified-user-id", email: "staff@example.com", role } });
    assert.equal(fixture.state.calls, 1);
    assert.match(ctx.headers.get("cache-control"), /private.*no-store/);
    assert.equal(ctx.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.doesNotMatch(JSON.stringify(result), /private|token|user_metadata|app_metadata/);
  }
});

test("verified users without a supported role can sign in and access the workspace", async () => {
  for (const role of [undefined, "owner", "ADMIN"]) {
    const fixture = setupAuth(userResponse(role));
    const access = await fixture.load("lib/supabase/server.js").getWorkspaceAccess(context());
    assert.equal(access.status, "authorized");
    assert.equal(access.user.role, null);
    const page = await fixture.load("pages/admin/dashboard.js").getServerSideProps(context());
    assert.equal(page.props.user.id, "verified-user-id");
    assert.equal(page.props.user.role, null);
    const login = await fixture.load("pages/admin/login.js").getServerSideProps(context());
    assert.equal(login.redirect.destination, "/admin/dashboard");
    const AccountMenu = fixture.load("components/Admin/AccountMenu.js").default;
    const markup = renderToStaticMarkup(React.createElement(AccountMenu, { user: page.props.user }));
    assert.match(markup, /staff@example.com/);
    assert.doesNotMatch(markup, /capitalize/);
    const entry = await fixture.load("pages/admin/index.js").getServerSideProps(context());
    assert.equal(entry.redirect.destination, "/admin/dashboard");
  }
});

test("role restrictions remain opt-in for future features and ignore editable metadata", async () => {
  for (const role of [undefined, "owner", "staff"]) {
    const fixture = setupAuth(userResponse(role));
    const server = fixture.load("lib/supabase/server.js");
    assert.equal((await server.getWorkspaceAccess(context(), ["admin"])).status, "forbidden");
    assert.equal(server.workspaceRedirect("forbidden").redirect.destination, "/admin/login?error=access_denied");
  }
  const fixture = setupAuth(userResponse("admin"));
  assert.equal((await fixture.load("lib/supabase/server.js").getWorkspaceAccess(context(), ["admin"])).status, "authorized");
});

test("unauthenticated, expired and unreachable sessions fail closed", async () => {
  for (const response of [{ data: { user: null }, error: null }, { data: null, error: { status: 401 } }, { data: { user: { app_metadata: { role: "admin" } } }, error: null }]) {
    const fixture = setupAuth(response);
    assert.equal((await fixture.load("lib/supabase/server.js").getWorkspaceAccess(context())).status, "unauthenticated");
    for (const route of ["pages/admin/dashboard.js", "pages/admin/index.js"]) {
      assert.equal((await fixture.load(route).getServerSideProps(context())).redirect.destination, "/admin/login");
    }
  }
  for (const response of [{ data: null, error: { status: 503 } }, new Error("network failure")]) {
    const fixture = setupAuth(response);
    assert.equal((await fixture.load("lib/supabase/server.js").getWorkspaceAccess(context())).status, "unavailable");
    assert.equal((await fixture.load("pages/admin/dashboard.js").getServerSideProps(context())).redirect.destination, "/admin/login");
  }
});

test("cookie refreshes preserve previous headers, replace chunks and remain uncached", async () => {
  const fixture = setupAuth(userResponse("admin"));
  fixture.state.writes = [{ name: "sb-project-auth-token.0", value: "fresh", options: { path: "/", sameSite: "lax", secure: true } }];
  const ctx = context("sb-project-auth-token.0=expired; sb-project-auth-token.1=chunk");
  ctx.res.setHeader("Set-Cookie", "other=value; Path=/");
  await fixture.load("lib/supabase/server.js").getWorkspaceAccess(ctx);
  const options = fixture.creations[0].options;
  assert.equal(options.cookies.getAll().find((cookie) => cookie.name === "sb-project-auth-token.0").value, "fresh");
  options.cookies.setAll([{ name: "sb-project-auth-token.0", value: "newer", options: { path: "/" } }]);
  const cookies = ctx.headers.get("set-cookie");
  assert.equal(cookies.length, 2);
  assert.equal(cookies[0], "other=value; Path=/");
  assert.ok(cookies[1].startsWith("sb-project-auth-token.0=newer"));
  assert.match(ctx.headers.get("cache-control"), /private.*no-store/);
  assert.equal(ctx.headers.get("pragma"), "no-cache");
  assert.equal(ctx.headers.get("expires"), "0");
  assert.deepEqual(normalize(options.cookieOptions), { path: "/", sameSite: "lax", secure: true });
});

test("server clients are request-scoped and never share another user's cookies", async () => {
  const fixture = setupAuth(userResponse("admin"));
  const server = fixture.load("lib/supabase/server.js");
  await server.getWorkspaceAccess(context("account=first"));
  await server.getWorkspaceAccess(context("account=second"));
  assert.equal(fixture.creations.length, 2);
  assert.equal(fixture.creations[0].options.cookies.getAll()[0].value, "first");
  assert.equal(fixture.creations[1].options.cookies.getAll()[0].value, "second");
});

test("login and admin entry redirect authenticated users to the protected dashboard", async () => {
  const fixture = setupAuth(userResponse("staff"));
  const login = await fixture.load("pages/admin/login.js").getServerSideProps(context());
  assert.deepEqual(normalize(login), { redirect: { destination: "/admin/dashboard", permanent: false } });
  const workspace = await fixture.load("pages/admin/index.js").getServerSideProps(context());
  assert.deepEqual(normalize(workspace), { redirect: { destination: "/admin/dashboard", permanent: false } });
  const ctx = context();
  const dashboard = await fixture.load("pages/admin/dashboard.js").getServerSideProps(ctx);
  assert.deepEqual(normalize(dashboard), { props: { user: { id: "verified-user-id", email: "staff@example.com", role: "staff" }, initialModule: "overview" } });
  assert.match(ctx.headers.get("cache-control"), /private.*no-store/);
  assert.equal(ctx.headers.get("x-robots-tag"), "noindex, nofollow");
  fixture.state.response = { data: { user: null }, error: null };
  const denied = await fixture.load("pages/admin/login.js").getServerSideProps(context("", { error: "access_denied" }));
  assert.equal(denied.props.accessDenied, true);
});

test("browser clients initialize lazily with shared cookie settings and no service-role client", () => {
  const calls = [];
  const client = {};
  const load = createLoader({
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key", NODE_ENV: "production" },
    window: {}, sdk: { createBrowserClient: (...args) => { calls.push(args); return client; } },
  });
  const browser = load("lib/supabase/browser.js");
  assert.equal(calls.length, 0);
  assert.equal(browser.getSupabaseBrowserClient(), client);
  assert.equal(browser.getSupabaseBrowserClient(), client);
  assert.equal(calls.length, 1);
  assert.deepEqual(normalize(calls[0][2]), { cookieOptions: { path: "/", sameSite: "lax", secure: true }, auth: { detectSessionInUrl: false } });
});

test("sign-in markup has labeled inputs, accessible error/loading controls and no extra auth flows", () => {
  const load = createLoader();
  const Form = load("components/Admin/LoginForm.js").default;
  const html = renderToStaticMarkup(React.createElement(Form, { unavailable: true }));
  const doc = parse(html);
  assert.equal(doc.querySelector("input[name=email]").getAttribute("autocomplete"), "username");
  assert.equal(doc.querySelector("input[name=password]").getAttribute("type"), "password");
  assert.equal(doc.querySelector("input[name=password]").getAttribute("autocomplete"), "current-password");
  assert.equal(doc.querySelectorAll("label").length, 2);
  assert.equal(doc.querySelector("button[type=button]").getAttribute("aria-label"), "Show password");
  assert.match(doc.querySelector("[role=alert]").text, /temporarily unavailable/);
  assert.match(read("components/Admin/LoginForm.js"), /aria-invalid=\{Boolean\(errors.password\)\}/);
  assert.match(read("components/Admin/LoginForm.js"), /submittingRef.current/);
  assert.match(read("components/Admin/LoginForm.js"), /focus:ring-primary\/20/);
  assert.match(read("components/Admin/LoginForm.js"), /router\.replace\("\/admin\/dashboard"\)/);
  assert.doesNotMatch(html + read("pages/admin/login.js"), /forgot|sign.?up|og:|twitter:|canonical|SeoHead|application\/ld\+json/i);
});

test("admin indexing policy covers current, future and not-found admin paths but not the public page", async () => {
  for (const router of [{ pathname: "/admin/login", asPath: "/admin/login" }, { pathname: "/admin/dashboard", asPath: "/admin/dashboard" }, { pathname: "/404", asPath: "/admin/missing" }]) {
    const load = createLoader({ router });
    const App = load("pages/_app.js").default;
    const html = renderToStaticMarkup(React.createElement(App, { Component: () => null, pageProps: {} }));
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.doesNotMatch(html, /og:|twitter:|canonical|application\/ld\+json/);
  }
  const load = createLoader({ router: { pathname: "/", asPath: "/" } });
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(load("pages/_app.js").default, { Component: () => null, pageProps: {} })), /noindex/);
  const rules = await require("../next.config.js").headers();
  assert.equal(rules[0].source, "/admin/:path*");
  assert.ok(rules[0].headers.some(({ key, value }) => key === "X-Robots-Tag" && value === "noindex, nofollow"));
  assert.doesNotMatch(read("public/sitemap.xml"), /\/admin/);
});

test("the dashboard route renders verified account controls and sample-only sales UI", async () => {
  const { load } = setupAuth(userResponse("staff"));
  const page = load("pages/admin/dashboard.js");
  const { props } = await page.getServerSideProps(context());
  const html = renderToStaticMarkup(React.createElement(page.default, props));
  const doc = parse(html);
  assert.equal(doc.querySelector("h1").text, "Dashboard");
  for (const label of ["Business", "Customers", "Products", "Quote Requests", "Quotations", "Invoices", "Delivery Challans"]) {
    assert.ok(doc.querySelectorAll("nav button").some((button) => button.text.includes(label)), label);
  }
  assert.match(html, /Sample data/);
  assert.match(html, /Sales performance/);
  assert.match(html, /547,000/);
  assert.match(html, /Recent documents/);
  assert.match(html, /Signed in as/);
  assert.match(html, /staff@example.com/);
  assert.ok(doc.querySelectorAll("button").some((button) => button.text.trim() === "Log out"));
  assert.doesNotMatch(html, /Admin sign-in/);
  assert.equal(doc.querySelector("section[aria-labelledby=documents-heading] tbody").querySelectorAll("tr").length, 5);
  assert.ok(doc.querySelector("section[aria-labelledby=documents-heading] div.relative.overflow-x-auto"));
  assert.ok(doc.querySelector("section[aria-labelledby=sales-performance-heading] div.sr-only table"));
  assert.ok(doc.querySelector("input[aria-label='Search documents']"));
  assert.ok(doc.querySelector("select#document-status"));
  assert.match(html, /aria-label="Next page"/);
  assert.ok(doc.querySelectorAll("dialog").every((dialog) => !dialog.hasAttribute("open")));
  for (const file of ["components/Admin/SalesDashboard.js", "components/Admin/SalesModulePreview.js", "data/salesPrototype.js"]) {
    assert.doesNotMatch(read(file), /supabase|fetch\(|axios|SeoHead|og:|twitter:|canonical|application\/ld\+json/i);
  }
  assert.doesNotMatch(read("pages/admin/dashboard.js") + read("components/Admin/AccountMenu.js"), /SeoHead|og:|twitter:|canonical|application\/ld\+json/i);
});

test("the real quote-request inbox is protected, noindex and never labelled as sample data", async () => {
  const fixture = setupAuth(userResponse(undefined));
  const page = fixture.load("pages/admin/quote-requests.js");
  const ctx = context();
  const result = await page.getServerSideProps(ctx);
  assert.equal(result.props.user.role, null);
  assert.equal(ctx.headers.get("x-robots-tag"), "noindex, nofollow");
  const html = renderToStaticMarkup(React.createElement(page.default, result.props));
  const doc = parse(html);
  assert.equal(doc.querySelector("h1").text, "Quote Requests");
  assert.match(html, /Received requests/);
  assert.match(html, /Search quote requests/);
  assert.doesNotMatch(html, /Sample data|sample documents|UI prototype|og:|twitter:|canonical/);
  fixture.state.response = { data: { user: null }, error: null };
  assert.equal((await page.getServerSideProps(context())).redirect.destination, "/admin/login");
});

test("business management has a protected dedicated route and redirects the old business preview", async () => {
  const { load, state } = setupAuth(userResponse(undefined));
  const page = await load("pages/admin/businesses.js").getServerSideProps(context());
  assert.equal(page.props.user.id, "verified-user-id");
  assert.equal(page.props.user.role, null);
  const previous = await load("pages/admin/dashboard.js").getServerSideProps(context("", { view: "business" }));
  assert.equal(previous.redirect.destination, "/admin/businesses");
  state.response = { data: { user: null }, error: null };
  assert.equal((await load("pages/admin/businesses.js").getServerSideProps(context())).redirect.destination, "/admin/login");
});

test("the previous dashboard preview URL redirects to the main dashboard", async () => {
  const page = createLoader()("pages/admin/dashboard-preview.js");
  assert.deepEqual(normalize(await page.getServerSideProps(context())), {
    redirect: { destination: "/admin/dashboard", permanent: false },
  });
  assert.equal(renderToStaticMarkup(React.createElement(page.default)), "");
});

test("the account menu tolerates missing account props during a dev hot reload", () => {
  const AccountMenu = createLoader()("components/Admin/AccountMenu.js").default;
  assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(AccountMenu)));
});

function findElement(tree, type) {
  if (!React.isValidElement(tree)) return null;
  if (tree.type === type) return tree;
  for (const child of React.Children.toArray(tree.props.children)) {
    const found = findElement(child, type);
    if (found) return found;
  }
  return null;
}

// Drive the component's real event handlers with deterministic hooks and an Auth double.
function accountFixture({ signOut = async () => ({ error: null }), configured = true } = {}) {
  const slots = [];
  const effects = [];
  const calls = [];
  const redirects = [];
  let cursor = 0;
  let authListener;
  let unsubscribes = 0;
  const react = { ...React,
    useRef(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: value };
      return slots[index];
    },
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = value;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useEffect(effect) {
      const index = cursor++;
      if (!(index in slots)) { slots[index] = true; effects.push(effect); }
    },
  };
  const load = createLoader({
    react,
    env: configured ? { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key" } : {},
    window: { location: { replace: (url) => redirects.push(url) } },
    sdk: { createBrowserClient: () => ({ auth: {
      signOut: (options) => { calls.push(normalize(options)); return signOut(options); },
      onAuthStateChange: (listener) => {
        authListener = listener;
        return { data: { subscription: { unsubscribe: () => { unsubscribes += 1; } } } };
      },
    } }) },
  });
  const AccountMenu = load("components/Admin/AccountMenu.js").default;
  return {
    calls, redirects,
    render() { cursor = 0; return AccountMenu({ user: { email: "staff@example.com", role: null } }); },
    mount: () => effects.map((effect) => effect()),
    emit: (event) => authListener(event),
    unsubscribes: () => unsubscribes,
  };
}

test("dashboard logout clears the current session before navigating and rejects repeated clicks", async () => {
  let resolve;
  const fixture = accountFixture({ signOut: () => new Promise((done) => { resolve = done; }) });
  const button = findElement(fixture.render(), "button");
  const [cleanup] = fixture.mount();
  const request = button.props.onClick();
  const pending = findElement(fixture.render(), "button");
  assert.equal(pending.props.disabled, true);
  assert.equal(pending.props["aria-busy"], true);
  assert.match(renderToStaticMarkup(pending), /Signing out/);
  await button.props.onClick();
  assert.deepEqual(fixture.calls, [{ scope: "local" }]);
  assert.deepEqual(fixture.redirects, []);
  fixture.emit("SIGNED_OUT");
  assert.deepEqual(fixture.redirects, []);
  resolve({ error: null });
  await request;
  assert.deepEqual(fixture.redirects, ["/admin/login"]);
  cleanup();
  assert.equal(fixture.unsubscribes(), 1);
});

test("logout failures show a safe error, allow retry and do not redirect prematurely", async () => {
  for (const failure of [
    () => ({ error: { message: "private Auth failure" } }),
    () => { throw new Error("private Auth failure"); },
  ]) {
    let fail = true;
    const fixture = accountFixture({ signOut: async () => fail ? failure() : { error: null } });
    await findElement(fixture.render(), "button").props.onClick();
    const tree = fixture.render();
    assert.equal(findElement(tree, "button").props.disabled, false);
    const html = renderToStaticMarkup(tree);
    assert.match(html, /role="alert"/);
    assert.match(html, /Unable to sign out. Please try again./);
    assert.doesNotMatch(html, /private Auth failure/);
    assert.deepEqual(fixture.redirects, []);
    fail = false;
    await findElement(tree, "button").props.onClick();
    assert.deepEqual(fixture.redirects, ["/admin/login"]);
    assert.equal(fixture.calls.length, 2);
  }
});

test("an unavailable Auth client cannot report a successful logout", async () => {
  const fixture = accountFixture({ configured: false });
  await findElement(fixture.render(), "button").props.onClick();
  assert.match(renderToStaticMarkup(fixture.render()), /Unable to sign out/);
  assert.deepEqual(fixture.calls, []);
  assert.deepEqual(fixture.redirects, []);
});

test("sign-out events from another tab leave the dashboard and unsubscribe on unmount", () => {
  const fixture = accountFixture();
  fixture.render();
  const [cleanup] = fixture.mount();
  for (const event of ["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED"]) fixture.emit(event);
  assert.deepEqual(fixture.redirects, []);
  fixture.emit("SIGNED_OUT");
  assert.deepEqual(fixture.redirects, ["/admin/login"]);
  cleanup();
  assert.equal(fixture.unsubscribes(), 1);
});
