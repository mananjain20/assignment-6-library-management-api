// model/borrowModel.js
// ============================================================
// Borrow Model
// Handles all Firestore operations for the "borrow_records" collection.
//
// Firestore Collection: borrow_records
// Fields: id, userId, bookId, bookTitle, borrowDate, dueDate,
//         returnDate, status
//
// Status Values:
//   "borrowed" — book is currently borrowed
//   "returned" — book has been returned
//
// Due date is automatically set to 14 days after borrowing.
// ============================================================

const { getDB } = require("../config/db");

// Name of the Firestore collection for borrow records
const COLLECTION = "borrow_records";

// Number of days before a borrowed book is due
const DUE_DAYS = 14;

/**
 * createBorrowRecord - Creates a new borrow record when a student borrows a book
 *
 * @param {Object} data - { userId, bookId, bookTitle }
 * @returns {Object} - The created borrow record
 */
const createBorrowRecord = async (data) => {
  const db = getDB();

  const { userId, bookId, bookTitle } = data;

  // Set borrowDate to now
  const borrowDate = new Date();

  // Set dueDate to 14 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + DUE_DAYS);

  const borrowRecord = {
    userId,
    bookId,
    bookTitle,
    borrowDate: borrowDate.toISOString(),
    dueDate: dueDate.toISOString(),
    returnDate: null,    // Will be set when the book is returned
    status: "borrowed",  // Initial status is "borrowed"
  };

  // Save to Firestore
  const docRef = await db.collection(COLLECTION).add(borrowRecord);

  return {
    id: docRef.id,
    ...borrowRecord,
  };
};

/**
 * getActiveBorrowRecord - Finds an active (not yet returned) borrow record
 * for a specific user and book combination.
 * Used to check if a student has already borrowed a book before allowing return.
 *
 * @param {string} userId - The student's user ID
 * @param {string} bookId - The book's Firestore document ID
 * @returns {Object|null} - The active borrow record or null if not found
 */
const getActiveBorrowRecord = async (userId, bookId) => {
  const db = getDB();

  // Query for borrow records matching this user, book, and "borrowed" status
  const snapshot = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("bookId", "==", bookId)
    .where("status", "==", "borrowed")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
};

/**
 * returnBook - Updates a borrow record when a student returns a book
 *
 * @param {string} borrowRecordId - The Firestore document ID of the borrow record
 * @returns {Object} - The updated borrow record
 */
const returnBook = async (borrowRecordId) => {
  const db = getDB();

  const returnDate = new Date().toISOString();

  // Update the borrow record with return date and new status
  await db.collection(COLLECTION).doc(borrowRecordId).update({
    returnDate: returnDate,
    status: "returned",
  });

  // Fetch and return the updated record
  const doc = await db.collection(COLLECTION).doc(borrowRecordId).get();
  return {
    id: doc.id,
    ...doc.data(),
  };
};

/**
 * getUserBorrowHistory - Gets all borrow records for a specific student
 * Used for the "My History" route.
 *
 * @param {string} userId - The student's user ID
 * @returns {Array} - Array of borrow record objects (sorted by newest first)
 */
const getUserBorrowHistory = async (userId) => {
  const db = getDB();

  const snapshot = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("borrowDate", "desc") // Newest records first
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * getAllBorrowRecords - Gets ALL borrow records across all students
 * Used by librarians to view the complete borrowing history.
 *
 * @returns {Array} - Array of all borrow record objects (sorted by newest first)
 */
const getAllBorrowRecords = async () => {
  const db = getDB();

  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("borrowDate", "desc") // Newest records first
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * checkAlreadyBorrowed - Checks if a student already has an active borrow
 * for the same book (prevents borrowing the same book twice)
 *
 * @param {string} userId - The student's user ID
 * @param {string} bookId - The book's Firestore document ID
 * @returns {boolean} - true if already borrowed, false otherwise
 */
const checkAlreadyBorrowed = async (userId, bookId) => {
  const existingRecord = await getActiveBorrowRecord(userId, bookId);
  return existingRecord !== null;
};

module.exports = {
  createBorrowRecord,
  getActiveBorrowRecord,
  returnBook,
  getUserBorrowHistory,
  getAllBorrowRecords,
  checkAlreadyBorrowed,
};
