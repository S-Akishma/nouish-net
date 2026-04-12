import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  Leaf, Package, Users, CheckCircle, TrendingUp,
  MapPin, Sparkles, ArrowLeft, RefreshCw, Clock, Heart
} from 'lucide-react';
import AIChatbot from '../components/AIChatbot';
import { generateOverviewInsight } from '../services/aiService';

// Simple SVG Pie Chart
function PieChart({ data, colors, size = 180 }) {
  if (!data || data.length === 0) return <div className="text-earth-400 text-sm text-center py-8">No data</div>;
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total === 0) return <div className="text-earth-400 text-sm text-center py-8">No data yet</div>;

  let cumAngle = -Math.PI / 2;
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const midAngle = cumAngle - angle / 2;
    const lx = cx + (r * 0.65) * Math.cos(midAngle);
    const ly = cy + (r * 0.65) * Math.sin(midAngle);
    const pct = Math.round((d.value / total) * 100);
    return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: colors[i % colors.length], label: d.label, value: d.value, pct, lx, ly };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.color} stroke="white" strokeWidth="2" opacity="0.9">
            <title>{s.label}: {s.value} ({s.pct}%)</title>
          </path>
          {s.pct > 8 && (
            <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fontWeight="bold" fill="white">{s.pct}%</text>
          )}
        </g>
      ))}
      <circle cx={cx} cy={cy} r={r * 0.38} fill="white" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#503922">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#a8855a">total</text>
    </svg>
  );
}

