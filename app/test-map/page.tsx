'use client';

import { useEffect, useState } from 'react';

export default function TestMapPage() {
  const [apiKey, setApiKey] = useState<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Check if API key is available
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log('Test Page - API Key:', key);
    setApiKey(key || 'NOT FOUND');

    // Try to load Google Maps
    if (key) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        setMapLoaded(true);
      };
      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error);
      };
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🗺️ Google Maps API Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">API Key Status:</span>
              <span className={`px-3 py-1 rounded ${apiKey && apiKey !== 'NOT FOUND' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {apiKey && apiKey !== 'NOT FOUND' ? '✅ Present' : '❌ Missing'}
              </span>
            </div>
            {apiKey && apiKey !== 'NOT FOUND' && (
              <div className="mt-2 p-3 bg-gray-100 rounded font-mono text-sm break-all">
                {apiKey}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Google Maps Script Status</h2>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Loading Status:</span>
            <span className={`px-3 py-1 rounded ${mapLoaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {mapLoaded ? '✅ Loaded' : '⏳ Loading...'}
            </span>
          </div>
        </div>

        {mapLoaded && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Map Test</h2>
            <div id="map" className="w-full h-96 rounded-lg bg-gray-200"></div>
            <button
              onClick={() => {
                const mapDiv = document.getElementById('map');
                if (mapDiv && (window as any).google) {
                  new (window as any).google.maps.Map(mapDiv, {
                    center: { lat: 13.0827, lng: 80.2707 },
                    zoom: 13,
                  });
                  
                  // Add traffic layer
                  const traffic = new (window as any).google.maps.TrafficLayer();
                  traffic.setMap(new (window as any).google.maps.Map(mapDiv, {
                    center: { lat: 13.0827, lng: 80.2707 },
                    zoom: 13,
                  }));
                }
              }}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              🗺️ Initialize Map with Traffic
            </button>
          </div>
        )}

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-bold text-blue-900 mb-2">📝 Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-900">
            <li>Check if the API key is present above</li>
            <li>If missing, verify .env.local file exists in the project root</li>
            <li>Make sure the variable name is NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</li>
            <li>If you just added it, restart the Next.js dev server</li>
            <li>After restarting, hard refresh this page (Ctrl + Shift + R)</li>
          </ol>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <h3 className="font-bold mb-2">Console Output:</h3>
          <p className="text-sm text-gray-600">Check your browser console (F12) for detailed logs</p>
        </div>
      </div>
    </div>
  );
}
