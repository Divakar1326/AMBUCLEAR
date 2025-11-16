'use client';

import { useEffect, useRef, useState } from 'react';

interface Location {
  lat: number;
  lng: number;
}

interface Ambulance {
  id: string;
  name?: string;
  vehicle_no: string;
  status: 'red' | 'yellow' | 'green';
  lat: number;
  lng: number;
}

interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface TrafficMapProps {
  center: Location;
  zoom?: number;
  ambulances?: Ambulance[];
  hospitals?: Hospital[];
  showTraffic?: boolean;
  currentLocation?: Location;
  onMapLoad?: (map: any) => void;
  height?: string;
}

export default function TrafficMap({
  center,
  zoom = 13,
  ambulances = [],
  hospitals = [],
  showTraffic = true,
  currentLocation,
  onMapLoad,
  height = '600px'
}: TrafficMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [trafficLayer, setTrafficLayer] = useState<google.maps.TrafficLayer | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [routeLine, setRouteLine] = useState<google.maps.Polyline | null>(null);
  const [loading, setLoading] = useState(true);
  const [trafficInfo, setTrafficInfo] = useState<string>('');

  // Initialize map using script tag (same as test page)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    console.log('TrafficMap: Initializing...');
    console.log('TrafficMap: API Key present?', apiKey ? 'YES' : 'NO');
    
    if (!apiKey) {
      console.error('❌ Google Maps API key not configured');
      setLoading(false);
      return;
    }

    // Function to initialize map
    const initializeMap = () => {
      console.log('TrafficMap: Initializing map instance...');
      
      if (!mapRef.current) {
        console.error('❌ Map ref not available');
        setTimeout(initializeMap, 100); // Retry after 100ms
        return;
      }

      if (!(window as any).google || !(window as any).google.maps) {
        console.log('⏳ Google Maps not loaded yet, waiting...');
        setTimeout(initializeMap, 100);
        return;
      }

      try {
        const newMap = new (window as any).google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        console.log('✅ Map instance created');
        setMap(newMap);
        
        // Add traffic layer
        const traffic = new (window as any).google.maps.TrafficLayer();
        if (showTraffic) {
          traffic.setMap(newMap);
          console.log('✅ Traffic layer enabled');
        }
        setTrafficLayer(traffic);
        
        setLoading(false);
        onMapLoad?.(newMap);
      } catch (error) {
        console.error('❌ Error creating map:', error);
        setLoading(false);
      }
    };

    // Check if script already exists
    if ((window as any).google && (window as any).google.maps) {
      console.log('✅ Google Maps already loaded');
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      console.log('⏳ Google Maps script already loading...');
      existingScript.addEventListener('load', initializeMap);
      return;
    }

    // Load Google Maps script
    console.log('📥 Loading Google Maps script...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('✅ Google Maps script loaded');
      initializeMap();
    };
    
    script.onerror = (error) => {
      console.error('❌ Failed to load Google Maps script:', error);
      setLoading(false);
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Update map center when location changes
  useEffect(() => {
    if (map && center) {
      map.setCenter(center);
    }
  }, [map, center.lat, center.lng]);

  // Toggle traffic layer
  useEffect(() => {
    if (trafficLayer && map) {
      trafficLayer.setMap(showTraffic ? map : null);
    }
  }, [trafficLayer, map, showTraffic]);

  // Update markers for ambulances and hospitals
  useEffect(() => {
    if (!map || !(window as any).google) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    const newMarkers: any[] = [];

    const google = (window as any).google;

    // Add current location marker
    if (currentLocation) {
      const currentMarker = new google.maps.Marker({
        position: currentLocation,
        map,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      newMarkers.push(currentMarker);
    }

    // Add ambulance markers
    ambulances.forEach(ambulance => {
      const color = ambulance.status === 'red' ? '#ef4444' : 
                    ambulance.status === 'yellow' ? '#f59e0b' : '#10b981';
      
      const marker = new google.maps.Marker({
        position: { lat: ambulance.lat, lng: ambulance.lng },
        map,
        title: `${ambulance.vehicle_no} (${ambulance.status.toUpperCase()})`,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 2,
          anchor: new google.maps.Point(12, 22)
        },
        label: {
          text: '🚑',
          fontSize: '20px',
          fontWeight: 'bold'
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h3 style="font-weight: bold; margin-bottom: 5px;">${ambulance.vehicle_no}</h3>
            <p style="margin: 2px 0;">${ambulance.name || 'Ambulance Driver'}</p>
            <p style="margin: 2px 0;">Status: <span style="color: ${color}; font-weight: bold;">${ambulance.status.toUpperCase()}</span></p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    // Add hospital markers
    hospitals.forEach(hospital => {
      const marker = new google.maps.Marker({
        position: { lat: hospital.lat, lng: hospital.lng },
        map,
        title: hospital.name,
        icon: {
          url: 'https://maps.google.com/mapfiles/kml/shapes/hospitals.png',
          scaledSize: new google.maps.Size(40, 40)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 5px;">🏥 ${hospital.name}</h3>
            ${hospital.distance ? `<p style="margin: 2px 0; color: #2563eb;">📍 ${hospital.distance.toFixed(1)} km away</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
  }, [map, ambulances, hospitals, currentLocation]);

  // Check traffic level at current location
  useEffect(() => {
    if (!currentLocation) return;

    const checkTraffic = async () => {
      try {
        const response = await fetch('/api/google-maps/traffic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: currentLocation })
        });

        const data = await response.json();
        if (data.success) {
          setTrafficInfo(data.data.description);
        }
      } catch (error) {
        console.error('Error checking traffic:', error);
      }
    };

    checkTraffic();
    const interval = setInterval(checkTraffic, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [currentLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 rounded-lg border-2 border-blue-200" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold mb-1">Loading Google Maps...</p>
          <p className="text-sm text-gray-500">Initializing live traffic data</p>
        </div>
      </div>
    );
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center bg-red-50 rounded-lg border-2 border-red-200" style={{ height }}>
        <div className="text-center p-6">
          <p className="text-red-600 font-semibold mb-2">⚠️ Google Maps Not Configured</p>
          <p className="text-sm text-gray-600">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height, width: '100%' }} className="rounded-lg shadow-lg" />
      
      {/* Traffic Info Overlay */}
      {trafficInfo && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 border-2 border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚦</span>
            <div>
              <p className="text-xs text-gray-600">Current Traffic</p>
              <p className="text-sm font-semibold text-gray-900">{trafficInfo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg px-4 py-3 border-2 border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">Legend</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Emergency (Red)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Non-Emergency (Yellow)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Available (Green)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🏥</span>
            <span>Hospital</span>
          </div>
        </div>
      </div>
    </div>
  );
}
