import express from 'express';
import { db } from '../config/firebase.js';
import { classifyReport, analyzePattern, generateResolutionPlan, generateChatResponse } from '../services/gemini.js';
import { verifyToken } from '../middleware/auth.js';
import { FieldValue } from 'firebase-admin/firestore';

async function checkWardGuardian(userId, wardId) {
  if (!userId || !wardId) return;
  try {
    const topUsers = await db.collection('users')
      .where('wardId', '==', wardId)
      .orderBy('civicScore', 'desc')
      .limit(3)
      .get();
    
    if (topUsers.docs.some(d => d.id === userId)) {
      await db.collection('users').doc(userId).set({
        badges: FieldValue.arrayUnion('Ward Guardian')
      }, { merge: true });
    }
  } catch (err) {
    console.error("Ward Guardian check failed:", err);
  }
}

const router = express.Router();

// POST /api/reports — create a new report
router.post('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not configured' });
    const {
      category, severity, description, imageUrl,
      lat, lng, wardId, summary, confidence,
      humanReadable, reasoning
    } = req.body;

    const report = {
      reporterId: req.user.uid,
      category: category || 'other',
      severity: severity || 'medium',
      description: description || '',
      summary: summary || '',
      humanReadable: humanReadable || '',
      reasoning: reasoning || '',
      confidence: confidence || 0,
      imageUrl: imageUrl || '',
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      wardId: wardId || 'unknown',
      status: 'open',
      clusterId: null,
      createdAt: new Date(),
    };

    // Generate AI Resolution Plan synchronously (or we could do it async, but for the hackathon returning it is nice)
    const plan = await generateResolutionPlan(report.category, report.severity, report.description || report.summary);
    report.aiResolutionPlan = plan;

    const docRef = await db.collection('reports').add(report);

    // Award Civic Score and badge for reporting
    await db.collection('users').doc(req.user.uid).set({
      civicScore: FieldValue.increment(10),
      badges: FieldValue.arrayUnion('First Report')
    }, { merge: true });
    await checkWardGuardian(req.user.uid, wardId);

    // Update wardStats open count
    const statsRef = db.collection('wardStats').doc(`${wardId}_${category}`);
    const statsDoc = await statsRef.get();
    const newOpenCount = (statsDoc.data()?.openCount || 0) + 1;
    
    await statsRef.set({
      wardId, category,
      openCount: newOpenCount,
      resolvedCount: statsDoc.data()?.resolvedCount || 0,
      brokenCommitments: statsDoc.data()?.brokenCommitments || 0,
      avgResolutionDays: statsDoc.data()?.avgResolutionDays || 0,
      lastUpdated: new Date(),
    }, { merge: true });

    // Feature 7: Pattern Agent (Trigger insight if 5+ open issues)
    if (newOpenCount >= 5 && (!statsDoc.data()?.insight || newOpenCount % 5 === 0)) {
      // Run asynchronously so we don't block report creation
      db.collection('reports')
        .where('wardId', '==', wardId)
        .where('category', '==', category)
        .orderBy('createdAt', 'desc')
        .limit(10).get()
        .then(async (recentSnap) => {
           const summaries = recentSnap.docs.map(d => d.data().summary || d.data().description).filter(Boolean);
           if (summaries.length > 0) {
             const pattern = await analyzePattern(summaries, wardId, category);
             await statsRef.update({
               isSystemic: pattern.is_systemic,
               insight: pattern.insight
             });
           }
        }).catch(err => console.error("Pattern agent failed:", err));
    }

    res.status(201).json({ id: docRef.id, ...report });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/classify — AI classification
