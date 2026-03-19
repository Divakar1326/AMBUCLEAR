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

const FIXED_SCENARIO = {
  start: START_POINTS[0],
  hospital: HOSPITALS[1],
};

interface SimulationLog {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
}

function narrate(text: string, shouldSpeak: boolean = true) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  if (!shouldSpeak) {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    return;
  }
  // Cancel previous utterance
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-IN';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

function toPoint(latLng: any): Point {
  return { lat: latLng.lat(), lng: latLng.lng() };
}

interface MarkerTheme {
  fallbackColor?: string;
  fallbackLabelColor?: string;
  fallbackScale?: number;
}

export default function ChennaiTrafficSimulationV2() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const ambulanceMarkerRef = useRef<any>(null);
  const carMarkersRef = useRef<any[]>([]);
  const scatteredCarsRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const runIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const [reason, setReason] = useState<SosReason>('signal_stuck');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Preparing automatic simulation...');
  const [activeRun, setActiveRun] = useState(false);
  const [sosState, setSosState] = useState('No SOS sent in this run yet.');
  const [scenario, setScenario] = useState<{ start: Place; hospital: Place } | null>(null);
  const [publicAlerts, setPublicAlerts] = useState<Array<{ id: string; message: string; icon: string }>>([]);
  const [simulationLogs, setSimulationLogs] = useState<SimulationLog[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioEnabledRef = useRef(true);

  const reasonText = useMemo(() => SOS_REASON_LABEL[reason], [reason]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  const pushSimulationLog = (title: string, detail: string, speak = false) => {
    const log: SimulationLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      detail,
      timestamp: new Date().toLocaleTimeString(),
    };

    setSimulationLogs((prev) => [log, ...prev].slice(0, 10));

    if (speak && audioEnabledRef.current) {
      narrate(`${title}. ${detail}`);
    }
  };

  const getMarkerPosition = (marker: any): Point => {
    if (typeof marker?.getPosition === 'function') {
      const pos = marker.getPosition();
      return {
        lat: pos?.lat?.() ?? 13,
        lng: pos?.lng?.() ?? 80,
      };
    }

    return {
      lat: marker?.position?.lat ?? 13,
      lng: marker?.position?.lng ?? 80,
    };
  };

  const setMarkerPosition = (marker: any, point: Point) => {
    if (!marker) return;

    if (typeof marker.setPosition === 'function') {
      marker.setPosition(point);
      return;
    }

    marker.position = point;
  };

  const createMarker = (
    google: any,
    map: any,
    position: Point,
    title: string,
    content: HTMLElement,
    theme?: MarkerTheme
  ) => {
    const advancedCtor = google?.maps?.marker?.AdvancedMarkerElement;
    if (advancedCtor) {
      return new advancedCtor({
        map,
        position,
        content,
        title,
      });
    }

    return new google.maps.Marker({
      map,
      position,
      title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: theme?.fallbackColor || '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: theme?.fallbackScale ?? 12,
      },
      label: {
        text: (content.textContent || '').slice(0, 2),
        color: theme?.fallbackLabelColor || '#ffffff',
        fontWeight: '700',
      },
    });
  };

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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps script failed to load'));
      document.head.appendChild(script);
    });

    return (window as any).google;
  };

  const addPublicAlert = (message: string, icon: string) => {
    const alertId = Date.now().toString();
    setPublicAlerts((prev) => [...prev, { id: alertId, message, icon }]);
    pushSimulationLog('Public driver alert', message, true);

    const timeoutId = window.setTimeout(() => {
      setPublicAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }, 6000);

    timersRef.current.push(timeoutId);
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
    pushSimulationLog('SOS sent to control room', `${reasonText} at ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, true);

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
        pushSimulationLog('Control room resolved SOS', `Alert marked resolved for ${reasonText}.`, true);
      } else {
        setSosState('SOS created but auto-resolve failed.');
        pushSimulationLog('SOS resolve failed', 'Control room API returned an error while resolving.', false);
      }
    }, 7000);

    timersRef.current.push(timeoutId);
  };

  const addScatteredCars = (google: any, map: any, path: Point[]) => {
    scatteredCarsRef.current.forEach((marker) => marker.setMap(null));
    scatteredCarsRef.current = [];

    const carCount = 12;
    for (let i = 0; i < carCount; i++) {
      const pathIndex = Math.floor((Math.random() * path.length * 0.7) + path.length * 0.15);
      const basePoint = path[Math.min(pathIndex, path.length - 1)];
      const offsetLat = (Math.random() - 0.5) * 0.0005;
      const offsetLng = (Math.random() - 0.5) * 0.0005;

      const label = document.createElement('div');
      label.textContent = '🚗';
      label.style.fontSize = '20px';
      label.style.width = '34px';
      label.style.height = '34px';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.justifyContent = 'center';
      label.style.background = 'linear-gradient(135deg, #0ea5e9, #1d4ed8)';
      label.style.border = '2px solid #ffffff';
      label.style.borderRadius = '50%';
      label.style.boxShadow = '0 3px 8px rgba(2, 6, 23, 0.35)';

      const marker = createMarker(
        google,
        map,
        { lat: basePoint.lat + offsetLat, lng: basePoint.lng + offsetLng },
        `Traffic Vehicle ${i + 1}`,
        label,
        { fallbackColor: '#2563eb', fallbackLabelColor: '#ffffff', fallbackScale: 10 }
      );

      scatteredCarsRef.current.push(marker);
    }
  };

  const buildJunctionCars = (google: any, map: any, anchor: Point) => {
    carMarkersRef.current.forEach((marker) => marker.setMap(null));
    carMarkersRef.current = [];

    const offsets = [
      { lat: 0.00022, lng: -0.00016 },
      { lat: -0.00021, lng: -0.0002 },
      { lat: 0.00024, lng: -0.00033 },
      { lat: -0.00018, lng: -0.00036 },
    ];

    offsets.forEach((offset, idx) => {
      const label = document.createElement('div');
      label.textContent = `🚗 C${idx + 1}`;
      label.style.fontSize = '16px';
      label.style.fontWeight = 'bold';
      label.style.color = '#eff6ff';
      label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.35)';
      label.style.background = '#2563eb';
      label.style.border = '2px solid #ffffff';
      label.style.borderRadius = '9999px';
      label.style.padding = '3px 8px';
      label.style.boxShadow = '0 2px 6px rgba(30, 64, 175, 0.45)';

      const marker = createMarker(
        google,
        map,
        { lat: anchor.lat + offset.lat, lng: anchor.lng + offset.lng },
        `Junction Car ${idx + 1}`,
        label,
        { fallbackColor: '#2563eb', fallbackLabelColor: '#ffffff', fallbackScale: 11 }
      );

      carMarkersRef.current.push(marker);
    });
  };

  const moveCarsAside = () => {
    carMarkersRef.current.forEach((marker, idx) => {
      const current = getMarkerPosition(marker);
      const sideShift = 0.00052 + idx * 0.00006;
      const nextLng = current.lng + sideShift;

      const newLabel = document.createElement('div');
      newLabel.textContent = `🚗✓ C${idx + 1}`;
      newLabel.style.fontSize = '16px';
      newLabel.style.fontWeight = 'bold';
      newLabel.style.color = '#ecfdf5';
      newLabel.style.textShadow = '1px 1px 2px rgba(0,0,0,0.3)';
      newLabel.style.background = '#059669';
      newLabel.style.border = '2px solid #ffffff';
      newLabel.style.borderRadius = '9999px';
      newLabel.style.padding = '3px 8px';
      newLabel.style.boxShadow = '0 2px 6px rgba(6, 95, 70, 0.45)';

      setMarkerPosition(marker, { lat: current.lat, lng: nextLng });

      if ('content' in marker) {
        marker.content = newLabel;
      } else if (typeof marker.setLabel === 'function') {
        marker.setLabel(`C${idx + 1}`);
        marker.setIcon({
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          fillColor: '#059669',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 11,
        });
      }
    });
  };

  const runSimulation = async () => {
    setLoading(true);
    setActiveRun(true);
    setSosState('No SOS sent in this run yet.');
    setStatus('Loading Chennai route and simulation objects...');
    setPublicAlerts([]);
    setSimulationLogs([]);
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

      const start = FIXED_SCENARIO.start;
      const hospital = FIXED_SCENARIO.hospital;
      setScenario({ start, hospital });
      pushSimulationLog('Simulation started', `${start.name} to ${hospital.name}. Same route is reused on every restart.`, true);

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

      // Start marker
      const startLabel = document.createElement('div');
      startLabel.textContent = '📍 START';
      startLabel.style.fontSize = '14px';
      startLabel.style.fontWeight = 'bold';
      startLabel.style.color = '#6366f1';
      startLabel.style.textShadow = '1px 1px 2px rgba(255,255,255,0.8)';
      startLabel.style.backgroundColor = 'rgba(255,255,255,0.9)';
      startLabel.style.padding = '2px 6px';
      startLabel.style.borderRadius = '4px';

      createMarker(google, map, start, `Start: ${start.name}`, startLabel);

      // Hospital marker
      const hospitalLabel = document.createElement('div');
      hospitalLabel.textContent = '🏥 HOSPITAL';
      hospitalLabel.style.fontSize = '14px';
      hospitalLabel.style.fontWeight = 'bold';
      hospitalLabel.style.color = '#dc2626';
      hospitalLabel.style.textShadow = '1px 1px 2px rgba(255,255,255,0.8)';
      hospitalLabel.style.backgroundColor = 'rgba(255,255,255,0.9)';
      hospitalLabel.style.padding = '2px 6px';
      hospitalLabel.style.borderRadius = '4px';

      createMarker(google, map, hospital, `Hospital: ${hospital.name}`, hospitalLabel);

      const junctionIndex = Math.max(3, Math.floor(path.length * 0.48));
      const junctionPoint = path[junctionIndex];

      // Junction marker
      const junctionLabel = document.createElement('div');
      junctionLabel.textContent = '🚦 JUNCTION';
      junctionLabel.style.fontSize = '14px';
      junctionLabel.style.fontWeight = 'bold';
      junctionLabel.style.color = '#0ea5e9';
      junctionLabel.style.textShadow = '1px 1px 2px rgba(255,255,255,0.8)';
      junctionLabel.style.backgroundColor = 'rgba(255,255,255,0.9)';
      junctionLabel.style.padding = '2px 6px';
      junctionLabel.style.borderRadius = '4px';

      createMarker(google, map, junctionPoint, 'Junction', junctionLabel);

      buildJunctionCars(google, map, junctionPoint);
      addScatteredCars(google, map, path);

      // Ambulance marker
      const ambulanceLabel = document.createElement('div');
      ambulanceLabel.textContent = '🚑';
      ambulanceLabel.style.fontSize = '26px';
      ambulanceLabel.style.width = '40px';
      ambulanceLabel.style.height = '40px';
      ambulanceLabel.style.display = 'flex';
      ambulanceLabel.style.alignItems = 'center';
      ambulanceLabel.style.justifyContent = 'center';
      ambulanceLabel.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
      ambulanceLabel.style.border = '2px solid #ffffff';
      ambulanceLabel.style.borderRadius = '50%';
      ambulanceLabel.style.boxShadow = '0 4px 10px rgba(127, 29, 29, 0.45)';

      ambulanceMarkerRef.current = createMarker(
        google,
        map,
        path[0],
        'Simulated Ambulance',
        ambulanceLabel,
        { fallbackColor: '#dc2626', fallbackLabelColor: '#ffffff', fallbackScale: 13 }
      );

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
      pushSimulationLog('Ambulance dispatched', 'Driver switched to RED status and route sync started.', true);

      let index = 0;
      let sosSent = false;
      let carsMoved = false;
      let lastAlertIndex = -1;

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

        // Update ambulance position
        const ambulanceLabel = document.createElement('div');
        ambulanceLabel.textContent = '🚑';
        ambulanceLabel.style.fontSize = '26px';
        ambulanceLabel.style.width = '40px';
        ambulanceLabel.style.height = '40px';
        ambulanceLabel.style.display = 'flex';
        ambulanceLabel.style.alignItems = 'center';
        ambulanceLabel.style.justifyContent = 'center';
        ambulanceLabel.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
        ambulanceLabel.style.border = '2px solid #ffffff';
        ambulanceLabel.style.borderRadius = '50%';
        ambulanceLabel.style.boxShadow = '0 4px 10px rgba(127, 29, 29, 0.45)';

        if (ambulanceMarkerRef.current) {
          setMarkerPosition(ambulanceMarkerRef.current, point);

          if ('content' in ambulanceMarkerRef.current) {
            ambulanceMarkerRef.current.content = ambulanceLabel;
          } else if (typeof ambulanceMarkerRef.current.setIcon === 'function') {
            ambulanceMarkerRef.current.setIcon({
              path: (window as any).google.maps.SymbolPath.CIRCLE,
              fillColor: '#dc2626',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 13,
            });
          }
        }

        try {
          await syncAmbulanceLocation(point, hospital, routeMeta);
        } catch (syncError) {
          console.error('Simulation location sync failed:', syncError);
        }

        // Check if near scattered cars and send alerts
        if (index % 3 === 0 && index !== lastAlertIndex) {
          const randomAlert = Math.random();
          if (randomAlert > 0.6) {
            addPublicAlert('🚑 Emergency ambulance approaching! Please yield!', '🚨');
          }
          lastAlertIndex = index;
        }

        if (!carsMoved && index >= junctionIndex - 3) {
          moveCarsAside();
          carsMoved = true;
          addPublicAlert('🚑 EMERGENCY! Clear the path!', '🚨');
          pushSimulationLog('Car dialogue', 'Car 1 move right. Car 2 move left. Junction lane cleared.', true);
        }

        if (!sosSent && index >= junctionIndex) {
          sosSent = true;
          setStatus('Junction reached. Cars yielding. SOS event initiated.');
          sendAndAutoResolveSOS(point, liveRunId);
          addPublicAlert(`SOS ALERT: ${reasonText}`, '🆘');
          pushSimulationLog('SOS in progress', 'Alert was sent from ambulance and control room is responding.', true);
        }

        if (index >= path.length - 1) {
          window.clearInterval(intervalId);
          await syncAmbulanceStatus('green');
          setStatus(`Completed: ambulance reached ${hospital.name} on the planned route.`);
          setActiveRun(false);
          addPublicAlert('✅ Ambulance arrived at hospital safely!', '✅');
          pushSimulationLog('Case completed', 'Patient route closed and ambulance moved to GREEN status.', true);
          return;
        }

        index += 1;
      }, 2000);

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
          <h2 className="text-xl font-bold text-white">Automatic Chennai Simulation (Enhanced)</h2>
          <p className="text-sm text-gray-300 mt-1">
            🚑 Ambulance with 🚗 cars, public alerts, and voice notifications
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
            onClick={() => {
              setAudioEnabled((prev) => !prev);
              // Cancel any ongoing speech immediately
              if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
              }
            }}
            className={`px-3 py-2 rounded text-sm font-semibold border ${
              audioEnabled
                ? 'bg-emerald-600/80 border-emerald-400 text-white hover:bg-emerald-600'
                : 'bg-slate-700 border-slate-500 text-gray-200 hover:bg-slate-600'
            }`}
          >
            {audioEnabled ? 'Audio ON' : 'Audio OFF'}
          </button>
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

      <div className="mb-4 rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-cyan-100 font-semibold">Simulation Process Dialog</p>
          <span className="text-xs text-cyan-200">Live updates for cars, SOS, and control-room resolution</span>
        </div>
        {simulationLogs.length === 0 ? (
          <p className="text-sm text-cyan-100/80">Waiting for events...</p>
        ) : (
          <div className="space-y-2 max-h-44 overflow-auto pr-1">
            {simulationLogs.map((entry) => (
              <div key={entry.id} className="rounded-md bg-black/20 px-3 py-2 border border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{entry.title}</p>
                  <span className="text-[11px] text-gray-300">{entry.timestamp}</span>
                </div>
                <p className="text-xs text-gray-200 mt-1">{entry.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Public Alerts Section */}
      {publicAlerts.length > 0 && (
        <div className="mb-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg">
          <p className="text-xs font-bold text-red-900 mb-2">📱 PUBLIC DRIVER ALERTS:</p>
          <div className="space-y-2">
            {publicAlerts.map((alert) => (
              <div key={alert.id} className="text-sm text-red-900 font-semibold animate-pulse">
                {alert.icon} {alert.message}
              </div>
            ))}
          </div>
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
