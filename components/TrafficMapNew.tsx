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
  height?: string;
  selectedHospital?: Hospital;
  onRouteCalculated?: (routeData: any) => void;
}

// Global flag to track if Google Maps script is loaded
declare global {
  interface Window {
    googleMapsLoaded?: boolean;
    initMap?: () => void;
  }
}

export default function TrafficMap({
  center,
  zoom = 13,
  ambulances = [],
  hospitals = [],
  showTraffic = true,
  currentLocation,
  height = '500px',
  selectedHospital,
  onRouteCalculated
}: TrafficMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const calculatedRoutesRef = useRef<Map<string, any>>(new Map()); // Cache calculated routes
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    // Check if already loaded
    if (window.googleMapsLoaded) {
      setIsLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if ((window as any).google?.maps) {
          window.googleMapsLoaded = true;
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      window.googleMapsLoaded = true;
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      setError('Failed to load Google Maps');
    };
    
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const google = (window as any).google;
    if (!google) return;

    try {
      // Create map
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Add traffic layer
      if (showTraffic) {
        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(map);
        trafficLayerRef.current = trafficLayer;
      }

      console.log('✅ Map initialized successfully');
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
    }
  }, [isLoaded, center.lat, center.lng, zoom, showTraffic]);

  // Update center when it changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setCenter(center);
    }
  }, [center.lat, center.lng]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const google = (window as any).google;
    if (!google) return;

    // Clear old markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add current location marker
    if (currentLocation) {
      const marker = new google.maps.Marker({
        position: currentLocation,
        map: mapInstanceRef.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      markersRef.current.push(marker);
    }

    // Add ambulance markers
    ambulances.forEach(ambulance => {
      const color = ambulance.status === 'red' ? '#ef4444' : 
                    ambulance.status === 'yellow' ? '#f59e0b' : '#10b981';
      
      const marker = new google.maps.Marker({
        position: { lat: ambulance.lat, lng: ambulance.lng },
        map: mapInstanceRef.current,
        title: ambulance.vehicle_no,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px;">
          <strong>${ambulance.vehicle_no}</strong><br/>
          ${ambulance.name || ''}<br/>
          Status: <span style="color: ${color};">${ambulance.status.toUpperCase()}</span>
        </div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Add hospital markers
    hospitals.forEach(hospital => {
      const marker = new google.maps.Marker({
        position: { lat: hospital.lat, lng: hospital.lng },
        map: mapInstanceRef.current,
        title: hospital.name,
        icon: {
          url: 'https://maps.google.com/mapfiles/kml/shapes/hospitals.png',
          scaledSize: new google.maps.Size(32, 32)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 8px;">
          <strong>🏥 ${hospital.name}</strong><br/>
          ${hospital.distance ? `📍 ${hospital.distance.toFixed(1)} km away` : ''}
        </div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [isLoaded, ambulances, hospitals, currentLocation]);

  // Calculate and display route when hospital is selected
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !selectedHospital || !currentLocation) {
      // Clear existing route
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      return;
    }

    const google = (window as any).google;
    if (!google) return;

    // Create unique cache key for this route
    const cacheKey = `${currentLocation.lat},${currentLocation.lng}-${selectedHospital.lat},${selectedHospital.lng}`;
    
    // Check if route already calculated (use cached result)
    if (calculatedRoutesRef.current.has(cacheKey)) {
      console.log('✅ Using cached route for:', selectedHospital.name);
      const cachedData = calculatedRoutesRef.current.get(cacheKey);
      
      // Clear old renderer
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }

      // Create new renderer and display cached route
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 6,
          strokeOpacity: 0.9
        },
        preserveViewport: false
      });
      directionsRendererRef.current = directionsRenderer;
      directionsRenderer.setDirections(cachedData.directionsResult);
      
      // Send cached route data
      onRouteCalculated?.(cachedData.routeData);
      return;
    }

    // Prevent recalculation if already calculating
    if (calculatingRoute) {
      console.log('⏳ Route calculation already in progress, skipping...');
      return;
    }

    setCalculatingRoute(true);
    console.log('📍 Calculating shortest route to:', selectedHospital.name);

    // Create DirectionsService
    const directionsService = new google.maps.DirectionsService();
    
    // Clear old renderer
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    // Create new renderer with custom styling
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: false, // Show start/end markers
      polylineOptions: {
        strokeColor: '#2563eb', // Blue route line
        strokeWeight: 6,
        strokeOpacity: 0.9
      },
      preserveViewport: false // Auto-zoom to fit route
    });
    directionsRendererRef.current = directionsRenderer;

    // Request multiple route calculations with different strategies to find absolute shortest
    const routeRequests = [
      // Request 1: Standard with alternatives
      {
        origin: currentLocation,
        destination: { lat: selectedHospital.lat, lng: selectedHospital.lng },
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        },
        provideRouteAlternatives: true,
        optimizeWaypoints: true
      },
      // Request 2: Avoid highways (sometimes shorter)
      {
        origin: currentLocation,
        destination: { lat: selectedHospital.lat, lng: selectedHospital.lng },
        travelMode: google.maps.TravelMode.DRIVING,
        avoidHighways: true,
        provideRouteAlternatives: true
      },
      // Request 3: Avoid tolls (different path)
      {
        origin: currentLocation,
        destination: { lat: selectedHospital.lat, lng: selectedHospital.lng },
        travelMode: google.maps.TravelMode.DRIVING,
        avoidTolls: true,
        provideRouteAlternatives: true
      }
    ];

    // Make all requests in parallel
    Promise.all(
      routeRequests.map(request => 
        new Promise((resolve) => {
          directionsService.route(request, (result: any, status: any) => {
            if (status === google.maps.DirectionsStatus.OK) {
              resolve(result.routes);
            } else {
              resolve([]);
            }
          });
        })
      )
    ).then((allResults: any) => {
      setCalculatingRoute(false);
      
      // Flatten all routes from all requests
      const allRoutes = allResults.flat().filter((r: any) => r);
      
      if (allRoutes.length === 0) {
        console.error('❌ No routes found');
        setError('No routes available');
        return;
      }

      console.log(`✅ Evaluated ${allRoutes.length} total route options`);

      // Find the absolute shortest route by distance using minimum distance algorithm
      let shortestRoute = allRoutes[0];
      let shortestDistance = allRoutes[0].legs[0].distance.value;

      allRoutes.forEach((route: any, index: number) => {
        const distance = route.legs[0].distance.value;
        const duration = route.legs[0].duration.value;
        console.log(`Route ${index + 1}: ${(distance / 1000).toFixed(2)} km (${Math.round(duration / 60)} min)`);
        
        // Select route with minimum distance (Dijkstra-like shortest path)
        if (distance < shortestDistance) {
          shortestDistance = distance;
          shortestRoute = route;
        }
      });

      console.log(`🎯 SHORTEST PATH SELECTED: ${(shortestDistance / 1000).toFixed(2)} km`);

      // Display the shortest route
      const modifiedResult = {
        routes: [shortestRoute],
        request: routeRequests[0]
      };
      directionsRenderer.setDirections(modifiedResult);

      // Extract route data from shortest route
      const leg = shortestRoute.legs[0];
      
      const routeData = {
        distance: leg.distance.text,
        distanceValue: leg.distance.value,
        duration: leg.duration.text,
        durationValue: leg.duration.value,
        durationInTraffic: leg.duration_in_traffic?.text || leg.duration.text,
        durationInTrafficValue: leg.duration_in_traffic?.value || leg.duration.value,
        steps: leg.steps.map((step: any) => ({
          instruction: step.instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
          distance: step.distance.text,
          duration: step.duration.text,
          maneuver: step.maneuver
        })),
        trafficDelay: leg.duration_in_traffic 
          ? Math.round((leg.duration_in_traffic.value - leg.duration.value) / 60) 
          : 0,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        overview_polyline: shortestRoute.overview_polyline
      };

      // Cache this route to prevent recalculation
      const cacheKey = `${currentLocation.lat},${currentLocation.lng}-${selectedHospital.lat},${selectedHospital.lng}`;
      calculatedRoutesRef.current.set(cacheKey, {
        directionsResult: modifiedResult,
        routeData
      });
      console.log('💾 Route cached for future use');
      console.log('📊 Shortest route data:', routeData);
      onRouteCalculated?.(routeData);
    }).catch((error) => {
      setCalculatingRoute(false);
      console.error('❌ Route calculation failed:', error);
      setError('Failed to calculate route');
    });
  }, [isLoaded, selectedHospital?.id, currentLocation?.lat, currentLocation?.lng]);

  // Show error state
  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg" 
        style={{ height }}
      >
        <div className="text-center p-6">
          <p className="text-red-600 font-semibold mb-2">⚠️ {error}</p>
          <p className="text-sm text-gray-600">Check console for details</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isLoaded) {
    return (
      <div 
        className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 border-2 border-blue-200 rounded-lg" 
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Loading Google Maps...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  // Render map
  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }} 
        className="rounded-lg shadow-lg"
      />
      
      {/* Calculating Route Indicator */}
      {calculatingRoute && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="font-semibold">Calculating route...</span>
        </div>
      )}
      
      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-1">Legend</p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Emergency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Non-Emergency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">🏥</span>
            <span>Hospital</span>
          </div>
        </div>
      </div>
    </div>
  );
}
