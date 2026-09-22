
const swaggerJsdoc = require("swagger-jsdoc");

// Swagger definition — describes the overall API
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "📚 Library Management System API",
    version: "1.0.0",
    description:
      "A complete REST API for managing a library system. Supports student registration, book management, borrowing, and returning books.",
    contact: {
      name: "Library API Support",
      email: "support@library.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development Server",
    },
  ],
  // Security scheme — defines how JWT Bearer tokens work in Swagger UI
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          'Enter your JWT token here. Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."',
      },
    },
    schemas: {
      // ---- User Schemas ----
      UserRegister: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Manan Jain" },
          email: { type: "string", example: "manan@example.com" },
          password: {
            type: "string",
            minLength: 6,
            example: "password123",
          },
        },
      },
      LibrarianRegister: {
        type: "object",
        required: ["name", "email", "password", "librarianSecretKey"],
        properties: {
          name: { type: "string", example: "Dr. Sharma" },
          email: { type: "string", example: "sharma@library.com" },
          password: { type: "string", example: "securePass456" },
          librarianSecretKey: {
            type: "string",
            example: "your_librarian_secret",
          },
        },
      },
      UserLogin: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "manan@example.com" },
          password: { type: "string", example: "password123" },
        },
      },
      // ---- Book Schemas ----
      BookCreate: {
        type: "object",
        required: ["title", "author", "isbn", "category", "totalCopies"],
        properties: {
          title: { type: "string", example: "The Great Gatsby" },
          author: { type: "string", example: "F. Scott Fitzgerald" },
          isbn: { type: "string", example: "978-0-7432-7356-5" },
          category: { type: "string", example: "Fiction" },
          totalCopies: { type: "integer", example: 5 },
        },
      },
      BookUpdate: {
        type: "object",
        properties: {
          title: { type: "string", example: "The Great Gatsby (Updated)" },
          author: { type: "string", example: "F. Scott Fitzgerald" },
          isbn: { type: "string", example: "978-0-7432-7356-5" },
          category: { type: "string", example: "Classic Fiction" },
          totalCopies: { type: "integer", example: 8 },
          availableCopies: { type: "integer", example: 6 },
        },
      },
      // ---- Response Schemas ----
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation successful" },
          data: { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error message here" },
        },
      },
    },
  },
};

// Options for swagger-jsdoc — tells it where to find JSDoc comments
const options = {
  swaggerDefinition,
  apis: [
    "./router/authRouter.js",
    "./router/bookRouter.js",
    "./router/borrowRouter.js",
  ],
};

// Generate the Swagger specification from JSDoc comments
const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
