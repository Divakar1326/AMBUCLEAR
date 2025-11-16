'use client';

import { useEffect, useRef, useState } from 'react';

interface Ambulance {
  id: string;
  name?: string;
  vehicle_no: string;
  status: 'red' | 'yellow' | 'green';
  lat: number;
  lng: number;
  destination?: {
    name: string;
    lat: number;
    lng: number;
  };
}

interface FastControlMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  ambulances: Ambulance[];
  height?: string;
  selectedSOSLocation?: { lat: number; lng: number; info: string } | null;
}

export default function FastControlMap({
  center,
  zoom = 12,
  ambulances,
  height = '600px',
  selectedSOSLocation
}: FastControlMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map quickly
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const google = (window as any).google;
    if (!google?.maps) {
      // Wait for Google Maps to load
      const checkInterval = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(checkInterval);
          setIsLoaded(true);
        }
      }, 50);
      return () => clearInterval(checkInterval);
    }

    setIsLoaded(true);
  }, []);

  // Create map instance
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const google = (window as any).google;
    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy',
    });

    mapInstanceRef.current = map;

    // Add traffic layer (delayed)
    setTimeout(() => {
      const trafficLayer = new google.maps.TrafficLayer();
      trafficLayer.setMap(map);
    }, 200);
  }, [isLoaded, center.lat, center.lng, zoom]);

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current && selectedSOSLocation) {
      mapInstanceRef.current.setCenter({ lat: selectedSOSLocation.lat, lng: selectedSOSLocation.lng });
      mapInstanceRef.current.setZoom(16);
    } else if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [selectedSOSLocation, center.lat, center.lng, zoom]);

  // Update ambulance markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const google = (window as any).google;

    // Clear old markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add ambulance markers
    ambulances.forEach(ambulance => {
      const color = ambulance.status === 'red' ? '#ef4444' : 
                    ambulance.status === 'yellow' ? '#f59e0b' : '#10b981';
      
      const marker = new google.maps.Marker({
        position: { lat: ambulance.lat, lng: ambulance.lng },
        map: mapInstanceRef.current,
        title: ambulance.vehicle_no,
        icon: {
          path: 'M 0,-2 2,2 0,1 -2,2 Z',
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 5,
        },
        zIndex: 100
      });

      let infoContent = `<div style="padding: 10px; min-width: 180px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <strong style="font-size: 15px;">${ambulance.vehicle_no}</strong>
          <span style="background: ${color}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">
            ${ambulance.status.toUpperCase()}
          </span>
        </div>
        <div style="font-size: 12px; color: #555;">
          <div><strong>Driver:</strong> ${ambulance.name || 'N/A'}</div>`;
      
      if (ambulance.destination) {
        infoContent += `<div style="margin-top: 6px; padding: 6px; background: #f0f9ff; border-left: 2px solid #3b82f6; border-radius: 3px;">
          <div style="color: #1e40af; font-weight: bold; font-size: 11px;">📍 Going to:</div>
          <div style="color: #1e40af; font-size: 11px;">${ambulance.destination.name}</div>
        </div>`;
      }
      
      infoContent += `</div></div>`;

      const infoWindow = new google.maps.InfoWindow({ content: infoContent });
      marker.addListener('click', () => infoWindow.open(mapInstanceRef.current, marker));

      markersRef.current.push(marker);

      // Draw route to destination
      if (ambulance.destination) {
        const destMarker = new google.maps.Marker({
          position: { lat: ambulance.destination.lat, lng: ambulance.destination.lng },
          map: mapInstanceRef.current,
          title: ambulance.destination.name,
          icon: {
            url: 'https://maps.google.com/mapfiles/kml/shapes/hospitals.png',
            scaledSize: new google.maps.Size(28, 28)
          },
          zIndex: 50
        });

        const routeLine = new google.maps.Polyline({
          path: [
            { lat: ambulance.lat, lng: ambulance.lng },
            { lat: ambulance.destination.lat, lng: ambulance.destination.lng }
          ],
          strokeColor: color,
          strokeOpacity: 0.7,
          strokeWeight: 3,
          map: mapInstanceRef.current,
          icons: [{
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              strokeColor: color,
              fillColor: color,
              fillOpacity: 1,
              scale: 2
            },
            offset: '50%',
            repeat: '80px'
          }]
        });

        markersRef.current.push(destMarker, routeLine as any);
      }
    });
  }, [isLoaded, ambulances]);

  if (!isLoaded) {
    return (
      <div style={{ height, width: '100%' }} className="flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-600 text-sm font-semibold">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={mapRef} style={{ height, width: '100%' }} className="rounded-lg shadow-lg" />
  );
}
