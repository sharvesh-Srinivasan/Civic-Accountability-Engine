import express from 'express';
import { db } from '../config/firebase.js';

const router = express.Router();

const TAMIL_NADU_LOCALITIES = [
  // Chennai
  { id: 'chennai_adyar', name: 'Adyar', city: 'Chennai', lat: 13.0012, lng: 80.2565 },
  { id: 'chennai_velachery', name: 'Velachery', city: 'Chennai', lat: 12.9716, lng: 80.2189 },
  { id: 'chennai_tnagar', name: 'T. Nagar', city: 'Chennai', lat: 13.0418, lng: 80.2341 },
  { id: 'chennai_annanagar', name: 'Anna Nagar', city: 'Chennai', lat: 13.0846, lng: 80.2179 },
  { id: 'chennai_omr', name: 'OMR', city: 'Chennai', lat: 12.9065, lng: 80.2285 },
  { id: 'chennai_tambaram', name: 'Tambaram', city: 'Chennai', lat: 12.9229, lng: 80.1275 },
  
  // Coimbatore
  { id: 'cbe_rs_puram', name: 'RS Puram', city: 'Coimbatore', lat: 11.0076, lng: 76.9498 },
  { id: 'cbe_singanallur', name: 'Singanallur', city: 'Coimbatore', lat: 10.9925, lng: 77.0270 },
  { id: 'cbe_peelamedu', name: 'Peelamedu', city: 'Coimbatore', lat: 11.0264, lng: 77.0090 },
  { id: 'cbe_gandhipuram', name: 'Gandhipuram', city: 'Coimbatore', lat: 11.0183, lng: 76.9654 },
  { id: 'cbe_ukkadam', name: 'Ukkadam', city: 'Coimbatore', lat: 10.9904, lng: 76.9609 },
  
  // Madurai
  { id: 'mdu_meenakshi', name: 'Meenakshi Temple Area', city: 'Madurai', lat: 9.9195, lng: 78.1193 },
  { id: 'mdu_annanagar', name: 'Anna Nagar', city: 'Madurai', lat: 9.9250, lng: 78.1450 },
  { id: 'mdu_kknagar', name: 'KK Nagar', city: 'Madurai', lat: 9.9312, lng: 78.1565 },
  { id: 'mdu_kpudur', name: 'K Pudur', city: 'Madurai', lat: 9.9542, lng: 78.1414 },

  // Trichy
  { id: 'try_srirangam', name: 'Srirangam', city: 'Trichy', lat: 10.8628, lng: 78.6896 },
  { id: 'try_thillainagar', name: 'Thillai Nagar', city: 'Trichy', lat: 10.8305, lng: 78.6826 },
  { id: 'try_cantonment', name: 'Cantonment', city: 'Trichy', lat: 10.8050, lng: 78.6856 },

  // Salem
  { id: 'slm_alagapuram', name: 'Alagapuram', city: 'Salem', lat: 11.6775, lng: 78.1362 },
  { id: 'slm_hasthampatti', name: 'Hasthampatti', city: 'Salem', lat: 11.6738, lng: 78.1583 },
  { id: 'slm_suramangalam', name: 'Suramangalam', city: 'Salem', lat: 11.6745, lng: 78.1162 }
];

// GET /api/wards — list all wards
router.get('/', async (req, res) => {
  res.json(TAMIL_NADU_LOCALITIES);
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
