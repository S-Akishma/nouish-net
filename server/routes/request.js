const express = require('express');
const db = require('../database');
const { auth, restrictTo } = require('../middleware/auth');
const router = express.Router();

function safeStr(val, fallback = '') {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function buildRouteData(data, status) {
  return JSON.stringify({
    pickup: { lat: data.food_lat, lng: data.food_lng, address: safeStr(data.food_addr, 'Donor location') },
    dropoff: { lat: data.orphanage_lat, lng: data.orphanage_lng, address: safeStr(data.orphanage_addr, 'Receiver location') },
    status,
    updated_at: new Date().toISOString()
  });
}

// Orphanage requests food
router.post('/', auth, restrictTo('orphanage'), async (req, res) => {
  try {
    const { food_id } = req.body;
    const orphanage_id = req.user.id;

    const existing = await db.execute({
      sql: 'SELECT id FROM requests WHERE food_id=? AND orphanage_id=? AND status!=?',
      args: [food_id, orphanage_id, 'rejected']
    });
    if (existing.rows.length > 0)
      return res.status(400).json({ message: 'Already requested' });

    const result = await db.execute({
      sql: 'INSERT INTO requests (food_id, orphanage_id, status) VALUES (?,?,?)',
      args: [food_id, orphanage_id, 'pending']
    });
    res.status(201).json({ message: 'Request submitted', requestId: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept / Reject
router.put('/status', auth, restrictTo('provider', 'admin'), async (req, res) => {
  try {
    const { request_id, status } = req.body;
    if (!['accepted', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    await db.execute({ sql: 'UPDATE requests SET status=? WHERE id=?', args: [status, request_id] });

    if (status === 'accepted') {
      const dataRes = await db.execute({
        sql: `SELECT f.lat as food_lat, f.lng as food_lng, f.location_address as food_addr,
               u.lat as orphanage_lat, u.lng as orphanage_lng, u.location_address as orphanage_addr
              FROM requests r JOIN food_listings f ON r.food_id=f.id JOIN users u ON r.orphanage_id=u.id
              WHERE r.id=?`,
        args: [request_id]
      });

      if (dataRes.rows.length > 0) {
        const data = dataRes.rows[0];
        const routeData = buildRouteData(data, 'accepted');

        const exRes = await db.execute({ sql: 'SELECT id FROM delivery WHERE request_id=?', args: [request_id] });
        if (exRes.rows.length > 0) {
          await db.execute({
            sql: 'UPDATE delivery SET status=?,route_data=?,updated_at=CURRENT_TIMESTAMP WHERE request_id=?',
            args: ['accepted', routeData, request_id]
          });
        } else {
          await db.execute({
            sql: 'INSERT INTO delivery (request_id,partner_name,contact,status,route_data) VALUES (?,?,?,?,?)',
            args: [request_id, 'NourishNet Volunteer', 'TBA', 'accepted', routeData]
          });
        }
      }
    }

    res.json({ message: `Request ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update delivery milestone
router.put('/delivery', auth, restrictTo('provider', 'admin'), async (req, res) => {
  try {
    const { request_id, status, partner_name, contact } = req.body;
    if (!['pending', 'accepted', 'out_for_delivery', 'delivered'].includes(status))
      return res.status(400).json({ message: 'Invalid delivery status' });

    const dataRes = await db.execute({
      sql: `SELECT f.lat as food_lat, f.lng as food_lng, f.location_address as food_addr,
             u.lat as orphanage_lat, u.lng as orphanage_lng, u.location_address as orphanage_addr
            FROM requests r JOIN food_listings f ON r.food_id=f.id JOIN users u ON r.orphanage_id=u.id
            WHERE r.id=?`,
      args: [request_id]
    });

    const routeData = dataRes.rows.length > 0 ? buildRouteData(dataRes.rows[0], status) : null;

    await db.execute({
      sql: 'UPDATE delivery SET partner_name=?,contact=?,status=?,route_data=?,updated_at=CURRENT_TIMESTAMP WHERE request_id=?',
      args: [partner_name || 'NourishNet Volunteer', contact || 'TBA', status, routeData, request_id]
    });

    await db.execute({ sql: 'UPDATE requests SET status=? WHERE id=?', args: [status, request_id] });

    res.json({ message: `Delivery updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Provider incoming requests
router.get('/my-requests', auth, restrictTo('provider'), async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT r.*, f.food_name, f.food_type, f.image, f.quantity,
             f.lat as food_lat, f.lng as food_lng, f.location_address as food_addr,
             u.name as orphanage_name, u.lat as orphanage_lat, u.lng as orphanage_lng,
             u.location_address as orphanage_addr,
             d.partner_name, d.contact, d.route_data, d.updated_at as delivery_updated
            FROM requests r JOIN food_listings f ON r.food_id=f.id JOIN users u ON r.orphanage_id=u.id
            LEFT JOIN delivery d ON d.request_id=r.id
            WHERE f.provider_id=? ORDER BY r.created_at DESC`,
      args: [req.user.id]
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orphanage sent requests
router.get('/sent', auth, restrictTo('orphanage'), async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT r.*, f.food_name, f.food_type, f.image, f.quantity, f.prep_time, f.expiry_time,
             f.lat as food_lat, f.lng as food_lng, f.location_address as food_addr,
             u.name as provider_name, u.provider_type,
             d.partner_name, d.contact, d.route_data, d.status as delivery_status, d.updated_at as delivery_updated
            FROM requests r JOIN food_listings f ON r.food_id=f.id JOIN users u ON f.provider_id=u.id
            LEFT JOIN delivery d ON d.request_id=r.id
            WHERE r.orphanage_id=? ORDER BY r.created_at DESC`,
      args: [req.user.id]
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const [
      totalDelivered, totalPending, totalFoods,
      totalProviders, totalReceivers, servingsDelivered,
      foodByType, foodByCategory, topProviders,
      locationActivity, monthlyActivity, statusBreakdown
    ] = await Promise.all([
      db.execute({ sql: 'SELECT COUNT(*) as count FROM requests WHERE status="delivered"', args: [] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM requests WHERE status="pending"', args: [] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM food_listings', args: [] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM users WHERE role="provider"', args: [] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM users WHERE role="orphanage"', args: [] }),
      db.execute({ sql: 'SELECT SUM(f.quantity) as total FROM requests r JOIN food_listings f ON r.food_id=f.id WHERE r.status="delivered"', args: [] }),
      db.execute({ sql: 'SELECT food_type, COUNT(*) as count FROM food_listings GROUP BY food_type', args: [] }),
      db.execute({ sql: 'SELECT food_category, COUNT(*) as count FROM food_listings GROUP BY food_category', args: [] }),
      db.execute({ sql: `SELECT u.name, u.provider_type, u.location_address, COUNT(f.id) as listing_count, SUM(f.quantity) as total_servings, MAX(f.created_at) as last_active FROM users u JOIN food_listings f ON f.provider_id=u.id GROUP BY u.id ORDER BY total_servings DESC LIMIT 6`, args: [] }),
      db.execute({ sql: `SELECT u.location_address, u.name as provider_name, u.provider_type, SUM(f.quantity) as total_food, COUNT(f.id) as listings FROM food_listings f JOIN users u ON f.provider_id=u.id WHERE u.location_address IS NOT NULL AND u.location_address!='' GROUP BY u.id ORDER BY total_food DESC LIMIT 8`, args: [] }),
      db.execute({ sql: `SELECT strftime('%Y-%m', r.created_at) as month, COUNT(*) as requests, SUM(CASE WHEN r.status='delivered' THEN 1 ELSE 0 END) as delivered FROM requests r GROUP BY month ORDER BY month DESC LIMIT 6`, args: [] }),
      db.execute({ sql: 'SELECT status, COUNT(*) as count FROM requests GROUP BY status', args: [] }),
    ]);

    // Convert BigInt values from Turso/libsql to plain numbers
    const toNum = (v) => v === null || v === undefined ? 0 : Number(v);
    const fixRow = (row) => {
      const out = {};
      for (const k of Object.keys(row)) out[k] = typeof row[k] === 'bigint' ? Number(row[k]) : row[k];
      return out;
    };
    const fixRows = (rows) => rows.map(fixRow);

    res.json({
      totalDelivered: fixRow(totalDelivered.rows[0] || { count: 0 }),
      totalPending:   fixRow(totalPending.rows[0]   || { count: 0 }),
      totalFoods:     fixRow(totalFoods.rows[0]     || { count: 0 }),
      totalProviders: fixRow(totalProviders.rows[0] || { count: 0 }),
      totalReceivers: fixRow(totalReceivers.rows[0] || { count: 0 }),
      servingsDelivered: fixRow(servingsDelivered.rows[0] || { total: 0 }),
      foodByType:      fixRows(foodByType.rows),
      foodByCategory:  fixRows(foodByCategory.rows),
      topProviders:    fixRows(topProviders.rows),
      locationActivity: fixRows(locationActivity.rows),
      monthlyActivity:  fixRows(monthlyActivity.rows),
      statusBreakdown:  fixRows(statusBreakdown.rows),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
