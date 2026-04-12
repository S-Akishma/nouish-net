import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Leaf, LogOut, Clock, Users, CheckCircle, MapPin,
  Package, Navigation, Heart, ChevronDown, ChevronUp,
  Truck, Sparkles, LayoutGrid, RefreshCw, Zap, TrendingUp
} from 'lucide-react';
import AIChatbot from '../components/AIChatbot';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

function StatusTracker({ status }) {
  const steps = [
    { key: 'pending', label: 'Requested' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'out_for_delivery', label: 'On the Way' },
    { key: 'delivered', label: 'Delivered' },
  ];
  const idx = steps.findIndex(s => s.key === status);
  return (
    <div className="flex items-center mt-3">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <div className={`flex flex-col items-center ${i <= idx ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs transition-all ${
              i < idx ? 'bg-brand-500' : i === idx ? 'bg-brand-600 ring-4 ring-brand-100' : 'bg-earth-200'
            }`}>
              {i <= idx ? <CheckCircle size={13} /> : i + 1}
            </div>
            <span className="text-[9px] text-earth-400 mt-1 font-semibold uppercase tracking-wide text-center w-14 leading-tight">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mb-4 ${i < idx ? 'bg-brand-400' : 'bg-earth-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OrphanageDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [foods, setFoods] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [aiMatches, setAiMatches] = useState([]);
  const [liveFeed, setLiveFeed] = useState({ foods: [], receivers: [] });
  const [expandedReq, setExpandedReq] = useState(null);
  const [requesting, setRequesting] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [chatMatchData, setChatMatchData] = useState(null);

  const userLat = user?.lat || 13.0827;
  const userLng = user?.lng || 80.2707;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [fRes, rRes] = await Promise.all([
        api.get('/food/all'),
        api.get('/request/sent')
      ]);
      setFoods(fRes.data);
      setMyRequests(rRes.data);
    } catch (err) { console.error(err); }
  };

  const fetchAIMatch = async () => {
    setMatchLoading(true);
    try {
      const res = await api.get('/ai/match');
      const matches = res.data.matches || [];
      setAiMatches(matches);
      setChatMatchData(matches.slice(0, 3));
      setActiveTab('ai');
    } catch (err) {
      console.error('AI Match error:', err);
      // Show ai tab with error message even on failure
      setAiMatches([]);
      setActiveTab('ai');
      alert('AI Match failed. Make sure the server is running on port 5000.');
    } finally { setMatchLoading(false); }
  };

  const fetchLiveFeed = async () => {
    try {
      const res = await api.get('/ai/live-feed');
      setLiveFeed(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === 'split') fetchLiveFeed();
  }, [activeTab]);

  const handleRequest = async food_id => {
    setRequesting(food_id);
    try {
      await api.post('/request', { food_id });
      fetchData();
      setActiveTab('tracking');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not place request');
    } finally { setRequesting(null); }
  };

  const activeDeliveries = myRequests.filter(r => ['accepted', 'out_for_delivery'].includes(r.status));
  const tabs = [
    ['browse', 'Browse Food', Package],
    ['ai', 'AI Match', Sparkles],
    ['tracking', 'My Requests', Heart],
    ['map', 'Live Map', Navigation],
    ['split', 'Split View', LayoutGrid],
  ];

  return (
    <div className="min-h-screen bg-earth-50 font-body">
      {/* Navbar */}
      <nav className="bg-white border-b border-earth-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Leaf size={17} className="text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-earth-900 text-lg">NourishNet</span>
            <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-mono">RECEIVER</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchAIMatch} disabled={matchLoading}
            className="hidden sm:flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-100 transition-colors">
            {matchLoading
              ? <><RefreshCw size={14} className="animate-spin" /> Matching...</>
              : <><Sparkles size={14} /> AI Match</>}
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-earth-800">{user?.name}</p>
            <p className="text-xs text-earth-400">Orphanage / NGO</p>
          </div>
          <Link to="/overview" className="hidden sm:flex items-center gap-1.5 text-sm text-purple-600 border border-purple-200 hover:bg-purple-50 px-3 py-2 rounded-xl transition-colors">
            <TrendingUp size={14} /> Overview
          </Link>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-earth-500 hover:text-red-500 border border-earth-200 hover:border-red-200 px-3 py-2 rounded-xl transition-colors">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Location bar */}
      {user?.location_address && typeof user.location_address === 'string' && (
        <div className="bg-brand-50 border-b border-brand-100 px-6 py-2.5 flex items-center gap-2 text-sm text-brand-700">
          <MapPin size={14} />
          Listings sorted by distance from: <strong>{typeof user.location_address === 'string' ? user.location_address : JSON.stringify(user.location_address)}</strong>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-earth-100 rounded-2xl p-1 mb-8 w-fit shadow-sm overflow-x-auto">
          {tabs.map(([key, label, Icon]) => (
            <button key={key} onClick={() => { setActiveTab(key); if (key === 'ai' && aiMatches.length === 0) fetchAIMatch(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === key ? 'bg-brand-600 text-white shadow-md' : 'text-earth-500 hover:text-earth-700'
              }`}>
              <Icon size={14} /> {label}
              {key === 'tracking' && myRequests.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-white text-brand-600' : 'bg-earth-200 text-earth-600'}`}>
                  {myRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── BROWSE TAB ── */}
        {activeTab === 'browse' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-earth-900">Available Food Near You</h2>
              <div className="flex items-center gap-3">
                <button onClick={fetchAIMatch} disabled={matchLoading}
                  className="flex items-center gap-2 btn-primary text-sm">
                  {matchLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  AI Find Nearest
                </button>
              </div>
            </div>
            {foods.length === 0 ? (
              <div className="card p-16 text-center border-dashed">
                <div className="text-5xl mb-4">🍽️</div>
                <p className="text-earth-400">No food listings available right now.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {foods.map(f => {
                  const already = myRequests.some(r => r.food_id === f.id && r.status !== 'rejected');
                  return (
                    <div key={f.id} className="card overflow-hidden group hover:shadow-md transition-all">
                      <div className="h-40 bg-earth-100 overflow-hidden relative">
                        {f.image
                          ? <img src={`/uploads/${f.image}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={f.food_name} />
                          : <div className="w-full h-full flex items-center justify-center text-5xl">
                              {f.food_category === 'catered' ? '🍱' : f.food_category === 'bakery' ? '🥐' : '🍛'}
                            </div>
                        }
                        <div className="absolute top-3 left-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            f.food_type === 'veg' ? 'bg-brand-100 text-brand-700' :
                            f.food_type === 'vegan' ? 'bg-green-100 text-green-700' :
                            f.food_type === 'jain' ? 'bg-gray-100 text-gray-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {f.food_type === 'veg' ? '🟢 Veg' : f.food_type === 'vegan' ? '🌿 Vegan' : f.food_type === 'jain' ? '⚪ Jain' : '🔴 Non-Veg'}
                          </span>
                        </div>
                        {f.distance_km != null && (
                          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full font-mono">
                            {f.distance_km.toFixed(1)} km
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-display font-bold text-earth-900 text-lg mb-0.5">{f.food_name}</h3>
                        <p className="text-xs text-earth-400 mb-3 capitalize">{f.provider_type} • {f.provider_name}</p>
                        {f.description && <p className="text-xs text-earth-500 mb-3 line-clamp-2">{f.description}</p>}
                        <div className="space-y-1.5 text-sm mb-4">
                          <div className="flex items-center gap-2 text-earth-600 font-semibold">
                            <Users size={13} className="text-brand-500" /> Serves {f.quantity} people
                          </div>
                          {f.expiry_time && (
                            <div className="flex items-center gap-2 text-orange-600">
                              <Clock size={13} /> Exp: {new Date(f.expiry_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                          {f.location_address && (
                            <div className="flex items-center gap-2 text-earth-400">
                              <MapPin size={13} className="flex-shrink-0" />
                              <span className="truncate text-xs">{f.location_address}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => !already && handleRequest(f.id)}
                          disabled={already || requesting === f.id}
                          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                            already ? 'bg-earth-100 text-earth-400 cursor-not-allowed' :
                            requesting === f.id ? 'bg-brand-300 text-white' :
                            'bg-brand-600 hover:bg-brand-700 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-200'
                          }`}>
                          {already ? '✓ Already Requested' : requesting === f.id ? 'Requesting...' : 'Request Food'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AI MATCH TAB ── */}
        {activeTab === 'ai' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-earth-900 flex items-center gap-2">
                  <Sparkles size={22} className="text-brand-500" /> AI Donor Matching
                </h2>
                <p className="text-earth-400 text-sm mt-1">Food donors sorted by distance from your location — nearest first</p>
              </div>
              <button onClick={fetchAIMatch} disabled={matchLoading}
                className="btn-primary flex items-center gap-2">
                <RefreshCw size={15} className={matchLoading ? 'animate-spin' : ''} />
                {matchLoading ? 'Matching...' : 'Re-match'}
              </button>
            </div>

            {matchLoading ? (
              <div className="card p-16 text-center">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-earth-500">AI is finding the nearest donors for you...</p>
              </div>
            ) : aiMatches.length === 0 ? (
              <div className="card p-16 text-center border-dashed">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="font-display text-xl font-bold text-earth-700 mb-2">No matches yet</h3>
                <p className="text-earth-400 mb-4">Click the button above to run AI matching</p>
                <button onClick={fetchAIMatch} className="btn-primary mx-auto flex items-center gap-2">
                  <Sparkles size={16} /> Run AI Match
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {aiMatches.map((f, idx) => {
                  const already = myRequests.some(r => r.food_id === f.id && r.status !== 'rejected');
                  return (
                    <div key={f.id} className={`card overflow-hidden hover:shadow-md transition-all ${idx === 0 ? 'border-brand-300 border-2' : ''}`}>
                      <div className="p-5 flex gap-5 items-start">
                        {/* Rank badge */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-display font-bold text-xl ${
                          idx === 0 ? 'bg-brand-500 text-white' :
                          idx === 1 ? 'bg-earth-200 text-earth-700' :
                          'bg-earth-100 text-earth-500'
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </div>

                        {/* Food image */}
                        <div className="w-20 h-20 bg-earth-100 rounded-2xl overflow-hidden flex-shrink-0">
                          {f.image
                            ? <img src={`/uploads/${f.image}`} className="w-full h-full object-cover" alt={f.food_name} />
                            : <div className="w-full h-full flex items-center justify-center text-3xl">
                                {f.food_category === 'catered' ? '🍱' : '🍛'}
                              </div>
                          }
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <h3 className="font-display font-bold text-earth-900 text-xl">{f.food_name}</h3>
                              <p className="text-earth-400 text-sm capitalize">{f.provider_type} • {f.provider_name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="bg-brand-50 border border-brand-200 text-brand-700 font-mono font-bold px-3 py-1 rounded-full text-sm">
                                📍 {f.distance_km} km away
                              </div>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                f.food_type === 'veg' ? 'bg-brand-100 text-brand-700' :
                                f.food_type === 'vegan' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {f.food_type === 'veg' ? '🟢 Veg' : f.food_type === 'vegan' ? '🌿 Vegan' : '🔴 Non-Veg'}
                              </span>
                            </div>
                          </div>

                          {/* AI insight box */}
                          <div className="mt-3 p-3 bg-brand-50 border border-brand-100 rounded-xl text-sm text-brand-800 flex items-start gap-2">
                            <Zap size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
                            <span>
                              <strong>{f.provider_name}</strong> has posted food for <strong>{f.quantity} people</strong>
                              {f.food_category ? ` (${f.food_category})` : ''} at a location <strong>{f.distance_km} km from you</strong>.
                              {idx === 0 ? ' This is your closest available donor right now!' : ''}
                            </span>
                          </div>

                          <div className="flex gap-4 mt-3 text-sm flex-wrap">
                            <span className="flex items-center gap-1.5 text-earth-600 font-semibold">
                              <Users size={13} className="text-brand-500" /> {f.quantity} servings
                            </span>
                            {f.expiry_time && (
                              <span className="flex items-center gap-1.5 text-orange-600">
                                <Clock size={13} /> Exp: {new Date(f.expiry_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                            {f.location_address && (
                              <span className="flex items-center gap-1.5 text-earth-400">
                                <MapPin size={13} className="flex-shrink-0" />
                                <span className="truncate max-w-xs text-xs">{f.location_address}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Request button */}
                        <div className="flex-shrink-0">
                          <button onClick={() => !already && handleRequest(f.id)}
                            disabled={already || requesting === f.id}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                              already ? 'bg-earth-100 text-earth-400 cursor-not-allowed' :
                              requesting === f.id ? 'bg-brand-300 text-white' :
                              'bg-brand-600 hover:bg-brand-700 text-white hover:-translate-y-0.5 hover:shadow-lg'
                            }`}>
                            {already ? '✓ Requested' : requesting === f.id ? '...' : 'Request'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TRACKING TAB ── */}
        {activeTab === 'tracking' && (
          <div>
            <h2 className="font-display text-2xl font-bold text-earth-900 mb-6">My Requests & Tracking</h2>
            {myRequests.length === 0 ? (
              <div className="card p-16 text-center border-dashed">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-earth-400 mb-4">No requests yet. Use AI Match to find nearest donors!</p>
                <button onClick={fetchAIMatch} className="btn-primary mx-auto flex items-center gap-2">
                  <Sparkles size={16} /> AI Find Donors
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map(r => (
                  <div key={r.id} className="card overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex gap-4 items-start">
                          <div className="w-14 h-14 bg-earth-100 rounded-2xl overflow-hidden flex-shrink-0">
                            {r.image
                              ? <img src={`/uploads/${r.image}`} className="w-full h-full object-cover" alt="" />
                              : <div className="w-full h-full flex items-center justify-center text-2xl">🍛</div>
                            }
                          </div>
                          <div>
                            <h3 className="font-bold text-earth-900 text-base">{r.food_name || 'Food Request'}</h3>
                            <p className="text-sm text-earth-500">
                              {r.provider_name}
                              {r.provider_type && <span className="text-earth-400 ml-1">({r.provider_type})</span>}
                            </p>
                            <p className="text-xs text-earth-400 mt-0.5 flex items-center gap-1">
                              <Users size={11} /> {r.quantity} servings
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            r.status === 'pending' ? 'bg-warm-100 text-warm-700' :
                            r.status === 'accepted' ? 'bg-brand-100 text-brand-700' :
                            r.status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'delivered' ? 'bg-brand-100 text-brand-800' :
                            'bg-red-100 text-red-700'
                          }`}>{r.status.replace(/_/g, ' ')}</span>
                          {r.route_data && (
                            <button onClick={() => setExpandedReq(expandedReq === r.id ? null : r.id)}
                              className="text-earth-400 hover:text-brand-600">
                              {expandedReq === r.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          )}
                        </div>
                      </div>
                      <StatusTracker status={r.status} />
                      {r.status === 'out_for_delivery' && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-sm text-blue-700">
                          <Truck size={15} className="animate-bounce" />
                          Your food is on the way! Check the <button onClick={() => setActiveTab('map')} className="font-bold underline">Live Map</button>
                        </div>
                      )}
                    </div>
                    {expandedReq === r.id && r.route_data && (() => {
                      const route = JSON.parse(r.route_data);
                      return (
                        <div className="px-6 pb-6 border-t border-earth-100 bg-earth-50/30">
                          <p className="text-xs font-bold text-earth-500 uppercase tracking-wider mt-4 mb-3 flex items-center gap-1.5">
                            <Navigation size={13} /> Route Details
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white border border-earth-100 rounded-xl p-3">
                              <p className="text-xs text-earth-400 mb-1">📍 Pickup (Donor)</p>
                              <p className="text-sm font-semibold text-earth-800 line-clamp-2">{route.pickup?.address || 'Donor location'}</p>
                            </div>
                            <div className="bg-white border border-earth-100 rounded-xl p-3">
                              <p className="text-xs text-earth-400 mb-1">🏠 Dropoff (You)</p>
                              <p className="text-sm font-semibold text-earth-800 line-clamp-2">{route.dropoff?.address || 'Your location'}</p>
                            </div>
                          </div>
                          <p className="text-xs text-earth-400 mt-2">Updated: {new Date(route.updated_at).toLocaleString()}</p>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MAP TAB ── */}
        {activeTab === 'map' && (
          <div>
            <h2 className="font-display text-2xl font-bold text-earth-900 mb-2">Live Delivery Map</h2>
            <p className="text-earth-400 text-sm mb-6">All available donors and your active delivery routes</p>
            <div className="card overflow-hidden" style={{ height: '500px' }}>
              <MapContainer center={[userLat, userLng]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[userLat, userLng]} icon={blueIcon}>
                  <Popup><strong>Your Location</strong><br />{user?.name}<br />{user?.location_address}</Popup>
                </Marker>
                {foods.map(f => (
                  <Marker key={`f-${f.id}`} position={[f.lat || f.user_lat || 13.0827, f.lng || f.user_lng || 80.2707]} icon={greenIcon}>
                    <Popup>
                      <strong>{f.food_name}</strong><br />
                      {f.provider_name}<br />
                      Serves {f.quantity} people<br />
                      {f.distance_km != null && <><br />{f.distance_km.toFixed(1)} km away</>}
                    </Popup>
                  </Marker>
                ))}
                {myRequests.filter(r => r.route_data && ['accepted','out_for_delivery','delivered'].includes(r.status)).map(r => {
                  const route = JSON.parse(r.route_data);
                  if (!route.pickup?.lat || !route.dropoff?.lat) return null;
                  const color = r.status === 'delivered' ? '#16a34a' : r.status === 'out_for_delivery' ? '#2563eb' : '#f59e0b';
                  return (
                    <span key={`r-${r.id}`}>
                      <Polyline positions={[[route.pickup.lat, route.pickup.lng],[route.dropoff.lat, route.dropoff.lng]]}
                        color={color} weight={4} dashArray={r.status === 'accepted' ? '8,6' : undefined} />
                    </span>
                  );
                })}
              </MapContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-earth-500">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-brand-500"></div> You</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500"></div> Food Donors</div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-blue-500 rounded"></div> Out for Delivery</div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-warm-500 rounded border-dashed border border-warm-400"></div> Accepted</div>
              <div className="flex items-center gap-2"><div className="w-4 h-1 bg-brand-500 rounded"></div> Delivered</div>
            </div>
          </div>
        )}

        {/* ── SPLIT VIEW TAB ── */}
        {activeTab === 'split' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-earth-900 flex items-center gap-2">
                  <LayoutGrid size={22} className="text-brand-500" /> Live Split View
                </h2>
                <p className="text-earth-400 text-sm mt-1">See all donors and receivers simultaneously with AI match lines</p>
              </div>
              <button onClick={fetchLiveFeed} className="btn-secondary flex items-center gap-2 text-sm">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Donors panel */}
              <div className="card p-5">
                <h3 className="font-bold text-earth-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Active Donors ({liveFeed.foods.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {liveFeed.foods.length === 0 ? (
                    <p className="text-earth-400 text-sm text-center py-8">No active food listings</p>
                  ) : liveFeed.foods.map(f => (
                    <div key={f.id} className="flex items-start gap-3 p-3 bg-earth-50 rounded-xl border border-earth-100">
                      <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                        {f.food_type === 'veg' ? '🟢' : '🔴'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-earth-900 text-sm truncate">{f.food_name}</p>
                        <p className="text-xs text-earth-500">{f.provider_name} • {f.quantity} servings</p>
                        {f.location_address && <p className="text-xs text-earth-400 truncate mt-0.5">{f.location_address}</p>}
                        {f.nearest_receivers?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {f.nearest_receivers.map(r => (
                              <span key={r.id} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                                {r.name} ({r.distance_km}km)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-mono text-brand-600 font-bold flex-shrink-0">
                        {f.distance_km != null ? `${f.distance_km}km` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receivers panel */}
              <div className="card p-5">
                <h3 className="font-bold text-earth-800 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Registered Receivers ({liveFeed.receivers.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {liveFeed.receivers.length === 0 ? (
                    <p className="text-earth-400 text-sm text-center py-8">No receivers registered yet</p>
                  ) : liveFeed.receivers.map(r => (
                    <div key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border ${
                      r.id === user?.id ? 'bg-brand-50 border-brand-200' : 'bg-earth-50 border-earth-100'
                    }`}>
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                        🏠
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-earth-900 text-sm flex items-center gap-1.5">
                          {r.name}
                          {r.id === user?.id && <span className="text-[10px] bg-brand-500 text-white px-1.5 py-0.5 rounded-full">You</span>}
                        </p>
                        {r.location_address && <p className="text-xs text-earth-400 truncate mt-0.5">{r.location_address}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Combined map */}
            <div className="card overflow-hidden" style={{ height: '450px' }}>
              <MapContainer center={[userLat, userLng]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {/* Receivers */}
                {liveFeed.receivers.map(r => (
                  <Marker key={`rec-${r.id}`} position={[r.lat || userLat, r.lng || userLng]}
                    icon={r.id === user?.id ? blueIcon : redIcon}>
                    <Popup><strong>{r.name}</strong><br />{r.id === user?.id ? '📍 You' : 'Receiver'}<br />{r.location_address}</Popup>
                  </Marker>
                ))}
                {/* Donors */}
                {liveFeed.foods.map(f => {
                  const fLat = f.lat || f.provider_lat || userLat;
                  const fLng = f.lng || f.provider_lng || userLng;
                  return (
                    <span key={`fd-${f.id}`}>
                      <Marker position={[fLat, fLng]} icon={greenIcon}>
                        <Popup>
                          <strong>{f.food_name}</strong><br />
                          {f.provider_name}<br />
                          🍽️ Serves {f.quantity} people<br />
                          {f.food_type === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}<br />
                          {f.location_address}
                        </Popup>
                      </Marker>
                      {/* AI match lines — draw to nearest receiver */}
                      {f.nearest_receivers?.slice(0,1).map(r => (
                        <Polyline key={`line-${f.id}-${r.id}`}
                          positions={[[fLat, fLng], [r.lat || userLat, r.lng || userLng]]}
                          color="#16a34a" weight={2} dashArray="6,5" opacity={0.5}
                        />
                      ))}
                    </span>
                  );
                })}
              </MapContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-earth-500">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500"></div> Donor (Food available)</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500"></div> You</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500"></div> Other Receivers</div>
              <div className="flex items-center gap-2"><div className="w-6 h-px border-t-2 border-dashed border-brand-500"></div> AI Match Line</div>
            </div>
          </div>
        )}
      </div>

      <AIChatbot context="receiver-dashboard" matchData={chatMatchData} />
    </div>
  );
}
