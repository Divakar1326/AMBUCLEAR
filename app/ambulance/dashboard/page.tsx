'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
    }
  }, [status, currentPosition]);

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

        {/* Content based on status */}
        {status === 'red' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏥 Nearby Hospitals</h2>
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
                    
                    <button 
                      onClick={() => handleNavigate(hospital)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                    >
                      🧭 Navigate to {hospital.name}
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
