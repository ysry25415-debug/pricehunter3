import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { mockProducts } from "./data/mockProducts.js";
import { initDb, getDb } from "./db.js";
import { getAmazonStatus, searchAmazon } from "./integrations/amazon.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const computeOfferTotals = (offer) => ({
  ...offer,
  total: Number((offer.price + offer.shippingCost).toFixed(2))
});

const computeProductMetrics = (product) => {
  const offersWithTotals = product.offers.map(computeOfferTotals);
  const lowestTotal = Math.min(...offersWithTotals.map((offer) => offer.total));
  const bestRating = Math.max(...offersWithTotals.map((offer) => offer.rating));
  const fastestShipping = Math.min(
    ...offersWithTotals.map((offer) => offer.shippingDays)
  );

  return {
    ...product,
    offers: offersWithTotals,
    lowestTotal,
    bestRating,
    fastestShipping
  };
};

// Simple keyword search over mock products to simulate store integrations.
const searchProducts = (query) => {
  if (!query) {
    return mockProducts.map(computeProductMetrics);
  }

  const normalized = query.toLowerCase();
  return mockProducts
    .filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized)
    )
    .map(computeProductMetrics);
};

const sortProducts = (products, sort) => {
  const sorted = [...products];

  if (sort === "rating") {
    sorted.sort((a, b) => b.bestRating - a.bestRating);
    return sorted;
  }

  if (sort === "shipping") {
    sorted.sort((a, b) => a.fastestShipping - b.fastestShipping);
    return sorted;
  }

  // Default to cheapest total price.
  sorted.sort((a, b) => a.lowestTotal - b.lowestTotal);
  return sorted;
};

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const generateToken = () => crypto.randomBytes(32).toString("hex");

const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

const smtpReady =
  smtpConfig.host &&
  smtpConfig.port &&
  smtpConfig.auth.user &&
  smtpConfig.auth.pass &&
  process.env.SMTP_FROM;

const mailTransporter = smtpReady
  ? nodemailer.createTransport(smtpConfig)
  : null;

initDb().catch((error) => {
  console.error("Failed to initialize database:", error);
});

app.get("/api/products/search", (req, res) => {
  const query = req.query.q || "";
  const sort = req.query.sort || "cheapest";
  const market = req.query.market || "eg";

  const results = searchProducts(query);
  const sortedResults = sortProducts(results, sort);

  res.json({
    query,
    sort,
    market,
    count: sortedResults.length,
    products: sortedResults
  });
});

app.get("/api/integrations/amazon/status", (req, res) => {
  const market = req.query.market || "eg";
  res.json(getAmazonStatus(market));
});

app.post("/api/auth/signup", async (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const db = await getDb();
    const existing = await db.get("SELECT * FROM users WHERE email = ?", email);
    const passwordHash = await bcrypt.hash(password, 10);

    if (existing) {
      if (existing.password_hash) {
        return res.status(409).json({ message: "Account already exists." });
      }
      await db.run(
        "UPDATE users SET password_hash = ? WHERE email = ?",
        passwordHash,
        email
      );
    } else {
      await db.run(
        "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
        email,
        passwordHash,
        new Date().toISOString()
      );
    }

    return res.json({ message: "Account created." });
  } catch (error) {
    console.error("Signup failed:", error);
    return res.status(500).json({ message: "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  try {
    const db = await getDb();
    const user = await db.get("SELECT * FROM users WHERE email = ?", email);

    if (!user || !user.password_hash) {
      return res.status(401).json({ message: "Account not found." });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await db.run(
      "INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)",
      user.id,
      token,
      expiresAt,
      new Date().toISOString()
    );

    return res.json({ token, user: { email: user.email }, expiresAt });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ message: "Login failed." });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token." });
  }

  try {
    const db = await getDb();
    const session = await db.get(
      "SELECT * FROM sessions WHERE token = ?",
      token
    );

    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ message: "Session expired." });
    }

    const user = await db.get("SELECT email FROM users WHERE id = ?", session.user_id);
    return res.json({ user });
  } catch (error) {
    console.error("Session check failed:", error);
    return res.status(500).json({ message: "Session check failed." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!token) {
    return res.status(200).json({ message: "Logged out." });
  }

  try {
    const db = await getDb();
    await db.run("DELETE FROM sessions WHERE token = ?", token);
    return res.json({ message: "Logged out." });
  } catch (error) {
    console.error("Logout failed:", error);
    return res.status(500).json({ message: "Logout failed." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3001, () => {
  console.log(`PriceHunter API running on port ${PORT}`);
});
