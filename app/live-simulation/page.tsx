'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SimulatedVehicle {
  id: string;
  firestoreId?: string;
  type: 'car' | 'ambulance';
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  status?: 'red' | 'yellow' | 'green';
  alert?: {
    direction: string;
    timestamp: number;
    distance: number;
  };
}

interface EventLog {
  timestamp: string;
  type: 'info' | 'alert' | 'ai' | 'error';
  message: string;
}

export default function LiveSimulationPage() {
  const [vehicles, setVehicles] = useState<SimulatedVehicle[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [controlRoomRecommendations, setControlRoomRecommendations] = useState<string>('');
  const [scenario, setScenario] = useState<string>('frontal-approach');
  
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const aiInterval = useRef<NodeJS.Timeout | null>(null);

  // Add log entry
  const addLog = (message: string, type: 'info' | 'alert' | 'ai' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{
      timestamp,
      type,
      message
    }, ...prev].slice(0, 50));
  };

  // Initialize vehicles and save to Firestore
  const initializeScenario = async (scenarioType: string) => {
    const basePosition = { lat: 12.9716, lng: 77.5946 };

    let vehicleSetup: SimulatedVehicle[] = [];

    switch (scenarioType) {
      case 'frontal-approach':
        vehicleSetup = [
          {
            id: 'AMB-LIVE-001',
            type: 'ambulance',
            lat: basePosition.lat - 0.005,
            lng: basePosition.lng,
            heading: 0,
            speed: 60,
            status: 'red',
          },
          {
            id: 'CAR-LIVE-001',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng - 0.0001,
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-LIVE-002',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng,
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-LIVE-003',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng + 0.0001,
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-LIVE-004',
            type: 'car',
            lat: basePosition.lat + 0.001,
            lng: basePosition.lng - 0.0001,
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-LIVE-005',
            type: 'car',
            lat: basePosition.lat + 0.001,
            lng: basePosition.lng + 0.0001,
            heading: 0,
            speed: 40,
          },
        ];
        break;

      case 'multi-ambulance':
        vehicleSetup = [
          {
            id: 'AMB-LIVE-001',
            type: 'ambulance',
            lat: basePosition.lat - 0.004,
            lng: basePosition.lng,
            heading: 0,
            speed: 65,
            status: 'red',
          },
          {
            id: 'AMB-LIVE-002',
            type: 'ambulance',
            lat: basePosition.lat - 0.006,
            lng: basePosition.lng + 0.0002,
            heading: 0,
            speed: 55,
            status: 'yellow',
          },
          {
            id: 'AMB-LIVE-003',
            type: 'ambulance',
            lat: basePosition.lat - 0.008,
            lng: basePosition.lng - 0.0002,
            heading: 0,
            speed: 50,
            status: 'green',
          },
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `CAR-LIVE-00${i + 1}`,
            type: 'car' as const,
            lat: basePosition.lat + (i * 0.0005),
            lng: basePosition.lng + ((i % 2 === 0 ? -1 : 1) * 0.0001),
            heading: 0,
            speed: 40,
          })),
        ];
        break;

      default:
        vehicleSetup = [];
    }

    // Save vehicles to Firestore
    try {
      const savedVehicles = await Promise.all(
        vehicleSetup.map(async (vehicle) => {
          if (vehicle.type === 'ambulance') {
            const docRef = await addDoc(collection(db, 'ambulances'), {
              vehicle_no: vehicle.id,
              status: vehicle.status,
              lat: vehicle.lat,
              lng: vehicle.lng,
              heading: vehicle.heading,
              speed: vehicle.speed,
              timestamp: new Date(),
            });
            addLog(`✅ Ambulance ${vehicle.id} registered in Firebase`, 'info');
            return { ...vehicle, firestoreId: docRef.id };
          } else {
            const docRef = await addDoc(collection(db, 'public_locations'), {
              vehicle_id: vehicle.id,
              lat: vehicle.lat,
              lng: vehicle.lng,
              heading: vehicle.heading,
              speed: vehicle.speed,
              timestamp: new Date(),
            });
            addLog(`✅ Car ${vehicle.id} registered in Firebase`, 'info');
            return { ...vehicle, firestoreId: docRef.id };
          }
        })
      );

      setVehicles(savedVehicles);
      addLog(`🎬 Scenario "${scenarioType}" initialized with ${savedVehicles.length} vehicles`, 'info');
    } catch (error) {
      console.error('Error initializing vehicles:', error);
      addLog(`❌ Error initializing vehicles: ${error}`, 'error');
    }
  };

  // Update vehicle positions in Firestore (simulates real movement)
  const updateVehiclePositions = async () => {
    if (!isRunning || vehicles.length === 0) return;

    try {
      for (const vehicle of vehicles) {
        if (!vehicle.firestoreId) continue;

        // Calculate new position based on speed and heading
        const speedInDegrees = (vehicle.speed / 111000) * (1 / 3600); // km/h to degrees per second
        const headingRad = (vehicle.heading * Math.PI) / 180;

        const newLat = vehicle.lat + speedInDegrees * Math.cos(headingRad) * 0.5;
        const newLng = vehicle.lng + speedInDegrees * Math.sin(headingRad) * 0.5;

        const collection_name = vehicle.type === 'ambulance' ? 'ambulances' : 'public_locations';
        
        await updateDoc(doc(db, collection_name, vehicle.firestoreId), {
          lat: newLat,
          lng: newLng,
          timestamp: new Date(),
        });

        // Update local state
        setVehicles(prev =>
          prev.map(v =>
            v.id === vehicle.id
              ? { ...v, lat: newLat, lng: newLng }
              : v
          )
        );
      }
    } catch (error) {
      console.error('Error updating positions:', error);
    }
  };

  // Check for alerts from API (cars calling voice-route API)
  const checkForAlerts = async () => {
    if (!isRunning) return;

    try {
      const cars = vehicles.filter(v => v.type === 'car');
      
      for (const car of cars) {
        const response = await fetch('/api/ai/voice-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: car.lat,
            lng: car.lng,
            heading: car.heading,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.alert) {
            const existingAlert = car.alert;
            const isNewAlert = !existingAlert || existingAlert.timestamp < Date.now() - 5000;

            if (isNewAlert) {
              addLog(
                `🚨 ${car.id}: ${data.instruction} (${data.distance.toFixed(0)}m away)`,
                'alert'
              );

              // Speak the instruction
              if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(data.instruction);
                utterance.rate = 1.2;
                utterance.pitch = 1.1;
                utterance.volume = 0.9;
                window.speechSynthesis.speak(utterance);
              }

              // Update vehicle with alert
              setVehicles(prev =>
                prev.map(v =>
                  v.id === car.id
                    ? {
                        ...v,
                        alert: {
                          direction: data.direction,
                          timestamp: Date.now(),
                          distance: data.distance,
                        },
                      }
                    : v
                )
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  // Get AI recommendations for control room
  const getControlRoomRecommendations = async () => {
    if (!isRunning) return;

    try {
      const ambulances = vehicles.filter(v => v.type === 'ambulance' && v.status === 'red');
      const cars = vehicles.filter(v => v.type === 'car');

      if (ambulances.length === 0) return;

      const ambulance = ambulances[0];

      const response = await fetch('/api/ai/control-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ambulance: {
            lat: ambulance.lat,
            lng: ambulance.lng,
            status: ambulance.status,
          },
          nearbyCars: cars.map(car => ({
            lat: car.lat,
            lng: car.lng,
            distance: calculateDistance(ambulance.lat, ambulance.lng, car.lat, car.lng),
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setControlRoomRecommendations(data.recommendation);
        addLog(`🤖 AI Recommendation: ${data.recommendation.substring(0, 100)}...`, 'ai');

        // Speak recommendation
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(data.recommendation);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Start simulation
  const startSimulation = () => {
    setIsRunning(true);
    addLog('▶️ Live simulation started', 'info');

    // Update positions every 500ms
    simulationInterval.current = setInterval(() => {
      updateVehiclePositions();
      checkForAlerts();
    }, 500);

    // Get AI recommendations every 10 seconds
    aiInterval.current = setInterval(() => {
      getControlRoomRecommendations();
    }, 10000);

    // Get initial recommendation
    setTimeout(() => {
      getControlRoomRecommendations();
    }, 1000);
  };

  // Stop simulation
  const stopSimulation = () => {
    setIsRunning(false);
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }
    if (aiInterval.current) {
      clearInterval(aiInterval.current);
    }
    addLog('⏸️ Live simulation paused', 'info');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
      if (aiInterval.current) {
        clearInterval(aiInterval.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="animate-pulse">🔴</span>
            AMBUCLEAR Live Simulation
          </h1>
          <p className="text-blue-200">
            Real-time simulation with actual API calls, Firestore integration, and AI voice assistance
          </p>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Scenario Controls */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">🎬 Scenario</h2>
            
            <select
              value={scenario}
              onChange={e => setScenario(e.target.value)}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg mb-4 disabled:opacity-50"
            >
              <option value="frontal-approach" className="text-black">
                Frontal Approach (1 RED + 5 cars)
              </option>
              <option value="multi-ambulance" className="text-black">
                Multi-Ambulance (3 + 5 cars)
              </option>
            </select>

            <div className="space-y-3">
              <button
                onClick={() => initializeScenario(scenario)}
                disabled={isRunning}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🎬 Initialize Scenario
              </button>

              {!isRunning ? (
                <button
                  onClick={startSimulation}
                  disabled={vehicles.length === 0}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  ▶️ Start Live Simulation
                </button>
              ) : (
                <button
                  onClick={stopSimulation}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                >
                  ⏸️ Pause Simulation
                </button>
              )}
            </div>
          </div>

          {/* Vehicle Status */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">🚗 Vehicles ({vehicles.length})</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    vehicle.type === 'ambulance'
                      ? 'bg-red-500/20 border-red-500'
                      : vehicle.alert
                      ? 'bg-orange-500/30 border-orange-500 animate-pulse'
                      : 'bg-white/10 border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-sm">
                      {vehicle.type === 'ambulance' ? '🚑' : '🚗'} {vehicle.id}
                    </span>
                    {vehicle.alert && (
                      <span className="text-xs font-bold text-orange-300 bg-orange-900/50 px-2 py-1 rounded">
                        {vehicle.alert.direction}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-blue-200">
                    Speed: {vehicle.speed} km/h | Heading: {vehicle.heading}°
                  </div>
                  {vehicle.alert && (
                    <div className="text-xs text-orange-300 mt-1">
                      Distance: {vehicle.alert.distance.toFixed(0)}m
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Control Room */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">🤖 AI Control Room</h2>
            <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg p-4 border border-purple-500/30 min-h-[200px]">
              {controlRoomRecommendations ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-green-400 font-semibold">GROQ AI ACTIVE</span>
                  </div>
                  <p className="text-white text-sm leading-relaxed">
                    {controlRoomRecommendations}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-blue-300">
                  <p className="text-center">
                    {isRunning
                      ? 'Analyzing traffic patterns...'
                      : 'Start simulation to get AI recommendations'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
                <div className="text-xs text-blue-300 mb-1">Voice Alerts</div>
                <div className="text-2xl font-bold text-white">
                  {vehicles.filter(v => v.alert).length}
                </div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                <div className="text-xs text-green-300 mb-1">Status</div>
                <div className="text-lg font-bold text-white">
                  {isRunning ? '🟢 LIVE' : '🔴 PAUSED'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Logs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">📡 Live Event Stream</h2>
          <div className="bg-black/50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No events yet. Initialize and start the simulation.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`mb-2 ${
                    log.type === 'alert'
                      ? 'text-orange-400'
                      : log.type === 'ai'
                      ? 'text-purple-400'
                      : log.type === 'error'
                      ? 'text-red-400'
                      : 'text-green-400'
                  }`}
                >
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
