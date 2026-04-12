const express = require('express');
const db = require('../database');
const { auth, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Add food listing
router.post('/add', auth, restrictTo('provider'), upload.single('image'), (req, res) => {
  const { food_name, food_type, food_category, description, quantity, prep_time, expiry_time, lat, lng, location_address } = req.body;
  const provider_id = req.user.id;
  const image = req.file ? req.file.filename : null;

  db.get('SELECT lat, lng FROM users WHERE id = ?', [provider_id], (err, user) => {
    const finalLat = parseFloat(lat) || user?.lat || 13.0827;
    const finalLng = parseFloat(lng) || user?.lng || 80.2707;

    db.run(
      'INSERT INTO food_listings (provider_id, food_name, food_type, food_category, description, image, quantity, prep_time, expiry_time, lat, lng, location_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [provider_id, food_name || 'Food Item', food_type || 'veg', food_category || 'cooked',
       description || '', image, parseInt(quantity), prep_time || null, expiry_time || null,
       finalLat, finalLng, location_address || ''],
      function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(201).json({ message: 'Food listed', foodId: this.lastID });
      }
    );
  });
});

// All AVAILABLE (non-expired) food sorted by proximity
router.get('/all', auth, (req, res) => {
  // KEY FIX: expiry_time filter — exclude expired food automatically
  const sql = `
    SELECT f.*, u.name as provider_name, u.provider_type, u.lat as user_lat, u.lng as user_lng
    FROM food_listings f
    JOIN users u ON f.provider_id = u.id
    WHERE f.id NOT IN (SELECT food_id FROM requests WHERE status NOT IN ('rejected'))
    AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now'))AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now', '+5 hours', '+30 minutes'))
    ORDER BY f.created_at DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT lat, lng FROM users WHERE id = ?', [req.user.id], (err2, user) => {
      if (user?.lat && user?.lng) {
        rows.forEach(r => {
          r.distance_km = Math.round(haversine(user.lat, user.lng,
            r.lat || r.user_lat || 13.0827, r.lng || r.user_lng || 80.2707) * 10) / 10;
        });
        rows.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
      }
      res.json(rows);
    });
  });
});

// Public nearby — also expiry-filtered
router.get('/nearby', (req, res) => {
  const { lat, lng } = req.query;
  const sql = `
    SELECT f.*, u.name as provider_name, u.provider_type, u.lat as user_lat, u.lng as user_lng
    FROM food_listings f JOIN users u ON f.provider_id = u.id
    WHERE f.id NOT IN (SELECT food_id FROM requests WHERE status NOT IN ('rejected'))
    AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now'))
    ORDER BY f.created_at DESC LIMIT 20
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (lat && lng) {
      rows.forEach(r => {
        r.distance_km = haversine(parseFloat(lat), parseFloat(lng), r.lat || r.user_lat || 13.0827, r.lng || r.user_lng || 80.2707);
      });
      rows.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }
    res.json(rows.slice(0, 5));
  });
});

// Provider's own listings — shows ALL including expired (with expiry status)
router.get('/my-listings', auth, restrictTo('provider'), (req, res) => {
  db.all(`
    SELECT *,
      CASE WHEN expiry_time IS NOT NULL 
        AND datetime(expiry_time) <= datetime('now', '+5 hours', '+30 minutes') 
        THEN 1 ELSE 0 END as is_expired
    FROM food_listings WHERE provider_id = ? ORDER BY created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
router.get('/stats', (req, res) => {
  db.get(`
    SELECT 
      SUM(f.quantity) as meals_shared,
      COUNT(DISTINCT r.orphanage_id) as ngos_served
    FROM requests r
    JOIN food_listings f ON r.food_id = f.id
  `, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      meals_shared: row?.meals_shared || 0,
      ngos_served: row?.ngos_served || 0
    });
  });
});
module.exports = router;
