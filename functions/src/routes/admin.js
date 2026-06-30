import express from 'express';
import { db } from '../config/firebase.js';
import { detectPatterns } from '../services/patternDetector.js';
import { checkAndUpdateCommitments } from '../services/commitmentChecker.js';

const router = express.Router();

// Simple admin secret middleware (for hackathon — not production grade)
const adminSecret = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== (process.env.ADMIN_SECRET || 'civic-admin-2024')) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }
  next();
};

// POST /api/admin/detect-patterns — run pattern detection
router.post('/detect-patterns', adminSecret, async (req, res) => {
  try {
    const results = await detectPatterns();
    res.json({ success: true, clustersFound: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/check-commitments — run commitment status check
router.post('/check-commitments', adminSecret, async (req, res) => {
  try {
    const results = await checkAndUpdateCommitments();
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/seed — seed demo data
router.post('/seed', adminSecret, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'DB not configured' });

    const now = new Date();
    const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    // Seed wards
    const wards = [
      { id: 'ward1', name: 'Ward 1 - Central', city: 'Bengaluru', trustScore: 42, previousTrustScore: 65, avgResponseTime: '4 days', stalledIssues: 12 },
      { id: 'ward2', name: 'Ward 2 - East', city: 'Bengaluru', trustScore: 78, previousTrustScore: 60, avgResponseTime: '1.2 days', stalledIssues: 2 },
      { id: 'ward3', name: 'Ward 3 - North', city: 'Bengaluru', trustScore: 85, previousTrustScore: 82, avgResponseTime: '1 day', stalledIssues: 1 },
    ];
    for (const ward of wards) {
      await db.collection('wards').doc(ward.id).set(ward);
    }

    // Seed reports
    const reports = [
      { wardId: 'ward1', category: 'pothole', severity: 'high', status: 'open', lat: 12.9716, lng: 77.5946, description: 'Large pothole on main road causing accidents', summary: 'Dangerous pothole blocking main arterial road.', createdAt: daysAgo(25), reporterId: 'seed_user_1', imageUrl: '', clusterId: 'cluster_ward1_pothole', confidence: 0.92 },
      { wardId: 'ward1', category: 'pothole', severity: 'high', status: 'acknowledged', lat: 12.9720, lng: 77.5950, description: 'Pothole near school entrance', summary: 'Deep pothole near school gate posing risk to children.', createdAt: daysAgo(20), reporterId: 'seed_user_2', imageUrl: '', clusterId: 'cluster_ward1_pothole', confidence: 0.88 },
      { wardId: 'ward1', category: 'pothole', severity: 'medium', status: 'open', lat: 12.9710, lng: 77.5940, description: 'Multiple small potholes near junction', summary: 'Several potholes near busy junction causing traffic slowdown.', createdAt: daysAgo(15), reporterId: 'seed_user_3', imageUrl: '', clusterId: 'cluster_ward1_pothole', confidence: 0.85 },
      { wardId: 'ward1', category: 'pothole', severity: 'medium', status: 'open', lat: 12.9725, lng: 77.5955, description: 'Pothole filled with water, hard to see', summary: 'Water-filled pothole invisible to cyclists, creating hazard.', createdAt: daysAgo(10), reporterId: 'seed_user_1', imageUrl: '', clusterId: 'cluster_ward1_pothole', confidence: 0.79 },
      { wardId: 'ward1', category: 'pothole', severity: 'low', status: 'open', lat: 12.9708, lng: 77.5935, description: 'Small pothole developing near footpath', summary: 'Minor pothole near footpath, will worsen in monsoon.', createdAt: daysAgo(5), reporterId: 'seed_user_4', imageUrl: '', clusterId: 'cluster_ward1_pothole', confidence: 0.71 },
      { wardId: 'ward2', category: 'streetlight', severity: 'high', status: 'resolved', lat: 12.9750, lng: 77.6010, description: 'Three streetlights out on main road', summary: 'Three consecutive streetlights out, road completely dark at night.', createdAt: daysAgo(30), reporterId: 'seed_user_2', imageUrl: '', clusterId: null, confidence: 0.95 },
      { wardId: 'ward2', category: 'streetlight', severity: 'medium', status: 'resolved', lat: 12.9755, lng: 77.6015, description: 'Flickering light near park', summary: 'Streetlight flickering intermittently near community park.', createdAt: daysAgo(28), reporterId: 'seed_user_3', imageUrl: '', clusterId: null, confidence: 0.83 },
      { wardId: 'ward2', category: 'garbage', severity: 'high', status: 'open', lat: 12.9740, lng: 77.5990, description: 'Garbage overflowing for 2 weeks', summary: 'Garbage bin overflowing for two weeks, attracting pests.', createdAt: daysAgo(14), reporterId: 'seed_user_5', imageUrl: '', clusterId: null, confidence: 0.91 },
      { wardId: 'ward2', category: 'garbage', severity: 'medium', status: 'open', lat: 12.9745, lng: 77.5995, description: 'Illegal dumping site growing', summary: 'Unauthorized garbage dumping site growing near residential area.', createdAt: daysAgo(8), reporterId: 'seed_user_1', imageUrl: '', clusterId: null, confidence: 0.87 },
      { wardId: 'ward3', category: 'water_leak', severity: 'high', status: 'open', lat: 12.9800, lng: 77.5800, description: 'Water pipe burst on side street', summary: 'Burst water pipe flooding road and wasting hundreds of liters daily.', createdAt: daysAgo(3), reporterId: 'seed_user_6', imageUrl: '', clusterId: null, confidence: 0.94 },
      { wardId: 'ward3', category: 'water_leak', severity: 'medium', status: 'open', lat: 12.9805, lng: 77.5810, description: 'Slow water leak near park', summary: 'Persistent slow water leak causing road damage and wastage.', createdAt: daysAgo(7), reporterId: 'seed_user_2', imageUrl: '', clusterId: null, confidence: 0.82 },
      { wardId: 'ward3', category: 'pothole', severity: 'high', status: 'disputed', lat: 12.9810, lng: 77.5820, description: 'Massive pothole after road repair botched', summary: 'New pothole appeared after poorly executed road repair work.', createdAt: daysAgo(12), reporterId: 'seed_user_3', imageUrl: '', clusterId: null, confidence: 0.89 },
      { wardId: 'ward1', category: 'garbage', severity: 'low', status: 'resolved', lat: 12.9705, lng: 77.5930, description: 'Litter near community center', summary: 'Litter accumulation near community centre entrance.', createdAt: daysAgo(22), reporterId: 'seed_user_4', imageUrl: '', clusterId: null, confidence: 0.76 },
      { wardId: 'ward2', category: 'streetlight', severity: 'high', status: 'open', lat: 12.9760, lng: 77.6020, description: 'Dark stretch of 500m at night', summary: 'Entire 500-metre stretch without streetlight creating safety risk.', createdAt: daysAgo(6), reporterId: 'seed_user_5', imageUrl: '', clusterId: null, confidence: 0.90 },
      { wardId: 'ward3', category: 'garbage', severity: 'medium', status: 'open', lat: 12.9815, lng: 77.5825, description: 'Construction waste dumped on road', summary: 'Construction debris blocking footpath and part of road.', createdAt: daysAgo(4), reporterId: 'seed_user_6', imageUrl: '', clusterId: null, confidence: 0.78 },
    ];

    const reportIds = [];
    for (const report of reports) {
      const ref = await db.collection('reports').add(report);
      reportIds.push(ref.id);
    }

    // Seed commitments
    const commitments = [
      { reportId: reportIds[0], authorityName: 'BBMP Roads Division', promisedAction: 'Fill potholes with bitumen mix within 7 days', etaDate: daysAgo(-5), status: 'broken', createdAt: daysAgo(20) },
      { reportId: reportIds[5], authorityName: 'BESCOM', promisedAction: 'Replace faulty streetlights and inspect wiring', etaDate: daysAgo(-15), status: 'honored', createdAt: daysAgo(28) },
      { reportId: reportIds[6], authorityName: 'BESCOM', promisedAction: 'Repair flickering streetlight transformer', etaDate: daysAgo(-12), status: 'honored', createdAt: daysAgo(26) },
      { reportId: reportIds[7], authorityName: 'BBMP Sanitation', promisedAction: 'Deploy additional garbage truck for weekly pickup', etaDate: daysAgo(3), status: 'broken', createdAt: daysAgo(12) },
      { reportId: reportIds[9], authorityName: 'BWSSB', promisedAction: 'Emergency pipe repair team dispatched within 48 hours', etaDate: daysAgo(-1), status: 'pending', createdAt: daysAgo(2) },
    ];

    for (const commitment of commitments) {
      await db.collection('commitments').add(commitment);
    }

    // Seed wardStats
    const wardStats = [
      { id: 'ward1_pothole', wardId: 'ward1', category: 'pothole', openCount: 4, resolvedCount: 0, brokenCommitments: 1, avgResolutionDays: 0, isSystemic: true, insight: 'Recurring potholes in Ward 1 suggest deteriorating road sub-base requiring full reconstruction.', recommendedPriority: 'urgent', lastUpdated: now },
      { id: 'ward1_garbage', wardId: 'ward1', category: 'garbage', openCount: 0, resolvedCount: 1, brokenCommitments: 0, avgResolutionDays: 3.2, isSystemic: false, insight: null, recommendedPriority: 'low', lastUpdated: now },
      { id: 'ward2_streetlight', wardId: 'ward2', category: 'streetlight', openCount: 1, resolvedCount: 2, brokenCommitments: 0, avgResolutionDays: 5.5, isSystemic: false, insight: null, recommendedPriority: 'medium', lastUpdated: now },
      { id: 'ward2_garbage', wardId: 'ward2', category: 'garbage', openCount: 2, resolvedCount: 0, brokenCommitments: 1, avgResolutionDays: 0, isSystemic: true, insight: 'Inadequate garbage collection frequency causing persistent overflow in Ward 2 residential zones.', recommendedPriority: 'high', lastUpdated: now },
      { id: 'ward3_water_leak', wardId: 'ward3', category: 'water_leak', openCount: 2, resolvedCount: 0, brokenCommitments: 0, avgResolutionDays: 0, isSystemic: false, insight: null, recommendedPriority: 'high', lastUpdated: now },
      { id: 'ward3_pothole', wardId: 'ward3', category: 'pothole', openCount: 1, resolvedCount: 0, brokenCommitments: 0, avgResolutionDays: 0, isSystemic: false, insight: null, recommendedPriority: 'medium', lastUpdated: now },
      { id: 'ward3_garbage', wardId: 'ward3', category: 'garbage', openCount: 1, resolvedCount: 0, brokenCommitments: 0, avgResolutionDays: 0, isSystemic: false, insight: null, recommendedPriority: 'low', lastUpdated: now },
    ];

    for (const stat of wardStats) {
      const { id, ...data } = stat;
      await db.collection('wardStats').doc(id).set(data);
    }

    res.json({
      success: true,
      seeded: {
        wards: wards.length,
        reports: reportIds.length,
        commitments: commitments.length,
        wardStats: wardStats.length,
      }
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
