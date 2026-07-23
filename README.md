# ⚡ PulseNet - Production-Quality Mini Social Media Platform

PulseNet is a full-stack, production-grade social media platform built with Node.js, Express, MongoDB (Mongoose), JWT Authentication, Multer file uploads, and a modern Vanilla HTML5/CSS3/JavaScript frontend featuring glassmorphism, dark/light theme switching, and real-time interactive social features.

---

## 🌟 Key Features

### 🔐 Authentication & Security
- **JWT Authentication**: Token-based authentication stored in `localStorage` with Bearer headers.
- **Encrypted Passwords**: Password hashing using `bcryptjs` (salt rounds = 10).
- **Protected Routes**: Middleware guards on both backend API and client pages.
- **Input Validation**: `express-validator` checks for valid email, password length, and duplicate username/email prevention.

### 👤 User Profiles & Social System
- **Profile Customization**: Edit bio, username, and profile avatar image upload via Multer.
- **Follow / Unfollow System**: Dynamic follow toggle with self-follow prevention.
- **Followers & Following Modals**: View list of followers and following users interactively.
- **Profile Stats**: Live counter for Posts, Followers, and Following.

### 📷 Feed & Posts Engine
- **Post Creation**: Create posts with captions and image attachments.
- **Live Image Preview**: File reader preview with one-click image removal before publishing.
- **Feed Stream**: Newest-first post stream with skeleton loader states.
- **Post Ownership**: Only post owners can edit or delete their posts and uploaded media.

### ❤️ Likes & Comments
- **Animated Like Toggle**: Pulse animation with real-time counters and duplicate like prevention.
- **Comments Thread**: Inline comments on feed + full dedicated comment view page (`post.html`).
- **Comment Deletion**: Authors and post owners can remove comments.

### 🔍 Search & UI Excellence
- **User & Post Search**: Instant query search for posts by caption and users by username/email.
- **Dark / Light Theme Toggle**: Persistent theme choice saved in `localStorage`.
- **Toast Notifications**: Floating glassmorphic alert popups for errors and success feedback.
- **Responsive Layout**: Customized breakpoints for Mobile, Tablet, and Desktop displays.

---

## 📁 Folder Structure

```
social-media-app/
├── client/
│   ├── index.html            # Landing / Auth redirect
│   ├── login.html            # User Login page
│   ├── register.html         # User Registration page
│   ├── feed.html             # Main Feed & Search page
│   ├── profile.html          # User Profile page
│   ├── edit-profile.html     # Edit Profile & Avatar upload
│   ├── post.html             # Single Post View & Comments
│   ├── 404.html              # Custom 404 Error page
│   ├── css/
│   │   ├── style.css         # Glassmorphism & Modern CSS System
│   │   └── responsive.css    # Responsive breakpoints
│   └── js/
│       ├── api.js            # Centralized fetch API wrapper
│       ├── auth.js           # Session manager & route guards
│       ├── theme.js          # Theme manager & Toast notification helper
│       ├── feed.js           # Feed rendering, post creation & like/follow
│       ├── profile.js        # User profile & posts grid logic
│       └── post.js           # Single post view & comment thread logic
├── server/
│   ├── config/
│   │   └── db.js             # Mongoose MongoDB connection
│   ├── controllers/
│   │   ├── authController.js # Auth handlers (Register, Login, Me)
│   │   ├── userController.js # User profile, edit, search, follow
│   │   ├── postController.js # Post CRUD & Like toggle
│   │   └── commentController.js # Add & delete comments
│   ├── middleware/
│   │   ├── auth.js           # JWT verification middleware
│   │   ├── upload.js         # Multer storage & image type filter
│   │   └── validate.js       # Express-validator error handler
│   ├── models/
│   │   ├── User.js           # Mongoose User schema
│   │   ├── Post.js           # Mongoose Post schema
│   │   └── Comment.js        # Mongoose Comment schema
│   ├── routes/
│   │   ├── authRoutes.js     # /api/auth endpoints
│   │   ├── userRoutes.js     # /api/users endpoints
│   │   ├── postRoutes.js     # /api/posts endpoints
│   │   └── commentRoutes.js  # /api/comments endpoints
│   ├── uploads/              # Static media uploads directory
│   └── server.js             # Express application entrypoint
├── .env                      # Active environment configuration
├── .env.example              # Sample environment template
├── package.json              # App dependencies & scripts
└── README.md                 # Documentation
```

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Glassmorphism, Animations), Vanilla JavaScript ES6 (Fetch API, DOM manipulation).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB & Mongoose ORM.
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`.
- **Uploads**: `multer` image upload engine.
- **Validation**: `express-validator`.

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory (or use the included `.env`):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/social_media_app
JWT_SECRET=super_secret_jwt_token_key_change_in_production_12345
```

---

## 🚀 Quickstart & How to Run

### 1. Prerequisites
Ensure you have **Node.js** (v16+) and **MongoDB** running locally on default port `27017` or provide a valid `MONGO_URI` (such as MongoDB Atlas).

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Server
```bash
npm start
```
*For development mode with automatic reload:*
```bash
npm run dev
```

### 4. Open in Browser
Visit `http://localhost:5000` in your web browser.

---

## 📡 API Endpoints Documentation

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login user & return JWT token | ❌ |
| `GET` | `/api/auth/me` | Fetch authenticated user data | ✅ |

### User Routes (`/api/users`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/users/profile` | Fetch logged in user's profile | ✅ |
| `GET` | `/api/users/:id` | Fetch user profile by ID or username | ❌ |
| `PUT` | `/api/users/update` | Update user username, bio, avatar | ✅ |
| `GET` | `/api/users` | Search users by query string | ❌ |
| `POST` | `/api/users/:id/follow` | Toggle follow/unfollow user | ✅ |

### Post Routes (`/api/posts`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/posts` | Fetch feed posts (supports `search` & `user`) | ❌ |
| `POST` | `/api/posts` | Create new post (caption & image upload) | ✅ |
| `GET` | `/api/posts/:id` | Fetch single post details & comments | ❌ |
| `PUT` | `/api/posts/:id` | Update post caption | ✅ (Owner) |
| `DELETE` | `/api/posts/:id` | Delete post & associated media | ✅ (Owner) |
| `POST` | `/api/posts/:id/like` | Toggle like/unlike post | ✅ |
| `POST` | `/api/posts/:id/comment` | Add comment to post | ✅ |

### Comment Routes (`/api/comments`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `DELETE` | `/api/comments/:id` | Delete comment | ✅ (Author/Owner) |
