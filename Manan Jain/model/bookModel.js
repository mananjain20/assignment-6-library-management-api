// model/bookModel.js
// ============================================================
// Book Model
// Handles all Firestore operations for the "books" collection.
//
// Firestore Collection: books
// Fields: id, title, author, isbn, category, totalCopies,
//         availableCopies, createdAt
//
// Important Rules:
// - availableCopies must never go below 0
// - availableCopies must never exceed totalCopies
// ============================================================

const { getDB } = require("../config/db");

// Name of the Firestore collection for books
const COLLECTION = "books";

/**
 * createBook - Adds a new book to the Firestore books collection
 *
 * @param {Object} bookData - { title, author, isbn, category, totalCopies }
 * @returns {Object} - The created book object with its Firestore ID
 */
const createBook = async (bookData) => {
  const db = getDB();

  const { title, author, isbn, category, totalCopies } = bookData;

  // When a book is first added, all copies are available
  const newBook = {
    title: title.trim(),
    author: author.trim(),
    isbn: isbn.trim(),
    category: category.trim(),
    totalCopies: Number(totalCopies),
    availableCopies: Number(totalCopies), // Initially all copies are available
    createdAt: new Date().toISOString(),
  };

  // Add to Firestore and get the auto-generated document reference
  const docRef = await db.collection(COLLECTION).add(newBook);

  // Return the book with its Firestore document ID
  return {
    id: docRef.id,
    ...newBook,
  };
};

/**
 * getAllBooks - Retrieves all books with optional search and category filter
 *
 * @param {Object} filters - { search: string, category: string }
 * @returns {Array} - Array of book objects
 */
const getAllBooks = async (filters = {}) => {
  const db = getDB();

  let query = db.collection(COLLECTION);

  // Apply category filter if provided
  // Example: ?category=Fiction
  if (filters.category) {
    query = query.where("category", "==", filters.category.trim());
  }

  const snapshot = await query.get();

  // Convert Firestore documents to plain JavaScript objects
  let books = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Apply search filter in memory (Firestore doesn't support full-text search natively)
  // This filters by title OR author containing the search term (case-insensitive)
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase().trim();
    books = books.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );
  }

  return books;
};

/**
 * getBookById - Retrieves a single book by its Firestore document ID
 *
 * @param {string} bookId - The Firestore document ID
 * @returns {Object|null} - The book object or null if not found
 */
const getBookById = async (bookId) => {
  const db = getDB();

  const doc = await db.collection(COLLECTION).doc(bookId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
};

/**
 * updateBook - Updates book fields in Firestore
 *
 * @param {string} bookId - The Firestore document ID to update
 * @param {Object} updateData - Fields to update (partial update is fine)
 * @returns {Object} - The updated book object
 */
const updateBook = async (bookId, updateData) => {
  const db = getDB();

  // Get the current book data first
  const currentBook = await getBookById(bookId);

  if (!currentBook) {
    return null;
  }

  // Build the update object — only include fields that were provided
  const updates = {};

  if (updateData.title !== undefined) updates.title = updateData.title.trim();
  if (updateData.author !== undefined)
    updates.author = updateData.author.trim();
  if (updateData.isbn !== undefined) updates.isbn = updateData.isbn.trim();
  if (updateData.category !== undefined)
    updates.category = updateData.category.trim();

  // Handle totalCopies and availableCopies updates with validation
  if (updateData.totalCopies !== undefined) {
    const newTotal = Number(updateData.totalCopies);
    if (newTotal < 0) {
      throw new Error("totalCopies cannot be negative");
    }
    updates.totalCopies = newTotal;
  }

  if (updateData.availableCopies !== undefined) {
    const newAvailable = Number(updateData.availableCopies);
    const effectiveTotalCopies =
      updates.totalCopies !== undefined
        ? updates.totalCopies
        : currentBook.totalCopies;

    // availableCopies cannot be negative or exceed totalCopies
    if (newAvailable < 0) {
      throw new Error("availableCopies cannot be negative");
    }
    if (newAvailable > effectiveTotalCopies) {
      throw new Error("availableCopies cannot exceed totalCopies");
    }
    updates.availableCopies = newAvailable;
  }

  // Perform the update in Firestore
  await db.collection(COLLECTION).doc(bookId).update(updates);

  // Return the updated book
  return await getBookById(bookId);
};

/**
 * deleteBook - Deletes a book document from Firestore
 *
 * @param {string} bookId - The Firestore document ID to delete
 * @returns {boolean} - true if deleted, false if not found
 */
const deleteBook = async (bookId) => {
  const db = getDB();

  // Check if the book exists before trying to delete
  const book = await getBookById(bookId);
  if (!book) {
    return false;
  }

  await db.collection(COLLECTION).doc(bookId).delete();
  return true;
};

/**
 * decrementAvailableCopies - Reduces availableCopies by 1 when a book is borrowed
 * Uses a Firestore transaction to prevent race conditions when multiple
 * students borrow the same book at the same time.
 *
 * @param {string} bookId - The Firestore document ID
 * @returns {Object} - The updated book data
 */
const decrementAvailableCopies = async (bookId) => {
  const db = getDB();
  const bookRef = db.collection(COLLECTION).doc(bookId);

  // Firestore transactions ensure atomicity — either all operations succeed or none do
  const updatedBook = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(bookRef);

    if (!doc.exists) {
      throw new Error("Book not found");
    }

    const bookData = doc.data();

    // Double-check availability inside the transaction to prevent overselling
    if (bookData.availableCopies <= 0) {
      throw new Error("No copies available for borrowing");
    }

    // Decrement availableCopies by 1
    const newAvailable = bookData.availableCopies - 1;
    transaction.update(bookRef, { availableCopies: newAvailable });

    return { id: doc.id, ...bookData, availableCopies: newAvailable };
  });

  return updatedBook;
};

/**
 * incrementAvailableCopies - Increases availableCopies by 1 when a book is returned
 * Uses a Firestore transaction to ensure data consistency.
 *
 * @param {string} bookId - The Firestore document ID
 * @returns {Object} - The updated book data
 */
const incrementAvailableCopies = async (bookId) => {
  const db = getDB();
  const bookRef = db.collection(COLLECTION).doc(bookId);

  const updatedBook = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(bookRef);

    if (!doc.exists) {
      throw new Error("Book not found");
    }

    const bookData = doc.data();

    // Make sure we don't exceed totalCopies (safety check)
    if (bookData.availableCopies >= bookData.totalCopies) {
      throw new Error("Available copies already at maximum");
    }

    // Increment availableCopies by 1
    const newAvailable = bookData.availableCopies + 1;
    transaction.update(bookRef, { availableCopies: newAvailable });

    return { id: doc.id, ...bookData, availableCopies: newAvailable };
  });

  return updatedBook;
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  decrementAvailableCopies,
  incrementAvailableCopies,
};
