const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
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
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS food_listings (
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
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_id INTEGER NOT NULL,
    orphanage_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS delivery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    partner_name TEXT,
    contact TEXT,
    status TEXT DEFAULT 'pending',
    route_data TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Safe upgrades - ignore errors if column exists
  const addCol = (t, c, d) => db.run(`ALTER TABLE ${t} ADD COLUMN ${c} ${d}`, () => {});
  addCol('food_listings', 'food_name', 'TEXT DEFAULT "Food Item"');
  addCol('food_listings', 'food_type', 'TEXT DEFAULT "veg"');
  addCol('food_listings', 'food_category', 'TEXT DEFAULT "cooked"');
  addCol('food_listings', 'description', 'TEXT');
  addCol('food_listings', 'location_address', 'TEXT');
  addCol('food_listings', 'status', 'TEXT DEFAULT "available"');
  addCol('users', 'location_address', 'TEXT');
  addCol('users', 'provider_type', 'TEXT DEFAULT "restaurant"');
  addCol('delivery', 'route_data', 'TEXT');
  addCol('delivery', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
});

console.log('Database initialized');
module.exports = db;
