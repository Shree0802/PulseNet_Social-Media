const express = require('express');
const { check } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// @route POST /api/auth/register
router.post(
  '/register',
  [
    check('username', 'Username is required and must be at least 3 characters').isLength({ min: 3 }),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
  ],
  validate,
  register
);

// @route POST /api/auth/login
router.post(
  '/login',
  [
    check('loginId', 'Email or Username is required').notEmpty(),
    check('password', 'Password is required').notEmpty(),
  ],
  validate,
  login
);

// @route GET /api/auth/me
router.get('/me', protect, getMe);

module.exports = router;
