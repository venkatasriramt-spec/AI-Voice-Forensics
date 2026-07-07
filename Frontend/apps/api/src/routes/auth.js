import express from 'express';
import bcrypt from 'bcryptjs';
import { generateUUID } from '../utils/uuid.js';
import { generateToken, verifyToken, extractTokenFromHeader } from '../utils/auth.js';
import { getUserByEmail, createUser, userExists } from '../utils/user-store.js';

const router = express.Router();

// Validation helpers
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password) {
  return password && password.length >= 6;
}

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  // Validate email format
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password length
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Check if email already exists
  if (userExists(email)) {
    throw new Error('Email already registered');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate UUID
  const uid = generateUUID();

  // Create user
  createUser(email, hashedPassword, uid);

  // Generate JWT token
  const token = generateToken({ email, uid });

  res.json({
    token,
    user: { email, uid },
  });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user by email
  const user = getUserByEmail(email);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT token
  const token = generateToken({ email: user.email, uid: user.uid });

  res.json({
    token,
    user: { email: user.email, uid: user.uid },
  });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new Error('Unauthorized');
  }

  // Verify token is valid
  verifyToken(token);

  res.json({ success: true });
});

// GET /auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new Error('Unauthorized');
  }

  // Verify and decode token
  const decoded = verifyToken(token);

  res.json({
    user: { email: decoded.email, uid: decoded.uid },
  });
});

export default router;