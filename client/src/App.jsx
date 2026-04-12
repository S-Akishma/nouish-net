import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProviderDashboard from './pages/ProviderDashboard';
import OrphanageDashboard from './pages/OrphanageDashboard';
import Landing from './pages/Landing';
import Overview from './pages/Overview';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-earth-50">
      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={user.role === 'provider' ? '/provider' : '/receiver'} />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/provider" element={<ProtectedRoute role="provider"><ProviderDashboard /></ProtectedRoute>} />
          <Route path="/receiver" element={<ProtectedRoute role="orphanage"><OrphanageDashboard /></ProtectedRoute>} />
          <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
