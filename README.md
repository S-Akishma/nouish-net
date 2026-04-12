# 🌱 NourishNet v3.0 — Food Redistribution Platform
### Powered by Groq AI (Free & Fast)

A full-stack platform connecting food donors (restaurants, caterers, hotels, event hosts) with orphanages and NGOs. Built with React + Node.js + SQLite + **Groq AI**.

---

## 🤖 AI Setup (Groq — Free)

1. Go to **https://console.groq.com/keys**
2. Sign up for free (no credit card needed)
3. Create an API key
4. Add it in **two places**:

**Server** — `server/.env`:
```
GROQ_API_KEY=gsk_your_key_here
```

**Client** — `client/src/services/aiService.js`:
```js
const GROQ_API_KEY = 'gsk_your_key_here';
```

> The server uses Groq for the chatbot API endpoint.
> The client uses Groq directly for the Overview AI insights.
> Both fall back to smart rule-based responses if no key is set.

---

## 🚀 Quick Start

**Terminal 1 — Backend:**
```bash
cd server
npm install
node index.js
```
✅ You should see: `NourishNet server running on port 5000`

**Terminal 2 — Frontend:**
```bash
cd client
npm install
npm run dev
```
✅ Open: `http://localhost:5173`

---

## ✨ Features

| Feature | Description |
|---|---|
| **Groq AI Chatbot** | NourishBot on every page — llama-3.1-8b-instant model |
| **AI Match** | Sorts donors by GPS distance, Groq recommends best match |
| **AI Overview Insight** | Groq analyzes platform stats and writes insights |
| **Expiry Auto-Removal** | Expired food disappears automatically from receiver view |
| **Live Route Map** | Delivery routes shown on map after acceptance |
| **Split View** | Donors + receivers simultaneously with AI match lines |
| **Pie Charts** | Food type, category, request status breakdowns |

---

## 🗂 Project Structure

```
nourish-v3/
├── server/
│   ├── routes/
│   │   ├── ai.js       ← Groq chatbot + AI match endpoints
│   │   ├── auth.js
│   │   ├── food.js     ← Expiry-filtered queries
│   │   └── request.js
│   ├── .env            ← Add GROQ_API_KEY here
│   └── index.js
└── client/
    └── src/
        ├── services/
        │   ├── aiService.js  ← Groq API integration (add key here too)
        │   └── api.js
        ├── components/
        │   └── AIChatbot.jsx ← NourishBot UI
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx
            ├── Signup.jsx
            ├── ProviderDashboard.jsx
            ├── OrphanageDashboard.jsx
            └── Overview.jsx
```

---

## 🌐 Deploy

See `DEPLOY.md` for Render.com, Railway, and Heroku instructions.
Add `GROQ_API_KEY` as an environment variable in your deployment platform.
