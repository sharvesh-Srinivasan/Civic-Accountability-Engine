import { adminAuth, db } from '../config/firebase.js';

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split('Bearer ')[1];
  if (!adminAuth) {
    // Mock mode: accept any token for demo
    req.user = { uid: 'demo_user', email: 'demo@example.com' };
    return next();
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

