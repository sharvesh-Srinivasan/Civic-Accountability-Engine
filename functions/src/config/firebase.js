import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

let db, storage, adminAuth;

function initializeFirebase() {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson || serviceAccountJson.includes('your-project-id')) {
      console.warn('⚠️  Firebase service account not configured. Using mock mode.');
      return;
    }
    const serviceAccount = JSON.parse(serviceAccountJson);

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com`,
      });
    }

    db = getFirestore();
    storage = getStorage();
    adminAuth = getAuth();
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('❌ Firebase Admin init failed:', err.message);
  }
}

initializeFirebase();

export { db, storage, adminAuth };
