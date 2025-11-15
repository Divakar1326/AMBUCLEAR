'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🚑 AMBUCLEAR
          </h1>
          <p className="text-xl text-gray-700 mb-2">
            Emergency Vehicle Smart Alert System
          </p>
          <p className="text-gray-600">
            Save lives through faster traffic clearance
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Ambulance Driver Card */}
          <Link href="/ambulance">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-red-500 group">
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">
                🚑
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Ambulance Driver
              </h2>
              <p className="text-gray-600 text-center text-sm">
                Manage emergency status, navigate to hospitals, and send SOS alerts
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-center gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                    Red Alert
                  </span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                    Yellow
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    Green
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Public Driver Card */}
          <Link href="/public">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 group">
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">
                🚗
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Public Driver
              </h2>
              <p className="text-gray-600 text-center text-sm">
                Receive automatic alerts when emergency vehicles approach
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  No login required • GPS permission needed
                </p>
              </div>
            </div>
          </Link>

          {/* Control Room Card */}
          <Link href="/control">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-purple-500 group">
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">
                🎛️
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Control Room
              </h2>
              <p className="text-gray-600 text-center text-sm">
                Monitor active ambulances, SOS events, and manage system
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Login protected • Admin access
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg shadow-md p-6 inline-block">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              How it works
            </h3>
            <div className="text-left space-y-2 text-sm text-gray-700">
              <p>✓ Ambulance driver activates Red Alert during emergency</p>
              <p>✓ System detects nearby vehicles within 500m radius</p>
              <p>✓ Alerts sent only to vehicles on the same route direction</p>
              <p>✓ Public drivers receive audio + visual emergency notification</p>
              <p>✓ Traffic clears faster, saving precious lives</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Powered by Next.js • Built for Vercel • v1.0.0</p>
        </div>
      </div>
    </main>
  );
}
