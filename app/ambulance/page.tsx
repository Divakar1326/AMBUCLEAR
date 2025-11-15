'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  // Check if already logged in
  useEffect(() => {
    const ambulanceId = localStorage.getItem('ambulance_id');
    if (ambulanceId) {
      router.push('/ambulance/dashboard');
    }
  }, [router]);

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
              <input
                type="text"
                value={formData.hospital_name}
                onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                placeholder="Enter hospital name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                required
              />
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
    </div>
  );
}
