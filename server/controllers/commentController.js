const Comment = require('../models/Comment');
const Post = require('../models/Post');
const LocalDB = require('../config/localDb');
const { getIsConnected } = require('../config/db');

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comment
// @access  Private
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    if (getIsConnected()) {
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const comment = await Comment.create({
        userId: req.user._id,
        postId: post._id,
        text: text.trim(),
      });

      post.comments.push(comment._id);
      await post.save();

      const populatedComment = await Comment.findById(comment._id).populate(
        'userId',
        'username profilePicture'
      );

      return res.status(201).json(populatedComment);
    } else {
      const comment = await LocalDB.createComment({
        userId: req.user._id,
        postId,
        text: text.trim(),
      });
      return res.status(201).json(comment);
    }
  } catch (error) {
    console.error('[AddComment Error]', error);
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private (Comment author or Post owner)
const deleteComment = async (req, res) => {
  try {
    if (getIsConnected()) {
      const comment = await Comment.findById(req.params.id);
      if (!comment) return res.status(404).json({ message: 'Comment not found' });

      const post = await Post.findById(comment.postId);
      const isCommentAuthor = comment.userId.toString() === req.user._id.toString();
      const isPostOwner = post && post.userId.toString() === req.user._id.toString();

      if (!isCommentAuthor && !isPostOwner) {
        return res.status(403).json({ message: 'Unauthorized to delete this comment' });
      }

      if (post) {
        post.comments = post.comments.filter(cId => cId.toString() !== comment._id.toString());
        await post.save();
      }

      await Comment.findByIdAndDelete(comment._id);
      return res.json({ message: 'Comment deleted successfully' });
    } else {
      await LocalDB.deleteComment(req.params.id);
      return res.json({ message: 'Comment deleted successfully' });
    }
  } catch (error) {
    console.error('[DeleteComment Error]', error);
    res.status(500).json({ message: 'Failed to delete comment', error: error.message });
  }
};

module.exports = {
  addComment,
  deleteComment,
};
