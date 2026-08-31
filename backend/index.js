const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const { ensureAdminSeeded, requireAuth, registerAuthRoutes } = require("./auth");

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://mongodb:27017/chaiDB";
const API_MAX_JSON_SIZE = process.env.API_MAX_JSON_SIZE || "1mb";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const UPLOADS_DIR = path.join(__dirname, "uploads");
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const corsOptions = {
  origin(origin, callback) {
    if (CORS_ORIGIN === "*" || !origin) {
      callback(null, true);
      return;
    }

    const allowed = CORS_ORIGIN.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (allowed.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS policy"));
  },
};

const productSchema = new mongoose.Schema(
  {
    id: { type: Number, default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, default: 'food', trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    badge: { type: String, default: '', trim: true }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Product = mongoose.model("Product", productSchema);

const storeSettingsSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, default: 1 },
    openingDays: { type: String, default: 'Every Day' },
    openingHours: { type: String, default: '5:00 PM - 2:00 AM' },
    phone: { type: String, default: '+94 70 392 3931' },
    address: { type: String, default: 'Sri Lanka' },
    mapUrl: { type: String, default: 'https://maps.app.goo.gl/CTwFqKEPF2g95mrE9' },
    instagramHandle: { type: String, default: '@ceylon_chaii' },
    instagramUrl: { type: String, default: 'https://www.instagram.com/ceylon_chaii' },
    announcement: { type: String, default: 'Weekend offer: 10% off selected tea and food combos.' },
    logoImage: { type: String, default: 'images/logo.svg' },
    gallery: {
      type: [{ url: String, title: String }],
      default: [
        { url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500', title: 'Brewing Perfection' },
        { url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500', title: 'Fresh Ingredients' },
        { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500', title: 'Cozy Atmosphere' }
      ]
    }
  },
  {
    versionKey: false
  }
);

const StoreSettings = mongoose.model("StoreSettings", storeSettingsSchema);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_IMAGE_SIZE_BYTES) || 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Invalid file type. Allowed: jpg, png, webp, gif"));
  },
});

function validateAndParsePrice(priceInput) {
  if (priceInput === undefined || priceInput === null || priceInput === '') {
    return { valid: false };
  }
  if (typeof priceInput === 'number') {
    return { valid: priceInput >= 0, value: String(priceInput) };
  }
  const str = String(priceInput).trim();
  if (!str) {
    return { valid: false };
  }
  const match = str.match(/\d+(\.\d+)?/);
  if (!match) {
    return { valid: false };
  }
  const val = Number(match[0]);
  if (val < 0) {
    return { valid: false };
  }
  return { valid: true, value: str };
}

function formatProduct(product, req) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const doc = product.toObject ? product.toObject() : product;
  if (doc.image && !doc.image.startsWith('http://') && !doc.image.startsWith('https://')) {
    doc.image = `${baseUrl}/uploads/${doc.image}`;
  }
  return doc;
}

function formatStoreSettings(settings, req) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const doc = settings.toObject ? settings.toObject() : settings;
  if (doc.logoImage && !doc.logoImage.startsWith('http://') && !doc.logoImage.startsWith('https://') && !doc.logoImage.startsWith('images/')) {
    doc.logoImage = `${baseUrl}/uploads/${doc.logoImage}`;
  }
  if (doc.gallery && Array.isArray(doc.gallery)) {
    doc.gallery = doc.gallery.map(item => {
      let url = item.url;
      if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('images/')) {
        url = `${baseUrl}/uploads/${url}`;
      }
      return { title: item.title, url: url };
    });
  }
  return doc;
}

function getDatabaseState() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] || "unknown";
}

async function safeDeleteUpload(fileName) {
  if (!fileName) {
    return;
  }

  try {
    await fsp.unlink(path.join(UPLOADS_DIR, fileName));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Failed to remove file:", fileName, error.message);
    }
  }
}

app.disable("x-powered-by");
app.use(express.json({ limit: API_MAX_JSON_SIZE }));
app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.use("/uploads", express.static(UPLOADS_DIR));

registerAuthRoutes(app);

app.get("/", (_req, res) => {
  res.json({
    service: "ceylon-chai-backend",
    status: "ok",
    database: getDatabaseState(),
  });
});

app.get("/health", (_req, res) => {
  const dbState = getDatabaseState();
  const isHealthy = dbState === "connected";
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "degraded",
    database: dbState,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/products", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const products = await Product.find().sort({ id: 1, createdAt: -1 });
    res.json(products.map(p => formatProduct(p, req)));
  } catch (error) {
    next(error);
  }
});

