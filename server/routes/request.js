const express = require('express');
const db = require('../database');
const { auth, restrictTo } = require('../middleware/auth');
const router = express.Router();

// Safe string helper - prevents [object Object]
function safeStr(val, fallback = '') {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function buildRouteData(data, status) {
  return JSON.stringify({
    pickup: {
      lat: data.food_lat,
      lng: data.food_lng,
      address: safeStr(data.food_addr, 'Donor location')
    },
    dropoff: {
      lat: data.orphanage_lat,
      lng: data.orphanage_lng,
      address: safeStr(data.orphanage_addr, 'Receiver location')
    },
    status,
    updated_at: new Date().toISOString()
  });
}

// Orphanage requests food
router.post('/', auth, restrictTo('orphanage'), (req, res) => {
  const { food_id } = req.body;
  const orphanage_id = req.user.id;
  db.get('SELECT id FROM requests WHERE food_id=? AND orphanage_id=? AND status!=?',
    [food_id, orphanage_id, 'rejected'], (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existing) return res.status(400).json({ message: 'Already requested' });
      db.run('INSERT INTO requests (food_id, orphanage_id, status) VALUES (?,?,?)',
        [food_id, orphanage_id, 'pending'],
        function(e) {
          if (e) return res.status(500).json({ error: e.message });
          res.status(201).json({ message: 'Request submitted', requestId: this.lastID });
        });
    });
});

// Accept / Reject
router.put('/status', auth, restrictTo('provider', 'admin'), (req, res) => {
  const { request_id, status } = req.body;
  if (!['accepted', 'rejected'].includes(status))
    return res.status(400).json({ message: 'Invalid status' });
  db.run('UPDATE requests SET status=? WHERE id=?', [status, request_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (status === 'accepted') {
      db.get(`SELECT f.lat as food_lat, f.lng as food_lng, f.location_address as food_addr,
               u.lat as orphanage_lat, u.lng as orphanage_lng, u.location_address as orphanage_addr
        FROM requests r JOIN food_listings f ON r.food_id=f.id JOIN users u ON r.orphanage_id=u.id
        WHERE r.id=?`, [request_id], (e, data) => {
        if (!data) return;
        const routeData = buildRouteData(data, 'accepted');
        db.get('SELECT id FROM delivery WHERE request_id=?', [request_id], (e2, ex) => {
          if (ex) db.run('UPDATE delivery SET status=?,route_data=?,updated_at=CURRENT_TIMESTAMP WHERE request_id=?', ['accepted', routeData, request_id]);
          else db.run('INSERT INTO delivery (request_id,partner_name,contact,status,route_data) VALUES (?,?,?,?,?)', [request_id,'NourishNet Volunteer','TBA','accepted',routeData]);
        });
      });
    }
    res.json({ message: `Request ${status}` });
  });
});

// Update delivery milestone
router.put('/delivery', auth, restrictTo('provider', 'admin'), (req, res) => {
  const { request_id, status, partner_name, contact } = req.body;
  if (!['pending','accepted','out_for_delivery','delivered'].includes(status))
    return res.status(400).json({ message: 'Invalid delivery status' });
  db.get(`SELECT f.lat as food_lat, f.lng as food_lng, f.location_address as food_addr,
           u.lat as orphanage_lat, u.lng as orphanage_lng, u.location_address as orphanage_addr
    FROM requests r JOIN food_listings f ON r.food_id=f.id JOIN users u ON r.orphanage_id=u.id
    WHERE r.id=?`, [request_id], (err, data) => {
    const routeData = data ? buildRouteData(data, status) : null;
    db.run('UPDATE delivery SET partner_name=?,contact=?,status=?,route_data=?,updated_at=CURRENT_TIMESTAMP WHERE request_id=?',
      [partner_name||'NourishNet Volunteer', contact||'TBA', status, routeData, request_id], (e) => {
        if (e) return res.status(500).json({ error: e.message });
        db.run('UPDATE requests SET status=? WHERE id=?', [status, request_id], (e2) => {
          if (e2) return res.status(500).json({ error: e2.message });
          res.json({ message: `Delivery updated to ${status}` });
        });
      });
  });
});

