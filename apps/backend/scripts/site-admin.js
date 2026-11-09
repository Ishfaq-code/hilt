require("dotenv").config();

const mongoose = require("mongoose");

const User = require("../models/User");

async function main() {
  const [action, email] = process.argv.slice(2);

  if (
    !["grant", "revoke"].includes(action) ||
    !email ||
    process.argv.length !== 4
  ) {
    throw new Error(
      "Usage: npm run site-admin -- grant|revoke EMAIL. Operate only on an account you intend to authorize.",
    );
  }

  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/HiltDB",
  );

  const user = await User.findOne({
    emailAddress: email.trim().toLowerCase(),
  }).select("+passwordHash");

  if (!user) {
    throw new Error("Account not found. Register the intended account first.");
  }

  if (action === "grant" && !user.passwordHash) {
    throw new Error("This account has no password and cannot sign in.");
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { isSiteAdmin: action === "grant" } },
  );

  const change = action === "grant" ? "granted" : "revoked";

  console.log(`Site administrator access ${change} for account ${user.id}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
