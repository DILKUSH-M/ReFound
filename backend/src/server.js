
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const connectDB = require("./config/db");
const itemRoutes = require("./routes/itemRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve uploaded item images
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// Health-check route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to FindIt API!",
    database: "FindIt backend is running",
  });
});

// Item API routes
app.use("/api/items", itemRoutes);
app.use("/api/auth", authRoutes);

// Handle unknown API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

// Handle unexpected errors, including upload errors
app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (error instanceof require("multer").MulterError) {
    return res.status(400).json({
      success: false,
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Image must be 5 MB or smaller."
          : error.message,
    });
  }

  if (error.message === "Please upload an image file.") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

// Start server after MongoDB connects
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`FindIt server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start FindIt:", error.message);
    process.exit(1);
  }
};

startServer();
