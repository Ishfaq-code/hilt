const { createHash, randomBytes } = require("node:crypto");
const express = require("express");
const argon2 = require("argon2");
const { rateLimit } = require("express-rate-limit");
const isEmail = require("validator/lib/isEmail");

const User = require("../models/User");
const Session = require("../models/Session");
const {
  requireSession,
  isSameOrigin,
  sessionLifetimeMs,
  sessionCookieName,
  sessionCookie,
} = require("../middleware/session");

const router = express.Router();
let dummyPasswordHash;

// registration and failed login attempts have separate budgets
const registrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many registration attempts. Try again in 15 minutes.",
  },
});

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});

function publicUser(user) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress,
  };
}

function readCredentials(body) {
  if (
    !body ||
    typeof body.emailAddress !== "string" ||
    typeof body.password !== "string"
  ) {
    return null;
  }

  const emailAddress = body.emailAddress.trim().toLowerCase();
  const passwordLength = Array.from(body.password).length;

  if (!isEmail(emailAddress) || passwordLength < 1 || passwordLength > 128) {
    return null;
  }

  return { emailAddress, password: body.password };
}

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");

  const expectsJson =
    (req.method === "POST" && ["/register", "/login"].includes(req.path)) ||
    (req.method === "PATCH" && req.path === "/me");

  if (expectsJson && !req.is("application/json")) {
    return res.status(415).json({
      error: "Send the request as application/json.",
    });
  }

  next();
});

router.use(express.json({ limit: "8kb" }));

router.post("/register", registrationLimit, async (req, res) => {
  const credentials = readCredentials(req.body);

  if (!credentials || Array.from(credentials.password).length < 15) {
    return res.status(400).json({
      error:
        "A valid emailAddress and a password of 15–128 characters are required.",
    });
  }

  const { firstName, lastName } = req.body;
  const invalidName = [firstName, lastName].some(
    (name) =>
      typeof name !== "string" || !name.trim() || name.trim().length > 100,
  );

  if (invalidName) {
    return res.status(400).json({
      error: "firstName and lastName must each contain 1–100 characters.",
    });
  }

  const passwordHash = await argon2.hash(credentials.password, {
    type: argon2.argon2id,
  });

  try {
    // assign fields explicitly so clients cannot choose a hash, id, or role
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailAddress: credentials.emailAddress,
      passwordHash,
    });

    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    // the unique index also covers concurrent registrations for the same email
    if (error.code === 11000) {
      return res.status(409).json({
        error: "An account with this email address already exists.",
      });
    }

    throw error;
  }
});

router.post("/login", loginLimit, async (req, res) => {
  const useCookie = req.get("X-Session-Mode") === "cookie";

  if (useCookie && !isSameOrigin(req)) {
    return res.status(403).json({ error: "Sign in from the Hilt website." });
  }

  const credentials = readCredentials(req.body);

  if (!credentials) {
    return res.status(400).json({
      error:
        "A valid emailAddress and a password of 1–128 characters are required.",
    });
  }

  const user = await User.findOne({
    emailAddress: credentials.emailAddress,
  }).select("+passwordHash");

  // unknown emails and seed users still perform the expensive verification
  if (!dummyPasswordHash) {
    dummyPasswordHash = argon2.hash(randomBytes(32));
  }

  const passwordMatches = await argon2.verify(
    user?.passwordHash || (await dummyPasswordHash),
    credentials.password,
  );

  if (!user?.passwordHash || !passwordMatches) {
    return res
      .status(401)
      .json({ error: "Invalid email address or password." });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);

  // only the digest is stored, so the database does not reveal usable tokens
  await Session.create({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    user: user._id,
    expiresAt,
  });

  if (useCookie) {
    res.cookie(sessionCookieName, token, {
      ...sessionCookie,
      maxAge: sessionLifetimeMs,
    });

    return res.json({ expiresAt, user: publicUser(user) });
  }

  return res.json({
    token,
    tokenType: "Bearer",
    expiresAt,
    user: publicUser(user),
  });
});

router.get("/me", requireSession, (req, res) => {
  res.json({ user: publicUser(req.auth.user) });
});

router.patch("/me", requireSession, async (req, res) => {
  const body = req.body;
  const fields = ["firstName", "lastName"];

  if (
    !body ||
    Array.isArray(body) ||
    typeof body !== "object" ||
    !Object.keys(body).length ||
    Object.keys(body).some((key) => !fields.includes(key))
  ) {
    return res
      .status(400)
      .json({ error: "Provide firstName or lastName only." });
  }

  const changes = {};

  for (const field of fields) {
    if (!Object.hasOwn(body, field)) {
      continue;
    }

    const name = body[field];

    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({
        error: "firstName and lastName must each contain 1–100 characters.",
      });
    }

    changes[field] = name.trim();
  }

  const user = await User.findByIdAndUpdate(
    req.auth.user._id,
    { $set: changes },
    { returnDocument: "after", runValidators: true },
  );

  // the user may have been removed after session resolution
  if (!user) {
    return res.status(401).json({
      error: "The session is invalid or expired. Please log in again.",
    });
  }

  res.json({ user: publicUser(user) });
});

router.post("/logout", requireSession, async (req, res) => {
  await Session.deleteOne({ _id: req.auth.session._id });

  if (req.auth.viaCookie) {
    res.clearCookie(sessionCookieName, sessionCookie);
  }

  res.status(204).end();
});

module.exports = router;
