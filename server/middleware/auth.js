import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  // This will work whether req.user.Admin is 1 OR true
  if (req.user && (req.user.Admin === 1 || req.user.Admin === true)) {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
}