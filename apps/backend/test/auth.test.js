const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const { once } = require("node:events");
const { test } = require("node:test");
const mongoose = require("mongoose");
const argon2 = require("argon2");

const app = require("../server");
const User = require("../models/User");
const Session = require("../models/Session");

test("authentication API against MongoDB", async (t) => {
  // isolate tests even when the uri names an existing database
  const dbName = `hilt_auth_test_${randomUUID().replaceAll("-", "")}`;
  let server;

  t.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    if (mongoose.connection.name === dbName) {
      await mongoose.connection.dropDatabase();
    }

    await mongoose.disconnect();
  });

  await mongoose.connect(
    process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017",
    { dbName, serverSelectionTimeoutMS: 5000 },
  );
  await Promise.all([User.init(), Session.init()]);

  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const secureCookies =
    process.env.NODE_ENV === "production" &&
    process.env.SESSION_COOKIE_SECURE !== "false";
  const origin = `${secureCookies ? "https:" : "http:"}//${new URL(baseUrl).host}`;

  const account = {
    firstName: "Alex",
    lastName: "Student",
    emailAddress: "alex@example.com",
    password: "a long checkpoint passphrase",
  };

  async function request(
    path,
    { body, token, method = "POST", headers = {} } = {},
  ) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();

    return {
      status: response.status,
      headers: response.headers,
      body: text ? JSON.parse(text) : null,
    };
  }

  let userId;
  let token;

  await t.test(
    "registers a normalized account, hashes its password, and returns only safe fields",
    async () => {
      const result = await request("/api/auth/register", {
        body: {
          ...account,
          firstName: " Alex ",
          emailAddress: " ALEX@EXAMPLE.COM ",
          passwordHash: "injected",
          role: "admin",
        },
      });

      assert.equal(result.status, 201);
      assert.equal(result.headers.get("cache-control"), "no-store");

      userId = result.body.user.id;

      assert.deepEqual(result.body, {
        user: {
          id: userId,
          firstName: "Alex",
          lastName: "Student",
          emailAddress: account.emailAddress,
        },
      });

      const saved = await User.findById(userId).select("+passwordHash").lean();

      assert.match(saved.passwordHash, /^\$argon2id\$/);
      assert.equal(
        await argon2.verify(saved.passwordHash, account.password),
        true,
      );
      assert.equal(saved.password, undefined);
      assert.equal(saved.role, undefined);
      assert.equal((await User.findById(userId)).passwordHash, undefined);
    },
  );

  await t.test(
    "rejects duplicate emails without overwriting the existing account",
    async () => {
      const result = await request("/api/auth/register", {
        body: { ...account, emailAddress: "ALEX@example.com" },
      });

      assert.equal(result.status, 409);
      assert.equal(
        await User.countDocuments({ emailAddress: account.emailAddress }),
        1,
      );
      assert.equal(
        (await User.findOne({ emailAddress: account.emailAddress })).id,
        userId,
      );
    },
  );

  await t.test(
    "allows only one account when duplicate registrations race",
    async () => {
      const body = { ...account, emailAddress: "race@example.com" };
      const results = await Promise.all([
        request("/api/auth/register", { body }),
        request("/api/auth/register", { body }),
      ]);

      assert.deepEqual(
        results.map((result) => result.status).sort(),
        [201, 409],
      );
      assert.equal(
        await User.countDocuments({ emailAddress: body.emailAddress }),
        1,
      );
    },
  );

  await t.test(
    "rejects missing, malformed, oversized, and operator-shaped fields",
    async () => {
      for (const body of [
        {},
        { ...account, firstName: " " },
        { ...account, lastName: "x".repeat(101) },
        { ...account, emailAddress: "not-an-email" },
        { ...account, emailAddress: { $ne: null } },
        { ...account, password: { $gt: "" } },
        { ...account, password: "too short" },
        { ...account, password: "x".repeat(129) },
      ]) {
        const result = await request("/api/auth/register", { body });

        assert.equal(result.status, 400);
        assert.equal(typeof result.body.error, "string");
      }

      assert.equal(await User.countDocuments(), 2);
    },
  );

  await t.test(
    "returns JSON errors for malformed JSON, large bodies, and wrong media types",
    async () => {
      const malformed = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      });
      const oversized = await request("/api/auth/register", {
        body: { padding: "x".repeat(9000) },
      });
      const wrongType = await request("/api/auth/register", {
        body: account,
        headers: { "Content-Type": "text/plain" },
      });

      assert.equal(malformed.status, 400);
      assert.deepEqual(await malformed.json(), {
        error: "The request body must be valid JSON.",
      });
      assert.equal(oversized.status, 413);
      assert.equal(wrongType.status, 415);
    },
  );

  await t.test(
    "logs in case-insensitively and stores only a digest of the expiring token",
    async () => {
      const result = await request("/api/auth/login", {
        body: { ...account, emailAddress: " ALEX@example.com " },
      });

      assert.equal(result.status, 200);
      assert.equal(result.headers.get("cache-control"), "no-store");
      assert.equal(result.body.user.id, userId);
      assert.equal(result.body.tokenType, "Bearer");
      assert.equal(result.body.user.passwordHash, undefined);

      token = result.body.token;

      assert.match(token, /^[a-f0-9]{64}$/);

      const expiresIn = new Date(result.body.expiresAt).getTime() - Date.now();
      const saved = await Session.findOne({ user: userId })
        .select("+tokenHash")
        .lean();

      assert.ok(
        expiresIn > 23 * 60 * 60 * 1000 && expiresIn <= 24 * 60 * 60 * 1000,
      );
      assert.equal(
        saved.tokenHash,
        createHash("sha256").update(token).digest("hex"),
      );
      assert.equal(JSON.stringify(saved).includes(token), false);
    },
  );

  await t.test(
    "rejects wrong passwords, unknown users, and legacy users identically",
    async () => {
      const legacy = await User.create({
        firstName: "Legacy",
        lastName: "User",
        emailAddress: "legacy@example.com",
      });

      for (const emailAddress of [
        account.emailAddress,
        "missing@example.com",
        legacy.emailAddress,
      ]) {
        const result = await request("/api/auth/login", {
          body: { emailAddress, password: "incorrect password" },
        });

        assert.equal(result.status, 401);
        assert.deepEqual(result.body, {
          error: "Invalid email address or password.",
        });
      }

      const duplicate = await request("/api/auth/register", {
        body: { ...account, emailAddress: legacy.emailAddress },
      });

      assert.equal(duplicate.status, 409);
      assert.equal(
        (await User.findById(legacy.id).select("+passwordHash")).passwordHash,
        undefined,
      );
    },
  );

  await t.test(
    "rejects login injection and invalid field types before querying MongoDB",
    async () => {
      for (const body of [
        {},
        { emailAddress: { $ne: null }, password: account.password },
        { ...account, password: [] },
      ]) {
        assert.equal((await request("/api/auth/login", { body })).status, 400);
      }
    },
  );

  await t.test(
    "preserves password whitespace and Unicode without truncation",
    async () => {
      const unicodeAccount = {
        ...account,
        emailAddress: "unicode@example.com",
        password: ` ${"🔐".repeat(15)} `,
      };
      const trimmedPassword = {
        ...unicodeAccount,
        password: unicodeAccount.password.trim(),
      };

      assert.equal(
        (await request("/api/auth/register", { body: unicodeAccount })).status,
        201,
      );
      assert.equal(
        (await request("/api/auth/login", { body: unicodeAccount })).status,
        200,
      );
      assert.equal(
        (await request("/api/auth/login", { body: trimmedPassword })).status,
        401,
      );
    },
  );

  await t.test("resolves the logged-in user using a Bearer token", async () => {
    const result = await request("/api/auth/me", { method: "GET", token });

    assert.equal(result.status, 200);
    assert.deepEqual(result.body, {
      user: {
        id: userId,
        firstName: "Alex",
        lastName: "Student",
        emailAddress: account.emailAddress,
      },
    });
    assert.equal(result.headers.get("cache-control"), "no-store");
  });

  await t.test(
    "updates only the session owner and preserves credentials and other users",
    async () => {
      const other = await User.create({
        firstName: "Other",
        lastName: "Student",
        emailAddress: "other@example.com",
      });
      const original = await User.findById(userId)
        .select("+passwordHash")
        .lean();
      const result = await request("/api/auth/me", {
        method: "PATCH",
        token,
        body: { firstName: " Avery ", lastName: " Knight " },
      });

      assert.equal(result.status, 200);
      assert.equal(result.headers.get("cache-control"), "no-store");
      assert.deepEqual(result.body, {
        user: {
          id: userId,
          firstName: "Avery",
          lastName: "Knight",
          emailAddress: account.emailAddress,
        },
      });

      const saved = await User.findById(userId).select("+passwordHash").lean();

      assert.equal(saved.firstName, "Avery");
      assert.equal(saved.lastName, "Knight");
      assert.equal(saved.emailAddress, original.emailAddress);
      assert.equal(saved.passwordHash, original.passwordHash);
      assert.deepEqual(saved.createdAt, original.createdAt);
      assert.ok(saved.updatedAt >= original.updatedAt);
      assert.equal((await User.findById(other.id)).firstName, "Other");
      assert.equal(
        (await request("/api/auth/me", { method: "GET", token })).body.user
          .firstName,
        "Avery",
      );
    },
  );

  await t.test(
    "supports a partial name update and persists through logout and a fresh login",
    async () => {
      const update = await request("/api/auth/me", {
        method: "PATCH",
        token,
        body: { firstName: "Avery Lee" },
      });

      assert.equal(update.status, 200);
      assert.equal(update.body.user.lastName, "Knight");

      const login = await request("/api/auth/login", { body: account });

      assert.equal(login.status, 200);
      assert.equal(
        (await request("/api/auth/logout", { token: login.body.token })).status,
        204,
      );
      assert.equal(
        (
          await request("/api/auth/me", {
            method: "GET",
            token: login.body.token,
          })
        ).status,
        401,
      );

      const fresh = await request("/api/auth/login", { body: account });
      const profile = await request("/api/auth/me", {
        method: "GET",
        token: fresh.body.token,
      });

      assert.equal(fresh.status, 200);
      assert.notEqual(fresh.body.token, login.body.token);
      assert.deepEqual(profile.body, {
        user: {
          id: userId,
          firstName: "Avery Lee",
          lastName: "Knight",
          emailAddress: account.emailAddress,
        },
      });
      assert.equal(
        (await request("/api/auth/logout", { token: fresh.body.token })).status,
        204,
      );
    },
  );

  await t.test(
    "rejects invalid profile names and unsupported fields atomically",
    async () => {
      for (const body of [
        {},
        [],
        null,
        { firstName: " " },
        { lastName: "x".repeat(101) },
        { firstName: null },
        { firstName: { $ne: null } },
        { lastName: ["Name"] },
        { firstName: "Changed", lastName: " " },
        { firstName: "Changed", id: "0".repeat(24) },
        { firstName: "Changed", _id: "0".repeat(24) },
        { firstName: "Changed", emailAddress: "other@example.com" },
        { firstName: "Changed", password: "replacement password" },
        { firstName: "Changed", passwordHash: "injected" },
        { firstName: "Changed", role: "admin" },
        { firstName: "Changed", isSiteAdmin: true },
        { $set: { firstName: "Changed" } },
      ]) {
        const result = await request("/api/auth/me", {
          method: "PATCH",
          token,
          body,
        });

        assert.equal(result.status, 400);
        assert.equal(typeof result.body.error, "string");
      }

      const saved = await User.findById(userId);

      assert.equal(saved.firstName, "Avery Lee");
      assert.equal(saved.lastName, "Knight");
      assert.equal(saved.emailAddress, account.emailAddress);
    },
  );

  await t.test("requires a valid session to edit a profile", async () => {
    for (const invalidToken of [undefined, "malformed", "0".repeat(64)]) {
      const result = await request("/api/auth/me", {
        method: "PATCH",
        token: invalidToken,
        body: { firstName: "Changed" },
      });

      assert.equal(result.status, 401);
    }

    const login = await request("/api/auth/login", { body: account });

    await request("/api/auth/logout", { token: login.body.token });

    const revoked = await request("/api/auth/me", {
      method: "PATCH",
      token: login.body.token,
      body: { firstName: "Changed" },
    });

    assert.equal(revoked.status, 401);

    const expiring = await request("/api/auth/login", { body: account });
    const tokenHash = createHash("sha256")
      .update(expiring.body.token)
      .digest("hex");

    await Session.updateOne(
      { tokenHash },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const expired = await request("/api/auth/me", {
      method: "PATCH",
      token: expiring.body.token,
      body: { firstName: "Changed" },
    });

    assert.equal(expired.status, 401);
    assert.equal((await User.findById(userId)).firstName, "Avery Lee");
  });

  await t.test(
    "returns JSON errors for malformed, oversized, and non-JSON profile requests",
    async () => {
      const malformed = await fetch(`${baseUrl}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: "{",
      });
      const oversized = await request("/api/auth/me", {
        method: "PATCH",
        token,
        body: { firstName: "x".repeat(9000) },
      });
      const wrongType = await request("/api/auth/me", {
        method: "PATCH",
        token,
        body: { firstName: "Changed" },
        headers: { "Content-Type": "text/plain" },
      });

      assert.equal(malformed.status, 400);
      assert.deepEqual(await malformed.json(), {
        error: "The request body must be valid JSON.",
      });
      assert.equal(oversized.status, 413);
      assert.equal(wrongType.status, 415);
    },
  );

  await t.test("rejects missing, malformed, and unknown tokens", async () => {
    for (const invalidToken of [undefined, "malformed", "0".repeat(64)]) {
      const result = await request("/api/auth/me", {
        method: "GET",
        token: invalidToken,
      });

      assert.equal(result.status, 401);
    }

    assert.equal((await request("/api/auth/logout")).status, 401);
  });

  await t.test(
    "rejects expired sessions before MongoDB TTL cleanup",
    async () => {
      const login = await request("/api/auth/login", { body: account });
      const expiredToken = login.body.token;
      const tokenHash = createHash("sha256").update(expiredToken).digest("hex");

      await Session.updateOne(
        { tokenHash },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );

      const expired = await request("/api/auth/me", {
        method: "GET",
        token: expiredToken,
      });

      assert.equal(expired.status, 401);
    },
  );

  await t.test("revokes only the session being logged out", async () => {
    const secondLogin = await request("/api/auth/login", { body: account });
    const logout = await request("/api/auth/logout", { token });

    assert.notEqual(secondLogin.body.token, token);
    assert.equal(logout.status, 204);
    assert.equal(logout.body, null);
    assert.equal(
      (await request("/api/auth/me", { method: "GET", token })).status,
      401,
    );
    assert.equal(
      (
        await request("/api/auth/me", {
          method: "GET",
          token: secondLogin.body.token,
        })
      ).status,
      200,
    );
  });

  await t.test("rejects a session whose user no longer exists", async () => {
    const login = await request("/api/auth/login", {
      body: { ...account, emailAddress: "race@example.com" },
    });

    await User.deleteOne({ emailAddress: "race@example.com" });

    const result = await request("/api/auth/me", {
      method: "GET",
      token: login.body.token,
    });

    assert.equal(result.status, 401);
  });

  await t.test(
    "restores a browser session from an HttpOnly cookie without exposing its token in JSON",
    async () => {
      const login = await request("/api/auth/login", {
        body: account,
        headers: { "X-Session-Mode": "cookie", Origin: origin },
      });
      const setCookie = login.headers.get("set-cookie");

      assert.equal(login.status, 200);
      assert.deepEqual(Object.keys(login.body).sort(), ["expiresAt", "user"]);
      assert.match(setCookie, /HttpOnly/);
      assert.match(setCookie, /SameSite=Lax/);
      assert.match(setCookie, /Path=\/api;/);
      assert.match(setCookie, /Max-Age=86400/);

      if (secureCookies) {
        assert.match(setCookie, /; Secure/);
      }

      const cookie = setCookie.split(";")[0];
      const headers = { Cookie: cookie };
      const restored = await request("/api/auth/me", {
        method: "GET",
        headers,
      });
      const malformedBearer = await request("/api/auth/me", {
        method: "GET",
        headers: { ...headers, Authorization: "Bearer malformed" },
      });

      assert.equal(restored.status, 200);
      assert.equal(restored.body.user.id, userId);
      assert.equal(
        (await request("/api/me/clubs", { method: "GET", headers })).status,
        200,
      );
      assert.equal(malformedBearer.status, 401);

      // browsers attach cookies automatically; writes must come from this origin
      for (const badOrigin of [
        undefined,
        "https://other.example",
        "null",
        `${origin}.other.example`,
      ]) {
        const unsafeHeaders = {
          ...headers,
          ...(badOrigin ? { Origin: badOrigin } : {}),
        };
        const edit = await request("/api/auth/me", {
          method: "PATCH",
          headers: unsafeHeaders,
          body: { firstName: "Cross-site change" },
        });
        const logout = await request("/api/auth/logout", {
          headers: unsafeHeaders,
        });

        assert.equal(edit.status, 403);
        assert.equal(logout.status, 403);
      }

      const unchanged = await request("/api/auth/me", {
        method: "GET",
        headers,
      });
      const edit = await request("/api/auth/me", {
        method: "PATCH",
        headers: { ...headers, Origin: origin },
        body: { firstName: restored.body.user.firstName },
      });

      assert.equal(unchanged.body.user.firstName, restored.body.user.firstName);
      assert.equal(edit.status, 200);

      const logout = await request("/api/auth/logout", {
        headers: { ...headers, Origin: origin },
      });

      assert.equal(logout.status, 204);
      assert.match(
        logout.headers.get("set-cookie"),
        /hilt_session=; Path=\/api; Expires=Thu, 01 Jan 1970/,
      );
      assert.equal(
        (await request("/api/auth/me", { method: "GET", headers })).status,
        401,
      );
    },
  );

  await t.test(
    "rejects cross-origin cookie login and clears expired browser sessions",
    async () => {
      for (const Origin of [undefined, "https://other.example"]) {
        const result = await request("/api/auth/login", {
          body: account,
          headers: {
            "X-Session-Mode": "cookie",
            ...(Origin ? { Origin } : {}),
          },
        });

        assert.equal(result.status, 403);
        assert.equal(result.headers.get("set-cookie"), null);
      }

      const login = await request("/api/auth/login", {
        body: account,
        headers: { "X-Session-Mode": "cookie", Origin: origin },
      });
      const cookie = login.headers.get("set-cookie").split(";")[0];
      const tokenHash = createHash("sha256")
        .update(cookie.split("=")[1])
        .digest("hex");

      await Session.updateOne(
        { tokenHash },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );

      const expired = await request("/api/auth/me", {
        method: "GET",
        headers: { Cookie: cookie },
      });

      assert.equal(expired.status, 401);
      assert.match(expired.headers.get("set-cookie"), /hilt_session=;/);
    },
  );

  await t.test(
    "limits repeated login and registration attempts with JSON and Retry-After",
    async () => {
      for (const path of ["/api/auth/login", "/api/auth/register"]) {
        let result;

        for (let attempt = 0; attempt < 21; attempt += 1) {
          result = await request(path, { body: {} });

          if (result.status === 429) {
            break;
          }
        }

        assert.equal(result.status, 429);
        assert.ok(Number(result.headers.get("retry-after")) > 0);
        assert.equal(typeof result.body.error, "string");
      }
    },
  );

  await t.test("keeps the existing health response intact", async () => {
    const result = await request("/api/health", { method: "GET" });

    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { status: "ok", mongodb: "connected" });
  });
});
