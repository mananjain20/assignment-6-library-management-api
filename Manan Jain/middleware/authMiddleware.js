// middleware/authMiddleware.js
// ============================================================
// JWT Authentication Middleware
// This middleware protects routes that require a logged-in user.
// It reads the JWT token from the Authorization header,
// verifies it, and attaches the decoded user info to req.user.
// ============================================================

const jwt = require("jsonwebtoken");

/**
 * authenticate - JWT verification middleware
 *
 * Usage: Add to any route that requires login
 * Example: router.get("/profile", authenticate, profileController)
 *
 * Expects the request to have:
 *   Authorization: Bearer <your_jwt_token>
 */
const authenticate = (req, res, next) => {
  try {
    // Step 1: Get the Authorization header from the request
    const authHeader = req.headers.authorization;

    // Step 2: Check if the Authorization header exists and has the correct format
    // It should look like: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message:
          "Access denied. No token provided. Please login to get a token.",
      });
    }

    // Step 3: Extract the token part (remove "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    // Step 4: Verify the token using the secret key from .env
    // jwt.verify() will throw an error if the token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 5: Attach decoded user information to req.user
    // This makes user info available in all subsequent route handlers
    // decoded contains: { userId, role, iat, exp }
    req.user = decoded;

    // Step 6: Call next() to pass control to the next middleware/route handler
    next();
  } catch (error) {
    // Handle specific JWT errors with helpful messages
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    // Generic error fallback
    return res.status(401).json({
      success: false,
      message: "Authentication failed. Please login again.",
    });
  }
};

module.exports = { authenticate };
