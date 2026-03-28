const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🔥 IMPORTANT: Use Docker container name for MongoDB
mongoose
  .connect("mongodb://mongodb:27017/chaiDB")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
});

const Product = mongoose.model("Product", productSchema);

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Root route (so browser doesn't show "Cannot GET /")
app.get("/", (req, res) => {
  res.send("🚀 Backend is running successfully!");
});

// Get all products
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new product
app.post("/products", upload.single("image"), async (req, res) => {
  try {
    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      image: req.file ? req.file.filename : null,
    });

    await product.save();
    res.json({ message: "Product added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete("/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listen on all interfaces (IMPORTANT for Docker)
app.listen(5000, "0.0.0.0", () => {
  console.log("Backend running on port 5000");
});
