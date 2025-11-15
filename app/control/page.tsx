'use client';

import { useState, useEffect } from 'react';

interface Ambulance {
  id: string;
  name: string;
  vehicle_no: string;
  status: 'red' | 'yellow' | 'green';
  lat: number;
  lng: number;
  timestamp: string;
}

interface SOSRecord {
  id: string;
  ambulance_id: string;
  lat: number;
  lng: number;
  active: boolean;
  timestamp: string;
}

export default function ControlRoomPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [sosRecords, setSosRecords] = useState<SOSRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('control_auth');
    if (auth === 'true') {
      setAuthenticated(true);
      loadData();
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check (in production, use proper authentication)
    if (password === 'admin123') {
      sessionStorage.setItem('control_auth', 'true');
      setAuthenticated(true);
      loadData();
    } else {
      alert('Invalid password');
    }
  };

  const loadData = async () => {
    try {
      const [ambulancesRes, sosRes] = await Promise.all([
        fetch('/api/ambulance/all'),
        fetch('/api/sos'),
      ]);

      const ambulancesData = await ambulancesRes.json();
      const sosData = await sosRes.json();

      setAmbulances(ambulancesData.ambulances || []);
      setSosRecords(sosData.sos || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleResolveSOS = async (sosId: string) => {
    try {
      await fetch(`/api/sos/${sosId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      loadData();
    } catch (error) {
      console.error('Error resolving SOS:', error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('control_auth');
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎛️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Control Room</h1>
            <p className="text-gray-600">Admin Access Required</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Login
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">Default password: admin123</p>
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900 underline mt-2 inline-block">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const redCount = ambulances.filter(a => a.status === 'red').length;
  const yellowCount = ambulances.filter(a => a.status === 'yellow').length;
  const greenCount = ambulances.filter(a => a.status === 'green').length;
  const activeSOS = sosRecords.filter(s => s.active).length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎛️ Control Room Dashboard</h1>
            <p className="text-sm text-gray-600">Real-time Emergency Response Monitoring</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">🚑</div>
            <div className="text-3xl font-bold text-gray-900">{ambulances.length}</div>
            <div className="text-sm text-gray-600">Total Ambulances</div>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">🔴</div>
            <div className="text-3xl font-bold text-red-600">{redCount}</div>
            <div className="text-sm text-gray-600">Emergency Active</div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">🟡</div>
            <div className="text-3xl font-bold text-yellow-600">{yellowCount}</div>
            <div className="text-sm text-gray-600">Non-Emergency</div>
          </div>

          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">🆘</div>
            <div className="text-3xl font-bold text-orange-600">{activeSOS}</div>
            <div className="text-sm text-gray-600">Active SOS Alerts</div>
          </div>
        </div>

        {/* Active SOS Alerts */}
        {activeSOS > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              <span className="animate-pulse">🆘</span> ACTIVE SOS ALERTS
            </h2>
            <div className="space-y-3">
              {sosRecords.filter(s => s.active).map((sos) => {
                const ambulance = ambulances.find(a => a.id === sos.ambulance_id);
                return (
                  <div key={sos.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {ambulance?.vehicle_no || sos.ambulance_id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {ambulance?.name} • {new Date(sos.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Location: {sos.lat.toFixed(6)}, {sos.lng.toFixed(6)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolveSOS(sos.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ambulance List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Ambulances</h2>
          
          {ambulances.length === 0 ? (
            <p className="text-gray-600">No ambulances registered yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Vehicle</th>
                    <th className="text-left py-3 px-4">Driver</th>
                    <th className="text-left py-3 px-4">Hospital</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Location</th>
                    <th className="text-left py-3 px-4">Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {ambulances.map((amb) => (
                    <tr key={amb.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold">{amb.vehicle_no}</td>
                      <td className="py-3 px-4">{amb.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{amb['hospital_name']}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          amb.status === 'red'
                            ? 'bg-red-100 text-red-800'
                            : amb.status === 'yellow'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {amb.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {amb.lat.toFixed(4)}, {amb.lng.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {new Date(amb.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
