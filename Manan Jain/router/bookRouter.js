// router/bookRouter.js
// ============================================================
// Book Routes
// Handles all book-related operations.
//
// Public Routes (no login required):
//   GET /api/books           → Get all books (with search & category filter)
//   GET /api/books/:id       → Get a single book
//
// Librarian-Only Routes (JWT + librarian role required):
//   POST   /api/books        → Add a new book
//   PUT    /api/books/:id    → Update a book
//   DELETE /api/books/:id    → Delete a book
// ============================================================

const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");
const {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
} = require("../model/bookModel");

const router = express.Router();

// ============================================================
// ROUTE 1: Get All Books
// GET /api/books
// Public — no authentication required
// Supports: ?search=keyword  and  ?category=Fiction
// ============================================================
/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get all books (with optional search and category filter)
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or author (case-insensitive)
 *         example: gatsby
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by exact category
 *         example: Fiction
 *     responses:
 *       200:
 *         description: List of books returned successfully
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
 *                   example: Books retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 5
 *                     books:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Server error
 */
router.get("/", async (req, res) => {
  try {
    // Extract query parameters from the URL
    // Example: /api/books?search=gatsby&category=Fiction
    const { search, category } = req.query;

    // Pass filters to the model
    const books = await getAllBooks({ search, category });

    return res.status(200).json({
      success: true,
      message: "Books retrieved successfully",
      data: {
        count: books.length,
        books,
      },
    });
  } catch (error) {
    console.error("Get all books error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving books.",
    });
  }
});

// ============================================================
// ROUTE 2: Get Single Book
// GET /api/books/:id
// Public — no authentication required
// ============================================================
/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get a single book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Firestore document ID of the book
 *         example: abc123xyz
 *     responses:
 *       200:
 *         description: Book details retrieved successfully
 *       404:
 *         description: Book not found
 *       500:
 *         description: Server error
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const book = await getBookById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book retrieved successfully",
      data: {
        book,
      },
    });
  } catch (error) {
    console.error("Get book by ID error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving the book.",
    });
  }
});

// ============================================================
// ROUTE 3: Add a Book
// POST /api/books
// Librarian only — requires JWT + librarian role
// ============================================================
/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Add a new book (Librarian only)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookCreate'
 *     responses:
 *       201:
 *         description: Book added successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized - token required
 *       403:
 *         description: Forbidden - librarian role required
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticate,           // Step 1: Verify JWT token
  checkRole("librarian"), // Step 2: Check user is a librarian
  async (req, res) => {
    try {
      const { title, author, isbn, category, totalCopies } = req.body;

      // --- Input Validation ---
      if (!title || !author || !isbn || !category || !totalCopies) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide all required fields: title, author, isbn, category, totalCopies",
        });
      }

      // Validate totalCopies is a positive number
      if (isNaN(totalCopies) || Number(totalCopies) <= 0) {
        return res.status(400).json({
          success: false,
          message: "totalCopies must be a positive number",
        });
      }

      // --- Create the Book ---
      const newBook = await createBook({
        title,
        author,
        isbn,
        category,
        totalCopies,
      });

      return res.status(201).json({
        success: true,
        message: "Book added successfully",
        data: {
          book: newBook,
        },
      });
    } catch (error) {
      console.error("Add book error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error while adding the book.",
      });
    }
  }
);

// ============================================================
// ROUTE 4: Update a Book
// PUT /api/books/:id
// Librarian only
// ============================================================
/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Update a book (Librarian only)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Firestore document ID of the book to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookUpdate'
 *     responses:
 *       200:
 *         description: Book updated successfully
 *       400:
 *         description: Invalid inventory values
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - librarian only
 *       404:
 *         description: Book not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticate,
  checkRole("librarian"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if the book exists first
      const existingBook = await getBookById(id);
      if (!existingBook) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      // updateBook() handles validation internally and returns null if not found
      const updatedBook = await updateBook(id, req.body);

      return res.status(200).json({
        success: true,
        message: "Book updated successfully",
        data: {
          book: updatedBook,
        },
      });
    } catch (error) {
      // updateBook() throws errors for invalid inventory values
      if (
        error.message.includes("cannot be negative") ||
        error.message.includes("cannot exceed")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Update book error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error while updating the book.",
      });
    }
  }
);

// ============================================================
// ROUTE 5: Delete a Book
// DELETE /api/books/:id
// Librarian only
// ============================================================
/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Delete a book (Librarian only)
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Firestore document ID of the book to delete
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - librarian only
 *       404:
 *         description: Book not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticate,
  checkRole("librarian"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const deleted = await deleteBook(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Book deleted successfully",
        data: null,
      });
    } catch (error) {
      console.error("Delete book error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error while deleting the book.",
      });
    }
  }
);

module.exports = router;
