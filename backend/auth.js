const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString("hex");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

if (!process.env.JWT_SECRET) {
  console.warn(
    "[auth] JWT_SECRET is not set -- using a random secret generated for this process. " +
    "All admin sessions will be invalidated on restart. Set JWT_SECRET in backend/.env for a real deployment."
  );
}

const BCRYPT_ROUNDS = 12;
// A real (but unused) bcrypt hash to compare against when a username doesn't
// exist, so a login/reset attempt for an unknown user takes the same time as
// one for a real user instead of leaking existence via response timing.
const DUMMY_HASH = "$2b$12$uV8rEX9/TVO7bqNEgAqI1ulCOPfgeiAyW9HSvfAZPEJqIHzBzMsT6";
const COMMON_WEAK_PASSWORDS = new Set([
  "password", "password123", "12345678", "123456789", "qwerty123",
  "letmein123", "admin123", "welcome123", "changeme123", "iloveyou1",
]);

const adminUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    recoveryCodeHash: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

const AdminUser = mongoose.model("AdminUser", adminUserSchema);

// Authoritative password policy -- mirrored client-side in admin.js for live feedback,
// but only this copy is ever trusted to accept/reject a password.
function validatePassword(password, username) {
  if (typeof password !== "string" || password.length < 12) {
    return "Password must be at least 12 characters long.";
  }
  if (password.length > 128) {
    return "Password must be shorter than 128 characters.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character.";
  }
  if (username && password.toLowerCase().includes(String(username).toLowerCase())) {
    return "Password must not contain your username.";
  }
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    return "That password is too common. Please choose a stronger one.";
  }
  return null;
}

function generateRecoveryCode() {
  const bytes = crypto.randomBytes(9);
  const base32 = bytes.toString("hex").toUpperCase().slice(0, 12);
  return `${base32.slice(0, 4)}-${base32.slice(4, 8)}-${base32.slice(8, 12)}`;
}

async function ensureAdminSeeded() {
  const existing = await AdminUser.findOne({});
  if (existing) {
    return;
  }

  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.warn(
      "[auth] No admin account exists yet and ADMIN_USERNAME/ADMIN_PASSWORD are not set. " +
      "Admin login is disabled until you set both in backend/.env and restart the server."
    );
    return;
  }

  const policyError = validatePassword(ADMIN_PASSWORD, ADMIN_USERNAME);
  if (policyError) {
    console.error(`[auth] ADMIN_PASSWORD does not meet the password policy (${policyError}). Admin account was not created.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
  const recoveryCode = generateRecoveryCode();
  const recoveryCodeHash = await bcrypt.hash(recoveryCode, BCRYPT_ROUNDS);

  await AdminUser.create({
    username: ADMIN_USERNAME.toLowerCase().trim(),
    passwordHash,
    recoveryCodeHash,
  });

  console.log("=".repeat(64));
  console.log(`[auth] Admin account created for username: ${ADMIN_USERNAME.toLowerCase().trim()}`);
  console.log("[auth] SAVE THIS RECOVERY CODE NOW -- it will not be shown again:");
  console.log(`[auth]     ${recoveryCode}`);
  console.log("[auth] If you forget your password, use it on the admin login screen's");
  console.log("[auth] \"Forgot password\" flow to set a new one.");
  console.log("=".repeat(64));
}

function signToken(admin) {
  return jwt.sign({ sub: admin.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

// Deliberately generous window+limit: this protects against automated brute
// force, not a determined attacker with many IPs, and must not lock out a
// single admin who mistypes their password a few times.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

function registerAuthRoutes(app) {
  app.get("/auth/status", async (_req, res, next) => {
    try {
      const configured = Boolean(await AdminUser.findOne({}));
      res.json({ configured });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/login", authLimiter, async (req, res, next) => {
    try {
      const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
      const password = typeof req.body.password === "string" ? req.body.password : "";

      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }

      const admin = await AdminUser.findOne({ username });
      // Always run a bcrypt.compare, even with no matching user, so login
      // timing doesn't reveal whether a username exists.
      const hashToCompare = admin ? admin.passwordHash : DUMMY_HASH;
      const isMatch = await bcrypt.compare(password, hashToCompare);

      if (!admin || !isMatch) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      res.json({ token: signToken(admin), username: admin.username });
    } catch (error) {
      next(error);
    }
  });

  app.get("/auth/me", requireAuth, (req, res) => {
    res.json({ username: req.admin.sub });
  });

  app.post("/auth/change-password", requireAuth, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const admin = await AdminUser.findOne({ username: req.admin.sub });
      if (!admin) {
        res.status(401).json({ error: "Session no longer valid" });
        return;
      }

      const isMatch = await bcrypt.compare(String(currentPassword || ""), admin.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const policyError = validatePassword(newPassword, admin.username);
      if (policyError) {
        res.status(400).json({ error: policyError });
        return;
      }

      admin.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await admin.save();

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/forgot-password", authLimiter, async (req, res, next) => {
    try {
      const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
      const recoveryCode = typeof req.body.recoveryCode === "string" ? req.body.recoveryCode.trim().toUpperCase() : "";
      const { newPassword } = req.body;

      const admin = await AdminUser.findOne({ username });
      const hashToCompare = admin ? admin.recoveryCodeHash : DUMMY_HASH;
      const isMatch = await bcrypt.compare(recoveryCode, hashToCompare);

      if (!admin || !isMatch) {
        res.status(401).json({ error: "Invalid username or recovery code" });
        return;
      }

      const policyError = validatePassword(newPassword, admin.username);
      if (policyError) {
        res.status(400).json({ error: policyError });
        return;
      }

      // Recovery codes are single-use: reset the password and issue a fresh
      // code so a leaked-and-reused-once code can't be replayed indefinitely.
      const newRecoveryCode = generateRecoveryCode();
      admin.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      admin.recoveryCodeHash = await bcrypt.hash(newRecoveryCode, BCRYPT_ROUNDS);
      await admin.save();

      res.json({
        message: "Password reset successfully. Save your new recovery code -- it will not be shown again.",
        recoveryCode: newRecoveryCode,
      });
    } catch (error) {
      next(error);
    }
  });
}

module.exports = {
  AdminUser,
  ensureAdminSeeded,
  requireAuth,
  registerAuthRoutes,
  validatePassword,
};
