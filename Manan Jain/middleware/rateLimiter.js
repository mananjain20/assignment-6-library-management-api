// middleware/rateLimiter.js
// ============================================================
// Rate Limiting Middleware
// Prevents abuse by limiting how many requests a single IP
// address can make within a time window.
//
// Configuration: 100 requests per 15 minutes per IP
// Applied to all /api/* routes in server.js
// ============================================================

const rateLimit = require("express-rate-limit");

/**
 * apiLimiter - Rate limiting middleware for all API routes
 *
 * This helps protect the API from:
 * - Brute force attacks (too many login attempts)
 * - DDoS attacks (too many requests flooding the server)
 * - Accidental infinite loops in client code
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds (15 * 60 * 1000 = 900,000 ms)
  max: 100, // Maximum 100 requests per windowMs per IP address
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers (deprecated)

  // Custom error response when the limit is exceeded
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message:
        "Too many requests from this IP address. Please wait 15 minutes before trying again.",
      retryAfter: "15 minutes",
    });
  },
});

module.exports = { apiLimiter };
