'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: number;
  rating?: number;
  isOpen?: boolean;
}

export default function AmbulancePage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle_no: '',
    hospital_name: '',
  });
  const [loginId, setLoginId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHospitalSearch, setShowHospitalSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Hospital[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if already logged in
  useEffect(() => {
    const ambulanceId = localStorage.getItem('ambulance_id');
    if (ambulanceId) {
      router.push('/ambulance/dashboard');
    }
    // Get current location for hospital search
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.log('GPS error:', error)
      );
    }
  }, [router]);

  // Search hospitals with autocomplete
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
      const response = await fetch('/api/hospitals/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location: currentPosition }),
      });
      
      const data = await response.json();
      
      if (data.success && data.hospitals && data.hospitals.length > 0) {
        setSearchSuggestions(data.hospitals);
      } else {
        setSearchSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching hospitals:', error);
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchHospitalsAutocomplete(value);
      }, 300);
    } else {
      setSearchSuggestions([]);
    }
  };

  // Select hospital from search
  const selectHospital = (hospital: Hospital) => {
    setFormData({ ...formData, hospital_name: hospital.name });
    setShowHospitalSearch(false);
    setSearchQuery('');
    setSearchSuggestions([]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/ambulance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message with the generated ID
        alert(`✅ Registration successful!\n\nYour Ambulance ID is: ${data.id}\n\nPlease save this ID - you'll need it to login.`);
        localStorage.setItem('ambulance_id', data.id);
        router.push('/ambulance/dashboard');
      } else {
        setError(`❌ Registration failed: ${data.error || 'Please check all fields and try again.'}`);
      }
    } catch (err: any) {
      setError(`❌ Network error: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!loginId.trim()) {
      setError('Please enter your Ambulance ID');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/ambulance/${loginId}`);
      const data = await response.json();

      if (response.ok && data.ambulance) {
        localStorage.setItem('ambulance_id', loginId);
        router.push('/ambulance/dashboard');
      } else {
        // Specific error message based on status code
        if (response.status === 404) {
          setError(`❌ Ambulance ID "${loginId}" not found. Please REGISTER first if you're a new user.`);
        } else {
          setError(`❌ Login failed: ${data.error || 'Server error. Please try again.'}`);
        }
      }
    } catch (err: any) {
      setError(`❌ Network error: ${err.message || 'Please check your connection and try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚑</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ambulance Driver
          </h1>
          <p className="text-gray-600">Emergency Vehicle Portal</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              isLogin
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
              !isLogin
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ambulance ID
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter your ambulance ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Don't have an ID? Click Register above</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Number
              </label>
              <input
                type="text"
                value={formData.vehicle_no}
                onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
                placeholder="e.g., TN-01-AB-1234"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hospital Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.hospital_name}
                  onClick={() => setShowHospitalSearch(true)}
                  onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                  placeholder="Click to search hospital"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  required
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => setShowHospitalSearch(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  🔍
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>

      {/* Hospital Search Modal */}
      {showHospitalSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">🔍 Search Hospital</h3>
              <button
                onClick={() => {
                  setShowHospitalSearch(false);
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-lg text-gray-900 placeholder-gray-400 bg-white"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2">
                Start typing to see suggestions...
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
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
                      onClick={() => selectHospital(hospital)}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all text-left"
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
                        <div className="text-red-600 font-bold text-xl ml-4">→</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 && !isSearching ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-6xl mb-4">🏥</p>
                  <p className="text-lg font-semibold">No hospitals found</p>
                  <p className="text-sm mt-2">Try searching with different keywords</p>
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
    </div>
  );
}
