import { db } from '../config/firebase.js';
import { analyzePattern } from './gemini.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function detectPatterns() {
  if (!db) throw new Error('Database not configured');

  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const snapshot = await db.collection('reports')
    .where('status', '==', 'open')
    .where('createdAt', '>=', cutoff)
    .get();

  const grouped = {};
  snapshot.forEach(doc => {
    const d = doc.data();
    const key = `${d.wardId}_${d.category}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ id: doc.id, ...d });
  });

  const results = [];

  for (const [key, reports] of Object.entries(grouped)) {
    if (reports.length < 5) continue;

    const [wardId, category] = key.split('_');
    const summaries = reports.map(r => r.summary || r.description || '').filter(Boolean);

    const analysis = await analyzePattern(summaries, wardId, category);

    // Generate a cluster ID
    const clusterId = `cluster_${key}_${Date.now()}`;

    // Update wardStats
    const statsRef = db.collection('wardStats').doc(`${wardId}_${category}`);
    await statsRef.set({
      wardId,
      category,
      openCount: reports.length,
      isSystemic: analysis.is_systemic,
      insight: analysis.insight,
      recommendedPriority: analysis.recommended_priority,
      lastUpdated: new Date(),
    }, { merge: true });

    // Tag reports with clusterId
    const batch = db.batch();
    reports.forEach(r => {
      const ref = db.collection('reports').doc(r.id);
      batch.update(ref, { clusterId });
    });
    await batch.commit();

    results.push({ key, count: reports.length, clusterId, analysis });
  }

  return results;
}
