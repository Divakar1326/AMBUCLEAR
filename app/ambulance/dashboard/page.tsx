'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TrafficMap from '@/components/TrafficMapNew';
import { speakInstruction, type VoiceInstruction } from '@/lib/groqAI';

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
  types?: string[];
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
  return R * c;
}

function buildDestinationPayload(hospital: Hospital | null) {
  if (!hospital) return null;

  return {
    id: hospital.id,
    name: hospital.name,
    lat: hospital.lat,
    lng: hospital.lng,
    address: hospital.address,
    source: hospital.id.startsWith('fallback-') ? 'fallback-search' : 'google-search',
    selected_at: new Date().toISOString(),
  };
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
  const [favoriteHospitals, setFavoriteHospitals] = useState<Hospital[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [activeSOS, setActiveSOS] = useState<any[]>([]);
  const [allAmbulances, setAllAmbulances] = useState<any[]>([]);
  const [navigationVoiceEnabled, setNavigationVoiceEnabled] = useState(true);
  const [lastSpokenStep, setLastSpokenStep] = useState<number>(-1);
  const [showSOSReasonModal, setShowSOSReasonModal] = useState(false);
  const [sosReason, setSosReason] = useState<'signal_issues' | 'traffic_jam' | 'accident' | null>(null);
  const selectedHospitalRef = useRef<Hospital | null>(null);
  const routeDataRef = useRef<any>(null);
  const isRouteLockedRef = useRef(false);
  const lastAcceptedGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastHeadingRef = useRef(0);

  const getRouteOverviewPayload = () => {
    if (!isRouteLockedRef.current || !routeDataRef.current) return null;

    return {
      locked: true,
      distance: routeDataRef.current.distance,
      durationInTraffic: routeDataRef.current.durationInTraffic,
      trafficDelay: Number(routeDataRef.current.trafficDelay || 0),
      updated_at: new Date().toISOString(),
    };
  };

  const syncLiveRouteState = useCallback(async (position?: { lat: number; lng: number }, heading = 0) => {
    if (!ambulanceId) return;

    if (!position) return;

    try {
      await fetch(`/api/ambulance/${ambulanceId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: position.lat,
          lng: position.lng,
          heading,
          destination: buildDestinationPayload(selectedHospitalRef.current),
          route_overview: getRouteOverviewPayload(),
        }),
      });
    } catch (error) {
      console.error('Error syncing live route state:', error);
    }
  }, [ambulanceId]);

  // Memoized route calculation handler to prevent jittering
  const handleRouteCalculated = useCallback((data: any) => {
    console.log('Route data received:', data);
    setRouteData(data);
    routeDataRef.current = data;
    
    // Speak turn-by-turn instructions
    if (navigationVoiceEnabled && data?.route?.legs?.[0]?.steps) {
      speakNextNavigationStep(data.route.legs[0].steps);
    }
  }, [navigationVoiceEnabled]);

  // Voice navigation for turn-by-turn directions
  const speakNextNavigationStep = (steps: any[]) => {
    if (!steps || steps.length === 0) return;

    // Find current step based on distance (simplified - in production use geolocation matching)
    const currentStepIndex = 0; // For now, always announce first step

    if (currentStepIndex !== lastSpokenStep && currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      const instruction = step.instructions?.replace(/<[^>]*>/g, '') || 'Continue on route'; // Remove HTML tags
      
      const voiceInstruction: VoiceInstruction = {
        direction: 'CLEAR_AHEAD',
        urgency: 'MEDIUM',
        message: instruction,
        distance: step.distance?.value || 0,
      };

      speakInstruction(voiceInstruction);
      setLastSpokenStep(currentStepIndex);
    }
  };

  // Check authentication
  useEffect(() => {
    selectedHospitalRef.current = selectedHospital;
  }, [selectedHospital]);

  useEffect(() => {
    routeDataRef.current = routeData;
  }, [routeData]);

  useEffect(() => {
    isRouteLockedRef.current = isRouteLocked;
  }, [isRouteLocked]);

  useEffect(() => {
    const id = localStorage.getItem('ambulance_id');
    if (!id) {
      router.push('/ambulance');
      return;
    }

    setAmbulanceId(id);
    loadProfile(id);
    loadFavorites(id);
  }, [router]);

  const loadProfile = async (id: string) => {
    try {
      const response = await fetch(`/api/ambulance/${id}`);
      const data = await response.json();
      if (data.ambulance) {
        setProfile(data.ambulance);
        setStatus(data.ambulance.status);
        console.log('✅ Profile loaded:', data.ambulance);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load favorite hospitals
  const loadFavorites = async (id: string) => {
    try {
      setLoadingFavorites(true);
      const favorites = localStorage.getItem(`favorite_hospitals_${id}`);
      if (favorites) {
        setFavoriteHospitals(JSON.parse(favorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  // Add hospital to favorites
  const addToFavorites = (hospital: Hospital) => {
    if (ambulanceId) {
      const updated = [...favoriteHospitals];
      const exists = updated.some(h => h.id === hospital.id);
      if (!exists) {
        updated.push(hospital);
        setFavoriteHospitals(updated);
        localStorage.setItem(`favorite_hospitals_${ambulanceId}`, JSON.stringify(updated));
        alert(`✓ ${hospital.name} added to favorites`);
      } else {
        alert('Already in favorites');
      }
    }
  };

  // Remove hospital from favorites
  const removeFromFavorites = (hospitalId: string) => {
    if (ambulanceId) {
      const updated = favoriteHospitals.filter(h => h.id !== hospitalId);
      setFavoriteHospitals(updated);
      localStorage.setItem(`favorite_hospitals_${ambulanceId}`, JSON.stringify(updated));
    }
  };

  // Load active SOS alerts for GREEN mode
  const loadActiveSOSAlerts = async () => {
    try {
      const [sosRes, ambulancesRes] = await Promise.all([
        fetch('/api/sos'),
        fetch('/api/ambulance/all')
      ]);
      
      const sosData = await sosRes.json();
      const ambulancesData = await ambulancesRes.json();
      
      const activeSosRecords = sosData.sos?.filter((s: any) => s.active) || [];
      const allAmbs = ambulancesData.ambulances || [];
      
      // Match SOS with ambulance details
      const sosWithDetails = activeSosRecords.map((sos: any) => {
        const amb = allAmbs.find((a: any) => a.id === sos.ambulance_id);
        return {
          ...sos,
          ambulance: amb || null
        };
      });
      
      setActiveSOS(sosWithDetails);
      setAllAmbulances(allAmbs);
    } catch (error) {
      console.error('Error loading SOS alerts:', error);
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
          const nextPoint = { lat: latitude, lng: longitude };
          const nextHeading = heading || 0;
          const previousPoint = lastAcceptedGpsRef.current;

          // Ignore tiny GPS jitter to prevent marker/page flicker.
          if (previousPoint) {
            const movedMeters = distanceMeters(previousPoint, nextPoint);
            const headingDelta = Math.abs(nextHeading - lastHeadingRef.current);
            const normalizedHeadingDelta = Math.min(headingDelta, 360 - headingDelta);
            if (movedMeters < 8 && normalizedHeadingDelta < 12) {
              return;
            }
          }

          console.log('GPS Update:', { latitude, longitude, heading });
          lastAcceptedGpsRef.current = nextPoint;
          lastHeadingRef.current = nextHeading;
          setCurrentPosition(nextPoint);
          setGpsEnabled(true);

          // Update server
          await syncLiveRouteState(nextPoint, nextHeading);
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
  }, [ambulanceId, syncLiveRouteState]);

  useEffect(() => {
    if (!ambulanceId || !currentPosition) return;
    syncLiveRouteState(currentPosition);
  }, [ambulanceId, currentPosition, selectedHospital, isRouteLocked, routeData, syncLiveRouteState]);

  // Load nearby hospitals in red mode with stable polling cadence to avoid UI jitter.
  useEffect(() => {
    if (status !== 'red' || !currentPosition) return;

    loadNearbyHospitals();
    const interval = setInterval(() => {
      loadNearbyHospitals();
    }, 30000);

    return () => clearInterval(interval);
  }, [status, Boolean(currentPosition)]);

  useEffect(() => {
    if (status !== 'red' || !currentPosition || hospitals.length === 0) return;

    loadHospitalETAs();
    const interval = setInterval(() => {
      loadHospitalETAs();
    }, 45000);

    return () => clearInterval(interval);
  }, [status, hospitals.length, Boolean(currentPosition)]);

  // Load SOS alerts when in GREEN mode
  useEffect(() => {
    if (status === 'green') {
      loadActiveSOSAlerts();
      // Poll every 5 seconds
      const interval = setInterval(loadActiveSOSAlerts, 5000);
      return () => clearInterval(interval);
    }
  }, [status]);

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
      let hospitalsWithDistance = (data.hospitals || []).map((hospital: Hospital) => {
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

  // Search hospitals with autocomplete using backend API (RED status)
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
      console.log('🔍 Searching for hospitals:', query);
      
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

  // Search any place with autocomplete (YELLOW status - malls, homes, apartments, etc.)
  const searchPlacesAutocomplete = async (query: string) => {
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
      console.log('🔍 Searching for any place:', query);
      
      // Use backend API to search any place
      const response = await fetch('/api/places/search', {
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
      
      if (data.success && data.places && data.places.length > 0) {
        console.log(`✅ Found ${data.places.length} places`);
        setSearchSuggestions(data.places);
      } else {
        console.log('No places found for:', query);
        setSearchSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
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
        // Use different search function based on status
        if (status === 'yellow') {
          searchPlacesAutocomplete(value);
        } else {
          searchHospitalsAutocomplete(value);
        }
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

  // Filter ambulances within 500m of current driver position
  const ambulancesWithin500m = nearbyAmbulances.filter((ambulance: Ambulance) => {
    if (!currentPosition) return false;
    const distance = distanceMeters(currentPosition, { lat: ambulance.lat, lng: ambulance.lng });
    return distance <= 500; // 500 meters
  });

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
    setShowSOSReasonModal(true);
  };

  const handleSendSOS = async (reason: 'signal_issues' | 'traffic_jam' | 'accident') => {
    if (!ambulanceId || !currentPosition) return;

    try {
      await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambulance_id: ambulanceId,
          lat: currentPosition.lat,
          lng: currentPosition.lng,
          type: 'ambulance',
          note: `Ambulance SOS: ${reason === 'signal_issues' ? 'Signal Issues' : reason === 'traffic_jam' ? 'Traffic Jam' : 'Accident'}`,
        }),
      });

      alert('SOS alert sent successfully!');
      setShowSOSReasonModal(false);
      setSosReason(null);
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
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-blue-700 to-blue-900 flex items-center justify-center">
        <div className="mx-4 w-full max-w-md rounded-2xl border border-white/25 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-blue-600 opacity-90 animate-pulse"></div>
            <div className="absolute inset-[10px] rounded-full border-4 border-white/90 border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🚑</div>
          </div>
          <p className="text-2xl font-bold text-white">Loading Dashboard</p>
          <p className="mt-2 text-sm text-blue-100">Syncing live ambulance data and route systems...</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-300 animate-pulse"></span>
            <span className="h-2 w-2 rounded-full bg-white/90 animate-pulse" style={{ animationDelay: '0.15s' }}></span>
            <span className="h-2 w-2 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '0.3s' }}></span>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-white">Ambulance Dashboard</h1>
            <p className="text-sm text-gray-300">ID: {ambulanceId}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-lg ${
              gpsEnabled ? 'bg-green-500/30 border border-green-400/50 text-white' : 'bg-red-500/30 border border-red-400/50 text-white'
            }`}>
              {gpsEnabled ? 'GPS Active' : 'GPS Inactive'}
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {profile && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-white font-semibold">{profile.name}</p>
              <p className="text-sm text-gray-300">
                Verification: {String(profile.verification_status || 'pending').toUpperCase()} | Vehicle: {profile.vehicle_no}
              </p>
            </div>
            <div className="text-sm text-gray-300">
              License: {profile.driving_license_number || 'Not available'}
            </div>
          </div>
        )}

        {/* Status Control Panel */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Emergency Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Red Status */}
            <button
              onClick={() => handleStatusChange('red')}
              className={`p-6 rounded-xl border-2 transition-all backdrop-blur-lg ${
                status === 'red'
                  ? 'bg-red-500/30 border-red-400/50 shadow-lg scale-105'
                  : 'bg-white/5 border-white/20 hover:border-red-300/50'
              }`}
            >
              <div className="w-8 h-8 mx-auto mb-2 bg-red-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-white mb-1">RED ALERT</h3>
              <p className="text-sm text-gray-300">Emergency patient • Send alerts • Navigation</p>
            </button>

            {/* Yellow Status */}
            <button
              onClick={() => handleStatusChange('yellow')}
              className={`p-6 rounded-xl border-2 transition-all backdrop-blur-lg ${
                status === 'yellow'
                  ? 'bg-yellow-500/30 border-yellow-400/50 shadow-lg scale-105'
                  : 'bg-white/5 border-white/20 hover:border-yellow-300/50'
              }`}
            >
              <div className="w-8 h-8 mx-auto mb-2 bg-yellow-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-white mb-1">YELLOW</h3>
              <p className="text-sm text-gray-300">Non-emergency • Navigation • Search any place</p>
            </button>

            {/* Green Status */}
            <button
              onClick={() => handleStatusChange('green')}
              className={`p-6 rounded-xl border-2 transition-all backdrop-blur-lg ${
                status === 'green'
                  ? 'bg-green-500/30 border-green-400/50 shadow-lg scale-105'
                  : 'bg-white/5 border-white/20 hover:border-green-300/50'
              }`}
            >
              <div className="w-8 h-8 mx-auto mb-2 bg-green-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-white mb-1">GREEN</h3>
              <p className="text-sm text-gray-300">Available & Free • Monitor other ambulances</p>
            </button>
          </div>
        </div>

        {/* SOS Button */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg p-6 mb-6">
          <button
            onClick={handleSOS}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-red-500/50 transition-all"
          >
            SEND SOS ALERT
          </button>
          <p className="text-sm text-gray-300 text-center mt-2">
            Alert all available ambulances and control room
          </p>
        </div>

        {/* Live Traffic Map */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Live Traffic Map</h2>
            <div className="flex items-center gap-3">
              {selectedHospital && (
                <button
                  onClick={() => setNavigationVoiceEnabled(!navigationVoiceEnabled)}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-1 backdrop-blur-lg ${
                    navigationVoiceEnabled 
                      ? 'bg-green-500/30 border border-green-400/50 text-white hover:bg-green-500/40' 
                      : 'bg-gray-500/30 border border-gray-400/50 text-white hover:bg-gray-500/40'
                  }`}
                >
                  <span className="hidden sm:inline">Navigation Voice</span>
                </button>
              )}
              <div className="flex items-center gap-2 rounded-md bg-white/85 px-3 py-1 text-sm font-medium text-black">
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
          </div>
          <TrafficMap
            center={currentPosition || { lat: 13.0827, lng: 80.2707 }}
            zoom={currentPosition ? 14 : 12}
            currentLocation={currentPosition || undefined}
            hospitals={status === 'red' ? hospitals : []}
            ambulances={status === 'green' ? ambulancesWithin500m : []}
            showTraffic={true}
            height="500px"
            selectedHospital={selectedHospital || undefined}
            onRouteCalculated={handleRouteCalculated}
            status={status}
            routeLocked={isRouteLocked}
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
                  onClick={async () => {
                    setSelectedHospital(null);
                    setRouteData(null);
                    setIsRouteLocked(false);
                    selectedHospitalRef.current = null;
                    routeDataRef.current = null;
                    isRouteLockedRef.current = false;
                    await syncLiveRouteState();
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
                  onClick={async () => {
                    setIsRouteLocked(true);
                    isRouteLockedRef.current = true;

                    if (!ambulanceId || !currentPosition) return;

                    try {
                      await syncLiveRouteState(currentPosition);
                    } catch (error) {
                      console.error('Error syncing locked route:', error);
                    }
                  }}
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
            
            {/* Favorite Hospitals */}
            {favoriteHospitals.length > 0 && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⭐</span>
                    <h3 className="font-bold text-purple-900">Your Favorite Hospitals</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full font-semibold">{favoriteHospitals.length}</span>
                </div>
                <div className="space-y-2">
                  {favoriteHospitals.map((hospital) => (
                    <div key={hospital.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-purple-200">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{hospital.name}</p>
                        <p className="text-xs text-gray-600">{hospital.distance?.toFixed(1)} km away</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedHospital(hospital)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                        >
                          Select
                        </button>
                        <button
                          onClick={() => removeFromFavorites(hospital.id)}
                          className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium hover:bg-red-200"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {hospitals.length > 0 ? (
              <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                {hospitals.map((hospital) => (
                  <div key={hospital.id} className={`p-4 border-2 rounded-lg transition-colors ${
                    selectedHospital?.id === hospital.id 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{hospital.name}</h3>
                        </div>
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
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedHospital(hospital)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md ${
                          selectedHospital?.id === hospital.id
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {selectedHospital?.id === hospital.id ? '✓ Route Displayed' : '🧭 Show Route'}
                      </button>
                      {!favoriteHospitals.some(h => h.id === hospital.id) && (
                        <button
                          onClick={() => addToFavorites(hospital)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
                          title="Add to your favorite hospitals"
                        >
                          ⭐ Favorite
                        </button>
                      )}
                      {selectedHospital?.id === hospital.id && (
                        <button
                          onClick={() => handleNavigate(hospital)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
                        >
                          🗺️ Navigate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Loading hospitals...</p>
            )}
          </div>
        )}

        {status === 'yellow' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🗺️ Search Any Destination</h2>
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span>🔍</span>
                <span>Search Place</span>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Search for any hospital, clinic, pharmacy, or location to get navigation with real-time traffic.
            </p>
            
            {selectedHospital && (
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">📍 {selectedHospital.name}</h3>
                    {selectedHospital.address && (
                      <p className="text-sm text-gray-600 mt-1">{selectedHospital.address}</p>
                    )}
                    {selectedHospital.distance && (
                      <p className="text-sm text-blue-600 mt-2">📍 {selectedHospital.distance.toFixed(1)} km away</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleNavigate(selectedHospital)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg whitespace-nowrap ml-4"
                  >
                    🗺️ Navigate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'green' && (
          <div className="space-y-6">
            {/* Active SOS Alerts */}
            {activeSOS.length > 0 && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                  <span className="animate-pulse">🆘</span> 
                  ACTIVE SOS ALERTS - Drivers Need Help!
                </h2>
                <div className="space-y-4">
                  {activeSOS.map((sos) => (
                    <div key={sos.id} className="bg-white rounded-lg p-5 border-2 border-red-200 shadow-md">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🚑</span>
                            <h3 className="text-xl font-bold text-red-900">
                              {sos.ambulance?.vehicle_no || 'Unknown Vehicle'}
                            </h3>
                            <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full font-bold animate-pulse">
                              EMERGENCY
                            </span>
                          </div>
                          
                          {sos.ambulance && (
                            <div className="space-y-2 ml-10">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700">👨 Driver:</span>
                                <span className="text-gray-900">{sos.ambulance.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700">📞 Phone:</span>
                                <a 
                                  href={`tel:${sos.ambulance.phone}`}
                                  className="text-blue-600 hover:text-blue-800 font-semibold"
                                >
                                  {sos.ambulance.phone}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700">🏥 Hospital:</span>
                                <span className="text-gray-900">{sos.ambulance.hospital_name || 'Not specified'}</span>
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
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <a
                            href={`https://www.google.com/maps?q=${sos.lat},${sos.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center text-sm whitespace-nowrap"
                          >
                            🗺️ View Location
                          </a>
                          {sos.ambulance?.phone && (
                            <a
                              href={`tel:${sos.ambulance.phone}`}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-center text-sm whitespace-nowrap"
                            >
                              📞 Call Driver
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                        <p className="text-sm text-yellow-900 font-semibold">
                          ⚠️ This driver needs immediate assistance. Please help if you're nearby!
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Nearby Active Ambulances within 500m */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                  🚑 Ambulances Behind You (Within 500m)
                </h2>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                  {ambulancesWithin500m.length}
                </span>
              </div>
              {ambulancesWithin500m.length > 0 ? (
                <div className="space-y-3">
                  {ambulancesWithin500m.map((amb) => {
                    const distance = distanceMeters(currentPosition || { lat: 13.0827, lng: 80.2707 }, { lat: amb.lat, lng: amb.lng });
                    return (
                      <div key={amb.id} className="p-4 bg-white border-2 border-blue-200 rounded-lg hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">🚑</span>
                              <h3 className="font-bold text-gray-900 text-lg">{amb.vehicle_no}</h3>
                            </div>
                            <p className="text-sm text-gray-600 ml-11">Driver: {amb.name}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                              amb.status === 'red' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {amb.status === 'red' ? '🚨 EMERGENCY' : '⚠️ ON DUTY'}
                            </div>
                            <span className="text-sm font-bold text-blue-600">
                              📍 {(distance / 1000).toFixed(2)} km away
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-white border-2 border-blue-200 rounded-lg text-center">
                  <p className="text-lg text-blue-800 font-semibold">✓ No ambulances within 500m</p>
                  <p className="text-sm text-blue-600 mt-1">You're clear to proceed</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Hospital/Place Search Modal - Works for both RED and YELLOW status */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">🔍 {status === 'yellow' ? 'Search Any Place' : 'Search Hospital'}</h3>
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
                      placeholder={status === 'yellow' ? "Search any place: malls, apartments, pharmacies, restaurants..." : "Type hospital name (e.g., Apollo, CMC, Fortis)..."}
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
                    ✅ Found {searchSuggestions.length} {status === 'yellow' ? 'place' : 'hospital'}{searchSuggestions.length > 1 ? 's' : ''}
                  </p>
                  {searchSuggestions.map((hospital) => (
                    <button
                      key={hospital.id}
                      onClick={() => selectSearchedHospital(hospital)}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg">
                            {status === 'yellow' ? (
                              hospital.types?.includes('hospital') ? '🏥' :
                              hospital.types?.includes('shopping_mall') ? '🏬' :
                              hospital.types?.includes('store') ? '🏪' :
                              hospital.types?.includes('restaurant') ? '🍽️' :
                              hospital.types?.includes('pharmacy') ? '💊' :
                              '📍'
                            ) : '🏥'} {hospital.name}
                          </h4>
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
                  <p className="text-lg font-semibold">No {status === 'yellow' ? 'places' : 'hospitals'} found</p>
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
                      {status === 'yellow' ? (
                        <>
                          <li>• Phoenix Mall</li>
                          <li>• Express Avenue</li>
                          <li>• Apartment name or address</li>
                          <li>• Pharmacy</li>
                          <li>• Restaurant</li>
                          <li>• Any landmark or place</li>
                        </>
                      ) : (
                        <>
                          <li>• Apollo Hospital</li>
                          <li>• CMC Vellore</li>
                          <li>• Fortis</li>
                          <li>• Government Hospital</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SOS Reason Modal */}
      {showSOSReasonModal && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            setShowSOSReasonModal(false);
            setSosReason(null);
          }}
        >
          <div
            className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Report SOS Reason</h2>
                <p className="text-gray-600 mt-1">Choose what is blocking your ambulance right now.</p>
              </div>
              <button
                onClick={() => {
                  setShowSOSReasonModal(false);
                  setSosReason(null);
                }}
                className="h-9 w-9 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleSendSOS('signal_issues')}
                  className="rounded-xl border-2 border-orange-300 p-5 text-left hover:bg-orange-50 transition-all"
                >
                  <div className="text-3xl">🚦</div>
                  <p className="mt-3 text-lg font-bold text-gray-900">Signal Issues</p>
                  <p className="text-sm text-gray-600 mt-1">Traffic signal malfunction or signal not clearing.</p>
                </button>

                <button
                  onClick={() => handleSendSOS('traffic_jam')}
                  className="rounded-xl border-2 border-yellow-300 p-5 text-left hover:bg-yellow-50 transition-all"
                >
                  <div className="text-3xl">🚗</div>
                  <p className="mt-3 text-lg font-bold text-gray-900">Traffic Jam</p>
                  <p className="text-sm text-gray-600 mt-1">Vehicles blocking lane movement for emergency passage.</p>
                </button>

                <button
                  onClick={() => handleSendSOS('accident')}
                  className="rounded-xl border-2 border-red-300 p-5 text-left hover:bg-red-50 transition-all"
                >
                  <div className="text-3xl">⚠️</div>
                  <p className="mt-3 text-lg font-bold text-gray-900">Accident</p>
                  <p className="text-sm text-gray-600 mt-1">Crash, collision, or emergency obstruction on route.</p>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowSOSReasonModal(false);
                  setSosReason(null);
                }}
                className="mt-6 w-full rounded-lg bg-gray-100 py-3 font-semibold text-gray-800 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
