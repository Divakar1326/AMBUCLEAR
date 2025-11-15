'use client';

import { useEffect, useState } from 'react';

export default function MapDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>({});

  useEffect(() => {
    const runDiagnostics = () => {
      const results = {
        timestamp: new Date().toISOString(),
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        apiKeyPresent: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        apiKeyLength: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.length || 0,
        windowGoogle: typeof (window as any).google !== 'undefined',
        windowGoogleMaps: typeof (window as any).google?.maps !== 'undefined',
        allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')),
        userAgent: navigator.userAgent,
        online: navigator.onLine,
      };
      
      console.log('🔍 Map Diagnostics:', results);
      setDiagnostics(results);
    };

    runDiagnostics();
    
    // Run every 2 seconds to watch for changes
    const interval = setInterval(runDiagnostics, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-white border-2 border-blue-500 rounded-lg shadow-xl p-4 max-w-md z-50">
      <h3 className="font-bold text-lg mb-2">🔍 Map Diagnostics</h3>
      <div className="space-y-1 text-sm font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${diagnostics.apiKeyPresent ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>API Key: {diagnostics.apiKeyPresent ? '✅ Present' : '❌ Missing'}</span>
        </div>
        {diagnostics.apiKeyPresent && (
          <div className="text-xs text-gray-600 ml-5">
            Length: {diagnostics.apiKeyLength} chars
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${diagnostics.windowGoogle ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          <span>Google Object: {diagnostics.windowGoogle ? '✅ Loaded' : '⏳ Loading...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${diagnostics.windowGoogleMaps ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          <span>Google Maps: {diagnostics.windowGoogleMaps ? '✅ Ready' : '⏳ Loading...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${diagnostics.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>Internet: {diagnostics.online ? '✅ Online' : '❌ Offline'}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200">
        <details>
          <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
            View all env vars
          </summary>
          <div className="mt-2 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-auto">
            {diagnostics.allEnvVars?.map((key: string) => (
              <div key={key}>{key}</div>
            ))}
          </div>
        </details>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Updated: {diagnostics.timestamp}
      </div>
    </div>
  );
}
