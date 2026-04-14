const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const upload = require('../middleware/upload');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res, next) => {
  upload.single('license')(req, res, (uploadErr) => {
    if (uploadErr) console.warn('License upload warning:', uploadErr.message);
    next();
  });
}, async (req, res) => {
  try {
    const { name, role, email, password, lat, lng, location_address, provider_type } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });
    if (!['provider', 'orphanage'].includes(role))
      return res.status(400).json({ message: 'Please select Food Donor or Food Receiver' });

    const license_path = req.file ? req.file.filename : null;
    const cleanEmail = email.trim().toLowerCase();

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [cleanEmail]
    });
    if (existing.rows.length > 0)
      return res.status(400).json({ message: 'This email is already registered. Please sign in.' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.execute({
      sql: `INSERT INTO users (name, role, email, password, lat, lng, location_address, license_path, provider_type, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      args: [
        name.trim(), role, cleanEmail, hash,
        parseFloat(lat) || 13.0827,
        parseFloat(lng) || 80.2707,
        (location_address && location_address !== 'undefined') ? location_address.trim() : '',
        license_path,
        provider_type || 'restaurant'
      ]
    });

    console.log('User created, id:', result.lastInsertRowid);
    res.status(201).json({ message: 'Account created successfully!' });

  } catch (err) {
    console.error('Register error:', err);
    if (err.message?.includes('UNIQUE'))
      return res.status(400).json({ message: 'Email already registered' });
    res.status(500).json({ message: 'Unexpected error: ' + err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email.trim().toLowerCase()]
    });

    if (result.rows.length === 0)
      return res.status(400).json({ message: 'No account found with this email' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Incorrect password' });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'nourish_fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id, name: user.name, role: user.role,
        email: user.email, verified: user.verified,
        provider_type: user.provider_type,
        lat: user.lat, lng: user.lng,
        location_address: user.location_address
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login error: ' + err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id,name,role,email,lat,lng,location_address,provider_type,verified FROM users WHERE id=?',
      args: [req.user.id]
    });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
