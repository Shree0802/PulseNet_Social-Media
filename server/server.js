const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Body Parser & CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve client static files
app.use(express.static(path.join(__dirname, '../client')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

// HTML Page Routes for clean URLs
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/register.html'));
});

app.get('/feed', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/feed.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/profile.html'));
});

app.get('/edit-profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/edit-profile.html'));
});

app.get('/post', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/post.html'));
});

app.get('/messages', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/messages.html'));
});

// Fallback for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 404 Route for unmatched pages
app.use((req, res, next) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, '../client/404.html'));
  } else {
    res.status(404).json({ message: 'Resource not found' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Server running in production mode on port ${PORT}`);
    console.log(`🌐 Web App available at: http://localhost:${PORT}`);
    console.log(`=================================================`);
  });
}

module.exports = app;
