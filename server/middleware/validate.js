const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => err.msg);
    return res.status(400).json({
      message: extractedErrors.join('. '),
      errors: errors.array(),
    });
  }
  next();
};

module.exports = validate;
