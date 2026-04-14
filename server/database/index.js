const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_URL || 'file:sqlite.db',
  authToken: process.env.TURSO_TOKEN || undefined,
});

async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      lat REAL DEFAULT 13.0827,
      lng REAL DEFAULT 80.2707,
      location_address TEXT,
      license_path TEXT,
      provider_type TEXT DEFAULT 'restaurant',
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS food_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      food_name TEXT NOT NULL DEFAULT 'Food Item',
      food_type TEXT DEFAULT 'veg',
      food_category TEXT DEFAULT 'cooked',
      description TEXT,
      image TEXT,
      quantity INTEGER NOT NULL,
      prep_time DATETIME,
      expiry_time DATETIME,
      lat REAL,
      lng REAL,
      location_address TEXT,
      status TEXT DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL,
      orphanage_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS delivery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      partner_name TEXT,
      contact TEXT,
      status TEXT DEFAULT 'pending',
      route_data TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Turso Database initialized');
}

initDB().catch(err => console.error('DB init error:', err));

module.exports = db;
