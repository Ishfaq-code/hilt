const express = require("express");
const { rateLimit } = require("express-rate-limit");
const isEmail = require("validator/lib/isEmail");

const Organization = require("../models/Organization");
const University = require("../models/University");
const { requireSession } = require("../middleware/session");
const {
  expectJson,
  validateClubId,
  allowedFields,
  validRevision,
} = require("../middleware/validation");
const { applicationView } = require("../serializers/clubs");

const router = express.Router();
const applicationLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.auth.user.id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many club applications. Try again in an hour." },
});

router.param("clubId", validateClubId);

async function readApplication(body, user) {
  if (
    !allowedFields(body, [
      "name",
      "description",
      "universityId",
      "contactEmail",
      "links",
      "revision",
    ])
  ) {
    return { error: "Provide club details only." };
  }

  const { name, description, universityId, contactEmail, links = [] } = body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 4000 ||
    typeof contactEmail !== "string" ||
    contactEmail.length > 254 ||
    !isEmail(contactEmail.trim()) ||
    typeof universityId !== "string" ||
    !/^[a-f0-9]{24}$/i.test(universityId) ||
    !Array.isArray(links) ||
    links.length > 5
  ) {
    return {
      error:
        "Enter a club name (1–100 characters), description (1–4000), university, contact email, and up to five links.",
    };
  }

  const safeLinks = [];

  for (const link of links) {
    if (typeof link !== "string" || link.length > 2048) {
      return { error: "Club links must be HTTP or HTTPS URLs." };
    }

    try {
      const url = new URL(link);

      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      ) {
        throw new Error();
      }

      safeLinks.push(url.href);
    } catch {
      return {
        error: "Club links must be HTTP or HTTPS URLs without credentials.",
      };
    }
  }

  const university = await University.findById(universityId);

  if (!university) {
    return { error: "Choose a supported university." };
  }

  if (!university.emailDomains.includes(user.emailAddress.split("@")[1])) {
    return {
      error: `Use an account with a ${university.name} email address to apply.`,
      status: 403,
    };
  }

  return {
    values: {
      name: name.trim(),
      description: description.trim(),
      university: university._id,
      contactEmail: contactEmail.trim().toLowerCase(),
      links: safeLinks,
    },
  };
}

router.get("/", requireSession, async (req, res) => {
  const applications = await Organization.find({
    owner: req.auth.user._id,
    approvalStatus: { $in: ["pending", "approved", "rejected"] },
  })
    .populate("university")
    .sort({ createdAt: -1 });

  res.json({ applications: applications.map(applicationView) });
});

router.post(
  "/",
  requireSession,
  applicationLimit,
  expectJson,
  async (req, res) => {
    if (req.body && Object.hasOwn(req.body, "revision")) {
      return res
        .status(400)
        .json({ error: "A new application has no revision." });
    }

    const parsed = await readApplication(req.body, req.auth.user);

    if (parsed.error) {
      return res.status(parsed.status || 400).json({ error: parsed.error });
    }

    const club = await Organization.create({
      ...parsed.values,
      owner: req.auth.user._id,
      approvalStatus: "pending",
    });

    await club.populate("university");

    res.status(201).json({ application: applicationView(club) });
  },
);

router.patch("/:clubId", requireSession, expectJson, async (req, res) => {
  if (!validRevision(req.body?.revision)) {
    return res.status(400).json({
      error: "Provide the current application revision.",
    });
  }

  const parsed = await readApplication(req.body, req.auth.user);

  if (parsed.error) {
    return res.status(parsed.status || 400).json({ error: parsed.error });
  }

  // omitting links preserves them; an explicit empty array clears them
  if (!Object.hasOwn(req.body, "links")) {
    delete parsed.values.links;
  }

  const club = await Organization.findOneAndUpdate(
    {
      _id: req.params.clubId,
      owner: req.auth.user._id,
      approvalStatus: { $in: ["pending", "rejected"] },
      revision: req.body.revision,
    },
    {
      $set: { ...parsed.values, approvalStatus: "pending" },
      $inc: { revision: 1 },
    },
    { returnDocument: "after", runValidators: true },
  ).populate("university");

  if (!club) {
    const ownApplication = await Organization.exists({
      _id: req.params.clubId,
      owner: req.auth.user._id,
    });

    return res.status(ownApplication ? 409 : 404).json({
      error: ownApplication
        ? "This application changed or is already approved. Refresh before editing."
        : "Application not found.",
    });
  }

  res.json({ application: applicationView(club) });
});

module.exports = router;
