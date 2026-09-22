// router/borrowRouter.js
// ============================================================
// Borrow Routes
// Handles book borrowing, returning, and history viewing.
//
// Student Routes (JWT + student role):
//   POST /api/books/:id/borrow     → Borrow a book
//   POST /api/books/:id/return     → Return a book
//   GET  /api/books/my-history     → View own borrowing history
//
// Librarian Routes (JWT + librarian role):
//   GET  /api/librarian/borrow-records → View all borrow records
//
// NOTE: The borrow/return routes are defined here but mounted
//       under /api in server.js to produce the correct URL paths.
// ============================================================

const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");
const {
  createBorrowRecord,
  getActiveBorrowRecord,
  returnBook,
  getUserBorrowHistory,
  getAllBorrowRecords,
  checkAlreadyBorrowed,
} = require("../model/borrowModel");
const {
  getBookById,
  decrementAvailableCopies,
  incrementAvailableCopies,
} = require("../model/bookModel");

const router = express.Router();

// ============================================================
// ROUTE 1: Get My Borrowing History
// GET /api/books/my-history
// Student only
//
// IMPORTANT: This route MUST be defined BEFORE /:id routes
// because Express matches routes in order, and "my-history"
// would otherwise be treated as a book ID parameter.
// ============================================================
/**
 * @swagger
 * /api/books/my-history:
 *   get:
 *     summary: Get the logged-in student's borrowing history
 *     tags: [Borrowing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Borrowing history retrieved successfully
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
 *                   example: Borrowing history retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     records:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - student only
 *       500:
 *         description: Server error
 */
router.get(
  "/books/my-history",
  authenticate,
  checkRole("student"),
  async (req, res) => {
    try {
      // Get the logged-in student's ID from the JWT token
      const userId = req.user.userId;

      // Fetch all borrow records for this student
      const records = await getUserBorrowHistory(userId);

      return res.status(200).json({
        success: true,
        message: "Borrowing history retrieved successfully",
        data: {
          count: records.length,
          records,
        },
      });
    } catch (error) {
      console.error("Get borrow history error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error while retrieving borrowing history.",
      });
    }
  }
);

// ============================================================
// ROUTE 2: Borrow a Book
// POST /api/books/:id/borrow
// Student only
// ============================================================
/**
 * @swagger
 * /api/books/{id}/borrow:
 *   post:
 *     summary: Borrow a book (Student only)
 *     tags: [Borrowing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Firestore document ID of the book to borrow
 *         example: abc123xyz
 *     responses:
 *       201:
 *         description: Book borrowed successfully
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
 *                   example: Book borrowed successfully. Due date is 14 days from today.
 *                 data:
 *                   type: object
 *                   properties:
 *                     borrowRecord:
 *                       type: object
 *       400:
 *         description: No copies available or already borrowed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - student only
 *       404:
 *         description: Book not found
 *       500:
 *         description: Server error
 */
router.post(
  "/books/:id/borrow",
  authenticate,
  checkRole("student"),
  async (req, res) => {
    try {
      const bookId = req.params.id;
      const userId = req.user.userId; // From JWT token

      // --- Step 1: Check if the book exists ---
      const book = await getBookById(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      // --- Step 2: Check if there are copies available ---
      if (book.availableCopies <= 0) {
        return res.status(400).json({
          success: false,
          message: `Sorry, no copies of "${book.title}" are currently available. Please check back later.`,
        });
      }

      // --- Step 3: Check if the student already has this book borrowed ---
      const alreadyBorrowed = await checkAlreadyBorrowed(userId, bookId);
      if (alreadyBorrowed) {
        return res.status(400).json({
          success: false,
          message: "You have already borrowed this book. Please return it first.",
        });
      }

      // --- Step 4: Decrement availableCopies (uses Firestore transaction) ---
      // This atomic operation prevents race conditions where two students
      // borrow the last copy at the same time
      await decrementAvailableCopies(bookId);

      // --- Step 5: Create the borrow record ---
      const borrowRecord = await createBorrowRecord({
        userId,
        bookId,
        bookTitle: book.title,
      });

      return res.status(201).json({
        success: true,
        message: `Book borrowed successfully. Due date is ${new Date(borrowRecord.dueDate).toDateString()}.`,
        data: {
          borrowRecord,
        },
      });
    } catch (error) {
      // Handle specific error from the Firestore transaction
      if (error.message === "No copies available for borrowing") {
        return res.status(400).json({
          success: false,
          message: "No copies available for borrowing",
        });
      }

      console.error("Borrow book error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error while borrowing the book.",
      });
    }
  }
);

// ============================================================
// ROUTE 3: Return a Book
// POST /api/books/:id/return
// Student only
// ============================================================
/**
 * @swagger
 * /api/books/{id}/return:
 *   post:
 *     summary: Return a borrowed book (Student only)
 *     tags: [Borrowing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The Firestore document ID of the book to return
 *         example: abc123xyz
 *     responses:
 *       200:
 *         description: Book returned successfully
 *       400:
 *         description: Book was not borrowed by this user
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - student only
 *       404:
 *         description: Book not found
 *       500:
 *         description: Server error
 */
router.post(
  "/books/:id/return",
  authenticate,
  checkRole("student"),
  async (req, res) => {
    try {
      const bookId = req.params.id;
      const userId = req.user.userId;

      // --- Step 1: Check if the book exists ---
      const book = await getBookById(bookId);
      if (!book) {
        return res.status(404).json({
          success: false,
          message: "Book not found",
        });
      }

      // --- Step 2: Find the active borrow record for this student and book ---
      // This verifies that the student actually borrowed this book
      const activeBorrowRecord = await getActiveBorrowRecord(userId, bookId);

      if (!activeBorrowRecord) {
        return res.status(400).json({
          success: false,
          message: "You have not borrowed this book, or it has already been returned.",
        });
      }

      // --- Step 3: Increment availableCopies (uses Firestore transaction) ---
      await incrementAvailableCopies(bookId);

      // --- Step 4: Update the borrow record (set returnDate, change status to "returned") ---
      const updatedRecord = await returnBook(activeBorrowRecord.id);

      return res.status(200).json({
        success: true,
        message: "Book returned successfully. Thank you!",
        data: {
          borrowRecord: updatedRecord,
        },
      });
    } catch (error) {
      console.error("Return book error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error while returning the book.",
      });
    }
  }
);

// ============================================================
// ROUTE 4: Librarian — View All Borrow Records
// GET /api/librarian/borrow-records
// Librarian only
// ============================================================
/**
 * @swagger
 * /api/librarian/borrow-records:
 *   get:
 *     summary: Get all borrow records (Librarian only)
 *     tags: [Librarian]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All borrow records retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     records:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - librarian only
 *       500:
 *         description: Server error
 */
router.get(
  "/librarian/borrow-records",
  authenticate,
  checkRole("librarian"),
  async (req, res) => {
    try {
      // Fetch ALL borrow records from Firestore (all students)
      const records = await getAllBorrowRecords();

      return res.status(200).json({
        success: true,
        message: "All borrow records retrieved successfully",
        data: {
          count: records.length,
          records,
        },
      });
    } catch (error) {
      console.error("Get all borrow records error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Server error while retrieving borrow records.",
      });
    }
  }
);

module.exports = router;
