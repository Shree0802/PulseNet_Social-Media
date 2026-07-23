const express = require('express');
const {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
} = require('../controllers/postController');
const { addComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/posts - Get posts feed
router.get('/', getPosts);

// POST /api/posts - Create new post
router.post('/', protect, upload.single('image'), createPost);

// GET /api/posts/:id - Get single post detail
router.get('/:id', getPostById);

// PUT /api/posts/:id - Update post caption
router.put('/:id', protect, updatePost);

// DELETE /api/posts/:id - Delete post
router.delete('/:id', protect, deletePost);

// POST /api/posts/:id/like - Toggle like
router.post('/:id/like', protect, toggleLikePost);

// POST /api/posts/:id/comment - Add comment to post
router.post('/:id/comment', protect, addComment);

module.exports = router;
