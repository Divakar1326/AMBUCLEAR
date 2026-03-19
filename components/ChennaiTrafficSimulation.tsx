'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type SosReason = 'signal_stuck' | 'traffic_jam' | 'accident';

interface Point {
  lat: number;
  lng: number;
}

interface Place extends Point {
  name: string;
  address: string;
}

const SIMULATION_AMBULANCE_ID = 'AMB-TN01AB2026';

const START_POINTS: Place[] = [
  {
    name: 'T. Nagar',
    address: 'South Usman Road, T Nagar, Chennai',
    lat: 13.0418,
    lng: 80.2337,
  },
  {
    name: 'Tambaram',
    address: 'GST Road, Tambaram, Chennai',
    lat: 12.9249,
    lng: 80.1000,
  },
  {
    name: 'Anna Nagar',
    address: '2nd Avenue, Anna Nagar, Chennai',
    lat: 13.0850,
    lng: 80.2101,
  },
  {
    name: 'Velachery',
    address: 'Velachery Main Road, Chennai',
    lat: 12.9752,
    lng: 80.2212,
  },
];

const HOSPITALS: Place[] = [
  {
    name: 'Rajiv Gandhi Government General Hospital',
    address: 'Park Town, Chennai',
    lat: 13.0816,
    lng: 80.2750,
  },
  {
    name: 'Apollo Hospital Greams Road',
    address: 'Greams Lane, Chennai',
    lat: 13.0635,
    lng: 80.2516,
  },
  {
    name: 'Sri Ramachandra Hospital',
    address: 'Porur, Chennai',
    lat: 13.0381,
    lng: 80.1429,
  },
];

const SOS_REASON_LABEL: Record<SosReason, string> = {
  signal_stuck: 'Signal stuck',
  traffic_jam: 'Traffic jam',
  accident: 'Accident',
};

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function toPoint(latLng: any): Point {
  return { lat: latLng.lat(), lng: latLng.lng() };
}

function calculateDistance(p1: Point, p2: Point): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Return in meters
}

function isInSameLane(ambulancePoint: Point, carPoint: Point): { inLane: boolean; direction?: 'left' | 'right' } {
  // Simple lane detection: if long difference is very small (within ~0.0003 degrees ~30m)
  const lngDiff = Math.abs(ambulancePoint.lng - carPoint.lng);
  const latDiff = Math.abs(ambulancePoint.lat - carPoint.lat);

  if (lngDiff < 0.0003) {
    // Same lane (main road), suggestdirection based on position
    return {
      inLane: true,
      direction: carPoint.lng < ambulancePoint.lng ? 'right' : 'left',
    };
  }

  return { inLane: false };
}

