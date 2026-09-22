# Assignment 06: Library Management API with Firebase, Rate Limiting & Swagger

**Author:** Manan Jain  
**Render Deployment Link:**  https://assignment-6-library-management.onrender.com


## 📚 Summary & Project Overview

A complete **REST API** for managing a library system, built with **Node.js**, **Express.js**, and **Firebase Firestore**. Supports two distinct user roles — **Students** and **Librarians** — with JWT-based authentication, role-based access control (RBAC), express rate limiting, and interactive Swagger API documentation.

---

## 🚀 Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Web framework |
| Firebase Admin SDK | Backend Firebase access |
| Firebase Firestore | NoSQL cloud database |
| JWT (jsonwebtoken) | Authentication tokens |
| bcryptjs | Password hashing |
| dotenv | Environment variable management |
| cors | Cross-origin request support |
| express-rate-limit | API rate limiting |
| swagger-ui-express | Interactive API documentation |
| swagger-jsdoc | Generate Swagger spec from JSDoc |
| nodemon | Auto-restart during development |

---

## 📁 Project Structure

```text
library-management-api/
│
├── config/
│   ├── db.js              # Firebase Admin SDK initialization
│   └── swagger.js         # OpenAPI 3.0 configuration
│
├── middleware/
│   ├── authMiddleware.js  # JWT verification
│   ├── roleMiddleware.js  # Role-based access control (RBAC)
│   └── rateLimiter.js     # 100 req / 15 min rate limiting
│
├── model/
│   ├── userModel.js       # Firestore "users" collection operations
│   ├── bookModel.js       # Firestore "books" collection operations
│   └── borrowModel.js     # Firestore "borrow_records" operations
│
├── router/
│   ├── authRouter.js      # /api/auth/* routes
│   ├── bookRouter.js      # /api/books/* routes
│   └── borrowRouter.js    # Borrow/return/history routes
│
├── .env                   # Environment variables
├── .env.example           # Template showing required variables
├── .gitignore             # Git ignore file
├── package.json
├── server.js              # Application entry point
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone or Download the Project

```bash
cd library-management-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your real values:

```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
LIBRARIAN_SECRET_KEY=your_librarian_registration_secret_here
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email
```

---

## 🔥 Firebase Setup

Follow these steps to connect to Firebase Firestore:

### Step 1: Create a Firebase Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** and follow the setup wizard

### Step 2: Enable Firestore Database
1. In your Firebase project, click **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select your region and click **Enable**

### Step 3: Configure Firebase Credentials
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click the **Service accounts** tab
3. Click **Generate new private key**
4. Copy the `project_id`, `private_key`, and `client_email` values from the downloaded JSON into `.env`

> ⚠️ **IMPORTANT**: Never commit `.env` to GitHub. It contains private credentials.

---

## 🔐 Authentication

This API uses **JWT (JSON Web Tokens)**.

### How It Works:
1. Register or login to receive a **JWT token**
2. Include the token in the `Authorization` header for protected routes:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📋 API Endpoints

### 🔑 Authentication Routes

| Method | URL | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new student |
| `POST` | `/api/auth/register-librarian` | Public (needs secret key) | Register a librarian |
| `POST` | `/api/auth/login` | Public | Login (student or librarian) |
| `GET` | `/api/auth/profile` | 🔒 Authenticated | Get logged-in user's profile |

#### Register Student — `POST /api/auth/register`
```json
{
  "name": "Manan Jain",
  "email": "manan@example.com",
  "password": "password123"
}
```

#### Register Librarian — `POST /api/auth/register-librarian`
```json
{
  "name": "Dr. Sharma",
  "email": "sharma@library.com",
  "password": "securePass456",
  "librarianSecretKey": "your_librarian_secret"
}
```

#### Login — `POST /api/auth/login`
```json
{
  "email": "manan@example.com",
  "password": "password123"
}
```

---

### 📚 Book Routes

| Method | URL | Access | Description |
|---|---|---|---|
| `GET` | `/api/books` | Public | Get all books (search + filter) |
| `GET` | `/api/books/:id` | Public | Get a single book |
| `POST` | `/api/books` | 🔒 Librarian | Add a new book |
| `PUT` | `/api/books/:id` | 🔒 Librarian | Update a book |
| `DELETE` | `/api/books/:id` | 🔒 Librarian | Delete a book |

---

### 📖 Borrow Routes

| Method | URL | Access | Description |
|---|---|---|---|
| `POST` | `/api/books/:id/borrow` | 🔒 Student | Borrow a book |
| `POST` | `/api/books/:id/return` | 🔒 Student | Return a book |
| `GET` | `/api/books/my-history` | 🔒 Student | View own borrowing history |
| `GET` | `/api/librarian/borrow-records` | 🔒 Librarian | View all borrow records |

---

## 🛡️ Role Permissions

| Feature | Student | Librarian |
|---|---|---|
| Register | ✅ | ✅ (with secret key) |
| Login | ✅ | ✅ |
| View profile | ✅ | ✅ |
| View all books | ✅ | ✅ |
| Search books | ✅ | ✅ |
| Filter by category | ✅ | ✅ |
| Add book | ❌ | ✅ |
| Update book | ❌ | ✅ |
| Delete book | ❌ | ✅ |
| Borrow book | ✅ | ❌ |
| Return book | ✅ | ❌ |
| View own history | ✅ | ❌ |
| View all borrow records | ❌ | ✅ |

---

## 🏃 Running the Project

### Development:
```bash
npm run dev
```

### Production:
```bash
npm start
```

 Server runs at:
```text
http://localhost:3000
```

---

## 📖 Swagger Documentation

After starting the server, visit:

```text
http://localhost:3000/api-docs
```

---

## 👨‍💻 Author

**Manan Jain**

