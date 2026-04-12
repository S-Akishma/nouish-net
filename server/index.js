require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('./database');
const authRoutes    = require('./routes/auth');
const foodRoutes    = require('./routes/food');
const requestRoutes = require('./routes/request');
const aiRoutes      = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Health check - visit http://localhost:5000/api/health to confirm server is running
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/request', requestRoutes);
app.use('/api/ai', aiRoutes);

// Serve React build in production
const clientBuild = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
} else {
  app.get('/', (req, res) => res.json({ status: 'NourishNet API v3.0', port: PORT }));
}

app.listen(PORT, () => {
  console.log('==========================================');
  console.log(`  NourishNet Server running on port ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log('==========================================');
});
