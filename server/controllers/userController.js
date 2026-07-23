const User = require('../models/User');
const Post = require('../models/Post');
const LocalDB = require('../config/localDb');
const { getIsConnected } = require('../config/db');

// @desc    Get user profile by ID or username
// @route   GET /api/users/profile or /api/users/:id
// @access  Public / Optional Auth
const getUserProfile = async (req, res) => {
  try {
    const identifier = req.params.id || req.user?._id;

    if (!identifier) {
      return res.status(400).json({ message: 'User ID or identifier is required' });
    }

    if (getIsConnected()) {
      let user;
      if (identifier.toString().match(/^[0-9a-fA-F]{24}$/)) {
        user = await User.findById(identifier)
          .select('-password')
          .populate('followers', 'username profilePicture')
          .populate('following', 'username profilePicture');
      } else {
        user = await User.findOne({ username: identifier })
          .select('-password')
          .populate('followers', 'username profilePicture')
          .populate('following', 'username profilePicture');
      }

      if (!user) {
        return res.status(404).json({ message: 'User profile not found' });
      }

      const posts = await Post.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .populate('userId', 'username profilePicture');

      return res.json({
        user,
        postsCount: posts.length,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        posts,
      });
    } else {
      const user = await LocalDB.findUser({ _id: identifier }) || await LocalDB.findUser({ username: identifier });
      if (!user) {
        return res.status(404).json({ message: 'User profile not found' });
      }

      const posts = await LocalDB.getPosts('', user._id);
      return res.json({
        user,
        postsCount: posts.length,
        followersCount: user.followers ? user.followers.length : 0,
        followingCount: user.following ? user.following.length : 0,
        posts,
      });
    }
  } catch (error) {
    console.error('[GetUserProfile Error]', error);
    res.status(500).json({ message: 'Error loading user profile', error: error.message });
  }
};

// @desc    Update current user profile (bio, avatar, username)
// @route   PUT /api/users/update
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    let profilePicture;
    if (req.file) {
      profilePicture = `/uploads/${req.file.filename}`;
    }

    if (getIsConnected()) {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (username && username.trim() !== user.username) {
        const usernameExists = await User.findOne({ username: username.trim() });
        if (usernameExists) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
        user.username = username.trim();
      }

      if (bio !== undefined) user.bio = bio.trim();
      if (profilePicture) user.profilePicture = profilePicture;

      const updatedUser = await user.save();
      return res.json({ message: 'Profile updated successfully', user: updatedUser });
    } else {
      const updatedUser = await LocalDB.updateUser(req.user._id, { username, bio, profilePicture });
      return res.json({ message: 'Profile updated successfully', user: updatedUser });
    }
  } catch (error) {
    console.error('[UpdateUserProfile Error]', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// @desc    Search users by username or email
// @route   GET /api/users
// @access  Public
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (getIsConnected()) {
      if (!query) {
        const users = await User.find().select('username email profilePicture bio').limit(20);
        return res.json(users);
      }
      const regex = new RegExp(query.trim(), 'i');
      const users = await User.find({
        $or: [{ username: regex }, { email: regex }],
      }).select('username email profilePicture bio followers').limit(20);
      return res.json(users);
    } else {
      const users = await LocalDB.searchUsers(query);
      return res.json(users);
    }
  } catch (error) {
    console.error('[SearchUsers Error]', error);
    res.status(500).json({ message: 'Error searching users', error: error.message });
  }
};

// @desc    Follow or Unfollow a user
// @route   POST /api/users/:id/follow
// @access  Private
const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    if (getIsConnected()) {
      const targetUser = await User.findById(targetUserId);
      const currentUser = await User.findById(currentUserId);

      if (!targetUser || !currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isFollowing = currentUser.following.includes(targetUserId);

      if (isFollowing) {
        currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId.toString());
        targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId.toString());
      } else {
        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);
      }

      await currentUser.save();
      await targetUser.save();

      return res.json({
        isFollowing: !isFollowing,
        followersCount: targetUser.followers.length,
        followingCount: currentUser.following.length,
        message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      });
    } else {
      const result = await LocalDB.followUser(currentUserId, targetUserId);
      if (!result) return res.status(404).json({ message: 'User not found' });
      return res.json(result);
    }
  } catch (error) {
    console.error('[FollowUser Error]', error);
    res.status(500).json({ message: 'Error processing follow/unfollow action', error: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  searchUsers,
  followUser,
};