function Legend({ data, colors }) {
  return (
    <div className="space-y-2 mt-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }}></div>
          <span className="text-earth-600 capitalize">{d.label}</span>
          <span className="ml-auto font-bold text-earth-800">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    warm: 'bg-warm-50 text-warm-600',
    earth: 'bg-earth-100 text-earth-600',
    red: 'bg-red-50 text-red-500',
  };
  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <p className="font-display text-3xl font-bold text-earth-900">{value ?? '–'}</p>
      <p className="font-semibold text-earth-700 text-sm mt-1">{label}</p>
      {sub && <p className="text-earth-400 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

const PIE_COLORS_TYPE = ['#16a34a', '#dc2626', '#22c55e', '#6b7280'];
const PIE_COLORS_CAT  = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ec4899'];
const PIE_COLORS_STATUS = ['#f59e0b', '#16a34a', '#3b82f6', '#6b7280', '#dc2626'];

export default function Overview() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [aiInsight, setAiInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/request/analytics');
      setData(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateAIInsight = async () => {
    if (!data) return;
    setInsightLoading(true);
    try {
      const insight = await generateOverviewInsight(data);
      setAiInsight(insight);
    } catch {
      setAiInsight('Could not generate insight. Please try again.');
    }
    setInsightLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-earth-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-earth-500">Loading analytics...</p>
      </div>
    </div>
  );

  const typeData = (data?.foodByType || []).map(d => ({ label: d.food_type || 'unknown', value: d.count }));
  const catData  = (data?.foodByCategory || []).map(d => ({ label: d.food_category || 'unknown', value: d.count }));
  const statusData = (data?.statusBreakdown || []).map(d => ({ label: d.status, value: d.count }));

  return (
    <div className="min-h-screen bg-earth-50 font-body">
      {/* Nav */}
      <nav className="bg-white border-b border-earth-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Leaf size={17} className="text-white" />
          </div>
          <span className="font-display font-bold text-earth-900 text-lg">NourishNet</span>
          <span className="text-xs bg-warm-100 text-warm-700 px-2 py-0.5 rounded-full font-mono ml-1">OVERVIEW</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="flex items-center gap-1.5 text-sm text-earth-500 hover:text-brand-600 border border-earth-200 px-3 py-2 rounded-xl transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to={user?.role === 'provider' ? '/provider' : '/receiver'}
            className="flex items-center gap-1.5 text-sm text-earth-500 hover:text-brand-600 border border-earth-200 px-3 py-2 rounded-xl transition-colors">
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-earth-900">Platform Overview</h1>
            <p className="text-earth-400 mt-1">Real-time analytics powered by Groq AI</p>
          </div>
          <button onClick={generateAIInsight} disabled={insightLoading}
            className="btn-primary flex items-center gap-2">
            {insightLoading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {insightLoading ? 'Generating...' : 'Generate AI Insight'}
          </button>
        </div>

        {/* AI Insight box */}
        {aiInsight && (
          <div className="card p-6 border-l-4 border-brand-500 bg-brand-50/50">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={17} className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-brand-800 text-sm mb-1">AI Platform Insight</p>
                <p className="text-earth-700 text-sm leading-relaxed">{aiInsight}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Package}      label="Food Listings"   value={data?.totalFoods?.count}            color="earth" />
          <StatCard icon={CheckCircle}  label="Delivered"        value={data?.totalDelivered?.count}        color="brand" />
          <StatCard icon={Clock}        label="Pending"          value={data?.totalPending?.count}          color="warm" />
          <StatCard icon={Heart}        label="Servings Given"   value={data?.servingsDelivered?.total || 0} color="red" sub="meals distributed" />
          <StatCard icon={TrendingUp}   label="Donors"           value={data?.totalProviders?.count}        color="blue" />
          <StatCard icon={Users}        label="Receivers"        value={data?.totalReceivers?.count}        color="earth" />
        </div>

        {/* Pie charts row */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Food Type */}
          <div className="card p-6">
            <h3 className="font-display font-bold text-earth-800 text-lg mb-4">Food Type Distribution</h3>
            <div className="flex flex-col items-center gap-4">
              <PieChart data={typeData} colors={PIE_COLORS_TYPE} size={180} />
              <Legend data={typeData} colors={PIE_COLORS_TYPE} />
            </div>
          </div>

          {/* Food Category */}
          <div className="card p-6">
            <h3 className="font-display font-bold text-earth-800 text-lg mb-4">Food Category Breakdown</h3>
            <div className="flex flex-col items-center gap-4">
              <PieChart data={catData} colors={PIE_COLORS_CAT} size={180} />
              <Legend data={catData} colors={PIE_COLORS_CAT} />
            </div>
          </div>

          {/* Request Status */}
          <div className="card p-6">
            <h3 className="font-display font-bold text-earth-800 text-lg mb-4">Request Status Overview</h3>
            <div className="flex flex-col items-center gap-4">
              <PieChart data={statusData} colors={PIE_COLORS_STATUS} size={180} />
              <Legend data={statusData} colors={PIE_COLORS_STATUS} />
            </div>
          </div>
        </div>

        {/* Monthly activity */}
        {data?.monthlyActivity?.length > 0 && (
          <div className="card p-6">
            <h3 className="font-display font-bold text-earth-800 text-lg mb-6">Monthly Activity</h3>
            <div className="flex items-end gap-3 h-40 overflow-x-auto pb-2">
              {[...data.monthlyActivity].reverse().map((m, i) => {
                const maxVal = Math.max(...data.monthlyActivity.map(x => x.requests));
                const heightPct = maxVal > 0 ? (m.requests / maxVal) * 100 : 0;
                const delivPct = m.requests > 0 ? (m.delivered / m.requests) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-12">
                    <span className="text-xs text-earth-500 font-mono">{m.requests}</span>
                    <div className="w-full rounded-t-lg overflow-hidden flex flex-col justify-end"
                      style={{ height: `${Math.max(heightPct, 8)}%`, minHeight: '8px', background: '#e0c9a3' }}>
                      <div className="w-full rounded-t-lg" style={{ height: `${delivPct}%`, background: '#16a34a' }}></div>
                    </div>
                    <span className="text-[10px] text-earth-400 font-mono">{m.month?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-earth-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-brand-500 rounded"></div> Delivered</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-earth-200 rounded"></div> Total Requests</div>
            </div>
          </div>
        )}

        {/* Top locations */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-earth-800 text-lg mb-6 flex items-center gap-2">
            <MapPin size={18} className="text-brand-500" /> Highly Active Locations
          </h3>
          {(!data?.locationActivity || data.locationActivity.length === 0) ? (
            <p className="text-earth-400 text-sm text-center py-8">No location data yet</p>
          ) : (
            <div className="space-y-3">
              {data.locationActivity.map((loc, i) => {
                const maxFood = data.locationActivity[0]?.total_food || 1;
                const pct = Math.round((loc.total_food / maxFood) * 100);
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      i === 0 ? 'bg-warm-400 text-white' : i === 1 ? 'bg-earth-300 text-earth-700' : 'bg-earth-100 text-earth-500'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-earth-800 truncate">{loc.provider_name}</p>
                          <p className="text-xs text-earth-400 truncate">{loc.location_address || 'Location not set'}</p>
                        </div>
                        <div className="flex-shrink-0 text-right ml-3">
                          <p className="text-sm font-bold text-brand-600">{loc.total_food} servings</p>
                          <p className="text-xs text-earth-400">{loc.listings} listing{loc.listings !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="h-2 bg-earth-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Providers */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-earth-800 text-lg mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-500" /> Top Food Donors
          </h3>
          {(!data?.topProviders || data.topProviders.length === 0) ? (
            <p className="text-earth-400 text-sm text-center py-8">No donor data yet</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.topProviders.map((p, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${i === 0 ? 'border-brand-300 bg-brand-50' : 'border-earth-100 bg-earth-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0 ${
                      i === 0 ? 'bg-brand-500 text-white' : 'bg-earth-200 text-earth-600'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-earth-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-earth-400 capitalize mb-2">{p.provider_type}</p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-brand-600 font-bold">{p.total_servings} servings</span>
                        <span className="text-earth-400">{p.listing_count} listings</span>
                      </div>
                      {p.location_address && (
                        <p className="text-[10px] text-earth-400 mt-1 truncate flex items-center gap-1">
                          <MapPin size={9} /> {p.location_address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AIChatbot context="overview" />
    </div>
  );
}
