// model/userModel.js
// ============================================================
// User Model
// Handles all Firestore operations for the "users" collection.
// This includes creating users, finding users by email, etc.
//
// Firestore Collection: users
// Fields: uid, name, email, password (hashed), role, createdAt
// ============================================================

const bcrypt = require("bcryptjs");
const { getDB } = require("../config/db");

// Name of the Firestore collection for users
const COLLECTION = "users";

/**
 * createUser - Creates a new user document in Firestore
 *
 * @param {Object} userData - { name, email, password, role }
 * @returns {Object} - The created user object (without password)
 */
const createUser = async (userData) => {
  const db = getDB();

  const { name, email, password, role } = userData;

  // Hash the password before storing — NEVER store plain text passwords
  // bcrypt.hash() takes the password and a "salt rounds" number (10 is standard)
  // Higher salt rounds = more secure but slower
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Prepare the user document to store in Firestore
  const newUser = {
    name,
    email: email.toLowerCase().trim(), // Normalize email to lowercase
    password: hashedPassword,          // Store only the hashed version
    role: role || "student",           // Default role is "student"
    createdAt: new Date().toISOString(),
  };

  // Add the document to Firestore — Firestore auto-generates the document ID
  const docRef = await db.collection(COLLECTION).add(newUser);

  // Return user data with the Firestore document ID (uid)
  // We exclude the password from the returned object for security
  return {
    uid: docRef.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    createdAt: newUser.createdAt,
  };
};

/**
 * findUserByEmail - Finds a user by their email address
 *
 * @param {string} email - The user's email
 * @returns {Object|null} - User document with uid, or null if not found
 */
const findUserByEmail = async (email) => {
  const db = getDB();

  // Query Firestore for a document where email matches
  const snapshot = await db
    .collection(COLLECTION)
    .where("email", "==", email.toLowerCase().trim())
    .limit(1) // We only need one result
    .get();

  // If no matching document found, return null
  if (snapshot.empty) {
    return null;
  }

  // Get the first (and only) matching document
  const doc = snapshot.docs[0];

  // Return the document data along with the Firestore document ID
  return {
    uid: doc.id,
    ...doc.data(), // Spreads all fields: name, email, password, role, createdAt
  };
};

/**
 * findUserById - Finds a user by their Firestore document ID
 *
 * @param {string} uid - The Firestore document ID
 * @returns {Object|null} - User document without password, or null if not found
 */
const findUserById = async (uid) => {
  const db = getDB();

  // Get the specific document by its ID
  const doc = await db.collection(COLLECTION).doc(uid).get();

  // Return null if the document doesn't exist
  if (!doc.exists) {
    return null;
  }

  const userData = doc.data();

  // Return user data WITHOUT the password field (security best practice)
  return {
    uid: doc.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    createdAt: userData.createdAt,
  };
};

/**
 * comparePassword - Compares a plain text password with a hashed password
 *
 * @param {string} plainPassword - The password the user typed
 * @param {string} hashedPassword - The hashed password stored in Firestore
 * @returns {boolean} - true if passwords match, false otherwise
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  // bcrypt.compare() hashes the plain password and compares it to the stored hash
  return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  comparePassword,
};
