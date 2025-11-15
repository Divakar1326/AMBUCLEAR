'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TrafficMap from '@/components/TrafficMapNew';

type Status = 'red' | 'yellow' | 'green';

interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance?: number;
  address?: string;
  rating?: number;
  isOpen?: boolean;
}

interface Ambulance {
  id: string;
  name: string;
  vehicle_no: string;
  status: Status;
  lat: number;
  lng: number;
}

export default function AmbulanceDashboard() {
  const router = useRouter();
  const [ambulanceId, setAmbulanceId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<Status>('green');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [nearbyAmbulances, setNearbyAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitalETAs, setHospitalETAs] = useState<Record<string, any>>({});
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [isRouteLocked, setIsRouteLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Hospital[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Memoized route calculation handler to prevent jittering
  const handleRouteCalculated = useCallback((data: any) => {
    console.log('Route data received:', data);
    setRouteData(data);
  }, []);

  // Check authentication
  useEffect(() => {
    const id = localStorage.getItem('ambulance_id');
    if (!id) {
      router.push('/ambulance');
    } else {
      setAmbulanceId(id);
      loadProfile(id);
    }
  }, [router]);

  const loadProfile = async (id: string) => {
    try {
      const response = await fetch(`/api/ambulance/${id}`);
      const data = await response.json();
      if (data.ambulance) {
        setProfile(data.ambulance);
        setStatus(data.ambulance.status);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // GPS tracking
  useEffect(() => {
    if (!ambulanceId) return;

    const startGPS = () => {
      if (!navigator.geolocation) {
        alert('GPS not supported by your browser');
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, heading } = position.coords;
          console.log('GPS Update:', { latitude, longitude, heading });
          setCurrentPosition({ lat: latitude, lng: longitude });
          setGpsEnabled(true);

          // Update server
          try {
            await fetch(`/api/ambulance/${ambulanceId}/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: latitude,
                lng: longitude,
                heading: heading || 0,
              }),
            });
          } catch (err) {
            console.error('Error updating location:', err);
          }
        },
        (error) => {
          console.error('GPS error:', error);
          setGpsEnabled(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    };

    const cleanup = startGPS();
    return cleanup;
  }, [ambulanceId]);

  // Load nearby hospitals when in red status
  useEffect(() => {
    if (status === 'red' && currentPosition) {
      console.log('Loading hospitals for position:', currentPosition);
      loadNearbyHospitals();
      loadHospitalETAs();
    }
  }, [status, currentPosition]);

  // Load ETAs with traffic for hospitals
  const loadHospitalETAs = async () => {
    if (!currentPosition || hospitals.length === 0) return;

    try {
      const response = await fetch('/api/google-maps/eta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origins: [currentPosition],
          destinations: hospitals.map(h => ({ lat: h.lat, lng: h.lng }))
        })
      });

      const data = await response.json();
      if (data.success) {
        const etaMap: Record<string, any> = {};
        data.data.results.forEach((result: any, index: number) => {
          if (hospitals[index]) {
            etaMap[hospitals[index].id] = result;
          }
        });
        setHospitalETAs(etaMap);
      }
    } catch (error) {
      console.error('Error loading ETAs:', error);
    }
  };

  // Load nearby ambulances when in green status
  useEffect(() => {
    if (status === 'green') {
      loadNearbyAmbulances();
      const interval = setInterval(loadNearbyAmbulances, 5000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const loadNearbyHospitals = async () => {
    if (!currentPosition) {
      console.log('No current position available');
      return;
    }
    
    try {
      console.log('Fetching real hospitals near:', currentPosition);
      const response = await fetch(`/api/hospitals?lat=${currentPosition.lat}&lng=${currentPosition.lng}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('API Error:', data.error);
        return;
      }
      
      // Calculate distance for each hospital
      const hospitalsWithDistance = (data.hospitals || []).map((hospital: Hospital) => {
        const distance = calculateDistance(
          currentPosition.lat,
          currentPosition.lng,
          hospital.lat,
          hospital.lng
        );
        return { ...hospital, distance };
      });
      
      // Sort by distance
      hospitalsWithDistance.sort((a: Hospital, b: Hospital) => (a.distance || 0) - (b.distance || 0));
      
      console.log('Found hospitals:', hospitalsWithDistance);
      setHospitals(hospitalsWithDistance);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Search hospitals with autocomplete using backend API
  const searchHospitalsAutocomplete = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (!currentPosition) {
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 Searching for:', query);
      
      // Use backend API to search hospitals
      const response = await fetch('/api/hospitals/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          location: currentPosition
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.hospitals && data.hospitals.length > 0) {
        console.log(`✅ Found ${data.hospitals.length} hospitals`);
        setSearchSuggestions(data.hospitals);
      } else {
        console.log('No hospitals found for:', query);
        setSearchSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching hospitals:', error);
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search to avoid too many API calls
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search (300ms delay)
    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchHospitalsAutocomplete(value);
      }, 300);
    } else {
      setSearchSuggestions([]);
    }
  };

  // Select hospital from search
  const selectSearchedHospital = (hospital: Hospital) => {
    // Add to hospitals list if not already there
    const exists = hospitals.some(h => h.id === hospital.id);
    if (!exists) {
      setHospitals(prev => [hospital, ...prev]);
    }
    setSelectedHospital(hospital);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchSuggestions([]);
  };

  // Navigate to hospital using Google Maps place ID
  const handleNavigate = (hospital: Hospital) => {
    if (!currentPosition) {
      alert('GPS location not available. Please enable location services.');
      return;
    }
    
    // Use place_id for accurate navigation to the exact hospital
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentPosition.lat},${currentPosition.lng}&destination=${hospital.lat},${hospital.lng}&destination_place_id=${hospital.id}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const loadNearbyAmbulances = async () => {
    try {
      const response = await fetch('/api/ambulance/nearby?status=red,yellow');
      const data = await response.json();
      setNearbyAmbulances(data.ambulances || []);
    } catch (error) {
      console.error('Error loading ambulances:', error);
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    if (!ambulanceId) return;

    try {
      const response = await fetch(`/api/ambulance/${ambulanceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStatus(newStatus);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSOS = async () => {
    if (!ambulanceId || !currentPosition) return;

    const confirmed = confirm('Send SOS alert to all available ambulances and control room?');
    if (!confirmed) return;

    try {
      await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambulance_id: ambulanceId,
          lat: currentPosition.lat,
          lng: currentPosition.lng,
        }),
      });

      alert('SOS alert sent successfully!');
    } catch (error) {
      console.error('Error sending SOS:', error);
      alert('Failed to send SOS');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ambulance_id');
    router.push('/ambulance');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🚑 Ambulance Dashboard</h1>
            <p className="text-sm text-gray-600">{profile?.name} • {profile?.vehicle_no}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              gpsEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {gpsEnabled ? '📍 GPS Active' : '📍 GPS Inactive'}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Control Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Red Status */}
            <button
              onClick={() => handleStatusChange('red')}
              className={`p-6 rounded-xl border-2 transition-all ${
                status === 'red'
                  ? 'bg-red-100 border-red-500 shadow-lg scale-105'
                  : 'bg-white border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="text-4xl mb-2">🔴</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">RED ALERT</h3>
              <p className="text-sm text-gray-600">Emergency patient • Send alerts • Navigation</p>
            </button>

            {/* Yellow Status */}
            <button
              onClick={() => handleStatusChange('yellow')}
              className={`p-6 rounded-xl border-2 transition-all ${
                status === 'yellow'
                  ? 'bg-yellow-100 border-yellow-500 shadow-lg scale-105'
                  : 'bg-white border-gray-200 hover:border-yellow-300'
              }`}
            >
              <div className="text-4xl mb-2">🟡</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">YELLOW</h3>
              <p className="text-sm text-gray-600">Non-emergency • Navigation only • No alerts</p>
            </button>

            {/* Green Status */}
            <button
              onClick={() => handleStatusChange('green')}
              className={`p-6 rounded-xl border-2 transition-all ${
                status === 'green'
                  ? 'bg-green-100 border-green-500 shadow-lg scale-105'
                  : 'bg-white border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="text-4xl mb-2">🟢</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">GREEN</h3>
              <p className="text-sm text-gray-600">Available & Free • Monitor other ambulances</p>
            </button>
          </div>
        </div>

        {/* SOS Button */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <button
            onClick={handleSOS}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl"
          >
            🆘 SEND SOS ALERT
          </button>
          <p className="text-sm text-gray-600 text-center mt-2">
            Alert all available ambulances and control room
          </p>
        </div>

        {/* Live Traffic Map */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">🗺️ Live Traffic Map</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {gpsEnabled ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Real-time traffic updates
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  Waiting for GPS...
                </>
              )}
            </div>
          </div>
          <TrafficMap
            center={currentPosition || { lat: 13.0827, lng: 80.2707 }}
            zoom={currentPosition ? 14 : 12}
            currentLocation={currentPosition || undefined}
            hospitals={status === 'red' ? hospitals : []}
            ambulances={status === 'green' ? nearbyAmbulances : []}
            showTraffic={true}
            height="500px"
            selectedHospital={selectedHospital || undefined}
            onRouteCalculated={handleRouteCalculated}
          />
          {!currentPosition && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                📍 Waiting for GPS location... Please allow location permissions if prompted.
              </p>
            </div>
          )}

          {/* Route Details Panel */}
          {routeData && selectedHospital && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">📍 Route to {selectedHospital.name}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Distance:</span>
                      <span className="ml-2 font-semibold text-gray-900">{routeData.distance}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-semibold text-gray-900">{routeData.durationInTraffic}</span>
                    </div>
                    {routeData.trafficDelay > 0 && (
                      <div className="col-span-2">
                        <span className="text-red-600 font-semibold">
                          ⚠️ +{routeData.trafficDelay} min delay due to traffic
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedHospital(null);
                    setRouteData(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Turn-by-turn directions */}
              {routeData.steps && routeData.steps.length > 0 && (
                <details className="mb-3">
                  <summary className="cursor-pointer text-sm font-semibold text-blue-700 hover:text-blue-800">
                    📋 View {routeData.steps.length} Turn-by-Turn Directions
                  </summary>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {routeData.steps.map((step: any, index: number) => (
                      <div key={index} className="text-xs bg-white p-2 rounded border border-gray-200">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="text-gray-800">{step.instruction}</p>
                            <p className="text-gray-500 mt-1">{step.distance} • {step.duration}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Lock Route Button */}
              {!isRouteLocked ? (
                <button
                  onClick={() => setIsRouteLocked(true)}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-bold text-base hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  🔒 Lock Route & Start AI Navigation
                </button>
              ) : (
                <div className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-bold text-base flex items-center justify-center gap-2">
                  <span className="animate-pulse">🤖</span>
                  <span>AI Navigation Active - Public Alerts Enabled</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content based on status */}
        {status === 'red' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🏥 Nearby Hospitals</h2>
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <span>🔍</span>
                <span>Search Hospital</span>
              </button>
            </div>
            
            {/* Hospital Search Modal */}
            {showSearchModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">🔍 Search Hospital</h3>
                    <button
                      onClick={() => {
                        setShowSearchModal(false);
                        setSearchQuery('');
                        setSearchSuggestions([]);
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Type hospital name (e.g., Apollo, CMC, Fortis)..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg text-gray-900 placeholder-gray-400 bg-white"
                      autoFocus
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Start typing to see suggestions...
                    </p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    {isSearching ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-lg font-semibold text-gray-700">🔍 Searching...</p>
                        <p className="text-sm text-gray-500 mt-2">Looking for "{searchQuery}"</p>
                      </div>
                    ) : searchSuggestions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 mb-3">
                          ✅ Found {searchSuggestions.length} hospital{searchSuggestions.length > 1 ? 's' : ''}
                        </p>
                        {searchSuggestions.map((hospital) => (
                          <button
                            key={hospital.id}
                            onClick={() => selectSearchedHospital(hospital)}
                            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-lg">🏥 {hospital.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{hospital.address}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-sm font-medium text-blue-600">
                                    📍 {hospital.distance?.toFixed(2)} km away
                                  </span>
                                  {hospital.rating && (
                                    <span className="text-sm text-yellow-600">
                                      ⭐ {hospital.rating.toFixed(1)}
                                    </span>
                                  )}
                                  {hospital.isOpen !== undefined && (
                                    <span className={`text-xs px-2 py-1 rounded ${hospital.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {hospital.isOpen ? '● Open' : '● Closed'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-indigo-600 font-bold text-xl ml-4">→</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 && !isSearching ? (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-6xl mb-4">🏥</p>
                        <p className="text-lg font-semibold">No hospitals found</p>
                        <p className="text-sm mt-2">Try searching with different keywords</p>
                        <p className="text-xs text-gray-400 mt-4">Searched for: "{searchQuery}"</p>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-6xl mb-4">🔍</p>
                        <p className="text-lg font-semibold">Start typing to search</p>
                        <p className="text-sm mt-2">Type at least 2 characters</p>
                        <div className="mt-6 text-left max-w-sm mx-auto">
                          <p className="text-xs text-gray-500 mb-2">💡 Examples:</p>
                          <ul className="text-xs text-gray-500 space-y-1">
                            <li>• Apollo Hospital</li>
                            <li>• CMC Vellore</li>
                            <li>• Fortis</li>
                            <li>• Government Hospital</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {hospitals.length > 0 ? (
              <div className="space-y-3">
                {hospitals.map((hospital) => (
                  <div key={hospital.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{hospital.name}</h3>
                        {hospital.address && (
                          <p className="text-sm text-gray-600 mt-1">{hospital.address}</p>
                        )}
                      </div>
                      {hospital.isOpen !== undefined && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          hospital.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {hospital.isOpen ? 'Open' : 'Closed'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <p className="text-sm font-medium text-blue-600">
                        📍 {hospital.distance ? `${hospital.distance.toFixed(1)} km away` : 'Calculating...'}
                      </p>
                      {hospital.rating && (
                        <p className="text-sm text-yellow-600">
                          ⭐ {hospital.rating.toFixed(1)}
                        </p>
                      )}
                    </div>
                    
                    {/* ETA with Traffic */}
                    {hospitalETAs[hospital.id] && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-600">ETA (No Traffic)</p>
                            <p className="font-semibold text-gray-900">{hospitalETAs[hospital.id].duration}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">ETA (With Traffic)</p>
                            <p className="font-semibold text-orange-600">{hospitalETAs[hospital.id].durationInTraffic}</p>
                          </div>
                        </div>
                        {hospitalETAs[hospital.id].trafficDelay > 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ +{Math.floor(hospitalETAs[hospital.id].trafficDelay / 60)} min delay due to traffic
                          </p>
                        )}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => setSelectedHospital(hospital)}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md ${
                        selectedHospital?.id === hospital.id
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {selectedHospital?.id === hospital.id ? '✓ Route Displayed' : '🧭 Show Route'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Loading hospitals...</p>
            )}
          </div>
        )}

        {status === 'green' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🚑 Active Emergency Ambulances</h2>
            {nearbyAmbulances.length > 0 ? (
              <div className="space-y-3">
                {nearbyAmbulances.map((amb) => (
                  <div key={amb.id} className="p-4 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{amb.vehicle_no}</h3>
                      <p className="text-sm text-gray-600">{amb.name}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      amb.status === 'red' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {amb.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No active emergency ambulances nearby</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
