# 🚀 NourishNet Deployment Guide

## Option 1 — Render.com (Recommended, Free)

1. Push your project to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Set these settings:
   - **Build Command:** `cd server && npm install && cd ../client && npm install && npm run build`
   - **Start Command:** `cd server && node index.js`
   - **Environment:** Node
5. Add environment variables:
   - `JWT_SECRET` = any long random string
   - `PORT` = 5000
6. Click Deploy ✅

---

## Option 2 — Railway.app (Free tier available)

1. Push to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select your repo
4. Railway auto-detects `railway.json` config
5. Add env vars: `JWT_SECRET`, `PORT=5000`
6. Deploy ✅

---

## Option 3 — Run Locally (Development)

Terminal 1 (Backend):
```bash
cd server
npm install
node index.js
```

Terminal 2 (Frontend):
```bash
cd client
npm install
npm run dev
```

Open: http://localhost:5173

---

## Option 4 — Single Server (Production build)

```bash
# Build frontend
cd client
npm install
npm run build

# Start server (serves both API + frontend)
cd ../server
npm install
node index.js
```

Open: http://localhost:5000

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Server port (default 5000) |
| `JWT_SECRET` | Yes | Any random secret string |
| `ANTHROPIC_API_KEY` | Optional | Enables full Claude AI chatbot |

## Notes
- SQLite database is auto-created as `server/database/sqlite.db`
- Uploaded files go to `server/uploads/` (auto-created)
- For production, consider using PostgreSQL instead of SQLite
