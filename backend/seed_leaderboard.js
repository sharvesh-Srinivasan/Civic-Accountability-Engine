import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    // try default path
    const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  process.exit(1);
}

const db = getFirestore();

const dummyUsers = [
  { displayName: "Priya Sharma", civicScore: 840, wardId: "ward1", city: "Chennai", role: "citizen", badges: ["First Report", "Community Watch", "Ward Guardian"] },
  { displayName: "Rahul Desai", civicScore: 720, wardId: "ward2", city: "Chennai", role: "citizen", badges: ["Verified Reporter", "Community Watch"] },
  { displayName: "Anita Patel", civicScore: 650, wardId: "ward3", city: "Chennai", role: "citizen", badges: ["Ward Guardian"] },
  { displayName: "Vikram Singh", civicScore: 590, wardId: "ward1", city: "Chennai", role: "citizen", badges: ["First Report", "Verified Reporter"] },
  { displayName: "Sneha Reddy", civicScore: 510, wardId: "ward4", city: "Chennai", role: "citizen", badges: ["Community Watch"] },
  { displayName: "Arjun Nair", civicScore: 480, wardId: "ward2", city: "Chennai", role: "citizen", badges: ["First Report"] },
  { displayName: "Kavya Menon", civicScore: 420, wardId: "ward5", city: "Chennai", role: "citizen", badges: [] },
  { displayName: "Rohan Gupta", civicScore: 390, wardId: "ward3", city: "Chennai", role: "citizen", badges: ["First Report"] },
  { displayName: "Meera Iyer", civicScore: 310, wardId: "ward1", city: "Chennai", role: "citizen", badges: ["Verified Reporter"] },
  { displayName: "Sanjay Kumar", civicScore: 250, wardId: "ward4", city: "Chennai", role: "citizen", badges: [] }
];

async function seed() {
  console.log("Seeding leaderboard data...");
  const batch = db.batch();
  
  for (let i = 0; i < dummyUsers.length; i++) {
    const user = dummyUsers[i];
    const userRef = db.collection('users').doc(`dummy_user_${i}`);
    batch.set(userRef, {
      ...user,
      email: `dummy${i}@example.com`,
      createdAt: new Date(),
      streak: Math.floor(Math.random() * 10)
    });
  }

  await batch.commit();
  console.log("Successfully added 10 dummy users to the leaderboard!");
}

seed().catch(console.error);