'use client';

import { useState, useEffect } from 'react';

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
      startGPSTracking();
    } catch (error) {
      alert('Please allow GPS access to receive emergency alerts');
    }
  };

  const startGPSTracking = () => {
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, heading } = position.coords;
        const pos = { lat: latitude, lng: longitude, heading };
        setCurrentPosition(pos);

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
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
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

  if (alertActive) {
    return (
      <div className="alert-fullscreen">
        <div className="text-center text-white p-8">
          <div className="text-8xl mb-6 animate-pulse">🚨</div>
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
            className="px-8 py-4 bg-white text-red-600 rounded-lg font-bold text-xl hover:bg-gray-100"
          >
            ACKNOWLEDGED
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚗</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Public Driver
          </h1>
          <p className="text-gray-600">Emergency Alert System</p>
        </div>

        {!gpsPermission ? (
          <div className="text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-gray-700 mb-4">
                To receive emergency vehicle alerts, we need access to your GPS location.
              </p>
              <ul className="text-sm text-gray-600 text-left space-y-2">
                <li>✓ You'll be alerted when ambulances approach (within 500m)</li>
                <li>✓ Alerts only sent if you're on the same route</li>
                <li>✓ Audio + visual warnings to clear the way</li>
                <li>✓ No personal data stored or tracked</li>
              </ul>
            </div>
            <button
              onClick={requestGPSPermission}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
            >
              📍 Enable GPS & Start Monitoring
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse mr-3"></div>
                <span className="text-green-800 font-semibold">GPS Active - Monitoring for Alerts</span>
              </div>
              {currentPosition && (
                <p className="text-sm text-gray-600 text-center">
                  Location: {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Alert Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Disable alerts temporarily</span>
                  <button
                    onClick={toggleAlertDisable}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      alertDisabled
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {alertDisabled ? 'Enable' : 'Disable'}
                  </button>
                </div>
                {!alertDisabled && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">Disable for:</span>
                    <select
                      value={disableMinutes}
                      onChange={(e) => setDisableMinutes(Number(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                )}
                {alertDisabled && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Alerts are currently disabled
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              <p>You will receive audio and visual alerts when emergency vehicles approach.</p>
              <p className="mt-2">Help save lives by giving way to ambulances! 🚑</p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900 underline">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
