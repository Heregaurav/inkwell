const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'inkwell-secret-change-in-prod';
const SESSION_COOKIE = 'inkwell_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const cookieSameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
  throw new Error('AUTH_COOKIE_SAME_SITE must be strict, lax, or none');
}
const cookieSecure = process.env.NODE_ENV === 'production' || cookieSameSite === 'none';

function getToken(req) {
  return req.cookies?.[SESSION_COOKIE];
}

exports.setAuthCookie = (res, token) => {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/api/v1',
    maxAge: COOKIE_MAX_AGE
  });
};

exports.clearAuthCookie = (res) => {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    path: '/api/v1'
  });
};

exports.auth = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

exports.optionalAuth = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-passwordHash');
    }
  } catch {}
  next();
};

exports.generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};
