const admin = require("firebase-admin");

let db; 

const initializeFirebase = () => {
  try {

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });

      console.log("✅ Firebase Admin SDK initialized successfully");
    }

   
    db = admin.firestore();

    
    db.settings({ ignoreUndefinedProperties: true });

    console.log("✅ Firestore connected successfully");

    return db;
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error.message);
    console.error(
      "💡 Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env"
    );
    process.exit(1); 
  }
};


const getDB = () => {
  if (!db) {
    throw new Error(
      "Firestore is not initialized. Call initializeFirebase() first."
    );
  }
  return db;
};

module.exports = { initializeFirebase, getDB };
