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
router.post('/add', auth, restrictTo('provider'), upload.single('image'), async (req, res) => {
  try {
    const { food_name, food_type, food_category, description, quantity, prep_time, expiry_time, lat, lng, location_address } = req.body;
    const provider_id = req.user.id;
    const image = req.file ? req.file.filename : null;

    const userResult = await db.execute({ sql: 'SELECT lat, lng FROM users WHERE id = ?', args: [provider_id] });
    const user = userResult.rows[0];

    const finalLat = parseFloat(lat) || user?.lat || 13.0827;
    const finalLng = parseFloat(lng) || user?.lng || 80.2707;

    const result = await db.execute({
      sql: 'INSERT INTO food_listings (provider_id, food_name, food_type, food_category, description, image, quantity, prep_time, expiry_time, lat, lng, location_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      args: [provider_id, food_name || 'Food Item', food_type || 'veg', food_category || 'cooked',
             description || '', image, parseInt(quantity), prep_time || null, expiry_time || null,
             finalLat, finalLng, location_address || '']
    });

    res.status(201).json({ message: 'Food listed', foodId: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All available food sorted by proximity
router.get('/all', auth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT f.*, u.name as provider_name, u.provider_type, u.lat as user_lat, u.lng as user_lng
            FROM food_listings f JOIN users u ON f.provider_id = u.id
            WHERE f.id NOT IN (
              SELECT food_id FROM requests WHERE status NOT IN ('rejected','delivered')
            )
            AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now','+5 hours','+30 minutes'))
            ORDER BY f.created_at DESC`,
      args: []
    });

    let rows = result.rows;

    const userResult = await db.execute({ sql: 'SELECT lat, lng FROM users WHERE id = ?', args: [req.user.id] });
    const user = userResult.rows[0];

    if (user?.lat && user?.lng) {
      rows = rows.map(r => ({
        ...r,
        distance_km: Math.round(haversine(user.lat, user.lng,
          r.lat || r.user_lat || 13.0827,
          r.lng || r.user_lng || 80.2707) * 10) / 10
      }));
      rows.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nearby food (public)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const result = await db.execute({
      sql: `SELECT f.*, u.name as provider_name, u.provider_type, u.lat as user_lat, u.lng as user_lng
            FROM food_listings f JOIN users u ON f.provider_id = u.id
            WHERE f.id NOT IN (
              SELECT food_id FROM requests WHERE status NOT IN ('rejected','delivered')
            )
            AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now'))
            ORDER BY f.created_at DESC LIMIT 20`,
      args: []
    });

    let rows = result.rows;
    if (lat && lng) {
      rows = rows.map(r => ({
        ...r,
        distance_km: haversine(parseFloat(lat), parseFloat(lng),
          r.lat || r.user_lat || 13.0827,
          r.lng || r.user_lng || 80.2707)
      }));
      rows.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    }

    res.json(rows.slice(0, 5));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Provider's own listings — only active, non-expired, non-delivered
router.get('/my-listings', auth, restrictTo('provider'), async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT f.*, 0 as is_expired
            FROM food_listings f
            WHERE f.provider_id = ?
            AND f.id NOT IN (SELECT food_id FROM requests WHERE status = 'delivered')
            AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now','+5 hours','+30 minutes'))
            ORDER BY f.created_at DESC`,
      args: [req.user.id]
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
router.get('/stats', async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT SUM(f.quantity) as meals_shared, COUNT(DISTINCT r.orphanage_id) as ngos_served
            FROM requests r JOIN food_listings f ON r.food_id = f.id`,
      args: []
    });
    const row = result.rows[0];
    res.json({ meals_shared: row?.meals_shared || 0, ngos_served: row?.ngos_served || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
