import { useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Leaf, Building2, Heart, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react';
import AIChatbot from '../components/AIChatbot';

const MapPicker = lazy(() => import('../components/MapPicker'));

const PROVIDER_TYPES = [
  { value: 'restaurant', label: '🍽️ Restaurant' },
  { value: 'caterer',    label: '🍱 Caterer' },
  { value: 'hotel',      label: '🏨 Hotel' },
  { value: 'event_host', label: '🎉 Event Host' },
  { value: 'canteen',    label: '🏫 Canteen / Mess' },
  { value: 'grocery',    label: '🛒 Grocery / Store' },
  { value: 'other',      label: '📦 Other' },
];

export default function Signup() {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') || 'provider');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [providerType, setProviderType] = useState('restaurant');
  const [license, setLicense] = useState(null);
  const [position, setPosition] = useState({ lat: 13.0827, lng: 80.2707 });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    if (!email.trim()) return setError('Email is required');
    if (!password || password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true); setError('');
    const data = new FormData();
    data.append('name', name.trim());
    data.append('email', email.trim().toLowerCase());
    data.append('password', password);
    data.append('role', role);
    data.append('provider_type', providerType);
    data.append('lat', String(position?.lat || 13.0827));
    data.append('lng', String(position?.lng || 80.2707));
    data.append('location_address', address || '');
    if (license) data.append('license', license);

    try {
      await api.post('/auth/register', data);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to server. Make sure server is running: cd server → node index.js');
      } else if (err.response.status === 404) {
        setError('Server not found (404). Please restart the server.');
      } else if (err.response.status === 413) {
        setError('File too large. Use a file under 10MB.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen bg-earth-50 flex items-center justify-center font-body">
      <div className="text-center">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-brand-600" />
        </div>
        <h2 className="font-display text-3xl font-bold text-earth-900 mb-2">Account Created!</h2>
        <p className="text-earth-500">Redirecting to sign in...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-earth-50 font-body flex flex-col">
      <div className="bg-white border-b border-earth-100 px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Leaf size={15} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold text-earth-900">NourishNet</span>
        </Link>
        <Link to="/login" className="text-sm text-earth-500 hover:text-brand-600 flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-bold text-earth-900 mb-2">Join NourishNet</h1>
            <p className="text-earth-500">Create your account and start making a difference</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { key: 'provider',  icon: Building2, label: 'Food Donor',    sub: 'Restaurants, caterers, hotels…' },
              { key: 'orphanage', icon: Heart,      label: 'Food Receiver', sub: 'Orphanages, NGOs, shelters…' }
            ].map(({ key, icon: Icon, label, sub }) => (
              <button key={key} type="button" onClick={() => setRole(key)}
                className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                  role === key ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-md' : 'border-earth-200 bg-white text-earth-500 hover:border-earth-300'
                }`}>
                <Icon size={26} />
                <span className="font-bold text-sm">{label}</span>
                <span className="text-xs opacity-70">{sub}</span>
              </button>
            ))}
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm leading-relaxed">⚠️ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-3xl p-8 shadow-sm border border-earth-100">
            <div>
              <label className="label">{role === 'provider' ? 'Organization / Business Name' : 'Organization Name'}</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder={role === 'provider' ? 'e.g. Spice Garden Restaurant' : 'e.g. Hope Children Home'}
                className="input-field" />
            </div>

            {role === 'provider' && (
              <div>
                <label className="label">We Are A…</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROVIDER_TYPES.map(pt => (
                    <button key={pt.value} type="button" onClick={() => setProviderType(pt.value)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        providerType === pt.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-earth-200 bg-earth-50 text-earth-600 hover:border-earth-300'
                      }`}>{pt.label}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com" className="input-field" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters" className="input-field" />
              </div>
            </div>

            <div>
              <label className="label">📍 Your Location</label>
              <p className="text-xs text-earth-400 mb-2">
                {role === 'provider' ? 'Where food can be picked up from' : 'Your location for nearest donor matching'}
              </p>
              <Suspense fallback={<div className="h-52 bg-earth-100 rounded-xl flex items-center justify-center text-earth-400 text-sm">Loading map…</div>}>
                <MapPicker position={position} setPosition={setPosition} setAddress={setAddress} height="200px" />
              </Suspense>
              {address && <p className="mt-2 text-xs text-brand-700 bg-brand-50 px-3 py-2 rounded-lg">📍 {address}</p>}
            </div>

            <div className="p-5 bg-earth-50 rounded-2xl border border-earth-200 border-dashed">
              <label className="label">Upload License / Certificate (Optional)</label>
              <p className="text-xs text-earth-400 mb-3">
                {role === 'provider' ? 'FSSAI or food safety certificate' : 'NGO registration certificate'} (PDF/image, max 10MB)
              </p>
              <div className="flex items-center gap-3">
                <label htmlFor="lic-upload" className="cursor-pointer flex items-center gap-2 bg-white border border-earth-300 text-earth-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:border-brand-400 hover:text-brand-600 transition-colors">
                  📎 Choose File
                </label>
                <span className="text-sm">{license ? <span className="text-brand-600 font-medium">✓ {license.name}</span> : <span className="text-earth-400">No file chosen</span>}</span>
              </div>
              <input id="lic-upload" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => setLicense(e.target.files?.[0] || null)} className="hidden" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-base transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account...</>
                : <>Create Account <ChevronRight size={18} /></>}
            </button>
          </form>

          <p className="text-center text-earth-500 text-sm mt-6">
            Already have an account? <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
      <AIChatbot context="signup" />
    </div>
  );
}
