require("dotenv").config();

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const { initializeFirebase } = require("./config/db");
const swaggerSpec = require("./config/swagger");
const { apiLimiter } = require("./middleware/rateLimiter");

const authRouter = require("./router/authRouter");
const bookRouter = require("./router/bookRouter");
const borrowRouter = require("./router/borrowRouter");

initializeFirebase();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/books", bookRouter);
app.use("/api", borrowRouter);

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "📚 Library API Docs",
    customCss: `
      .swagger-ui .topbar { background-color: #1a1a2e; }
      .swagger-ui .topbar .link { color: #e94560; }
    `,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "📚 Welcome to the Library Management System API",
    version: "1.0.0",
    documentation: "http://localhost:3000/api-docs",
    endpoints: {
      auth: "/api/auth",
      books: "/api/books",
      borrow: "/api/books/:id/borrow",
      return: "/api/books/:id/return",
      myHistory: "/api/books/my-history",
      librarianRecords: "/api/librarian/borrow-records",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("Global error handler caught:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "An unexpected server error occurred.",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("\n==========================================");
  console.log(`🚀 Library Management API is running!`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("==========================================\n");
});

module.exports = app;
