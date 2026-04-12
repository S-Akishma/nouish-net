const express = require('express');
const db = require('../database');
const { auth } = require('../middleware/auth');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL   = 'llama-3.1-8b-instant';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Core Groq caller (server-side)
async function callGroq(systemPrompt, userMessage, history = []) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set in .env');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 400, temperature: 0.7 })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

// AI Chatbot endpoint (server proxies Groq — keeps key safe)
router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const systemPrompt = `You are NourishBot, an AI assistant for NourishNet — a food redistribution platform in India connecting food donors (restaurants, caterers, hotels, event hosts) with orphanages and NGOs.

You help with:
- Finding nearest food donors by location (AI sorts by distance automatically)
- Food listings: name, type (veg/non-veg/vegan/jain), category (cooked/catered/raw/packaged/bakery/dairy)
- Requesting food, delivery tracking: Pending → Accepted → Out for Delivery → Delivered
- Expired food is automatically hidden from all listings once expiry time passes
- Live route map shows pickup and dropoff after delivery is accepted
- Split view shows all donors and receivers simultaneously on one map
- Overview page has pie charts and Groq AI-generated platform insights

Be warm, concise, encouraging. Use emojis sparingly.`;

  try {
    const reply = await callGroq(systemPrompt, message, history);
    res.json({ response: reply, model: GROQ_MODEL });
  } catch (err) {
    // Smart rule-based fallback if Groq key not set
    const m = message.toLowerCase();
    let reply = "I can help with food donations, requests, delivery tracking, and expiry rules! Try: 'How does expiry work?' or 'Find nearest donors'.";
    if (/expir|disappear|gone/.test(m)) reply = "Food listings automatically disappear once their expiry time passes ⏰ This ensures receivers only see fresh, safe food.";
    else if (/nearest|near|match|distance/.test(m)) reply = "Click 'AI Match' on your dashboard to find nearest donors sorted by GPS distance — closest first!";
    else if (/donat|add|list|post/.test(m)) reply = "To donate: click '+ Add Food' on your Provider Dashboard. Fill in food name, type, category, quantity, expiry time, and set your pickup location.";
    else if (/track|status|deliver/.test(m)) reply = "Track deliveries in 'My Requests' tab. Status goes: Pending → Accepted → Out for Delivery → Delivered with a live route map!";
    else if (/hello|hi|hey/.test(m)) reply = "Hello! 👋 I'm NourishBot, powered by Groq AI. I can help you donate food, request food, track deliveries, and more!";
    else if (/groq|api|key/.test(m)) reply = "To enable full Groq AI: set GROQ_API_KEY in server/.env. Get a free key at console.groq.com/keys";
    res.json({ response: reply, model: 'fallback' });
  }
});

// AI Match — nearest non-expired donors for receiver
router.get('/match', auth, (req, res) => {
  db.get('SELECT lat, lng, name, location_address FROM users WHERE id=?', [req.user.id], (err, receiver) => {
    if (err || !receiver) return res.status(500).json({ error: 'User not found' });

    // FIX: Use default coords if receiver never set location
    const rLat = receiver.lat || 13.0827;
    const rLng = receiver.lng || 80.2707;

    // FIX: Get ALL food listings including ones with no requests at all
    const sql = `
      SELECT f.*, u.name as provider_name, u.provider_type,
             u.lat as provider_lat, u.lng as provider_lng, u.location_address as provider_addr
      FROM food_listings f JOIN users u ON f.provider_id=u.id
      WHERE f.id NOT IN (
        SELECT food_id FROM requests WHERE status NOT IN ('rejected')
      )
      AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now'))
      ORDER BY f.created_at DESC
    `;
    db.all(sql, [], (err2, foods) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // FIX: Return all foods even if no match (empty array instead of error)
      const matched = foods.map(f => ({
        ...f,
        distance_km: Math.round(haversine(
          rLat, rLng,
          f.lat || f.provider_lat || 13.0827,
          f.lng || f.provider_lng || 80.2707
        ) * 10) / 10
      })).sort((a, b) => a.distance_km - b.distance_km);

      res.json({ receiver: receiver.name, matches: matched, total: matched.length });
    });
  });
});

// Live feed — donors + receivers for split view (expiry filtered)
router.get('/live-feed', auth, (req, res) => {
  const foodSql = `
    SELECT f.*, u.name as provider_name, u.provider_type,
           u.lat as provider_lat, u.lng as provider_lng, u.location_address as provider_addr
    FROM food_listings f JOIN users u ON f.provider_id=u.id
    WHERE f.id NOT IN (SELECT food_id FROM requests WHERE status NOT IN ('rejected'))
    AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now'))
    ORDER BY f.created_at DESC LIMIT 20
  `;
  db.all(foodSql, [], (err, foods) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(`SELECT id,name,lat,lng,location_address FROM users WHERE role='orphanage' ORDER BY created_at DESC`, [], (err2, receivers) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const enriched = foods.map(f => {
        const fLat = f.lat || f.provider_lat || 13.0827;
        const fLng = f.lng || f.provider_lng || 80.2707;
        const nearby = receivers.map(r => ({
          ...r,
          distance_km: Math.round(haversine(fLat, fLng, r.lat || 13.0827, r.lng || 80.2707) * 10) / 10
        })).sort((a, b) => a.distance_km - b.distance_km).slice(0, 3);
        return { ...f, nearest_receivers: nearby };
      });

      res.json({ foods: enriched, receivers });
    });
  });
});

// Public nearby suggestion (no auth required)
router.post('/suggest-nearby', (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.json({ message: 'Share your location to see the nearest food donors!' });

  const sql = `
    SELECT f.food_name, f.quantity, f.food_type, u.name as provider_name, u.lat as plat, u.lng as plng
    FROM food_listings f JOIN users u ON f.provider_id=u.id
    WHERE f.id NOT IN (SELECT food_id FROM requests WHERE status NOT IN ('rejected'))
    AND (f.expiry_time IS NULL OR datetime(f.expiry_time) > datetime('now'))
    LIMIT 20
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.json({ message: 'Could not fetch nearby donors.' });

    const sorted = rows.map(r => ({
      ...r,
      dist: haversine(parseFloat(lat), parseFloat(lng), r.plat || 13.0827, r.plng || 80.2707)
    })).sort((a, b) => a.dist - b.dist).slice(0, 3);

    if (sorted.length === 0) return res.json({ message: 'No food available near you right now. Check back soon!' });

    const summary = sorted.map(r => `${r.provider_name} (${r.dist.toFixed(1)}km) — ${r.food_name} for ${r.quantity} people`).join('; ');
    res.json({ message: `Nearest donors: ${summary}. Sign up to request!`, matches: sorted });
  });
});

module.exports = router;
