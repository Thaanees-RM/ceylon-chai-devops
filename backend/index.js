const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");

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
    name: { type: String, required: true, trim: true, maxlength: 120 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Product = mongoose.model("Product", productSchema);

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

function parsePrice(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
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

app.get("/products", async (_req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

app.post("/products", upload.single("image"), async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const price = parsePrice(req.body.price);

    if (!name) {
      await safeDeleteUpload(req.file && req.file.filename);
      res.status(400).json({ error: "Name is required" });
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      await safeDeleteUpload(req.file && req.file.filename);
      res.status(400).json({ error: "Price must be a valid positive number" });
      return;
    }

    const product = await Product.create({
      name,
      price,
      image: req.file ? req.file.filename : null,
    });

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    if (req.file) {
      await safeDeleteUpload(req.file.filename);
    }
    next(error);
  }
});

app.delete("/products/:id", async (req, res, next) => {
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

    await safeDeleteUpload(deleted.image);
    res.json({ message: "Deleted successfully" });
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
