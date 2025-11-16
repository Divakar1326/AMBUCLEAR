'use client';

import { useState, useEffect, useRef } from 'react';
import TrafficMapNew from '@/components/TrafficMapNew';
import { 
  getControlRoomRecommendations, 
  speakControlRoomRecommendation,
  type TrafficRecommendation,
  type AmbulanceData
} from '@/lib/groqAI';

interface Ambulance {
  id: string;
  name: string;
  phone: string;
  vehicle_no: string;
  hospital_name?: string;
  status: 'red' | 'yellow' | 'green';
  lat: number;
  lng: number;
  timestamp: string;
  destination?: {
    name: string;
    lat: number;
    lng: number;
  };
}

interface SOSRecord {
  id: string;
  ambulance_id?: string;
  device_id?: string;
  lat: number;
  lng: number;
  active: boolean;
  timestamp: string;
  type?: string;
  note?: string;
}

export default function ControlRoomPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [sosRecords, setSosRecords] = useState<SOSRecord[]>([]);
  const [publicSOSRecords, setPublicSOSRecords] = useState<SOSRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedSOSLocation, setSelectedSOSLocation] = useState<{lat: number, lng: number, info: string} | null>(null);
  const [groqRecommendations, setGroqRecommendations] = useState<TrafficRecommendation[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      startGroqAssistance();
      return () => {
        clearInterval(interval);
        if (voiceIntervalRef.current) {
          clearInterval(voiceIntervalRef.current);
        }
      };
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
      const [ambulancesRes, sosRes, publicSOSRes] = await Promise.all([
        fetch('/api/ambulance/all'),
        fetch('/api/sos'),
        fetch('/api/public/sos'),
      ]);

      const ambulancesData = await ambulancesRes.json();
      const sosData = await sosRes.json();
      const publicSOSData = await publicSOSRes.json();

      setAmbulances(ambulancesData.ambulances || []);
      setSosRecords(sosData.sos || []);
      setPublicSOSRecords(publicSOSData.alerts || []);
    } catch (error) {
      console.error('Error loading data:', error);
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
        await loadData(); // Reload data to refresh the list
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
      loadData();
    } catch (error) {
      console.error('Error resolving public SOS:', error);
    }
  };

  const getAIAssistance = async () => {
    setLoadingAI(true);
    try {
      const response = await fetch('/api/ai/route-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ambulances, sosRecords: sosRecords.filter(s => s.active) }),
      });
      const data = await response.json();
      if (data.success) {
        setAiRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error getting AI assistance:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const startGroqAssistance = () => {
    // Clear any existing interval
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
    }

    // Get AI recommendations every 10 seconds
    voiceIntervalRef.current = setInterval(async () => {
      if (!voiceEnabled || ambulances.length === 0) return;

      try {
        // Convert ambulances to AmbulanceData format
        const ambulanceData: AmbulanceData[] = ambulances.map(amb => ({
          id: amb.id,
          position: { lat: amb.lat, lng: amb.lng },
          heading: 0,
          status: amb.status.toUpperCase() as "RED" | "YELLOW" | "GREEN",
          destination: amb.destination,
          vehicle_no: amb.vehicle_no,
        }));

        const recommendations = await getControlRoomRecommendations(
          ambulanceData,
          sosRecords.filter(s => s.active)
        );

        setGroqRecommendations(recommendations);

        // Speak the highest priority recommendation
        if (recommendations.length > 0 && voiceEnabled) {
          const topRecommendation = recommendations[0];
          speakControlRoomRecommendation(topRecommendation);
        }
      } catch (error) {
        console.error('Groq assistance error:', error);
      }
    }, 10000); // Every 10 seconds
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
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
  const activePublicSOS = publicSOSRecords.filter(s => s.active).length;
  const totalActiveSOS = activeSOS + activePublicSOS;

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
            <div className="text-sm text-gray-600">Registered So Far</div>
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
            <div className="text-3xl font-bold text-orange-600">{totalActiveSOS}</div>
            <div className="text-sm text-gray-600">Active SOS Alerts</div>
            {activePublicSOS > 0 && (
              <div className="text-xs text-orange-700 mt-1">{activePublicSOS} from public</div>
            )}
          </div>
        </div>

        {/* Live Tracking Map - Always Visible */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">🗺️ Real-Time Ambulance Tracking</h2>
              <p className="text-sm text-gray-600 mt-1">Live positions, routes, and emergency status</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 ${
                  voiceEnabled 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-400 text-white hover:bg-gray-500'
                }`}
              >
                {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
              </button>
              <button
                onClick={getAIAssistance}
                disabled={loadingAI}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loadingAI ? '🤖 Analyzing...' : '🤖 AI Route Assistant'}
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-gray-600">Real-time traffic</span>
              </div>
              <div className="text-sm text-gray-600">
                {ambulances.length} active ambulance{ambulances.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Groq AI Recommendations Panel */}
          {groqRecommendations.length > 0 && (
            <div className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🧠</span>
                  <h3 className="font-bold text-purple-900">Groq AI Traffic Clearance Recommendations</h3>
                </div>
                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                  Auto-updates every 10s
                </span>
              </div>
              <div className="space-y-3">
                {groqRecommendations.map((rec, idx) => (
                  <div 
                    key={idx} 
                    className={`bg-white rounded-lg p-4 border-l-4 shadow-sm ${
                      rec.priority === 'CRITICAL' ? 'border-red-500' :
                      rec.priority === 'HIGH' ? 'border-orange-500' :
                      'border-yellow-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg ${
                            rec.priority === 'CRITICAL' ? 'animate-pulse' : ''
                          }`}>
                            {rec.priority === 'CRITICAL' && '🚨'}
                            {rec.priority === 'HIGH' && '⚠️'}
                            {rec.priority === 'MEDIUM' && '📍'}
                          </span>
                          <span className={`font-bold text-sm px-2 py-1 rounded ${
                            rec.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {rec.priority}
                          </span>
                          <span className="font-semibold text-gray-900">{rec.route}</span>
                        </div>
                        <p className="text-sm text-gray-800 font-medium mb-1">
                          🎯 Action: {rec.action}
                        </p>
                        <p className="text-xs text-gray-600">
                          💡 Reason: {rec.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => speakControlRoomRecommendation(rec)}
                        className="ml-4 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs font-semibold"
                      >
                        🔊 Speak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations Panel */}
          {aiRecommendations && (
            <div className="mb-4 bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <h3 className="font-bold text-purple-900">AI Route Recommendations</h3>
              </div>
              <div className="space-y-2">
                {aiRecommendations.priority_routes?.map((rec: any, idx: number) => (
                  <div key={idx} className="bg-white rounded p-3 border border-purple-200">
                    <p className="font-semibold text-gray-900">
                      {rec.priority === 'HIGH' && '🔴 '}  
                      {rec.priority === 'MEDIUM' && '🟡 '}  
                      {rec.priority === 'LOW' && '🟢 '}
                      {rec.ambulance_id} - {rec.route}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{rec.recommendation}</p>
                    <p className="text-xs text-gray-500 mt-1">Reason: {rec.reason}</p>
                  </div>
                ))}
              </div>
              {aiRecommendations.summary && (
                <div className="mt-3 p-3 bg-purple-100 rounded">
                  <p className="text-sm text-purple-900 font-semibold">{aiRecommendations.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mb-4 flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
              <span className="text-gray-700">Emergency (RED)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-700">Non-Emergency (YELLOW)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
              <span className="text-gray-700">Available (GREEN)</span>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-blue-50 px-3 py-1 rounded">
              <span className="text-blue-700 font-semibold">👁️ {ambulances.filter(a => a.destination).length} ambulances with destinations</span>
            </div>
          </div>

          {ambulances.length > 0 ? (
            <>
              <TrafficMapNew
                center={
                  selectedSOSLocation
                    ? { lat: selectedSOSLocation.lat, lng: selectedSOSLocation.lng }
                    : ambulances.length > 0
                    ? { lat: ambulances[0].lat, lng: ambulances[0].lng }
                    : { lat: 13.0827, lng: 80.2707 }
                }
                zoom={selectedSOSLocation ? 16 : 12}
                ambulances={ambulances}
                showTraffic={true}
                height="600px"
              />
              
              {selectedSOSLocation && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold text-red-900">📍 Viewing SOS Location</p>
                    <p className="text-sm text-gray-700">{selectedSOSLocation.info}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {selectedSOSLocation.lat.toFixed(6)}, {selectedSOSLocation.lng.toFixed(6)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSOSLocation(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold text-sm"
                  >
                    ✕ Clear
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg">🚑 No ambulances active yet</p>
              <p className="text-gray-400 text-sm mt-2">Ambulances will appear here when they come online</p>
            </div>
          )}
        </div>

        {/* Active SOS Alerts */}
        {totalActiveSOS > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
              <span className="animate-pulse">🆘</span> ACTIVE SOS ALERTS
            </h2>
            <div className="space-y-3">
              {/* Public Driver SOS Alerts */}
              {publicSOSRecords.filter(s => s.active).map((sos) => (
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
                      <a
                        href={`https://www.google.com/maps?q=${sos.lat},${sos.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 text-center"
                      >
                        🗺️ View on Map
                      </a>
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
              {sosRecords.filter(s => s.active).map((sos) => {
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
                        <button
                          onClick={() => setSelectedSOSLocation({
                            lat: sos.lat,
                            lng: sos.lng,
                            info: `SOS from ${ambulance?.vehicle_no || sos.ambulance_id}`
                          })}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-center text-sm whitespace-nowrap"
                        >
                          🗺️ View on Map
                        </button>
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
                    <th className="text-left py-3 px-4">Destination</th>
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
                      <td className="py-3 px-4">
                        {amb.destination ? (
                          <div className="text-sm">
                            <p className="font-semibold text-blue-600">📍 {amb.destination.name}</p>
                            <p className="text-xs text-gray-500">
                              {amb.destination.lat.toFixed(4)}, {amb.destination.lng.toFixed(4)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No destination</span>
                        )}
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
