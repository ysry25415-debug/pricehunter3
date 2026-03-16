import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import { mockProducts } from "./data/mockProducts.js";
import { manualProducts } from "./data/manualProducts.js";
import { initDb, getDb } from "./db.js";
import { getAmazonStatus, searchAmazon } from "./integrations/amazon.js";
import { getCjStatus, searchCjProducts } from "./integrations/cj.js";
import { getCseStatus, searchGoogleCse } from "./integrations/googleCse.js";

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
  const combined = [...manualProducts, ...mockProducts];
  if (!query) {
    return combined.map(computeProductMetrics);
  }

  const normalized = query.toLowerCase();
  return combined
    .filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized)
    )
    .map(computeProductMetrics);
};

const storeSearchTargets = [
  {
    store: "Amazon",
    domain: "amazon.com",
    searchUrl: (q) =>
      `https://www.amazon.com/s?k=${encodeURIComponent(q)}`
  },
  {
    store: "Noon",
    domain: "noon.com",
    searchUrl: (q) =>
      `https://www.noon.com/search/?q=${encodeURIComponent(q)}`
  },
  {
    store: "AliExpress",
    domain: "aliexpress.com",
    searchUrl: (q) =>
      `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`
  },
  {
    store: "Alibaba",
    domain: "alibaba.com",
    searchUrl: (q) =>
      `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`
  },
  {
    store: "DHgate",
    domain: "dhgate.com",
    searchUrl: (q) =>
      `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(q)}`
  },
  {
    store: "Banggood",
    domain: "banggood.com",
    searchUrl: (q) =>
      `https://www.banggood.com/search/${encodeURIComponent(q)}.html`
  },
  {
    store: "CJdropshipping",
    domain: "cjdropshipping.com",
    searchUrl: (q) =>
      `https://cjdropshipping.com/search?search=${encodeURIComponent(q)}`
  },
  {
    store: "Spocket",
    domain: "spocket.co",
    searchUrl: (q) =>
      `https://www.spocket.co/search?q=${encodeURIComponent(q)}`
  },
  {
    store: "Zendrop",
    domain: "zendrop.com",
    searchUrl: (q) =>
      `https://www.zendrop.com/search?q=${encodeURIComponent(q)}`
  },
  {
    store: "DSers",
    domain: "dsers.com",
    searchUrl: (q) =>
      `https://www.dsers.com/places/search?keyword=${encodeURIComponent(q)}`
  },
  {
    store: "SaleHoo",
    domain: "salehoo.com",
    searchUrl: (q) =>
      `https://www.salehoo.com/search?query=${encodeURIComponent(q)}`
  },
  {
    store: "Worldwide Brands",
    domain: "worldwidebrands.com",
    searchUrl: (q) =>
      `https://www.worldwidebrands.com/search?query=${encodeURIComponent(q)}`
  },
  {
    store: "Syncee",
    domain: "syncee.co",
    searchUrl: (q) =>
      `https://syncee.co/?s=${encodeURIComponent(q)}`
  },
  {
    store: "Modalyst",
    domain: "modalyst.co",
    searchUrl: (q) =>
      `https://www.modalyst.co/search?q=${encodeURIComponent(q)}`
  },
  {
    store: "AutoDS",
    domain: "autods.com",
    searchUrl: (q) =>
      `https://autods.com/product-research?keywords=${encodeURIComponent(q)}`
  },
  {
    store: "Doba",
    domain: "doba.com",
    searchUrl: (q) =>
      `https://www.doba.com/product/search?query=${encodeURIComponent(q)}`
  },
  {
    store: "Wholesale2B",
    domain: "wholesale2b.com",
    searchUrl: (q) =>
      `https://www.wholesale2b.com/search?query=${encodeURIComponent(q)}`
  }
];

const generateStoreSearchResults = (query) => {
  if (!query) {
    return [];
  }

  const offers = storeSearchTargets.map((target) => ({
    store: target.store,
    price: null,
    shippingCost: null,
    shippingDays: null,
    rating: null,
    buyLink: target.searchUrl(query)
  }));

  return [
    {
      id: `store-bundle-${encodeURIComponent(query)}`,
      name: query,
      description: `Best matching stores for "${query}".`,
      image: `https://source.unsplash.com/featured/?${encodeURIComponent(query)}`,
      offers,
      lowestTotal: null,
      bestRating: null,
      fastestShipping: null
    }
  ];
};

const sortProducts = (products, sort) => {
  const sorted = [...products];
  const safeNumber = (value, fallback) =>
    Number.isFinite(value) ? value : fallback;

  if (sort === "rating") {
    sorted.sort(
      (a, b) => safeNumber(b.bestRating, -1) - safeNumber(a.bestRating, -1)
    );
    return sorted;
  }

  if (sort === "shipping") {
    sorted.sort(
      (a, b) =>
        safeNumber(a.fastestShipping, Infinity) -
        safeNumber(b.fastestShipping, Infinity)
    );
    return sorted;
  }

  // Default to cheapest total price.
  sorted.sort(
    (a, b) =>
      safeNumber(a.lowestTotal, Infinity) -
      safeNumber(b.lowestTotal, Infinity)
  );
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

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

initDb().catch((error) => {
  console.error("Failed to initialize database:", error);
});

app.get("/api/products/search", async (req, res) => {
  const query = req.query.q || "";
  const sort = req.query.sort || "cheapest";
  const market = req.query.market || "eg";
  const source = req.query.source || "stores";

  let results = [];

  try {
    if (source === "cj") {
      results = await searchCjProducts(query);
    } else if (source === "stores") {
      results = generateStoreSearchResults(query);
    } else if (source === "manual") {
      results = searchProducts(query);
    } else if (source === "cse") {
      results = await searchGoogleCse(query, { count: 20 });
      if (!results.length) {
        results = generateStoreSearchResults(query);
      }
    } else if (source === "mock") {
      results = searchProducts(query);
    } else {
      const cjResults = await searchCjProducts(query).catch(() => []);
      const mockResults = searchProducts(query);
      const cseResults = await searchGoogleCse(query, { count: 20 }).catch(() => []);
      results = [...cseResults, ...cjResults, ...mockResults];
    }
  } catch (error) {
    console.error("Search failed:", error);
    results = searchProducts(query);
  }

  const sortedResults = sortProducts(results, sort);

  res.json({
    query,
    sort,
    market,
    source,
    count: sortedResults.length,
    products: sortedResults
  });
});

app.get("/api/integrations/amazon/status", (req, res) => {
  const market = req.query.market || "eg";
  res.json(getAmazonStatus(market));
});

app.get("/api/integrations/cj/status", (req, res) => {
  res.json(getCjStatus());
});

app.get("/api/integrations/google/status", (req, res) => {
  res.json(getCseStatus());
});

app.post("/api/assistant/ask", async (req, res) => {
  const { message, history } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required." });
  }

  if (!openaiClient) {
    return res.status(500).json({ message: "OpenAI API key is not configured." });
  }

  const systemPrompt = `You are the PriceHunter assistant. Be concise and helpful.
You know the site features: price comparison, search bar, AI image search (placeholder),
Top matches section, dropshipping drawer, plans, and account menu.
If asked about prices, explain that some results may not include live prices yet.
If asked how to use the site, give step-by-step guidance.`;

  const safeHistory = Array.isArray(history) ? history.slice(-6) : [];

  try {
    const response = await openaiClient.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        { role: "user", content: message }
      ]
    });

    return res.json({ reply: response.output_text });
  } catch (error) {
    console.error("Assistant failed:", error);
    return res.status(500).json({ message: "Assistant request failed." });
  }
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
