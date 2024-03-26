const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Get the token from the request headers
  const token = req.headers.authorization;

  // Check if token exists
  if (!token) {
    return res.status(401).json({ message: 'Token is required' });
  }

  try {
    // Verify the token
    const decodedUser = jwt.verify(token, 'your-secret-key');

    // Set user information on request object
    req.user = decodedUser.userId;

    // Call next middleware
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = { verifyToken };
