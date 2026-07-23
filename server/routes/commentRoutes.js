const express = require('express');
const { deleteComment } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// DELETE /api/comments/:id - Delete comment
router.delete('/:id', protect, deleteComment);

module.exports = router;
