import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Generate JWT Token
export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, companyid: user.companyid },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || '7d' }
  );
};

// Verify JWT Token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch  {
    return null;
  }
};
