/**
 * NourishNet AI Integration Service
 * ===================================
 * Powered by Groq API (Free & Fast)
 * Model: llama-3.1-8b-instant
 *
 * TO ENABLE FULL AI:
 * 1. Go to https://console.groq.com/keys
 * 2. Create a free account and generate an API key
 * 3. Paste it below as GROQ_API_KEY
 *
 * Groq is FREE, extremely fast, and requires no credit card for basic usage.
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY // ✅ safe// ← Paste your Groq key here: gsk_...
const GROQ_MODEL   = 'llama-3.1-8b-instant'; // Free, very fast model
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPTS = {
  chatbot: `You are NourishBot, an AI assistant for NourishNet — a food redistribution platform in India connecting food donors (restaurants, caterers, hotels, event hosts) with orphanages and NGOs.

You help with:
- Finding nearest food donors by location (AI sorts by distance automatically)
- Food listings: name, type (veg/non-veg/vegan/jain), category (cooked/catered/raw/packaged/bakery/dairy)
- Requesting food, delivery tracking: Pending → Accepted → Out for Delivery → Delivered
- Expired food is automatically hidden from all listings once expiry time passes
- Live route map shows pickup and dropoff after delivery is accepted
- Split view shows all donors and receivers simultaneously on one map
- Overview page has pie charts and Groq AI-generated platform insights

Be warm, concise, encouraging. Use emojis sparingly. Always respond in the same language the user writes in.`,

  overview: `You are a food redistribution platform analyst for NourishNet.
Give a 3-4 sentence insight from the platform data. Include:
1. Total impact (meals delivered, servings)
2. Most active donor or location with specific numbers
3. One actionable recommendation to improve reach
Be specific with numbers. Write in a helpful, encouraging tone.`,
};

/**
 * Core Groq API caller
 * Uses OpenAI-compatible endpoint — works with fetch directly from browser
 */
async function callGroq(systemPrompt, userMessage, history = []) {
  if (!GROQ_API_KEY) throw new Error('No Groq API key set');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.text
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 400,
      temperature: 0.7,
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'Groq API error');
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error('Empty response from Groq');
  return reply;
}

/**
 * CHATBOT — answers platform questions
 * Falls back to smart rule-based responses if no Groq key is set
 */
export async function getChatbotResponse(message, history = []) {
  try {
    return await callGroq(SYSTEM_PROMPTS.chatbot, message, history);
  } catch {
    return getRuleBasedResponse(message);
  }
}

function getRuleBasedResponse(msg) {
  const m = msg.toLowerCase();
  if (/expir|disappear|gone|removed|no longer|available/.test(m))
    return "Food listings automatically disappear once their expiry time passes ⏰ This ensures receivers only see fresh, safe food. Donors set the expiry time when listing food.";
  if (/nearest|near|close|km|distance|match/.test(m))
    return "Click 'AI Match' on your dashboard to instantly find the nearest donors. Food is sorted by your GPS distance — closest first!";
  if (/donat|add|list|post|give/.test(m))
    return "To donate: click '+ Add Food' on your Provider Dashboard. Fill in food name, type (Veg/Non-Veg), category (Cooked/Catered/etc.), quantity, expiry time, and set your pickup location on the map.";
  if (/expiry|best before|time|when/.test(m))
    return "Every food listing has a 'Best Before' expiry time. Once that time passes, the listing automatically disappears from the receiver's view. This keeps only safe, fresh food visible!";
  if (/cater|event|wedding|function/.test(m))
    return "Catering events often have large surpluses! Select 'Catered / Event Food' as the category. Even food from a 50-person event can feed an entire orphanage. Every plate counts! 🍱";
  if (/track|status|deliver|where/.test(m))
    return "Track deliveries in 'My Requests' tab. Status: Pending → Accepted → Out for Delivery → Delivered. A live route map shows pickup and dropoff once accepted!";
  if (/split|view|both|donor.*receiver/.test(m))
    return "The 'Split View' tab shows all active donors on the left, all receivers on the right, and a combined map with AI match lines connecting the nearest pairs!";
  if (/overview|chart|pie|analytics/.test(m))
    return "The Overview page shows pie charts (food type, category, request status), monthly activity bars, top active locations, and Groq AI-generated platform insights!";
  if (/hello|hi|hey|start/.test(m))
    return "Hello! 👋 I'm NourishBot, powered by Groq AI. I can help you donate food, request food, understand expiry rules, track deliveries, and more. What do you need today?";
  if (/register|sign up|account|join/.test(m))
    return "To register: go to /signup, choose 'Food Donor' or 'Food Receiver', fill your details, set your location on the map, and optionally upload your license/certificate. It only takes a minute!";
  if (/groq|api|key|ai/.test(m))
    return "NourishBot is powered by Groq AI (llama-3.1-8b-instant). Get a free API key at console.groq.com/keys and add it to client/src/services/aiService.js to enable full AI responses!";
  return "I can help with food donations, requests, delivery tracking, expiry rules, and platform navigation! Try asking: 'How does expiry work?' or 'Find nearest donors'.";
}

