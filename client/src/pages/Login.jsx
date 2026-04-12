import { useState,useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Leaf, Eye, EyeOff, ArrowRight } from 'lucide-react';
import AIChatbot from '../components/AIChatbot';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ meals_shared: 0, ngos_served: 0 });useEffect(() => {api.get('/food/stats').then(res => setStats(res.data)).catch(() => {});}, []);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'provider' ? '/provider' : '/receiver');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex font-body">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-earth-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-brand-400 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-warm-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div className="relative">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <Leaf size={18} className="text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white">NourishNet</span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            "Every plate shared<br />is a life changed."
          </h2>
          <p className="text-earth-400 text-base leading-relaxed">
            Join thousands of food donors and receivers transforming surplus into sustenance across India.
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-4">
  {[
    { value: stats.meals_shared, label: 'Meals Shared' },
    { value: stats.ngos_served, label: 'NGOs Served' },
  ].map(s => (
    <div key={s.label} className="bg-earth-800/60 rounded-xl px-4 py-3 text-center border border-earth-700">
      <p className="text-white font-bold font-display">{s.value}</p>
      <p className="text-earth-400 text-xs">{s.label}</p>
    </div>
  ))}
</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-earth-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Leaf size={15} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold text-earth-900">NourishNet</span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-earth-900 mb-1">Welcome back</h1>
          <p className="text-earth-500 mb-8 text-sm">Sign in to continue your food sharing journey</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className="input-field" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-field pr-12" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-earth-200 text-center">
            <p className="text-earth-500 text-sm">
              New to NourishNet?{' '}
              <Link to="/signup" className="text-brand-600 font-semibold hover:text-brand-700">Create an account</Link>
            </p>
          </div>

          <Link to="/" className="block text-center mt-4 text-earth-400 text-xs hover:text-earth-600 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>

      <AIChatbot context="login" />
    </div>
  );
}
