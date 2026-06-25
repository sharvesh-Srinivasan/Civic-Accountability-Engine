import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

// GET /api/wards — list all wards
router.get('/', async (req, res) => {
  try {
    if (!db) return res.json([]);
    const snap = await db.collection('wards').orderBy('name').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wards/stats — get all wardStats docs
router.get('/stats', async (req, res) => {
  try {
    if (!db) return res.json([]);
    const snap = await db.collection('wardStats').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wards/:wardId/stats — stats for a specific ward
router.get('/:wardId/stats', async (req, res) => {
  try {
    if (!db) return res.json([]);
    const snap = await db.collection('wardStats')
      .where('wardId', '==', req.params.wardId)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