/**
 * OVERVIEW INSIGHT — generates Groq AI analysis of platform stats
 */
export async function generateOverviewInsight(stats) {
  const summary = `
NourishNet platform data:
- Food listings: ${stats.totalFoods?.count || 0}
- Delivered: ${stats.totalDelivered?.count || 0} requests
- Pending: ${stats.totalPending?.count || 0}
- Servings delivered: ${stats.servingsDelivered?.total || 0}
- Donors: ${stats.totalProviders?.count || 0}, Receivers: ${stats.totalReceivers?.count || 0}
- Food types: ${JSON.stringify(stats.foodByType || [])}
- Top providers: ${JSON.stringify(stats.topProviders?.slice(0, 3) || [])}
- Most active locations: ${JSON.stringify(stats.locationActivity?.slice(0, 3) || [])}
  `;
  try {
    return await callGroq(SYSTEM_PROMPTS.overview, `Analyze this platform data:\n${summary}`);
  } catch {
    return generateFallbackInsight(stats);
  }
}

function generateFallbackInsight(d) {
  const delivered = d.totalDelivered?.count || 0;
  const servings  = d.servingsDelivered?.total || 0;
  const topProv   = d.topProviders?.[0];
  const topLoc    = d.locationActivity?.[0];
  const vegCount  = d.foodByType?.find(t => t.food_type === 'veg')?.count || 0;
  const totalFoods = d.totalFoods?.count || 1;
  const vegPct    = Math.round((vegCount / totalFoods) * 100);
  return `NourishNet has delivered ${delivered} food requests totalling ${servings} servings.${topProv ? ` Top donor: "${topProv.name}" (${topProv.provider_type}) with ${topProv.total_servings} servings across ${topProv.listing_count} listings.` : ''} ${topLoc ? `Most active location: "${topLoc.location_address}" contributing ${topLoc.total_food} servings.` : ''} ${vegPct}% of listings are vegetarian. Recommendation: Onboard more caterers and event hosts in areas with high receiver density to maximize food redistribution.`;
}

/**
 * EXPIRY CHECKER — client-side helpers used by UI components
 */
export function isExpired(expiryTime) {
  if (!expiryTime) return false;
  return new Date(expiryTime) <= new Date();
}

export function getExpiryStatus(expiryTime) {
  if (!expiryTime) return { expired: false, label: 'No expiry set', color: 'earth' };
  const expiry  = new Date(expiryTime);
  const now     = new Date();
  const diffMs  = expiry - now;
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffMs  <= 0)  return { expired: true,  label: 'Expired',                                          color: 'red'  };
  if (diffHrs <= 1)  return { expired: false, label: `Expires in ${Math.round(diffMs / 60000)} min`,     color: 'red'  };
  if (diffHrs <= 3)  return { expired: false, label: `Expires in ${Math.round(diffHrs)}h`,               color: 'warm' };
  if (diffHrs <= 24) return { expired: false, label: `Expires in ${Math.round(diffHrs)}h`,               color: 'warm' };
  return { expired: false, label: new Date(expiryTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }), color: 'earth' };
}
