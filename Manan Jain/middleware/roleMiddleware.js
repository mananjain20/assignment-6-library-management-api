// middleware/roleMiddleware.js
// ============================================================
// Role-Based Access Control (RBAC) Middleware
// This middleware checks if the logged-in user has the required
// role to access a specific route.
//
// Usage: checkRole("librarian") or checkRole("student")
// Must be used AFTER the authenticate middleware.
// ============================================================

/**
 * checkRole - Factory function that returns a role-checking middleware
 *
 * @param {...string} allowedRoles - One or more roles that are allowed
 * @returns {Function} - Express middleware function
 *
 * Usage examples:
 *   router.post("/books", authenticate, checkRole("librarian"), addBook)
 *   router.post("/borrow", authenticate, checkRole("student"), borrowBook)
 *   router.get("/any", authenticate, checkRole("librarian", "student"), anyRoute)
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user is set by the authenticate middleware
    // If authenticate wasn't called first, req.user will be undefined
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    // Get the current user's role from the decoded JWT token
    const userRole = req.user.role;

    // Check if the user's role is in the list of allowed roles
    // allowedRoles is an array like ["librarian"] or ["student", "librarian"]
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This route requires one of these roles: ${allowedRoles.join(", ")}. Your role: ${userRole}`,
      });
    }

    // User has the correct role — allow the request to proceed
    next();
  };
};

module.exports = { checkRole };
