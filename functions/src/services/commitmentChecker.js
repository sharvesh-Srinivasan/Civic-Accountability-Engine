import { db } from '../config/firebase.js';

export async function checkAndUpdateCommitments() {
  if (!db) throw new Error('Database not configured');

  const now = new Date();
  const snapshot = await db.collection('commitments')
    .where('status', '==', 'pending')
    .get();

  const results = { honored: 0, broken: 0, pending: 0 };

  for (const doc of snapshot.docs) {
    const commitment = doc.data();
    const etaDate = commitment.etaDate?.toDate?.() || new Date(commitment.etaDate);

    // Fetch linked report
    const reportId = commitment.reportId;
    let reportStatus = 'open';
    try {
      const reportDoc = await db.collection('reports').doc(reportId).get();
      if (reportDoc.exists) reportStatus = reportDoc.data().status;
    } catch { /* ignore */ }

    let newStatus = null;

    if (reportStatus === 'resolved') {
      newStatus = 'honored';
      results.honored++;
    } else if (now > etaDate) {
      newStatus = 'broken';
      results.broken++;
    } else {
      results.pending++;
      continue;
    }

    await doc.ref.update({ status: newStatus, updatedAt: now });

    // Update wardStats brokenCommitments or resolvedCount
    if (newStatus === 'broken') {
      // We need wardId — get from report
      try {
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (reportDoc.exists) {
          const { wardId, category } = reportDoc.data();
          const statsRef = db.collection('wardStats').doc(`${wardId}_${category}`);
          await statsRef.set(
            { brokenCommitments: (await statsRef.get()).data()?.brokenCommitments + 1 || 1, lastUpdated: now },
            { merge: true }
          );
        }
      } catch { /* ignore */ }
    }
  }

  return results;
}
