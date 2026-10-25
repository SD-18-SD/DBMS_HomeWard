import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { sendTokenCookie, COOKIE_NAME, cookieOptions } from '../utils/token.js';

// POST /api/auth/register
export async function register(req, res) {
  const { name, email, password } = req.body;
  // role is never taken from the request, so nobody can sign up as admin.
  const user = await User.create({ name, email, password });
  sendTokenCookie(res, user);
  res.status(201).json({ user });
}

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  // Same message for "no user" and "wrong password" so attackers learn nothing.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  sendTokenCookie(res, user);
  res.json({ user });
}

// POST /api/auth/logout
export function logout(_req, res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
  res.json({ message: 'Logged out' });
}

// GET /api/auth/me
export function getMe(req, res) {
  res.json({ user: req.user });
}

// PUT /api/auth/me
export async function updateMe(req, res) {
  const { name, phone, city } = req.body;
  req.user.set({ name, phone, city });
  await req.user.save();
  res.json({ user: req.user });
}
