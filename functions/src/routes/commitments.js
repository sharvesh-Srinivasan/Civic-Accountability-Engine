import express from 'express';
import { db } from '../config/firebase.js';
import { verifyToken, verifyAuthority } from '../middleware/auth.js';
import { checkAndUpdateCommitments } from '../services/commitmentChecker.js';

const router = express.Router();

// POST /api/commitments — create a commitment (authority only)
router.post('/', verifyAuthority, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'DB not configured' });
    const { reportId, authorityName, promisedAction, etaDate } = req.body;
    if (!reportId || !promisedAction || !etaDate) {
      return res.status(400).json({ error: 'reportId, promisedAction, and etaDate are required' });
    }
    const commitment = {
      reportId,
      authorityName: authorityName || 'Municipal Authority',
      promisedAction,
      etaDate: new Date(etaDate),
      status: 'pending',
      createdAt: new Date(),
      createdBy: req.user.uid,
    };
    const docRef = await db.collection('commitments').add(commitment);
    // Also update report status to acknowledged
    await db.collection('reports').doc(reportId).update({ status: 'acknowledged' });
    res.status(201).json({ id: docRef.id, ...commitment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/commitments — list commitments (optionally filtered by reportId)
router.get('/', async (req, res) => {
  try {
    if (!db) return res.json([]);
    const { reportId, status } = req.query;
    let q = db.collection('commitments').orderBy('createdAt', 'desc');
    if (reportId) q = db.collection('commitments').where('reportId', '==', reportId);
    if (status) q = q.where('status', '==', status);
    const snap = await q.limit(100).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/commitments/check — run deterministic commitment status check
router.post('/check', async (req, res) => {
  try {
    const results = await checkAndUpdateCommitments();
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/commitments/:id/resolve — explicitly honor a commitment and upload resolution photo
router.post('/:id/resolve', verifyAuthority, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'DB not configured' });
    const { resolutionImageUrl } = req.body;
    const commitmentRef = db.collection('commitments').doc(req.params.id);
    const doc = await commitmentRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    
    const updates = { status: 'honored', updatedAt: new Date() };
    if (resolutionImageUrl) updates.resolutionImageUrl = resolutionImageUrl;
    
    await commitmentRef.update(updates);
    
    // Also mark report as resolved
    const reportId = doc.data().reportId;
    if (reportId) {
      await db.collection('reports').doc(reportId).update({ status: 'resolved', updatedAt: new Date() });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
