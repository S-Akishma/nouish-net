import { Link } from 'react-router-dom';
import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  PlusCircle, MapPin, Clock, Users, CheckCircle, XCircle,
  Leaf, LogOut, Package, Truck, ChevronDown, ChevronUp, Navigation, TrendingUp
} from 'lucide-react';
import AIChatbot from '../components/AIChatbot';
import { getExpiryStatus } from '../services/aiService';

const MapPicker = lazy(() => import('../components/MapPicker'));

const FOOD_CATEGORIES = [
  { value: 'cooked', label: '🍛 Cooked Meal' },
  { value: 'catered', label: '🍱 Catered / Event Food' },
  { value: 'raw', label: '🥦 Raw / Fresh Produce' },
  { value: 'packaged', label: '📦 Packaged / Sealed' },
  { value: 'bakery', label: '🥐 Bakery / Snacks' },
  { value: 'dairy', label: '🥛 Dairy' },
];

const FOOD_TYPES = [
  { value: 'veg', label: '🟢 Vegetarian' },
  { value: 'nonveg', label: '🔴 Non-Vegetarian' },
  { value: 'vegan', label: '🌿 Vegan' },
  { value: 'jain', label: '⚪ Jain' },
];

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-warm-100 text-warm-700',
    accepted: 'bg-brand-100 text-brand-700',
    out_for_delivery: 'bg-blue-100 text-blue-700',
    delivered: 'bg-brand-100 text-brand-800',
    rejected: 'bg-red-100 text-red-700',
  };
  const labels = {
    pending: 'Pending', accepted: 'Accepted',
    out_for_delivery: 'Out for Delivery', delivered: '✅ Delivered', rejected: 'Rejected'
  };
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${map[status] || 'bg-earth-100 text-earth-600'}`}>
      {labels[status] || status}
    </span>
  );
}

export default function ProviderDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [expandedReq, setExpandedReq] = useState(null);
  const [position, setPosition] = useState({ lat: user?.lat || 13.0827, lng: user?.lng || 80.2707 });
  const [address, setAddress] = useState('');
  const [formData, setFormData] = useState({
    food_name: '', food_type: 'veg', food_category: 'cooked',
    description: '', quantity: '', prep_time: '', expiry_time: ''
  });
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [lRes, rRes] = await Promise.all([api.get('/food/my-listings'), api.get('/request/my-requests')]);
      setListings(lRes.data);
      setRequests(rRes.data);
    } catch (err) { console.error(err); }
  };

  const handleAddFood = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(k => data.append(k, formData[k]));
      if (image) data.append('image', image);
      data.append('lat', position.lat);
      data.append('lng', position.lng);
      data.append('location_address', address);
      await api.post('/food/add', data);
      setShowModal(false);
      setFormData({ food_name: '', food_type: 'veg', food_category: 'cooked', description: '', quantity: '', prep_time: '', expiry_time: '' });
      setImage(null);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try { await api.put('/request/status', { request_id: id, status }); fetchData(); } catch {}
  };

  const updateDelivery = async (id, status) => {
    try { await api.put('/request/delivery', { request_id: id, status, partner_name: 'NourishNet Volunteer', contact: 'TBA' }); fetchData(); } catch {}
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
            <span className="ml-2 text-xs bg-earth-100 text-earth-500 px-2 py-0.5 rounded-full font-mono">DONOR</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-earth-800">{user?.name}</p>
            <p className="text-xs text-earth-400 capitalize">{user?.provider_type || 'Food Provider'}</p>
          </div>
          <Link to="/overview" className="hidden sm:flex items-center gap-1.5 text-sm text-purple-600 border border-purple-200 hover:bg-purple-50 px-3 py-2 rounded-xl transition-colors">
            <TrendingUp size={14} /> Overview
          </Link>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-earth-500 hover:text-red-500 transition-colors border border-earth-200 hover:border-red-200 px-3 py-2 rounded-xl">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Stats bar */}
      <div className="bg-white border-b border-earth-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex gap-6 overflow-x-auto">
          {[
            { icon: Package, label: 'Active Listings', value: listings.length },
            { icon: Users, label: 'Requests', value: requests.length },
            { icon: Clock, label: 'Pending Review', value: pendingCount, alert: pendingCount > 0 },
            { icon: CheckCircle, label: 'Delivered', value: requests.filter(r => r.status === 'delivered').length },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 flex-shrink-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.alert ? 'bg-red-100' : 'bg-earth-100'}`}>
                <s.icon size={18} className={s.alert ? 'text-red-500' : 'text-earth-500'} />
              </div>
              <div>
                <p className={`text-xl font-display font-bold ${s.alert ? 'text-red-600' : 'text-earth-900'}`}>{s.value}</p>
                <p className="text-xs text-earth-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-earth-100 rounded-2xl p-1 mb-8 w-fit shadow-sm">
          {[['listings', 'My Listings', Package], ['requests', 'Incoming Requests', Users]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === key ? 'bg-brand-600 text-white shadow-md' : 'text-earth-500 hover:text-earth-700'
              }`}>
              <Icon size={15} /> {label}
              {key === 'requests' && pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold text-earth-900">Active Food Listings</h2>
              <button onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2">
                <PlusCircle size={18} /> Add Food
              </button>
            </div>
            {listings.length === 0 ? (
              <div className="card p-16 text-center border-dashed">
                <div className="text-5xl mb-4">🍽️</div>
                <h3 className="font-display text-xl font-bold text-earth-700 mb-2">No listings yet</h3>
                <p className="text-earth-400 mb-6 text-sm">Start sharing your surplus food with those who need it.</p>
                <button onClick={() => setShowModal(true)} className="btn-primary mx-auto flex items-center gap-2">
                  <PlusCircle size={16} /> List Your First Food
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {listings.map(f => (
                      <div key={f.id} className={`card overflow-hidden group transition-all duration-200 ${f.is_expired ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}>                    
                      <div className="h-36 bg-earth-100 overflow-hidden relative">
                      {f.image
                        ? <img src={`/uploads/${f.image}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={f.food_name} />
                        : <div className="w-full h-full flex items-center justify-center text-5xl">
                            {f.food_category === 'catered' ? '🍱' : f.food_category === 'bakery' ? '🥐' : '🍛'}
                          </div>
                      }
                      <div className="absolute top-3 left-3 flex flex-col gap-1">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${f.food_type === 'veg' ? 'badge-veg' : f.food_type === 'vegan' ? 'bg-green-100 text-green-700' : 'badge-nonveg'}`}>
                          {f.food_type === 'veg' ? '🟢 Veg' : f.food_type === 'vegan' ? '🌿 Vegan' : f.food_type === 'jain' ? '⚪ Jain' : '🔴 Non-Veg'}
                        </span>
                        {f.is_expired ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500 text-white">⏰ Expired</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-display font-bold text-earth-900 text-lg mb-1">{f.food_name}</h3>
                      <p className="text-xs text-earth-400 mb-3 capitalize">{f.food_category?.replace('_', ' ')}</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-earth-600"><Users size={14} className="text-brand-500" /> Serves {f.quantity} people</div>
                        {f.expiry_time && (
                          <div className="flex items-center gap-2 text-orange-600"><Clock size={14} /> Exp: {new Date(f.expiry_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                        )}
                        {f.location_address && (
                          <div className="flex items-center gap-2 text-earth-400"><MapPin size={14} className="flex-shrink-0" /><span className="truncate text-xs">{f.location_address}</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div>
            <h2 className="font-display text-2xl font-bold text-earth-900 mb-6">Incoming Requests</h2>
            {requests.length === 0 ? (
              <div className="card p-16 text-center border-dashed">
                <div className="text-5xl mb-4">📬</div>
                <p className="text-earth-400">No requests yet. Requests from NGOs will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(r => (
                  <div key={r.id} className="card overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4 items-start">
                          <div className="w-12 h-12 bg-earth-100 rounded-xl overflow-hidden flex-shrink-0">
                            {r.image ? <img src={`/uploads/${r.image}`} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🍛</div>}
                          </div>
                          <div>
                            <p className="font-bold text-earth-900">{r.orphanage_name}</p>
                            <p className="text-sm text-earth-500">
                              Requested: <strong>{r.food_name}</strong> — {r.quantity} servings
                              {r.food_type && <span className={`ml-2 text-xs font-bold ${r.food_type === 'veg' ? 'text-brand-600' : 'text-red-500'}`}>{r.food_type === 'veg' ? '🟢' : '🔴'}</span>}
                            </p>
                            {r.orphanage_addr && (
                              <p className="text-xs text-earth-400 mt-1 flex items-center gap-1"><MapPin size={11} />{r.orphanage_addr}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <StatusBadge status={r.status} />
                          <button onClick={() => setExpandedReq(expandedReq === r.id ? null : r.id)}
                            className="text-earth-400 hover:text-earth-600">
                            {expandedReq === r.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      {r.status === 'pending' && (
                        <div className="flex gap-3 mt-4 pt-4 border-t border-earth-100">
                          <button onClick={() => updateStatus(r.id, 'accepted')}
                            className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                            <CheckCircle size={16} /> Accept
                          </button>
                          <button onClick={() => updateStatus(r.id, 'rejected')}
                            className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                            <XCircle size={16} /> Decline
                          </button>
                        </div>
                      )}

                      {r.status === 'accepted' && (
                        <div className="mt-4 pt-4 border-t border-earth-100">
                          <button onClick={() => updateDelivery(r.id, 'out_for_delivery')}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                            <Truck size={16} /> Mark Out for Delivery
                          </button>
                        </div>
                      )}

                      {r.status === 'out_for_delivery' && (
                        <div className="mt-4 pt-4 border-t border-earth-100">
                          <button onClick={() => updateDelivery(r.id, 'delivered')}
                            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                            <CheckCircle size={16} /> Confirm Delivered
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded route view */}
                    {expandedReq === r.id && r.route_data && (() => {
                      const route = JSON.parse(r.route_data);
                      return (
                        <div className="px-5 pb-5 bg-earth-50/50 border-t border-earth-100">
                          <p className="text-xs font-bold text-earth-500 uppercase tracking-wider mt-4 mb-3 flex items-center gap-1.5">
                            <Navigation size={13} /> Live Route Details
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white border border-earth-100 rounded-xl p-3">
                              <p className="text-xs text-earth-400 mb-1">📍 Pickup (Your Location)</p>
                              <p className="text-sm font-semibold text-earth-800 truncate">{route.pickup?.address || 'Provider location'}</p>
                            </div>
                            <div className="bg-white border border-earth-100 rounded-xl p-3">
                              <p className="text-xs text-earth-400 mb-1">🏠 Dropoff (NGO)</p>
                              <p className="text-sm font-semibold text-earth-800 truncate">{route.dropoff?.address || 'NGO location'}</p>
                            </div>
                          </div>
                          <p className="text-xs text-earth-400 mt-2">Last updated: {new Date(route.updated_at).toLocaleString()}</p>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Food Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-earth-100 px-8 py-5 flex justify-between items-center rounded-t-3xl z-10">
              <h3 className="font-display text-2xl font-bold text-earth-900">New Food Listing</h3>
              <button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-full bg-earth-100 hover:bg-earth-200 flex items-center justify-center text-earth-500 transition-colors">
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={handleAddFood} className="p-8 space-y-6">
              {/* Food name */}
              <div>
                <label className="label">Food Name *</label>
                <input type="text" required value={formData.food_name} onChange={e => setFormData(p => ({ ...p, food_name: e.target.value }))}
                  placeholder="e.g. Biryani, Idli-Sambar, Wedding Feast…" className="input-field" />
              </div>

              {/* Food type */}
              <div>
                <label className="label">Food Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FOOD_TYPES.map(ft => (
                    <button key={ft.value} type="button" onClick={() => setFormData(p => ({ ...p, food_type: ft.value }))}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        formData.food_type === ft.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-earth-200 bg-earth-50 text-earth-600 hover:border-earth-300'
                      }`}>
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food category */}
              <div>
                <label className="label">Food Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FOOD_CATEGORIES.map(fc => (
                    <button key={fc.value} type="button" onClick={() => setFormData(p => ({ ...p, food_category: fc.value }))}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        formData.food_category === fc.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-earth-200 bg-earth-50 text-earth-600 hover:border-earth-300'
                      }`}>
                      {fc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description (optional)</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Any allergy info, ingredients, or special notes..." rows={2} className="input-field resize-none" />
              </div>

              {/* Quantity + Image */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Serves (Persons) *</label>
                  <input type="number" min="1" required value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                    placeholder="e.g. 50" className="input-field" />
                </div>
                <div>
                  <label className="label">Food Photo</label>
                  <div>
                    <label htmlFor="food-img" className="cursor-pointer flex items-center gap-2 bg-earth-50 border border-earth-200 text-earth-600 text-sm font-semibold px-4 py-3 rounded-xl hover:border-brand-400 hover:text-brand-600 transition-colors select-none">
                      <Package size={15} />
                      <span className="truncate">{image ? <span className="text-brand-600">✓ {image.name}</span> : 'Choose Photo'}</span>
                    </label>
                    <input id="food-img" type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} className="hidden" />
                  </div>
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Ready at (Prep Time)</label>
                  <input type="datetime-local" value={formData.prep_time} onChange={e => setFormData(p => ({ ...p, prep_time: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="label">Best Before (Expiry) *</label>
                  <input type="datetime-local" required value={formData.expiry_time} onChange={e => setFormData(p => ({ ...p, expiry_time: e.target.value }))} className="input-field" />
                </div>
              </div>

              {/* Pickup location */}
              <div>
                <label className="label">📍 Pickup Location</label>
                <Suspense fallback={<div className="h-52 bg-earth-100 rounded-xl flex items-center justify-center text-earth-400 text-sm">Loading map…</div>}>
                  <MapPicker position={position} setPosition={setPosition} setAddress={setAddress} height="210px" />
                </Suspense>
                {address && <p className="text-xs text-brand-700 bg-brand-50 px-3 py-2 rounded-lg mt-2">📍 {address}</p>}
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-200 disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing…</> : '🚀 Publish Food Listing'}
              </button>
            </form>
          </div>
        </div>
      )}

      <AIChatbot context="provider-dashboard" />
    </div>
  );
}