app.post("/products", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const priceVal = validateAndParsePrice(req.body.price);

    if (!name) {
      await safeDeleteUpload(req.file && req.file.filename);
      res.status(400).json({ error: "Name is required" });
      return;
    }

    if (!priceVal.valid) {
      await safeDeleteUpload(req.file && req.file.filename);
      res.status(400).json({ error: "Price must be a valid positive number or formatted currency string" });
      return;
    }

    const product = await Product.create({
      id: req.body.id ? Number(req.body.id) : null,
      name,
      category: req.body.category || 'food',
      description: req.body.description || '',
      price: priceVal.value,
      image: req.file ? req.file.filename : req.body.image || null,
      badge: req.body.badge || ''
    });

    res.status(201).json({ message: "Product added successfully", product: formatProduct(product, req) });
  } catch (error) {
    if (req.file) {
      await safeDeleteUpload(req.file.filename);
    }
    next(error);
  }
});

app.post("/products/bulk", requireAuth, async (req, res, next) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "Expected array of menu items" });
      return;
    }

    for (const item of items) {
      if (!item.name) {
        res.status(400).json({ error: "Name is required for all items" });
        return;
      }
      const priceVal = validateAndParsePrice(item.price);
      if (!priceVal.valid) {
        res.status(400).json({ error: `Invalid price for item: ${item.name}` });
        return;
      }
    }

    await Product.deleteMany({});

    const cleanFilename = (imgUrl) => {
      if (!imgUrl) return null;
      if (imgUrl.includes('/uploads/')) {
        const parts = imgUrl.split('/uploads/');
        return parts[parts.length - 1];
      }
      return imgUrl;
    };

    const payload = items.map(item => ({
      id: item.id ? Number(item.id) : null,
      name: item.name.trim(),
      category: item.category || 'food',
      description: item.description || '',
      price: validateAndParsePrice(item.price).value,
      image: cleanFilename(item.image),
      badge: item.badge || ''
    }));

    const created = await Product.insertMany(payload);
    res.json({ message: "Menu updated successfully", count: created.length });
  } catch (error) {
    next(error);
  }
});

app.delete("/products/:id", requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }

    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (deleted.image) {
      await safeDeleteUpload(deleted.image);
    }
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
});

app.post("/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({ 
    filename: req.file.filename,
    imageUrl: `${baseUrl}/uploads/${req.file.filename}`
  });
});

app.get("/store-settings", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    let settings = await StoreSettings.findOne({ id: 1 });
    if (!settings) {
      settings = await StoreSettings.create({ id: 1 });
    }
    res.json(formatStoreSettings(settings, req));
  } catch (error) {
    next(error);
  }
});

app.put("/store-settings", requireAuth, async (req, res, next) => {
  try {
    const cleanLogoFilename = (logoUrl) => {
      if (!logoUrl) return 'images/logo.svg';
      if (logoUrl.includes('/uploads/')) {
        const parts = logoUrl.split('/uploads/');
        return parts[parts.length - 1];
      }
      return logoUrl;
    };

    const updateData = {
      openingDays: req.body.openingDays,
      openingHours: req.body.openingHours,
      phone: req.body.phone,
      address: req.body.address,
      mapUrl: req.body.mapUrl,
      instagramHandle: req.body.instagramHandle,
      instagramUrl: req.body.instagramUrl,
      announcement: req.body.announcement,
      logoImage: cleanLogoFilename(req.body.logoImage)
    };

    if (req.body.gallery && Array.isArray(req.body.gallery)) {
      updateData.gallery = req.body.gallery.map(item => ({
        title: item.title || '',
        url: cleanLogoFilename(item.url)
      }));
    }

    let settings = await StoreSettings.findOneAndUpdate(
      { id: 1 },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json(formatStoreSettings(settings, req));
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (error && error.message === "Origin not allowed by CORS policy") {
    res.status(403).json({ error: error.message });
    return;
  }

  console.error("Unexpected server error:", error);
  res.status(500).json({ error: "Internal server error" });
});

let server;

async function start() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB connected");

  await ensureAdminSeeded();

  server = app.listen(PORT, HOST, () => {
    console.log(`Backend running on http://${HOST}:${PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await mongoose.connection.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error("Shutdown error:", error);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error("Shutdown error:", error);
    process.exit(1);
  });
});

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
