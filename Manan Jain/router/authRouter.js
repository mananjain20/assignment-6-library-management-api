// router/authRouter.js
// ============================================================
// Authentication Routes
// Handles user registration, login, and profile retrieval.
//
// Routes:
//   POST /api/auth/register          → Register a student
//   POST /api/auth/register-librarian → Register a librarian (secret key required)
//   POST /api/auth/login             → Login (student or librarian)
//   GET  /api/auth/profile           → Get logged-in user's profile
// ============================================================

const express = require("express");
const jwt = require("jsonwebtoken");
const { authenticate } = require("../middleware/authMiddleware");
const {
  createUser,
  findUserByEmail,
  findUserById,
  comparePassword,
} = require("../model/userModel");

const router = express.Router();

// ============================================================
// Helper: Generate JWT Token
// ============================================================
/**
 * generateToken - Creates a signed JWT token for a user
 *
 * @param {Object} user - { uid, role }
 * @returns {string} - Signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.uid, // User's unique Firestore document ID
      role: user.role,  // "student" or "librarian"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d", // Token valid for 7 days
    }
  );
};

// ============================================================
// ROUTE 1: Register Student
// POST /api/auth/register
// ============================================================
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new student
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: Student registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request (missing fields or email already exists)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // --- Input Validation ---
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Validate email format using a simple regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Password must be at least 6 characters
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // --- Check if Email is Already Taken ---
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // --- Create the New Student ---
    // createUser() will hash the password internally
    const newUser = await createUser({
      name,
      email,
      password,
      role: "student", // All users registered via this route are students
    });

    // --- Generate JWT Token ---
    const token = generateToken(newUser);

    // --- Send Success Response ---
    return res.status(201).json({
      success: true,
      message: "Student registered successfully",
      data: {
        token,
        user: newUser,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again.",
    });
  }
});

// ============================================================
// ROUTE 2: Register Librarian
// POST /api/auth/register-librarian
// ============================================================
/**
 * @swagger
 * /api/auth/register-librarian:
 *   post:
 *     summary: Register a new librarian (requires secret key)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LibrarianRegister'
 *     responses:
 *       201:
 *         description: Librarian registered successfully
 *       400:
 *         description: Invalid secret key or missing fields
 *       500:
 *         description: Server error
 */
router.post("/register-librarian", async (req, res) => {
  try {
    const { name, email, password, librarianSecretKey } = req.body;

    // --- Input Validation ---
    if (!name || !email || !password || !librarianSecretKey) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide name, email, password, and librarianSecretKey",
      });
    }

    // --- Verify the Librarian Secret Key ---
    // This key is stored in .env and prevents anyone from creating a librarian account
    if (librarianSecretKey !== process.env.LIBRARIAN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        message: "Invalid librarian secret key. Access denied.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // --- Check if Email is Already Taken ---
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // --- Create the Librarian Account ---
    const newLibrarian = await createUser({
      name,
      email,
      password,
      role: "librarian",
    });

    // --- Generate JWT Token ---
    const token = generateToken(newLibrarian);

    return res.status(201).json({
      success: true,
      message: "Librarian registered successfully",
      data: {
        token,
        user: newLibrarian,
      },
    });
  } catch (error) {
    console.error("Register librarian error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during librarian registration. Please try again.",
    });
  }
});

// ============================================================
// ROUTE 3: Login
// POST /api/auth/login
// ============================================================
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *                     role:
 *                       type: string
 *                       example: student
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Input Validation ---
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password",
      });
    }

    // --- Find the User by Email ---
    // findUserByEmail() returns the user WITH the hashed password (needed for comparison)
    const user = await findUserByEmail(email);

    if (!user) {
      // Don't reveal whether email or password was wrong — use a generic message
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // --- Verify the Password ---
    // comparePassword() uses bcrypt.compare() to check the plain text vs hashed password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // --- Generate JWT Token ---
    const token = generateToken(user);

    // --- Send Response (without password) ---
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        role: user.role,
        user: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during login. Please try again.",
    });
  }
});

// ============================================================
// ROUTE 4: Get Profile
// GET /api/auth/profile
// Requires: JWT token in Authorization header
// ============================================================
/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get the logged-in user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the user's profile (without password)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized - token missing or invalid
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/profile", authenticate, async (req, res) => {
  try {
    // req.user is set by the authenticate middleware
    // It contains: { userId, role, iat, exp }
    const userId = req.user.userId;

    // Fetch fresh user data from Firestore
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return the user profile (findUserById already excludes the password)
    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving profile.",
    });
  }
});

module.exports = router;
