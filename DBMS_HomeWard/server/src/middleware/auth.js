import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { COOKIE_NAME } from '../utils/token.js';

// Reads the cookie and returns the logged in user, or null.
async function userFromCookie(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(payload.id);
  } catch {
    return null;
  }
}

// protect: only logged in users can pass. Puts the user on req.user.
export async function protect(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new AppError('Please log in first', 401);

  const user = await userFromCookie(req);
  if (!user) throw new AppError('Your session has expired. Please log in again', 401);

  req.user = user;
  next();
}

// optionalAuth: everyone can pass, but if a valid cookie is present req.user is filled.
// Used on public pages that show extra things to owners and admins.
export async function optionalAuth(req, _res, next) {
  req.user = await userFromCookie(req);
  next();
}

// authorize('admin'): only users with one of the given roles can pass.
// Always use it AFTER protect.
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to do this', 403);
    }
    next();
  };
}

// True when the user created this document (pet, campaign) or is an admin.
export function isOwnerOrAdmin(user, doc) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const ownerId = doc.createdBy?._id ?? doc.createdBy;
  return Boolean(ownerId) && ownerId.toString() === user._id.toString();
}
