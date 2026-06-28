import { setDoc, doc } from 'firebase/firestore';
import { db } from './firebase.js';

const TAMIL_NADU_CITIES = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Salem',
  'Tirunelveli',
  'Tiruppur',
  'Vellore',
  'Erode',
  'Thoothukudi',
  'Dindigul',
  'Thanjavur'
];

// We'll create demo insights for each city for the dashboard
const generateInsights = (city) => ({
  trustScore: {
    sparkline: Array.from({ length: 6 }, () => Math.floor(Math.random() * 40) + 40),
    currentScore: Math.floor(Math.random() * 30) + 60,
    forecastText: `AI Forecast: ${city} shows a steady resolution rate. Expected to stabilize around ${Math.floor(Math.random() * 20) + 70}/100 as new infrastructure upgrades are completed.`
  },
  equityWatch: {
    wardName: 'A Suburb',
    text: `in ${city} has unusually low reporting volume relative to its population density. This may reflect lower digital adoption rather than fewer infrastructure issues. Community outreach is recommended.`
  },
  benchmarking: {
    poorWard: { name: 'A Central Ward', days: Math.floor(Math.random() * 15) + 10, metric: 'Pothole issues' },
    bestWard: { name: 'A Model Ward', days: Math.floor(Math.random() * 5) + 2 }
  }
});

async function seed() {
  console.log('Seeding Wards & Insights for Tamil Nadu...');
  try {
    for (const city of TAMIL_NADU_CITIES) {
      // Create 15 wards per city
      for (let i = 1; i <= 15; i++) {
        const wardId = `${city.toLowerCase()}_ward${i}`;
        const wardData = {
          id: wardId,
          name: `Ward ${i}`,
          city: city,
          lat: 11.0 + Math.random() * 2, // Approximate TN lat range
          lng: 77.0 + Math.random() * 3  // Approximate TN lng range
        };
        await setDoc(doc(db, 'wards', wardId), wardData);
      }
      console.log(`- Seeded Wards for ${city}`);
      
      // Create an insight doc for the city
      await setDoc(doc(db, 'dashboard_insights', city.toLowerCase()), generateInsights(city));
      console.log(`- Seeded Insights for ${city}`);
    }
    
    // Default fallback insight
    await setDoc(doc(db, 'dashboard_insights', 'demo_insight'), generateInsights('Tamil Nadu'));
    
    console.log('Done!');
  } catch (err) {
    console.error('Error seeding:', err);
  }
  process.exit(0);
}

seed();
