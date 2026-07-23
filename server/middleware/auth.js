const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LocalDB = require('../config/localDb');
const { getIsConnected } = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super_secret_jwt_token_key_change_in_production_12345'
      );

      let user;
      if (getIsConnected()) {
        user = await User.findById(decoded.id).select('-password');
      } else {
        user = await LocalDB.findUser({ _id: decoded.id });
      }

      if (!user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('[Auth Middleware Error]', error.message);
      return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
