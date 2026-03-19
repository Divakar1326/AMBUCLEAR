'use client';

import { useEffect, useMemo, useState } from 'react';
import TrafficMapNew from '@/components/TrafficMapNew';
import {
  speakControlRoomRecommendation,
  type TrafficRecommendation,
} from '@/lib/groqAI';
import { useControlRoomTracking } from '@/hooks/useControlRoomTracking';

type FleetInsight = TrafficRecommendation & {
  id: string;
};

export default function ControlRoomPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [fleetInsights, setFleetInsights] = useState<FleetInsight[]>([]);
  const { ambulances, sosRecords, publicSOSRecords, loading, refresh } = useControlRoomTracking(authenticated);

  useEffect(() => {
    const auth = sessionStorage.getItem('control_auth');
    if (auth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      sessionStorage.setItem('control_auth', 'true');
      setAuthenticated(true);
      refresh();
    } else {
      alert('Invalid password');
    }
  };

  const handleResolveSOS = async (sosId: string) => {
    try {
      const response = await fetch(`/api/sos/${sosId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });

      if (response.ok) {
        alert('✅ SOS resolved successfully');
        await refresh();
      } else {
        alert('❌ Failed to resolve SOS');
      }
    } catch (error) {
      console.error('Error resolving SOS:', error);
      alert('❌ Error resolving SOS');
    }
  };

  const handleResolvePublicSOS = async (sosId: string) => {
    try {
      await fetch('/api/public/sos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sosId, active: false }),
      });
      await refresh();
    } catch (error) {
      console.error('Error resolving public SOS:', error);
    }
  };

  const activeSOSRecords = useMemo(() => sosRecords.filter((record) => record.active), [sosRecords]);
  const activePublicSOSRecords = useMemo(() => publicSOSRecords.filter((record) => record.active), [publicSOSRecords]);

  const fleetSummary = useMemo(() => {
    const now = Date.now();
    const movingToDestination = ambulances.filter((ambulance) => ambulance.destination);
    const staleUpdates = ambulances.filter((ambulance) => {
      const updatedAt = new Date(ambulance.timestamp).getTime();
      return Number.isFinite(updatedAt) && now - updatedAt > 120000;
    });

    return {
      movingToDestination,
      staleUpdates,
      available: ambulances.filter((ambulance) => ambulance.status === 'green'),
      emergency: ambulances.filter((ambulance) => ambulance.status === 'red'),
      caution: ambulances.filter((ambulance) => ambulance.status === 'yellow'),
    };
  }, [ambulances]);

  useEffect(() => {
    const nextInsights: FleetInsight[] = [];

    if (fleetSummary.emergency.length > 0) {
      nextInsights.push({
        id: 'critical-red',
        priority: 'CRITICAL',
        route: 'Emergency fleet status',
        action: `${fleetSummary.emergency.length} ambulance${fleetSummary.emergency.length === 1 ? '' : 's'} currently marked RED`,
        reason: 'These units need immediate visibility and dispatch attention.',
        ambulance_ids: fleetSummary.emergency.map((ambulance) => ambulance.id),
      });
    }

    if (activeSOSRecords.length + activePublicSOSRecords.length > 0) {
      nextInsights.push({
        id: 'active-sos',
        priority: activeSOSRecords.length > 0 ? 'CRITICAL' : 'HIGH',
        route: 'Live SOS activity',
        action: `${activeSOSRecords.length + activePublicSOSRecords.length} active SOS alert${activeSOSRecords.length + activePublicSOSRecords.length === 1 ? '' : 's'} require monitoring`,
        reason: `${activeSOSRecords.length} ambulance SOS and ${activePublicSOSRecords.length} public SOS currently open.`,
        ambulance_ids: activeSOSRecords.map((record) => record.ambulance_id || '').filter(Boolean),
      });
    }

    if (fleetSummary.movingToDestination.length > 0) {
      nextInsights.push({
        id: 'destination-live',
        priority: 'HIGH',
        route: 'Destination coverage',
        action: `${fleetSummary.movingToDestination.length} ambulance${fleetSummary.movingToDestination.length === 1 ? '' : 's'} en route to active destinations`,
        reason: 'Control room can track who is moving and where each unit is headed without route overlays.',
        ambulance_ids: fleetSummary.movingToDestination.map((ambulance) => ambulance.id),
      });
    }

    if (fleetSummary.staleUpdates.length > 0) {
      nextInsights.push({
        id: 'stale-live-feed',
        priority: 'MEDIUM',
        route: 'Live feed quality',
        action: `${fleetSummary.staleUpdates.length} ambulance${fleetSummary.staleUpdates.length === 1 ? '' : 's'} have not updated in the last 2 minutes`,
        reason: 'These positions may be stale and should be checked with the driver or device.',
        ambulance_ids: fleetSummary.staleUpdates.map((ambulance) => ambulance.id),
      });
    }

    if (nextInsights.length === 0) {
      nextInsights.push({
        id: 'fleet-stable',
        priority: 'MEDIUM',
        route: 'Fleet overview',
        action: 'All live ambulances are visible and no urgent routing action is required',
        reason: 'Use the map and live board to monitor position, color status, and destination progress.',
        ambulance_ids: ambulances.map((ambulance) => ambulance.id),
      });
    }

    setFleetInsights(nextInsights);
  }, [activePublicSOSRecords.length, activeSOSRecords, ambulances, fleetSummary]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    refresh();
  }, [authenticated, refresh]);

  const handleLogout = () => {
    sessionStorage.removeItem('control_auth');
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-blue-700 to-blue-900 relative overflow-hidden flex items-center justify-center p-4">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[10px] opacity-40">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>
          {/* Floating Particles */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-red-400 rounded-full opacity-60 animate-float"></div>
            <div className="absolute top-2/3 right-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-40 animate-float animation-delay-2000"></div>
            <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-red-300 rounded-full opacity-50 animate-float animation-delay-4000"></div>
            <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-blue-300 rounded-full opacity-30 animate-float animation-delay-6000"></div>
          </div>
        </div>

        <div className="relative z-10 bg-white/5 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-md w-full p-8 border border-white/10">
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Control Room</h1>
            <p className="text-gray-400">Admin Access Required</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
            >
              Login
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">Default password: admin123</p>
            <a
              href="/"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/35 bg-gradient-to-r from-red-500/90 to-blue-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-red-500 hover:to-blue-500 hover:shadow-xl"
            >
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
  const activeSOS = activeSOSRecords.length;
  const activePublicSOS = activePublicSOSRecords.length;
  const totalActiveSOS = activeSOS + activePublicSOS;

  const getLastSeen = (timestamp: string) => {
    const ms = Date.now() - new Date(timestamp).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 'just now';

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-blue-700 to-blue-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-40">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        {/* Floating Particles */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-red-400 rounded-full opacity-60 animate-float"></div>
          <div className="absolute top-2/3 right-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-40 animate-float animation-delay-2000"></div>
          <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-red-300 rounded-full opacity-50 animate-float animation-delay-4000"></div>
          <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-blue-300 rounded-full opacity-30 animate-float animation-delay-6000"></div>
        </div>
      </div>
      {/* Header */}
      <header className="relative z-10 bg-white/5 backdrop-blur-xl shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Control Room Dashboard</h1>
            <p className="text-sm text-gray-400">Real-time Emergency Response Monitoring</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 backdrop-blur-lg text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">
              <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-white">{ambulances.length}</div>
            <div className="text-sm text-gray-400">Live Ambulances Online</div>
          </div>

          <div className="bg-red-500/10 backdrop-blur-xl border-2 border-red-500/30 rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-red-400">{redCount}</div>
            <div className="text-sm text-gray-400">Emergency Active</div>
          </div>

          <div className="bg-yellow-500/10 backdrop-blur-xl border-2 border-yellow-500/30 rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{yellowCount}</div>
            <div className="text-sm text-gray-400">Non-Emergency</div>
          </div>

          <div className="bg-orange-500/10 backdrop-blur-xl border-2 border-orange-500/30 rounded-xl shadow-lg p-6">
            <div className="text-3xl mb-2">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-orange-400">{totalActiveSOS}</div>
            <div className="text-sm text-gray-400">Active SOS Alerts</div>
            {activePublicSOS > 0 && (
              <div className="text-xs text-orange-400 mt-1">{activePublicSOS} from public</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr] gap-8 mb-8">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Live Ambulance Positions</h2>
                <p className="text-sm text-gray-400 mt-1">Map is now status-only: red, yellow, and green fleet positions.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={refresh}
                  className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all text-sm font-semibold"
                >
                  Refresh Now
                </button>
                <div className="text-sm text-gray-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {loading ? 'Syncing live feed...' : 'Live feed active'}
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                <span className="text-gray-200">Emergency (RED)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-200">Non-Emergency (YELLOW)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                <span className="text-gray-200">Available (GREEN)</span>
              </div>
            </div>

            {ambulances.length > 0 ? (
              <TrafficMapNew
                center={{ lat: 13.0827, lng: 80.2707 }}
                zoom={12}
                ambulances={ambulances}
                showTraffic={true}
                showAmbulanceDestinations={false}
                followCenter={false}
                height="640px"
              />
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                <p className="text-gray-300 text-lg">No ambulances active yet</p>
                <p className="text-gray-400 text-sm mt-2">Live ambulance markers will appear as units come online.</p>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h2 className="text-xl font-bold text-white">Live Fleet Insights</h2>
                </div>
                <span className="text-xs bg-red-500/20 text-red-200 px-2 py-1 rounded-full border border-red-500/30">
                  Auto-refresh every 5s
                </span>
              </div>

              <div className="space-y-3">
                {fleetInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`bg-white/5 backdrop-blur-lg rounded-lg p-4 border-l-4 shadow-sm ${
                      insight.priority === 'CRITICAL'
                        ? 'border-red-500'
                        : insight.priority === 'HIGH'
                        ? 'border-orange-500'
                        : 'border-yellow-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              insight.priority === 'CRITICAL'
                                ? 'bg-red-500 animate-pulse'
                                : insight.priority === 'HIGH'
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                            }`}
                          ></span>
                          <span className="font-semibold text-white">{insight.route}</span>
                          <span
                            className={`font-bold text-xs px-2 py-1 rounded ${
                              insight.priority === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                                : insight.priority === 'HIGH'
                                ? 'bg-orange-500/20 text-orange-200 border border-orange-500/30'
                                : 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
                            }`}
                          >
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 font-medium mb-1">{insight.action}</p>
                        <p className="text-xs text-gray-400">{insight.reason}</p>
                      </div>
                      <button
                        onClick={() => speakControlRoomRecommendation(insight)}
                        className="px-3 py-1 bg-blue-500/30 backdrop-blur-lg border border-blue-400/50 text-white rounded-lg hover:bg-blue-500/40 text-xs font-semibold"
                      >
                        Speak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Live Destination Board</h2>
              <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
                {ambulances.length === 0 && (
                  <p className="text-sm text-gray-400">Waiting for ambulance updates.</p>
                )}
                {ambulances.map((ambulance) => (
                  <div key={ambulance.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{ambulance.vehicle_no}</span>
                          <span
                            className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                              ambulance.status === 'red'
                                ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                                : ambulance.status === 'yellow'
                                ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-500/30'
                                : 'bg-green-500/20 text-green-200 border border-green-500/30'
                            }`}
                          >
                            {ambulance.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200">Driver: {ambulance.name || 'Not assigned'}</p>
                        <p className="text-sm text-gray-300 mt-1">
                          Going to: {ambulance.destination?.name || ambulance.hospital_name || 'No active destination'}
                        </p>
                        {ambulance.destination?.address && (
                          <p className="text-xs text-gray-400 mt-1">Destination note: {ambulance.destination.address}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-400 shrink-0">
                        <p>{ambulance.lat.toFixed(5)}, {ambulance.lng.toFixed(5)}</p>
                        <p className="mt-1">{new Date(ambulance.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active SOS Alerts */}
        {totalActiveSOS > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              <span className="animate-pulse">🆘</span> ACTIVE SOS ALERTS
            </h2>
            <div className="space-y-3">
              {/* Public Driver SOS Alerts */}
              {activePublicSOSRecords.map((sos) => (
                <div key={sos.id} className="bg-white rounded-lg p-4 border-2 border-orange-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🚗</span>
                        <span className="font-bold text-orange-900">PUBLIC DRIVER EMERGENCY</span>
                        <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full font-semibold">PUBLIC</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Device:</strong> {sos.device_id}
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        <strong>Location:</strong> {sos.lat.toFixed(6)}, {sos.lng.toFixed(6)}
                      </p>
                      {sos.note && (
                        <p className="text-sm text-gray-600 italic mt-2">{sos.note}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(sos.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleResolvePublicSOS(sos.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700"
                      >
                        ✅ Resolve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Ambulance SOS Alerts */}
              {activeSOSRecords.map((sos) => {
                const ambulance = ambulances.find(a => a.id === sos.ambulance_id);
                return (
                  <div key={sos.id} className="bg-white rounded-lg p-5 border-2 border-red-300 shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">🚑</span>
                          <h3 className="text-xl font-bold text-red-900">
                            {ambulance?.vehicle_no || `ID: ${sos.ambulance_id}`}
                          </h3>
                          <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full font-bold">
                            AMBULANCE SOS
                          </span>
                        </div>
                        
                        {ambulance ? (
                          <div className="space-y-2 ml-10">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">👨 Driver:</span>
                              <span className="text-gray-900">{ambulance.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">📞 Phone:</span>
                              <a 
                                href={`tel:${ambulance.phone}`}
                                className="text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                {ambulance.phone}
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">🏥 Hospital:</span>
                              <span className="text-gray-900">{ambulance.hospital_name || 'Not specified'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">📍 Location:</span>
                              <span className="text-gray-600 text-sm">
                                {sos.lat.toFixed(6)}, {sos.lng.toFixed(6)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">⏰ Time:</span>
                              <span className="text-gray-600 text-sm">
                                {new Date(sos.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {ambulance.status && (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700">🚨 Status:</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  ambulance.status === 'red' ? 'bg-red-100 text-red-800' :
                                  ambulance.status === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {ambulance.status.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="ml-10 text-sm text-gray-600">
                            <p>⚠️ Ambulance details not available</p>
                            <p className="mt-2">📍 Location: {sos.lat.toFixed(6)}, {sos.lng.toFixed(6)}</p>
                            <p>⏰ Time: {new Date(sos.timestamp).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {ambulance?.phone && (
                          <a
                            href={`tel:${ambulance.phone}`}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold text-center text-sm whitespace-nowrap"
                          >
                            📞 Call Driver
                          </a>
                        )}
                        <button
                          onClick={() => handleResolveSOS(sos.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                        >
                          ✅ Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ambulance List */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Active Ambulances</h2>
          
          {ambulances.length === 0 ? (
            <p className="text-gray-600">No ambulances registered yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {ambulances.map((amb) => (
                    <tr key={amb.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <p className="font-semibold text-gray-900">{amb.vehicle_no}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{amb.hospital_name || 'Hospital not set'}</p>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-mono">
                          {amb.id}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <p className="text-sm text-gray-900">{amb.name || 'Not assigned'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{amb.phone || 'No phone available'}</p>
                      </td>
                      <td className="py-2 px-3">
                        {amb.destination ? (
                          <div className="text-sm">
                            <p className="font-semibold text-blue-700">{amb.destination.name}</p>
                            {amb.destination.address && (
                              <p className="text-xs text-gray-500">{amb.destination.address}</p>
                            )}
                            {amb.destination.source && (
                              <p className="text-[11px] text-gray-400 mt-0.5">Source: {amb.destination.source}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">{amb.hospital_name || 'Not set'}</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
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
                      <td className="py-2 px-3 text-xs text-gray-500">
                        {amb.lat.toFixed(4)}, {amb.lng.toFixed(4)}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">
                        <p>{new Date(amb.timestamp).toLocaleTimeString()}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{getLastSeen(amb.timestamp)}</p>
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