router.post('/classify', async (req, res) => {
  try {
    const { imageUrl, description } = req.body;
    if (!description && !imageUrl) {
      return res.status(400).json({ error: 'imageUrl or description required' });
    }
    const result = await classifyReport(imageUrl, description);
    res.json(result);
  } catch (err) {
    console.error('Classify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/chat — AI chatbot interaction
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message required' });
    }
    const reply = await generateChatResponse(message, context || {});
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports — get all reports (public, with optional filters)
router.get('/', async (req, res) => {
  try {
    if (!db) return res.json([]);
    const { wardId, status, category, limit: lim } = req.query;
    let q = db.collection('reports');
    if (wardId) q = q.where('wardId', '==', wardId);
    if (status) q = q.where('status', '==', status);
    if (category) q = q.where('category', '==', category);
    q = q.orderBy('createdAt', 'desc').limit(parseInt(lim) || 100);
    const snap = await q.get();
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/my — current user's reports
router.get('/my', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json([]);
    const snap = await db.collection('reports')
      .where('reporterId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:id
router.get('/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'DB not configured' });
    const doc = await db.collection('reports').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Report not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reports/:id/status — update report status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'DB not configured' });
    const { status } = req.body;
    const validStatuses = ['open', 'acknowledged', 'resolved', 'disputed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const reportRef = db.collection('reports').doc(req.params.id);
    const reportDoc = await reportRef.get();
    if (!reportDoc.exists) return res.status(404).json({ error: 'Not found' });

    await reportRef.update({ status, updatedAt: new Date() });

    // If resolved, update wardStats
    if (status === 'resolved') {
      const { wardId, category, createdAt, reporterId } = reportDoc.data();
      const statsRef = db.collection('wardStats').doc(`${wardId}_${category}`);
      const statsDoc = await statsRef.get();
      const existing = statsDoc.data() || {};
      const resolutionDays = (Date.now() - createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24);
      const prevAvg = existing.avgResolutionDays || 0;
      const prevCount = existing.resolvedCount || 0;
      const newAvg = ((prevAvg * prevCount) + resolutionDays) / (prevCount + 1);
      await statsRef.set({
        wardId, category,
        openCount: Math.max((existing.openCount || 1) - 1, 0),
        resolvedCount: prevCount + 1,
        avgResolutionDays: Math.round(newAvg * 10) / 10,
        lastUpdated: new Date(),
      }, { merge: true });

      // Award +20 to original reporter
      if (reporterId) {
        const reporterRef = db.collection('users').doc(reporterId);
        await reporterRef.set({
          civicScore: FieldValue.increment(20),
          resolvedReportsCount: FieldValue.increment(1)
        }, { merge: true });
        
        const reporterSnap = await reporterRef.get();
        if (reporterSnap.exists) {
          const data = reporterSnap.data();
          if (data.resolvedReportsCount >= 3) {
            await reporterRef.set({
              badges: FieldValue.arrayUnion('Verified Reporter')
            }, { merge: true });
          }
          await checkWardGuardian(reporterId, data.wardId);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/nearby — check for existing open issues (Feature 3: Merge)
router.get('/nearby/search', async (req, res) => {
  try {
    if (!db) return res.json([]);
    const { wardId, category } = req.query;
    if (!wardId || !category) return res.json([]);
    
    // Simple logic for the demo: find open reports in the same ward and category
    const snap = await db.collection('reports')
      .where('wardId', '==', wardId)
      .where('category', '==', category)
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();
      
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error('Error fetching nearby reports:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/confirm — Feature 4: Community Verification (Merge)
router.post('/:id/confirm', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'DB not configured' });
    const { lat, lng } = req.body;
    
    const reportRef = db.collection('reports').doc(req.params.id);
    const reportDoc = await reportRef.get();
    if (!reportDoc.exists) return res.status(404).json({ error: 'Not found' });
    
    const data = reportDoc.data();
    let weight = 1;

    // Simple recency + distance weighting logic
    if (lat && lng && data.lat && data.lng) {
      // Calculate haversine distance in km
      const p = 0.017453292519943295;
      const a = 0.5 - Math.cos((data.lat - lat) * p)/2 + 
                Math.cos(lat * p) * Math.cos(data.lat * p) * 
                (1 - Math.cos((data.lng - lng) * p))/2;
      const dist = 12742 * Math.asin(Math.sqrt(a)); // km
      if (dist < 0.5) weight += 1; // within 500m gets extra weight
    }
    
    const daysOld = (Date.now() - data.createdAt.toDate().getTime()) / (1000*3600*24);
    if (daysOld < 3) weight += 1; // recent report gets extra weight

    await reportRef.update({
      confirmations: (data.confirmations || 0) + weight,
      lastConfirmedAt: new Date()
    });
    
    // Award Civic Score for verifying
    const userRef = db.collection('users').doc(req.user.uid);
    await userRef.set({
      civicScore: FieldValue.increment(5),
      verificationsGiven: FieldValue.increment(1)
    }, { merge: true });

    const userDocSnap = await userRef.get();
    if (userDocSnap.exists) {
      const data = userDocSnap.data();
      if (data.verificationsGiven >= 10) {
        await userRef.set({
          badges: FieldValue.arrayUnion('Community Watch')
        }, { merge: true });
      }
      await checkWardGuardian(req.user.uid, data.wardId);
    }
    
    res.json({ success: true, weight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/prioritize-insight — AI Justification (Feature 5)
import { getGenAI } from '../services/gemini.js';
router.post('/prioritize-insight', async (req, res) => {
  try {
    const { severity, daysOpen, count, category } = req.body;
    const model = getGenAI()?.getGenerativeModel({ model: 'gemini-1.5-flash' });
    if (!model) return res.json({ insight: "High severity issue open for multiple days." });

    const prompt = `You are a civic prioritization assistant. Given this issue's severity (${severity}), report count (${count || 1}), days open (${daysOpen}), and category (${category}), write ONE sentence (max 20 words) explaining why this should be addressed urgently. Do not include any prefixes.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    res.json({ insight: text });
  } catch (err) {
    console.error('Prioritize AI error:', err);
    res.json({ insight: "High severity issue requiring immediate attention." });
  }
});

export default router;
