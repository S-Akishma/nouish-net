import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Leaf, Heart, Truck, ChevronRight, Star, Users, Package } from 'lucide-react';
import api from '../services/api';
import AIChatbot from '../components/AIChatbot';

export default function Landing() {
  const [nearby, setNearby] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [stats, setStats] = useState({ meals_shared: 0, ngos_served: 0 });

  useEffect(() => {
    api.get('/food/stats').then(res => setStats(res.data)).catch(() => {});
  }, []);

  const detectLocation = () => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserPos({ lat, lng });
      try {
        const res = await api.get(`/food/nearby?lat=${lat}&lng=${lng}`);
        setNearby(res.data);
        const aiRes = await api.post('/ai/suggest-nearby', { lat, lng });
        setAiMsg(aiRes.data.message);
      } catch {}
      setLocLoading(false);
    }, () => setLocLoading(false));
  };

  const statCards = [
    { icon: Package, value: stats.meals_shared, label: 'Meals Shared' },
    { icon: Heart, value: stats.ngos_served, label: 'NGOs Served' },
  ];

  const steps = [
    { icon: '🍛', title: 'Donor Lists Food', desc: 'Restaurants, caterers, event hosts post surplus food with name, type, quantity and pickup location.' },
    { icon: '📍', title: 'AI Matches Nearby', desc: 'Our AI ranks listings by distance from the receiver. Closest donors appear first, always.' },
    { icon: '✅', title: 'Receiver Requests', desc: 'NGOs and orphanages browse and request food in one tap.' },
    { icon: '🚚', title: 'Live Tracking', desc: 'Both sides track delivery in real-time from acceptance to doorstep.' },
  ];

  const donorTypes = ['🍽️ Restaurants', '🍱 Caterers', '🏨 Hotels', '🎉 Event Hosts', '🏫 Canteens', '🛒 Grocery Stores'];

  return (
    <div className="min-h-screen bg-white font-body">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-earth-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Leaf size={16} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold text-earth-900">NourishNet</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-earth-700 hover:text-brand-600 transition-colors px-4 py-2">Sign In</Link>
          <Link to="/signup" className="btn-primary text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-warm-50 px-6 py-20 text-center">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-1/4 w-64 h-64 bg-brand-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-warm-400 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-bold px-4 py-2 rounded-full mb-6 uppercase tracking-wider">
            <Leaf size={12} /> Zero Hunger Initiative
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-earth-900 leading-tight mb-6">
            Surplus Food.<br />
            <span className="text-brand-600">Delivered with Purpose.</span>
          </h1>
          <p className="text-earth-500 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            NourishNet connects restaurants, caterers, and event hosts with orphanages and NGOs — turning wasted food into nourishing meals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="btn-primary flex items-center justify-center gap-2 text-base px-8 py-4">
              Start Donating <ChevronRight size={18} />
            </Link>
            <Link to="/signup?role=orphanage" className="btn-secondary flex items-center justify-center gap-2 text-base px-8 py-4">
              <Heart size={18} /> Request Food
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-earth-900 px-6 py-12">
        <div className="max-w-4xl mx-auto flex justify-center gap-16">
          {statCards.map(s => (
            <div key={s.label} className="text-center">
              <s.icon size={22} className="text-brand-400 mx-auto mb-2" />
              <div className="font-display text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-earth-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Location Section */}
      <section className="px-6 py-16 bg-gradient-to-b from-white to-brand-50">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin size={24} className="text-brand-600" />
          </div>
          <h2 className="font-display text-3xl font-bold text-earth-900 mb-3">Find Food Near You</h2>
          <p className="text-earth-500 mb-8">Our AI instantly identifies the nearest donors in your area — no account needed to check availability.</p>
          <button onClick={detectLocation} disabled={locLoading}
            className="btn-primary flex items-center gap-2 mx-auto text-base px-8 py-4">
            {locLoading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Detecting...</>
            ) : (
              <><MapPin size={18} /> Detect My Location</>
            )}
          </button>

          {aiMsg && (
            <div className="mt-8 p-5 bg-brand-50 border border-brand-200 rounded-2xl text-brand-800 text-sm font-medium animate-fade-up">
              🤖 {aiMsg}
            </div>
          )}

          {nearby.length > 0 && (
            <div className="mt-6 grid gap-3 text-left animate-fade-up">
              {nearby.map(f => (
                <div key={f.id} className="card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                    {f.food_type === 'veg' ? '🥗' : '🍗'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-earth-900 truncate">{f.food_name || 'Food Available'}</p>
                    <p className="text-earth-500 text-sm">{f.provider_name} • Serves {f.quantity}</p>
                  </div>
                  <div className="text-brand-600 font-mono text-sm font-bold flex-shrink-0">
                    {f.distance_km?.toFixed(1)} km
                  </div>
                </div>
              ))}
              <Link to="/signup" className="btn-primary flex items-center justify-center gap-2 mt-2">
                Sign up to Request Food <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-earth-900 text-center mb-12">How NourishNet Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative text-center p-6 rounded-2xl bg-earth-50 border border-earth-100 hover:border-brand-200 transition-colors group">
                <div className="text-4xl mb-4">{s.icon}</div>
                <div className="absolute top-4 right-4 w-6 h-6 bg-brand-100 text-brand-600 rounded-full text-xs font-bold flex items-center justify-center">{i+1}</div>
                <h3 className="font-semibold text-earth-800 mb-2">{s.title}</h3>
                <p className="text-earth-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donor types */}
      <section className="px-6 py-16 bg-earth-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Who Can Donate?</h2>
          <p className="text-earth-400 mb-10">Any food provider with surplus — large or small</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {donorTypes.map(item => (
              <div key={item} className="bg-earth-800 border border-earth-700 rounded-xl px-4 py-4 text-sm font-medium text-earth-200 hover:border-brand-500 transition-colors">
                {item}
              </div>
            ))}
          </div>
          <Link to="/signup" className="mt-10 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-8 py-4 rounded-xl transition-colors">
            Join as Donor <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-earth-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <Leaf size={13} className="text-white" />
          </div>
          <span className="font-display font-bold text-earth-800">NourishNet</span>
        </div>
        <p className="text-earth-400 text-sm">© 2025 NourishNet · Building a hunger-free tomorrow</p>
        <div className="flex gap-6 text-sm">
          <Link to="/login" className="text-earth-500 hover:text-brand-600 transition-colors">Sign In</Link>
          <Link to="/signup" className="text-earth-500 hover:text-brand-600 transition-colors">Sign Up</Link>
        </div>
      </footer>

      <AIChatbot context="landing" />
    </div>
  );
}