// Provider incoming
router.get('/my-requests', auth, restrictTo('provider'), (req, res) => {
  db.all(`SELECT r.*, f.food_name, f.food_type, f.image, f.quantity,
           f.lat as food_lat, f.lng as food_lng, f.location_address as food_addr,
           u.name as orphanage_name, u.lat as orphanage_lat, u.lng as orphanage_lng,
           u.location_address as orphanage_addr,
           d.partner_name, d.contact, d.route_data, d.updated_at as delivery_updated
    FROM requests r JOIN food_listings f ON r.food_id=f.id JOIN users u ON r.orphanage_id=u.id
    LEFT JOIN delivery d ON d.request_id=r.id
    WHERE f.provider_id=? ORDER BY r.created_at DESC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Orphanage sent
router.get('/sent', auth, restrictTo('orphanage'), (req, res) => {
  db.all(`SELECT r.*, f.food_name, f.food_type, f.image, f.quantity, f.prep_time, f.expiry_time,
           f.lat as food_lat, f.lng as food_lng, f.location_address as food_addr,
           u.name as provider_name, u.provider_type,
           d.partner_name, d.contact, d.route_data, d.status as delivery_status, d.updated_at as delivery_updated
    FROM requests r JOIN food_listings f ON r.food_id=f.id JOIN users u ON f.provider_id=u.id
    LEFT JOIN delivery d ON d.request_id=r.id
    WHERE r.orphanage_id=? ORDER BY r.created_at DESC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Analytics
router.get('/analytics', auth, (req, res) => {
  const results = {};
  let done = 0;
  const queries = {
    totalDelivered: { sql: 'SELECT COUNT(*) as count FROM requests WHERE status="delivered"', method: 'get' },
    totalPending:   { sql: 'SELECT COUNT(*) as count FROM requests WHERE status="pending"', method: 'get' },
    totalFoods:     { sql: 'SELECT COUNT(*) as count FROM food_listings', method: 'get' },
    totalProviders: { sql: 'SELECT COUNT(*) as count FROM users WHERE role="provider"', method: 'get' },
    totalReceivers: { sql: 'SELECT COUNT(*) as count FROM users WHERE role="orphanage"', method: 'get' },
    servingsDelivered: { sql: 'SELECT SUM(f.quantity) as total FROM requests r JOIN food_listings f ON r.food_id=f.id WHERE r.status="delivered"', method: 'get' },
    foodByType:     { sql: 'SELECT food_type, COUNT(*) as count FROM food_listings GROUP BY food_type', method: 'all' },
    foodByCategory: { sql: 'SELECT food_category, COUNT(*) as count FROM food_listings GROUP BY food_category', method: 'all' },
    topProviders:   { sql: `SELECT u.name, u.provider_type, u.location_address, COUNT(f.id) as listing_count, SUM(f.quantity) as total_servings, MAX(f.created_at) as last_active FROM users u JOIN food_listings f ON f.provider_id=u.id GROUP BY u.id ORDER BY total_servings DESC LIMIT 6`, method: 'all' },
    locationActivity: { sql: `SELECT u.location_address, u.name as provider_name, u.provider_type, SUM(f.quantity) as total_food, COUNT(f.id) as listings FROM food_listings f JOIN users u ON f.provider_id=u.id WHERE u.location_address IS NOT NULL AND u.location_address!='' GROUP BY u.id ORDER BY total_food DESC LIMIT 8`, method: 'all' },
    monthlyActivity:  { sql: `SELECT strftime('%Y-%m', r.created_at) as month, COUNT(*) as requests, SUM(CASE WHEN r.status='delivered' THEN 1 ELSE 0 END) as delivered FROM requests r GROUP BY month ORDER BY month DESC LIMIT 6`, method: 'all' },
    statusBreakdown: { sql: `SELECT status, COUNT(*) as count FROM requests GROUP BY status`, method: 'all' },
  };
  const keys = Object.keys(queries);
  keys.forEach(key => {
    db[queries[key].method](queries[key].sql, [], (err, data) => {
      results[key] = err ? (queries[key].method === 'all' ? [] : {}) : data;
      done++;
      if (done === keys.length) res.json(results);
    });
  });
});

module.exports = router;
