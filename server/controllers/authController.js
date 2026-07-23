const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LocalDB = require('../config/localDb');
const { getIsConnected } = require('../config/db');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_jwt_token_key_change_in_production_12345',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (getIsConnected()) {
      // Mongoose Mode
      const userExists = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username: username.trim() }],
      });

      if (userExists) {
        if (userExists.email.toLowerCase() === email.toLowerCase()) {
          return res.status(400).json({ message: 'Email is already registered' });
        }
        if (userExists.username.toLowerCase() === username.trim().toLowerCase()) {
          return res.status(400).json({ message: 'Username is already taken' });
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        profilePicture: '/uploads/default-avatar.svg',
      });

      const token = generateToken(user._id);
      return res.status(201).json({
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePicture: user.profilePicture,
          followers: user.followers,
          following: user.following,
          createdAt: user.createdAt,
        },
      });
    } else {
      // Embedded LocalDB Fallback Mode
      const existingUser = await LocalDB.findUser({ $or: [{ email }, { username }] });
      if (existingUser) {
        if (existingUser.email.toLowerCase() === email.toLowerCase()) {
          return res.status(400).json({ message: 'Email is already registered' });
        }
        return res.status(400).json({ message: 'Username is already taken' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await LocalDB.createUser({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
      });

      const token = generateToken(user._id);
      return res.status(201).json({
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePicture: user.profilePicture,
          followers: user.followers,
          following: user.following,
          createdAt: user.createdAt,
        },
      });
    }
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Please provide email/username and password' });
    }

    let user;
    if (getIsConnected()) {
      user = await User.findOne({
        $or: [
          { email: loginId.toLowerCase().trim() },
          { username: loginId.trim() },
        ],
      });
    } else {
      user = await LocalDB.findUser({
        $or: [
          { email: loginId.toLowerCase().trim() },
          { username: loginId.trim() },
        ],
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        followers: user.followers || [],
        following: user.following || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    let user;
    if (getIsConnected()) {
      user = await User.findById(req.user._id)
        .select('-password')
        .populate('followers', 'username profilePicture')
        .populate('following', 'username profilePicture');
    } else {
      user = await LocalDB.findUser({ _id: req.user._id });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('[GetMe Error]', error);
    res.status(500).json({ message: 'Server error fetching user details', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
