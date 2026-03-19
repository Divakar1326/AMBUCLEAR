'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { speakInstruction, type VoiceInstruction } from '@/lib/groqAI';
import TrafficMap from '@/components/TrafficMapNew';

interface NearbyAmbulance {
  id: string;
  name?: string;
  vehicle_no: string;
  status: 'red' | 'yellow' | 'green';
  lat: number;
  lng: number;
}

interface PlaceSearchResult {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  distance?: number;
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

export default function PublicPage() {
  const [deviceId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('device_id');
      if (!id) {
        id = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', id);
      }
      return id;
    }
    return '';
  });

  const [gpsPermission, setGpsPermission] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number; heading: number | null } | null>(null);
  const [alertActive, setAlertActive] = useState(false);
  const [alertData, setAlertData] = useState<any>(null);
  const [alertDisabled, setAlertDisabled] = useState(false);
  const [disableMinutes, setDisableMinutes] = useState(15);
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [showSOSReasonModal, setShowSOSReasonModal] = useState(false);
  const [sosReason, setSosReason] = useState<'signal_issues' | 'traffic_jam' | 'accident' | null>(null);
  const [voiceInstruction, setVoiceInstruction] = useState<VoiceInstruction | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isCheckingGPS, setIsCheckingGPS] = useState(true);
  const [nearbyAmbulances, setNearbyAmbulances] = useState<NearbyAmbulance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const currentPositionRef = useRef<{ lat: number; lng: number; heading: number | null } | null>(null);
  const gpsPermissionRef = useRef(false);

  const ambulancesWithin500m = useMemo(() => {
    if (!currentPosition) return [];
    return nearbyAmbulances.filter((amb) => {
      if (amb.id === deviceId) return false;
      const d = distanceMeters(currentPosition, { lat: amb.lat, lng: amb.lng });
      return d <= 500;
    });
  }, [nearbyAmbulances, currentPosition, deviceId]);

  useEffect(() => {
    currentPositionRef.current = currentPosition;
  }, [currentPosition]);

  useEffect(() => {
    gpsPermissionRef.current = gpsPermission;
  }, [gpsPermission]);

  useEffect(() => {
    // Check if alerts are disabled
    const disabledUntil = localStorage.getItem('alert_disabled_until');
    if (disabledUntil) {
      const until = new Date(disabledUntil);
      if (until > new Date()) {
        setAlertDisabled(true);
      } else {
        localStorage.removeItem('alert_disabled_until');
      }
    }

    // Cleanup voice interval on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!gpsPermission || !currentPosition) return;

    const loadNearbyAmbulances = async () => {
      try {
        const response = await fetch('/api/ambulance/nearby?status=red,yellow');
        const data = await response.json();
        setNearbyAmbulances(data.ambulances || []);
      } catch (error) {
        console.error('Error loading nearby ambulances:', error);
      }
    };

    loadNearbyAmbulances();
    const interval = setInterval(loadNearbyAmbulances, 5000);
    return () => clearInterval(interval);
  }, [gpsPermission, currentPosition?.lat, currentPosition?.lng]);

  useEffect(() => {
    const initializeGPS = async () => {
      setIsCheckingGPS(true);
      if (!navigator.geolocation) {
        setIsCheckingGPS(false);
        return;
      }

      try {
        if (navigator.permissions?.query) {
          const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          permission.onchange = () => {
            if (permission.state === 'granted') {
              setGpsPermission(true);
              localStorage.setItem('public_gps_granted', 'true');
              startGPSTracking();
            } else {
              setGpsPermission(false);
              localStorage.removeItem('public_gps_granted');
            }
          };

          if (permission.state === 'granted') {
            setGpsPermission(true);
            localStorage.setItem('public_gps_granted', 'true');
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setCurrentPosition({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  heading: position.coords.heading,
                });
                setIsCheckingGPS(false);
              },
              () => {
                setGpsPermission(false);
                setIsCheckingGPS(false);
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
            startGPSTracking();
            return;
          }

          if (permission.state === 'denied') {
            setGpsPermission(false);
            localStorage.removeItem('public_gps_granted');
            setIsCheckingGPS(false);
            return;
          }
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGpsPermission(true);
            localStorage.setItem('public_gps_granted', 'true');
            setCurrentPosition({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading,
            });
            startGPSTracking();
            setIsCheckingGPS(false);
          },
          () => {
            setGpsPermission(false);
            if (localStorage.getItem('public_gps_granted') === 'true') {
              // Keep UI active if browser reports a transient GPS timeout.
              setGpsPermission(true);
            }
            setIsCheckingGPS(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } catch (error) {
        console.error('Initial GPS check failed:', error);
        setIsCheckingGPS(false);
      }
    };

    initializeGPS();
  }, []);

  const requestGPSPermission = async () => {
    if (!navigator.geolocation) {
      alert('GPS not supported by your browser');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        });
      });

      setGpsPermission(true);
      localStorage.setItem('public_gps_granted', 'true');
      setCurrentPosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading,
      });
      startGPSTracking();
    } catch (error) {
      alert('Please allow GPS access to receive emergency alerts');
    }
  };

  const startGPSTracking = () => {
    if (watchIdRef.current !== null) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, heading } = position.coords;
        const pos = { lat: latitude, lng: longitude, heading };
        setCurrentPosition(pos);
        setGpsPermission(true);
        localStorage.setItem('public_gps_granted', 'true');
        setIsCheckingGPS(false);

        // Update server with position
        await fetch('/api/public/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: deviceId,
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
          }),
        });

        // Check for alerts (if not disabled)
        if (!alertDisabled) {
          checkForAlerts(latitude, longitude, heading || 0);
        }
      },
      (error) => {
        console.error('GPS error:', error);
        // Do not force permission false on transient watch errors.
        if (error.code === error.PERMISSION_DENIED) {
          setGpsPermission(false);
          localStorage.removeItem('public_gps_granted');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;

    // Start voice assistance polling every 2 seconds
    startVoiceAssistance();
  };

  const startVoiceAssistance = () => {
    // Clear any existing interval
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
    }

    // Poll for voice instructions every 2 seconds
    voiceIntervalRef.current = setInterval(async () => {
      const livePosition = currentPositionRef.current;
      if (!livePosition || !voiceEnabled || alertDisabled || !gpsPermissionRef.current) return;

      try {
        const response = await fetch('/api/ai/voice-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: livePosition.lat,
            lng: livePosition.lng,
            heading: livePosition.heading || 0,
          }),
        });

        const data = await response.json();

        if (data.success && data.instruction) {
          setVoiceInstruction(data.instruction);

          // Auto-speak if there's an emergency ambulance nearby
          if (
            data.instruction.urgency !== 'LOW' &&
            data.instruction.direction !== 'STAY_PUT'
          ) {
            speakInstruction(data.instruction);
          }
        }
      } catch (error) {
        console.error('Voice assistance error:', error);
      }
    }, 2000); // Every 2 seconds
  };

  const checkForAlerts = async (lat: number, lng: number, heading: number) => {
    try {
      const response = await fetch('/api/alert/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, heading }),
      });

      const data = await response.json();

      if (data.alert) {
        setAlertActive(true);
        setAlertData(data);

        // Trigger vibration
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Speak instruction
        if (window.speechSynthesis && data.instruction) {
          const utterance = new SpeechSynthesisUtterance(data.instruction);
          utterance.rate = 1.1;
          utterance.lang = 'en-IN';
          window.speechSynthesis.speak(utterance);
        }
      } else {
        setAlertActive(false);
        setAlertData(null);
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  const dismissAlert = () => {
    setAlertActive(false);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleAlertDisable = () => {
    if (alertDisabled) {
      localStorage.removeItem('alert_disabled_until');
      setAlertDisabled(false);
    } else {
      const until = new Date();
      until.setMinutes(until.getMinutes() + disableMinutes);
      localStorage.setItem('alert_disabled_until', until.toISOString());
      setAlertDisabled(true);
      setAlertActive(false);
    }
  };

  const handleSOS = async () => {
    if (!currentPosition) {
      alert('GPS location not available. Please enable GPS first.');
      return;
    }

    if (sosActive) {
      // Cancel SOS
      setSosActive(false);
      return;
    }

    setShowSOSReasonModal(true);
  };

  const handleSendPublicSOS = async (reason: 'signal_issues' | 'traffic_jam' | 'accident') => {
    if (!currentPosition) {
      alert('GPS location not available');
      return;
    }

    try {
      setSosLoading(true);
      const reasonText = reason === 'signal_issues' ? 'Signal Issues' : reason === 'traffic_jam' ? 'Traffic Jam' : 'Accident';
      
      const response = await fetch('/api/public/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          lat: currentPosition.lat,
          lng: currentPosition.lng,
          note: `Public driver SOS: ${reasonText}`
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSosActive(true);
        alert('SOS Alert sent successfully!\n\nControl room has been notified of your location.');
        
        // Vibrate
        if (navigator.vibrate) {
          navigator.vibrate([300, 100, 300]);
        }
        
        setShowSOSReasonModal(false);
        setSosReason(null);
      } else {
        alert('Failed to send SOS: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('SOS error:', error);
      alert('Network error. Please try again.');
    } finally {
      setSosLoading(false);
    }
  };

  const searchPlaces = async (query: string) => {
    if (!query || query.length < 2 || !currentPosition) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location: { lat: currentPosition.lat, lng: currentPosition.lng },
        }),
      });

      const data = await response.json();
      if (data.success && data.places) {
        setSearchResults(data.places);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Place search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  const selectPlace = (place: PlaceSearchResult) => {
    setSelectedPlace(place);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (alertActive) {
    return (
      <div className="alert-fullscreen">
        <div className="text-center text-white p-8">
          <div className="w-32 h-32 mx-auto mb-6 bg-red-500/30 backdrop-blur-lg rounded-full flex items-center justify-center border-4 border-white animate-pulse">
            <div className="text-6xl font-bold">!</div>
          </div>
          <h1 className="text-5xl font-bold mb-4 animate-shake">
            EMERGENCY VEHICLE APPROACHING
          </h1>
          <p className="text-2xl mb-8">
            {alertData?.instruction || 'Slow down and move to the side'}
          </p>
          <div className="text-3xl font-bold mb-6">
            {alertData?.distance ? `${Math.round(alertData.distance)}m away` : ''}
          </div>
          <button
            onClick={dismissAlert}
            className="px-8 py-4 bg-white/20 backdrop-blur-lg border border-white/30 text-white rounded-lg font-bold text-xl hover:bg-white/30 transition-all"
          >
            ACKNOWLEDGED
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-blue-700 to-blue-900 p-4 md:p-8">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl max-w-[1500px] mx-auto w-full p-6 md:p-8">
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-2 border-white/30 shrink-0">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Public Driver</h1>
              <p className="text-white/80">Emergency Alert System</p>
            </div>
          </div>

          <div className="bg-green-500/20 backdrop-blur-lg border border-green-400/30 rounded-lg px-4 py-3 min-w-[280px]">
            <div className="flex items-center justify-center lg:justify-start mb-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
              <span className="text-white font-semibold text-sm">GPS Active - Monitoring for Alerts</span>
            </div>
            <p className="text-xs text-white/75 text-center lg:text-left">
              {currentPosition
                ? `Location: ${currentPosition.lat.toFixed(6)}, ${currentPosition.lng.toFixed(6)}`
                : 'Location: waiting for GPS lock...'}
            </p>
          </div>
        </div>

        {!gpsPermission ? (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 mb-6">
              <p className="text-white mb-4">
                {isCheckingGPS
                  ? 'Checking your GPS permission and current location...'
                  : 'To receive emergency vehicle alerts, we need access to your GPS location.'}
              </p>
              <ul className="text-sm text-white/80 text-left space-y-2">
                <li>You'll be alerted when ambulances approach (within 500m)</li>
                <li>Alerts only sent if you're on the same route</li>
                <li>Audio + visual warnings to clear the way</li>
                <li>No personal data stored or tracked</li>
              </ul>
            </div>
            <button
              onClick={requestGPSPermission}
              className="w-full bg-white/20 backdrop-blur-lg border border-white/30 text-white py-4 rounded-lg font-semibold text-lg hover:bg-white/30 transition-all"
            >
              Enable GPS & Start Monitoring
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-4 lg:col-span-12">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-semibold text-white">Live Driver Map</h3>
                <button
                  onClick={() => setShowSearchModal(true)}
                  disabled={!currentPosition}
                  className="px-3 py-2 bg-indigo-500/40 border border-indigo-400/50 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500/60 transition-all"
                >
                  🔍 Search place
                </button>
              </div>

              {currentPosition ? (
                <TrafficMap
                  center={selectedPlace ? { lat: selectedPlace.lat, lng: selectedPlace.lng } : { lat: currentPosition.lat, lng: currentPosition.lng }}
                  zoom={selectedPlace ? 13 : 15}
                  currentLocation={{ lat: currentPosition.lat, lng: currentPosition.lng }}
                  currentLocationMarkerStyle="car"
                  ambulances={ambulancesWithin500m}
                  hospitals={selectedPlace ? [{ id: selectedPlace.id, name: selectedPlace.name, lat: selectedPlace.lat, lng: selectedPlace.lng }] : []}
                  selectedHospital={selectedPlace ? { id: selectedPlace.id, name: selectedPlace.name, lat: selectedPlace.lat, lng: selectedPlace.lng } : undefined}
                  showTraffic={true}
                  status="green"
                  routeLocked={true}
                  height="680px"
                />
              ) : (
                <div className="h-[680px] rounded-lg border border-white/20 bg-white/5 flex items-center justify-center text-center px-4">
                  <p className="text-sm text-white/80">Waiting for GPS coordinates to load map...</p>
                </div>
              )}

              <div className="mt-3 bg-blue-500/20 border border-blue-400/40 rounded-lg p-3">
                <p className="text-sm text-white font-semibold">
                  Ambulances within 500m behind/near you: {ambulancesWithin500m.length}
                </p>
                {ambulancesWithin500m.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {ambulancesWithin500m.map((amb) => {
                      if (!currentPosition) return null;
                      const d = distanceMeters(
                        { lat: currentPosition.lat, lng: currentPosition.lng },
                        { lat: amb.lat, lng: amb.lng }
                      );
                      return (
                        <div key={amb.id} className="flex items-center justify-between bg-white/10 rounded px-3 py-2">
                          <p className="text-sm text-white font-medium">🚑 {amb.vehicle_no}</p>
                          <p className="text-xs text-white/80">{Math.round(d)} m</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-white/80 mt-1">No emergency ambulance within 500m.</p>
                )}
              </div>

              {selectedPlace && (
                <div className="mt-3 bg-emerald-500/20 border border-emerald-400/40 rounded-lg p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-white font-semibold">Selected: {selectedPlace.name}</p>
                    {selectedPlace.address && <p className="text-xs text-white/80">{selectedPlace.address}</p>}
                  </div>
                  {currentPosition ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${currentPosition.lat},${currentPosition.lng}&destination=${selectedPlace.lat},${selectedPlace.lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-emerald-600/70 text-white rounded text-xs font-semibold hover:bg-emerald-600"
                    >
                      Navigate
                    </a>
                  ) : (
                    <span className="px-3 py-2 bg-gray-500/50 text-white/80 rounded text-xs font-semibold">GPS needed</span>
                  )}
                </div>
              )}
            </div>

            {/* SOS Emergency Button */}
            <div className="bg-white/10 backdrop-blur-lg border-2 border-red-400/50 rounded-lg p-6 lg:col-span-6">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Emergency SOS</span>
              </h3>
              <p className="text-sm text-white/80 mb-4">
                Need help? Send your location to the control room for emergency assistance.
              </p>
              <button
                onClick={handleSOS}
                disabled={sosLoading || !currentPosition}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl backdrop-blur-lg ${
                  sosActive
                    ? 'bg-orange-500/40 border-2 border-orange-400/50 text-white hover:bg-orange-500/50 animate-pulse'
                    : 'bg-red-500/40 border-2 border-red-400/50 text-white hover:bg-red-500/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {sosLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Sending SOS...
                  </span>
                ) : sosActive ? (
                  <span>SOS ACTIVE - Tap to Cancel</span>
                ) : (
                  <span>SEND EMERGENCY SOS</span>
                )}
              </button>
              {sosActive && (
                <div className="mt-3 p-3 bg-orange-500/30 backdrop-blur-lg border border-orange-400/50 rounded">
                  <p className="text-sm text-white font-semibold">
                    SOS Alert Active - Control room notified
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6 lg:col-span-6">
              <h3 className="font-semibold text-white mb-3">Alert Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">Voice assistance</span>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all backdrop-blur-lg ${
                      voiceEnabled
                        ? 'bg-green-500/30 border border-green-400/50 text-white hover:bg-green-500/40'
                        : 'bg-gray-500/30 border border-gray-400/50 text-white hover:bg-gray-500/40'
                    }`}
                  >
                    {voiceEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">Disable alerts temporarily</span>
                  <button
                    onClick={toggleAlertDisable}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all backdrop-blur-lg ${
                      alertDisabled
                        ? 'bg-green-500/30 border border-green-400/50 text-white hover:bg-green-500/40'
                        : 'bg-red-500/30 border border-red-400/50 text-white hover:bg-red-500/40'
                    }`}
                  >
                    {alertDisabled ? 'Enable' : 'Disable'}
                  </button>
                </div>
                {!alertDisabled && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white/80">Disable for:</span>
                    <select
                      value={disableMinutes}
                      onChange={(e) => setDisableMinutes(Number(e.target.value))}
                      className="px-3 py-1 bg-white/20 backdrop-blur-lg border border-white/30 rounded-lg text-sm text-white"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                )}
                {alertDisabled && (
                  <div className="bg-yellow-500/30 backdrop-blur-lg border border-yellow-400/50 rounded p-3">
                    <p className="text-sm text-white">
                      Alerts are currently disabled
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Voice Assistance Status */}
            {voiceInstruction && voiceInstruction.direction !== 'STAY_PUT' && (
              <div className={`border-2 rounded-lg p-6 lg:col-span-12 backdrop-blur-lg ${
                voiceInstruction.urgency === 'CRITICAL' ? 'bg-red-500/30 border-red-400/50 animate-pulse' :
                voiceInstruction.urgency === 'HIGH' ? 'bg-orange-500/30 border-orange-400/50' :
                'bg-yellow-500/30 border-yellow-400/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>AI Voice Assistant</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      {voiceInstruction.direction === 'LEFT' ? '← MOVE LEFT' :
                       voiceInstruction.direction === 'RIGHT' ? 'MOVE RIGHT →' :
                       'CLEAR AHEAD ↑'}
                    </span>
                  </div>
                  <p className="text-sm text-white font-semibold">
                    {voiceInstruction.message}
                  </p>
                  <p className="text-xs text-white/70">
                    Distance: {Math.round(voiceInstruction.distance)}m |
                    Urgency: {voiceInstruction.urgency}
                  </p>
                </div>
              </div>
            )}

            {/* SOS Reason Modal */}
            {showSOSReasonModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Emergency Reason</h2>
                  <p className="text-gray-600 mb-6">What is the reason for this emergency alert?</p>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button
                      onClick={() => handleSendPublicSOS('signal_issues')}
                      className="p-6 border-2 border-orange-400 rounded-lg text-center hover:bg-orange-50 transition-all"
                    >
                      <div className="text-3xl mb-2">🚦</div>
                      <div className="font-bold text-gray-900">Signal Issues</div>
                      <div className="text-xs text-gray-600 mt-2">Traffic signal malfunction or stuck</div>
                    </button>

                    <button
                      onClick={() => handleSendPublicSOS('traffic_jam')}
                      className="p-6 border-2 border-yellow-400 rounded-lg text-center hover:bg-yellow-50 transition-all"
                    >
                      <div className="text-3xl mb-2">🚗</div>
                      <div className="font-bold text-gray-900">Traffic Jam</div>
                      <div className="text-xs text-gray-600 mt-2">Heavy traffic blocking the route</div>
                    </button>

                    <button
                      onClick={() => handleSendPublicSOS('accident')}
                      className="p-6 border-2 border-red-400 rounded-lg text-center hover:bg-red-50 transition-all"
                    >
                      <div className="text-3xl mb-2">⚠️</div>
                      <div className="font-bold text-gray-900">Accident</div>
                      <div className="text-xs text-gray-600 mt-2">Road accident or emergency</div>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setShowSOSReasonModal(false);
                      setSosReason(null);
                    }}
                    className="w-full p-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="text-center text-sm text-white/80 lg:col-span-12">
              <p>You will receive audio and visual alerts when emergency vehicles approach.</p>
              <p className="mt-2">Help save lives by giving way to ambulances</p>
            </div>
          </div>
        )}

        {showSearchModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Search places</h3>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
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
                  placeholder="Search any place: shops, malls, pharmacy, restaurant..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-base text-gray-900"
                  autoFocus
                />
              </div>

              <div className="px-4 pb-4 overflow-auto">
                {isSearching ? (
                  <p className="text-sm text-gray-600">Searching...</p>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((place) => (
                      <button
                        key={place.id}
                        onClick={() => selectPlace(place)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50"
                      >
                        <p className="text-sm font-semibold text-gray-900">📍 {place.name}</p>
                        {place.address && <p className="text-xs text-gray-600 mt-1">{place.address}</p>}
                        {typeof place.distance === 'number' && (
                          <p className="text-xs text-blue-700 mt-1">{place.distance.toFixed(2)} km away</p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Type at least 2 letters to search places.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-gradient-to-r from-red-500/90 to-blue-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-red-500 hover:to-blue-500 hover:shadow-xl"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
