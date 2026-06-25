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

export async function verifyAuthority(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split('Bearer ')[1];

  if (!adminAuth) {
    req.user = { uid: 'demo_user', email: 'demo@example.com' };
    return next(); // Allow in demo mode
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (!db) return next(); // Demo mode

  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || !userDoc.data().isAuthority) {
      return res.status(403).json({ error: 'Authority access required' });
    }
    next();
  } catch {
    return res.status(500).json({ error: 'Auth check failed' });
  }
}
