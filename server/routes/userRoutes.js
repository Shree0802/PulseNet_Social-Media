const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  searchUsers,
  followUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/users/profile - Get current logged in user profile
router.get('/profile', protect, getUserProfile);

// GET /api/users - Search users or get list
router.get('/', searchUsers);

// GET /api/users/:id - Get specific user profile by ID or username
router.get('/:id', getUserProfile);

// PUT /api/users/update - Edit profile info & picture
router.put('/update', protect, upload.single('profilePicture'), updateUserProfile);

// POST /api/users/:id/follow - Follow or unfollow user
router.post('/:id/follow', protect, followUser);

module.exports = router;
