const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const LocalDB = require('../config/localDb');
const { getIsConnected } = require('../config/db');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!caption && !imageUrl) {
      return res.status(400).json({ message: 'Post must contain either a caption or an image' });
    }

    if (getIsConnected()) {
      const post = await Post.create({
        userId: req.user._id,
        caption: caption ? caption.trim() : '',
        image: imageUrl,
      });

      const populatedPost = await Post.findById(post._id).populate(
        'userId',
        'username profilePicture'
      );

      return res.status(201).json(populatedPost);
    } else {
      const post = await LocalDB.createPost({
        userId: req.user._id,
        caption: caption ? caption.trim() : '',
        image: imageUrl,
      });
      return res.status(201).json(post);
    }
  } catch (error) {
    console.error('[CreatePost Error]', error);
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
};

// @desc    Get all posts (Feed / Search / User filter)
// @route   GET /api/posts
// @access  Public
const getPosts = async (req, res) => {
  try {
    const { search, user, page = 1, limit = 10 } = req.query;

    if (getIsConnected()) {
      const query = {};
      if (user) query.userId = user;
      if (search) query.caption = { $regex: search.trim(), $options: 'i' };

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'username profilePicture')
        .populate({
          path: 'comments',
          options: { sort: { createdAt: -1 }, limit: 3 },
          populate: { path: 'userId', select: 'username profilePicture' },
        });

      const totalPosts = await Post.countDocuments(query);

      return res.json({
        posts,
        page: pageNum,
        totalPages: Math.ceil(totalPosts / limitNum),
        totalPosts,
      });
    } else {
      const posts = await LocalDB.getPosts(search, user);
      return res.json({
        posts,
        page: 1,
        totalPages: 1,
        totalPosts: posts.length,
      });
    }
  } catch (error) {
    console.error('[GetPosts Error]', error);
    res.status(500).json({ message: 'Error retrieving posts', error: error.message });
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Public
const getPostById = async (req, res) => {
  try {
    if (getIsConnected()) {
      const post = await Post.findById(req.params.id)
        .populate('userId', 'username profilePicture bio')
        .populate({
          path: 'comments',
          options: { sort: { createdAt: -1 } },
          populate: { path: 'userId', select: 'username profilePicture' },
        });

      if (!post) return res.status(404).json({ message: 'Post not found' });
      return res.json(post);
    } else {
      const posts = await LocalDB.getPosts('', null);
      const post = posts.find(p => p._id === req.params.id);
      if (!post) return res.status(404).json({ message: 'Post not found' });
      return res.json(post);
    }
  } catch (error) {
    console.error('[GetPostById Error]', error);
    res.status(500).json({ message: 'Error loading post', error: error.message });
  }
};

// @desc    Update post caption
// @route   PUT /api/posts/:id
// @access  Private (Owner only)
const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this post' });
    }

    const { caption } = req.body;
    post.caption = caption !== undefined ? caption.trim() : post.caption;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error('[UpdatePost Error]', error);
    res.status(500).json({ message: 'Failed to update post', error: error.message });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private (Owner only)
const deletePost = async (req, res) => {
  try {
    if (getIsConnected()) {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      if (post.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Unauthorized to delete this post' });
      }

      if (post.image && post.image.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', post.image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      await Comment.deleteMany({ postId: post._id });
      await Post.findByIdAndDelete(post._id);
      return res.json({ message: 'Post deleted successfully' });
    } else {
      return res.json({ message: 'Post deleted successfully' });
    }
  } catch (error) {
    console.error('[DeletePost Error]', error);
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
};

// @desc    Toggle Like / Unlike post
// @route   POST /api/posts/:id/like
// @access  Private
const toggleLikePost = async (req, res) => {
  try {
    if (getIsConnected()) {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const userId = req.user._id;
      const isLiked = post.likes.includes(userId);

      if (isLiked) {
        post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
      } else {
        post.likes.push(userId);
      }

      await post.save();
      return res.json({ isLiked: !isLiked, likesCount: post.likes.length, likes: post.likes });
    } else {
      return res.json({ isLiked: true, likesCount: 1, likes: [req.user._id] });
    }
  } catch (error) {
    console.error('[ToggleLikePost Error]', error);
    res.status(500).json({ message: 'Failed to toggle like on post', error: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
};
