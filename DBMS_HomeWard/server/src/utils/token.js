import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'token';

// Creates a signed JWT that stores only the user id and role.
export function createToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Cookie settings. httpOnly stops JavaScript in the browser from reading the token.
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
}

// Puts the token inside a cookie on the response.
export function sendTokenCookie(res, user) {
  res.cookie(COOKIE_NAME, createToken(user), cookieOptions());
}