export default function ChennaiTrafficSimulation() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const ambulanceMarkerRef = useRef<any>(null);
  const carMarkersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const runIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const scatteredCarsRef = useRef<any[]>([]);

  const [reason, setReason] = useState<SosReason>('signal_stuck');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Preparing automatic simulation...');
  const [activeRun, setActiveRun] = useState(false);
  const [sosState, setSosState] = useState('No SOS sent in this run yet.');
  const [scenario, setScenario] = useState<{ start: Place; hospital: Place } | null>(null);
  const [publicAlerts, setPublicAlerts] = useState<Array<{ id: string; message: string; timestamp: number }>>([]);

  const reasonText = useMemo(() => SOS_REASON_LABEL[reason], [reason]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearInterval(id));
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const loadGoogleMaps = async () => {
    const googleObject = (window as any).google;
    if (googleObject?.maps) {
      return googleObject;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is missing');
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps script failed to load'));
      document.head.appendChild(script);
    });

    return (window as any).google;
  };

  const syncAmbulanceStatus = async (nextStatus: 'red' | 'yellow' | 'green') => {
    await fetch(`/api/ambulance/${SIMULATION_AMBULANCE_ID}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
  };

  const syncAmbulanceLocation = async (
    point: Point,
    hospital: Place,
    routeMeta?: { distanceText: string; durationText: string; trafficDelayMin: number }
  ) => {
    await fetch(`/api/ambulance/${SIMULATION_AMBULANCE_ID}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: point.lat,
        lng: point.lng,
        heading: 0,
        destination: {
          id: `sim-${hospital.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: hospital.name,
          lat: hospital.lat,
          lng: hospital.lng,
          address: hospital.address,
          source: 'simulation-auto',
          selected_at: new Date().toISOString(),
        },
        route_overview: routeMeta
          ? {
              locked: true,
              distance: routeMeta.distanceText,
              durationInTraffic: routeMeta.durationText,
              trafficDelay: routeMeta.trafficDelayMin,
              updated_at: new Date().toISOString(),
            }
          : undefined,
      }),
    });
  };

  const sendAndAutoResolveSOS = async (point: Point, liveRunId: number) => {
    setSosState(`SOS sent: ${reasonText}. Waiting auto-resolve...`);

    const createRes = await fetch('/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ambulance_id: SIMULATION_AMBULANCE_ID,
        lat: point.lat,
        lng: point.lng,
        type: 'simulation',
        note: `Simulation SOS: ${reasonText}`,
      }),
    });

    if (!createRes.ok) {
      setSosState('SOS send failed for this run.');
      return;
    }

    const createData = await createRes.json();
    const sosId = createData?.sos?.id as string | undefined;

    if (!sosId) {
      setSosState('SOS created without id; cannot auto-resolve.');
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      if (runIdRef.current !== liveRunId) return;

      const resolveRes = await fetch(`/api/sos/${sosId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });

      if (resolveRes.ok) {
        setSosState(`SOS auto-resolved (${reasonText}) for signal testing.`);
      } else {
        setSosState('SOS created but auto-resolve failed.');
      }
    }, 7000);

    timersRef.current.push(timeoutId);
  };

  const buildCars = (google: any, map: any, anchor: Point) => {
    carMarkersRef.current.forEach((marker) => marker.setMap(null));
    carMarkersRef.current = [];
    scatteredCarsRef.current = [];

    const offsets = [
      { lat: 0.00022, lng: -0.00016 },
      { lat: -0.00021, lng: -0.0002 },
      { lat: 0.00024, lng: -0.00033 },
      { lat: -0.00018, lng: -0.00036 },
    ];

    offsets.forEach((offset, idx) => {
      const position = { lat: anchor.lat + offset.lat, lng: anchor.lng + offset.lng };
      const marker = new google.maps.Marker({
        map,
        position,
        label: {
          text: `C${idx + 1}`,
          color: '#111827',
          fontWeight: '700',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      carMarkersRef.current.push(marker);
      scatteredCarsRef.current.push({ position, id: `C${idx + 1}`, marker });
    });
  };

  const moveCarsAside = (anchor: Point) => {
    carMarkersRef.current.forEach((marker, idx) => {
      const sideShift = 0.00052 + idx * 0.00006;
      const current = marker.getPosition();
      const nextLat = current?.lat() ?? anchor.lat;
      const nextLng = (current?.lng() ?? anchor.lng) + sideShift;

      marker.setPosition({ lat: nextLat, lng: nextLng });
      marker.setIcon({
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      });
    });
  };

  const runSimulation = async () => {
    setLoading(true);
    setActiveRun(true);
    setSosState('No SOS sent in this run yet.');
    setStatus('Loading Chennai route and simulation objects...');
    clearTimers();

    const liveRunId = Date.now();
    runIdRef.current = liveRunId;

    try {
      const google = await loadGoogleMaps();
      const mapEl = mapRef.current;

      if (!mapEl) {
        setStatus('Map container unavailable.');
        setActiveRun(false);
        setLoading(false);
        return;
      }

      const start = randomFrom(START_POINTS);
      const hospital = randomFrom(HOSPITALS);
      setScenario({ start, hospital });

      const map = mapInstanceRef.current
        ? mapInstanceRef.current
        : new google.maps.Map(mapEl, {
            center: start,
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy',
          });

      mapInstanceRef.current = map;

      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }

      if (ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current.setMap(null);
      }

      const directionsService = new google.maps.DirectionsService();
      const directionResult = await new Promise<any>((resolve, reject) => {
        directionsService.route(
          {
            origin: start,
            destination: hospital,
            travelMode: google.maps.TravelMode.DRIVING,
            provideRouteAlternatives: false,
            drivingOptions: {
              departureTime: new Date(),
              trafficModel: google.maps.TrafficModel.BEST_GUESS,
            },
          },
          (result: any, dirStatus: any) => {
            if (dirStatus === google.maps.DirectionsStatus.OK && result?.routes?.[0]) {
              resolve(result);
            } else {
              reject(new Error('Failed to fetch route for simulation'));
            }
          }
        );
      });

      const route = directionResult.routes[0];
      const leg = route.legs[0];
      const path = route.overview_path.map((p: any) => toPoint(p));

      if (!path.length) {
        throw new Error('Route path empty');
      }

      routePolylineRef.current = new google.maps.Polyline({
        map,
        path,
        geodesic: false,
        strokeColor: '#2563eb',
        strokeOpacity: 0.95,
        strokeWeight: 5,
      });

      const bounds = new google.maps.LatLngBounds();
      path.forEach((p: Point) => bounds.extend(p));
      map.fitBounds(bounds);

      new google.maps.Marker({
        map,
        position: start,
        title: `Start: ${start.name}`,
        label: { text: 'S', color: '#ffffff', fontWeight: '700' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#6366f1',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      new google.maps.Marker({
        map,
        position: hospital,
        title: `Hospital: ${hospital.name}`,
        label: { text: 'H', color: '#ffffff', fontWeight: '700' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#dc2626',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const junctionIndex = Math.max(3, Math.floor(path.length * 0.48));
      const junctionPoint = path[junctionIndex];

      new google.maps.Marker({
        map,
        position: junctionPoint,
        title: 'Junction',
        label: { text: 'J', color: '#ffffff', fontWeight: '700' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#0ea5e9',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      buildCars(google, map, junctionPoint);

      ambulanceMarkerRef.current = new google.maps.Marker({
        map,
        position: path[0],
        title: 'Simulated Ambulance',
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: 0,
        },
      });

      await syncAmbulanceStatus('red');

      const routeMeta = {
        distanceText: leg.distance?.text || `${((leg.distance?.value || 0) / 1000).toFixed(1)} km`,
        durationText: leg.duration_in_traffic?.text || leg.duration?.text || 'N/A',
        trafficDelayMin: Math.max(
          0,
          Math.round(((leg.duration_in_traffic?.value || leg.duration?.value || 0) - (leg.duration?.value || 0)) / 60)
        ),
      };

      setStatus(`Running: ${start.name} -> ${hospital.name}`);
      setLoading(false);

      let index = 0;
      let sosSent = false;
      let carsMoved = false;

      const generatePublicAlerts = (ambulancePoint: Point) => {
        const PROXIMITY_THRESHOLD = 500; // meters
        const newAlerts: Array<{ id: string; message: string; timestamp: number }> = [];

        scatteredCarsRef.current.forEach((car) => {
          const distance = calculateDistance(ambulancePoint, car.position);

          if (distance < PROXIMITY_THRESHOLD) {
            const laneInfo = isInSameLane(ambulancePoint, car.position);

            if (laneInfo.inLane && laneInfo.direction) {
              // Car is in same lane - urgent directive
              const directionText = laneInfo.direction === 'left' ? 'LEFT ⬅️' : 'RIGHT ➡️';
              newAlerts.push({
                id: `${car.id}-alert`,
                message: `🚑 AMBULANCE APPROACHING! MOVE ${directionText}! Distance: ${distance.toFixed(0)}m`,
                timestamp: Date.now(),
              });

              // Text-to-speech for lane alerts
              if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(
                  `Emergency ambulance approaching! Move to the ${laneInfo.direction}! Now!`
                );
                utterance.rate = 1.5;
                utterance.pitch = 1.2;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
              }
            } else {
              // Car is nearby but not in direct lane
              newAlerts.push({
                id: `${car.id}-alert`,
                message: `🚑 Ambulance nearby: ${distance.toFixed(0)}m away - Stay alert!`,
                timestamp: Date.now(),
              });
            }
          }
        });

        setPublicAlerts(newAlerts);
      };

      const intervalId = window.setInterval(async () => {
        if (runIdRef.current !== liveRunId) {
          window.clearInterval(intervalId);
          return;
        }

        const point = path[index];
        if (!point) {
          window.clearInterval(intervalId);
          return;
        }

        ambulanceMarkerRef.current?.setPosition(point);
        await syncAmbulanceLocation(point, hospital, routeMeta);

        // Generate public alerts based on ambulance proximity to cars
        generatePublicAlerts(point);

        if (!carsMoved && index >= junctionIndex - 3) {
          moveCarsAside(junctionPoint);
          carsMoved = true;
        }

        if (!sosSent && index >= junctionIndex) {
          sosSent = true;
          setStatus('Junction reached. Cars yielding. SOS event initiated.');
          sendAndAutoResolveSOS(point, liveRunId);
        }

        if (index >= path.length - 1) {
          window.clearInterval(intervalId);
          await syncAmbulanceStatus('green');
          setStatus(`Completed: ambulance reached ${hospital.name} on the planned route.`);
          setActiveRun(false);
          setPublicAlerts([]);
          return;
        }

        index += 1;
      }, 900);

      timersRef.current.push(intervalId);
    } catch (error: any) {
      console.error('Simulation error:', error);
      setLoading(false);
      setActiveRun(false);
      setStatus(error?.message || 'Simulation failed to start.');
    }
  };

  useEffect(() => {
    runSimulation();

    return () => {
      clearTimers();
    };
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Automatic Chennai Traffic Simulation</h2>
          <p className="text-sm text-gray-300 mt-1">
            Red ambulance follows one fixed route, 4 cars move aside at a junction, SOS is raised and auto-resolved.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-gray-200">SOS reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as SosReason)}
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-white"
            disabled={activeRun}
          >
            <option value="signal_stuck" className="text-black">Signal stuck</option>
            <option value="traffic_jam" className="text-black">Traffic jam</option>
            <option value="accident" className="text-black">Accident</option>
          </select>
          <button
            onClick={runSimulation}
            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Restart Simulation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-sm">
        <div className="bg-white/5 border border-white/10 rounded p-3">
          <p className="text-gray-400 text-xs">Simulation ambulance</p>
          <p className="text-white font-semibold">{SIMULATION_AMBULANCE_ID}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded p-3">
          <p className="text-gray-400 text-xs">Scenario</p>
          <p className="text-white font-semibold">
            {scenario ? `${scenario.start.name} -> ${scenario.hospital.name}` : 'Preparing...'}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded p-3">
          <p className="text-gray-400 text-xs">SOS flow</p>
          <p className="text-white font-semibold">{reasonText}</p>
        </div>
      </div>

      <div className="mb-3 text-sm text-blue-100 bg-blue-500/20 border border-blue-500/30 rounded p-3">
        {status}
      </div>
      <div className="mb-4 text-sm text-emerald-100 bg-emerald-500/20 border border-emerald-500/30 rounded p-3">
        {sosState}
      </div>

      {publicAlerts.length > 0 && (
        <div className="mb-4 space-y-2 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-yellow-300">🚗 PUBLIC DRIVER ALERTS (Nearby vehicles within 500m):</p>
          {publicAlerts.map((alert) => (
            <div
              key={alert.id}
              className="text-sm bg-red-500/30 border border-red-400/50 rounded p-2 text-red-100 animate-pulse"
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div
        ref={mapRef}
        className="w-full rounded-lg border border-white/10"
        style={{ height: '520px' }}
      />

      {loading && (
        <div className="mt-4 text-sm text-gray-300">Initializing map and route...</div>
      )}
    </div>
  );
}
