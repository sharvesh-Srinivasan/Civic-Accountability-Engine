export const mockWards = [
  { id: 'ward_del', name: 'Connaught Place', city: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { id: 'ward_mum', name: 'Andheri West', city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { id: 'ward_blr', name: 'Indiranagar', city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { id: 'ward_chn', name: 'T. Nagar', city: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { id: 'ward_hyd', name: 'Banjara Hills', city: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { id: 'ward_kol', name: 'Park Street', city: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { id: 'ward_pun', name: 'Koregaon Park', city: 'Pune', lat: 18.5204, lng: 73.8567 },
  { id: 'ward_ahm', name: 'Navrangpura', city: 'Ahmedabad', lat: 23.0225, lng: 72.5714 }
];

export const mockUsers = [
  { id: 'u1', displayName: 'Jane Doe', email: 'jane@example.com', civicScore: 850, badges: ['Ward Guardian'], wardId: 'ward_del', city: 'Delhi' },
  { id: 'u2', displayName: 'Ravi Kumar', email: 'ravi@example.com', civicScore: 720, badges: [], wardId: 'ward_mum', city: 'Mumbai' },
  { id: 'u3', displayName: 'Sarah Smith', email: 'sarah@example.com', civicScore: 610, badges: [], wardId: 'ward_blr', city: 'Bangalore' },
  { id: 'auth1', displayName: 'Public Works Dept', role: 'authority', trustScore: 92, city: 'Delhi', wardId: 'ward_del' },
  { id: 'auth2', displayName: 'City Sanitation', role: 'authority', trustScore: 42, city: 'Mumbai', wardId: 'ward_mum' },
];

export const mockReports = [
  // Delhi
  { id: 'r1_del', category: 'pothole', severity: 'high', description: 'Massive crater causing accidents.', summary: 'Large pothole on Inner Circle', lat: 28.6320, lng: 77.2200, wardId: 'ward_del', status: 'acknowledged', reporterName: 'Jane Doe', reporterId: 'u1', createdAt: { toDate: () => new Date(Date.now() - 3 * 86400000) } },
  { id: 'r2_del', category: 'garbage', severity: 'medium', description: 'Overflowing dumpsters near the metro.', summary: 'Metro station waste dump', lat: 28.6280, lng: 77.2150, wardId: 'ward_del', status: 'open', reporterName: 'Anil Gupta', reporterId: 'u4', createdAt: { toDate: () => new Date(Date.now() - 5 * 86400000) } },
  // Mumbai
  { id: 'r1_mum', category: 'water_leak', severity: 'high', description: 'Main pipe burst flooding the street.', summary: 'Water main burst', lat: 19.1200, lng: 72.8250, wardId: 'ward_mum', status: 'open', reporterName: 'Ravi Kumar', reporterId: 'u2', createdAt: { toDate: () => new Date(Date.now() - 1 * 86400000) } },
  { id: 'r2_mum', category: 'infrastructure', severity: 'low', description: 'Broken pavement on Link Road.', summary: 'Damaged sidewalk', lat: 19.1350, lng: 72.8300, wardId: 'ward_mum', status: 'resolved', reporterName: 'Priya Desai', reporterId: 'u5', createdAt: { toDate: () => new Date(Date.now() - 15 * 86400000) } },
  { id: 'r3_mum', category: 'streetlight', severity: 'medium', description: 'Entire block is dark.', summary: 'Blackout on 4th Cross', lat: 19.1150, lng: 72.8400, wardId: 'ward_mum', status: 'acknowledged', reporterName: 'Rahul M', reporterId: 'u6', createdAt: { toDate: () => new Date(Date.now() - 2 * 86400000) } },
  // Bangalore
  { id: 'r1_blr', category: 'traffic', severity: 'high', description: 'Signal not working at 100ft road.', summary: 'Broken traffic light', lat: 12.9750, lng: 77.6400, wardId: 'ward_blr', status: 'open', reporterName: 'Sarah Smith', reporterId: 'u3', createdAt: { toDate: () => new Date(Date.now() - 4 * 86400000) } },
  { id: 'r2_blr', category: 'garbage', severity: 'high', description: 'Illegal dumping ground forming.', summary: 'Empty lot dumping', lat: 12.9800, lng: 77.6450, wardId: 'ward_blr', status: 'acknowledged', reporterName: 'Karthik', reporterId: 'u7', createdAt: { toDate: () => new Date(Date.now() - 7 * 86400000) } },
  // Chennai
  { id: 'r1_chn', category: 'pothole', severity: 'medium', description: 'Multiple potholes after the rain.', summary: 'Post-monsoon road damage', lat: 13.0400, lng: 80.2350, wardId: 'ward_chn', status: 'resolved', reporterName: 'Manoj', reporterId: 'u8', createdAt: { toDate: () => new Date(Date.now() - 20 * 86400000) } },
  { id: 'r2_chn', category: 'water_leak', severity: 'medium', description: 'Stagnant sewage water.', summary: 'Sewage block', lat: 13.0450, lng: 80.2400, wardId: 'ward_chn', status: 'open', reporterName: 'Vikram', reporterId: 'u9', createdAt: { toDate: () => new Date(Date.now() - 2 * 86400000) } },
  // Hyderabad
  { id: 'r1_hyd', category: 'streetlight', severity: 'medium', description: 'Flickering lights causing nuisance.', summary: 'Faulty streetlights', lat: 17.4150, lng: 78.4450, wardId: 'ward_hyd', status: 'acknowledged', reporterName: 'Sanjay', reporterId: 'u10', createdAt: { toDate: () => new Date(Date.now() - 6 * 86400000) } },
  // Kolkata
  { id: 'r1_kol', category: 'infrastructure', severity: 'high', description: 'Heritage wall collapsing.', summary: 'Dangerous wall structure', lat: 22.5550, lng: 88.3500, wardId: 'ward_kol', status: 'open', reporterName: 'Arjun', reporterId: 'u11', createdAt: { toDate: () => new Date(Date.now() - 10 * 86400000) } },
  // Pune
  { id: 'r1_pun', category: 'garbage', severity: 'low', description: 'Dry leaves not collected for weeks.', summary: 'Uncollected dry waste', lat: 18.5350, lng: 73.9000, wardId: 'ward_pun', status: 'resolved', reporterName: 'Sneha', reporterId: 'u12', createdAt: { toDate: () => new Date(Date.now() - 30 * 86400000) } },
  // Ahmedabad
  { id: 'r1_ahm', category: 'pothole', severity: 'medium', description: 'Road sinking near the circle.', summary: 'Road cave-in warning', lat: 23.0350, lng: 72.5550, wardId: 'ward_ahm', status: 'acknowledged', reporterName: 'Meet', reporterId: 'u13', createdAt: { toDate: () => new Date(Date.now() - 8 * 86400000) } },
];

export const mockCommitments = [
  {
    id: 'c1_del',
    reportId: 'r1_del',
    authorityName: 'Public Works Dept',
    promisedAction: 'Will dispatch a crew to fill the pothole within 48 hours.',
    etaDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    status: 'pending',
    createdAt: { toDate: () => new Date(Date.now() - 1 * 86400000) }
  },
  {
    id: 'c2_mum',
    reportId: 'r1_mum',
    authorityName: 'City Sanitation',
    promisedAction: 'Emergency crew dispatched to fix the leak.',
    etaDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    status: 'broken', // Seeded broken commitment
    createdAt: { toDate: () => new Date(Date.now() - 14 * 86400000) }
  },
  {
    id: 'c3_chn',
    reportId: 'r1_chn',
    authorityName: 'Road Ways',
    promisedAction: 'Contractor assigned to repave the section.',
    etaDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    status: 'honored',
    createdAt: { toDate: () => new Date(Date.now() - 18 * 86400000) }
  }
];

export const mockInsights = {
  demo_insight: {
    equityWatch: {
      wardName: 'Tech Park Area',
      text: 'has seen a 40% increase in overdue reports compared to neighboring areas. Resource allocation recommended.'
    },
    trustScore: {
      currentScore: 'B-',
      forecastText: 'Trust score is trending downwards due to recent broken commitments by City Sanitation.',
      sparkline: [40, 50, 60, 55, 45, 30, 20]
    },
    benchmarking: {
      poorWard: { name: 'Tech Park Area', days: 15, metric: 'sanitation issues' },
      bestWard: { name: 'Downtown District', days: 3 }
    }
  }
};
