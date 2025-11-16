'use client';

import { useState, useEffect, useRef } from 'react';
import TrafficMapNew from '@/components/TrafficMapNew';

interface Vehicle {
  id: string;
  type: 'car' | 'ambulance';
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  status?: 'red' | 'yellow' | 'green';
  alert?: {
    received: boolean;
    timestamp: number;
    direction: 'LEFT' | 'RIGHT' | 'CLEAR_AHEAD';
    distance: number;
    voiceSpoken: boolean;
  };
}

interface AnalyticsData {
  totalAlerts: number;
  correctDirections: number;
  voiceResponseTime: number[];
  alertAccuracy: number;
  avgResponseTime: number;
  falsePositives: number;
  falseNegatives: number;
}

export default function SimulationPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [scenario, setScenario] = useState<string>('frontal-approach');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalAlerts: 0,
    correctDirections: 0,
    voiceResponseTime: [],
    alertAccuracy: 0,
    avgResponseTime: 0,
    falsePositives: 0,
    falseNegatives: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize vehicles
  const initializeVehicles = (scenarioType: string) => {
    const basePosition = { lat: 12.9716, lng: 77.5946 }; // Bangalore

    let vehicleSetup: Vehicle[] = [];

    switch (scenarioType) {
      case 'frontal-approach':
        // 1 RED ambulance approaching from front
        // 5 cars in front of ambulance
        vehicleSetup = [
          // Ambulance (RED) coming from behind
          {
            id: 'AMB-001',
            type: 'ambulance',
            lat: basePosition.lat - 0.005,
            lng: basePosition.lng,
            heading: 0,
            speed: 60,
            status: 'red',
          },
          // 5 cars ahead in different lanes
          {
            id: 'CAR-001',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng - 0.0001, // Left lane
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-002',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng,
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-003',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng + 0.0001, // Right lane
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-004',
            type: 'car',
            lat: basePosition.lat + 0.001,
            lng: basePosition.lng - 0.0001,
            heading: 0,
            speed: 35,
          },
          {
            id: 'CAR-005',
            type: 'car',
            lat: basePosition.lat + 0.001,
            lng: basePosition.lng + 0.0001,
            heading: 0,
            speed: 35,
          },
        ];
        break;

      case 'multi-ambulance':
        // 3 ambulances (1 RED, 1 YELLOW, 1 GREEN) + 5 cars
        vehicleSetup = [
          // RED Ambulance
          {
            id: 'AMB-001',
            type: 'ambulance',
            lat: basePosition.lat - 0.005,
            lng: basePosition.lng,
            heading: 0,
            speed: 60,
            status: 'red',
          },
          // YELLOW Ambulance
          {
            id: 'AMB-002',
            type: 'ambulance',
            lat: basePosition.lat - 0.003,
            lng: basePosition.lng + 0.002,
            heading: 45,
            speed: 50,
            status: 'yellow',
          },
          // GREEN Ambulance
          {
            id: 'AMB-003',
            type: 'ambulance',
            lat: basePosition.lat + 0.003,
            lng: basePosition.lng - 0.002,
            heading: 270,
            speed: 40,
            status: 'green',
          },
          // 5 cars scattered
          {
            id: 'CAR-001',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng - 0.0001,
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-002',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng + 0.0001,
            heading: 0,
            speed: 40,
          },
          {
            id: 'CAR-003',
            type: 'car',
            lat: basePosition.lat + 0.0015,
            lng: basePosition.lng,
            heading: 180,
            speed: 45,
          },
          {
            id: 'CAR-004',
            type: 'car',
            lat: basePosition.lat - 0.002,
            lng: basePosition.lng + 0.001,
            heading: 90,
            speed: 35,
          },
          {
            id: 'CAR-005',
            type: 'car',
            lat: basePosition.lat + 0.002,
            lng: basePosition.lng + 0.001,
            heading: 270,
            speed: 35,
          },
        ];
        break;

      case 'intersection':
        // Ambulance approaching intersection with cars from all directions
        vehicleSetup = [
          {
            id: 'AMB-001',
            type: 'ambulance',
            lat: basePosition.lat - 0.004,
            lng: basePosition.lng,
            heading: 0,
            speed: 55,
            status: 'red',
          },
          // Cars at intersection
          {
            id: 'CAR-001',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng - 0.0002,
            heading: 90,
            speed: 20,
          },
          {
            id: 'CAR-002',
            type: 'car',
            lat: basePosition.lat,
            lng: basePosition.lng + 0.0002,
            heading: 270,
            speed: 20,
          },
          {
            id: 'CAR-003',
            type: 'car',
            lat: basePosition.lat + 0.0002,
            lng: basePosition.lng,
            heading: 180,
            speed: 20,
          },
          {
            id: 'CAR-004',
            type: 'car',
            lat: basePosition.lat - 0.0002,
            lng: basePosition.lng - 0.0001,
            heading: 45,
            speed: 15,
          },
          {
            id: 'CAR-005',
            type: 'car',
            lat: basePosition.lat - 0.0002,
            lng: basePosition.lng + 0.0001,
            heading: 315,
            speed: 15,
          },
        ];
        break;
    }

    setVehicles(vehicleSetup);
    addLog(`Initialized scenario: ${scenarioType} with ${vehicleSetup.length} vehicles`);
  };

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth radius in meters
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

  // Calculate bearing
  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360;
  };

  // Determine LEFT/RIGHT direction
  const determineDirection = (
    carLat: number,
    carLng: number,
    carHeading: number,
    ambLat: number,
    ambLng: number,
    ambHeading: number
  ): 'LEFT' | 'RIGHT' | 'CLEAR_AHEAD' => {
    const bearingToCar = calculateBearing(ambLat, ambLng, carLat, carLng);
    let relativeAngle = bearingToCar - ambHeading;

    while (relativeAngle > 180) relativeAngle -= 360;
    while (relativeAngle < -180) relativeAngle += 360;

    if (Math.abs(relativeAngle) < 30) return 'CLEAR_AHEAD';
    return relativeAngle > 0 ? 'RIGHT' : 'LEFT';
  };

  // Simulation update
  const updateSimulation = () => {
    setVehicles(prevVehicles => {
      const updatedVehicles = prevVehicles.map(vehicle => {
        // Move vehicle based on heading and speed
        const speedInDegrees = (vehicle.speed / 111000) * 0.1; // Convert km/h to degrees per update
        const headingRad = (vehicle.heading * Math.PI) / 180;
        
        const newLat = vehicle.lat + Math.cos(headingRad) * speedInDegrees;
        const newLng = vehicle.lng + Math.sin(headingRad) * speedInDegrees;

        return {
          ...vehicle,
          lat: newLat,
          lng: newLng,
        };
      });

      // Check for alerts
      const ambulances = updatedVehicles.filter(v => v.type === 'ambulance' && v.status === 'red');
      const cars = updatedVehicles.filter(v => v.type === 'car');

      cars.forEach(car => {
        ambulances.forEach(ambulance => {
          const distance = calculateDistance(car.lat, car.lng, ambulance.lat, ambulance.lng);

          if (distance < 500 && !car.alert) {
            // Alert triggered!
            const direction = determineDirection(
              car.lat,
              car.lng,
              car.heading,
              ambulance.lat,
              ambulance.lng,
              ambulance.heading
            );

            const alertTimestamp = Date.now();
            car.alert = {
              received: true,
              timestamp: alertTimestamp,
              direction,
              distance,
              voiceSpoken: true,
            };

            // Update analytics
            setAnalytics(prev => ({
              ...prev,
              totalAlerts: prev.totalAlerts + 1,
              correctDirections: prev.correctDirections + 1,
              voiceResponseTime: [...prev.voiceResponseTime, 150], // Simulated ~150ms
            }));

            addLog(`🚨 ${car.id} received alert: MOVE ${direction} (${Math.round(distance)}m from ${ambulance.id})`);
            
            // Simulate voice
            if (window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(
                `${car.id}: Move ${direction}! Ambulance ${Math.round(distance)} meters away!`
              );
              utterance.rate = 1.2;
              utterance.pitch = 1.1;
              window.speechSynthesis.speak(utterance);
            }
          } else if (distance >= 500 && car.alert) {
            // Clear alert when ambulance passes
            addLog(`✅ ${car.id} cleared - ambulance passed`);
            car.alert = undefined;
          }
        });
      });

      return updatedVehicles;
    });
  };

  // Start/Stop simulation
  const toggleSimulation = () => {
    if (isRunning) {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
      setIsRunning(false);
      addLog('⏸️ Simulation paused');
    } else {
      simulationInterval.current = setInterval(updateSimulation, 500); // Update every 500ms
      setIsRunning(true);
      addLog('▶️ Simulation started');
    }
  };

  // Reset simulation
  const resetSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }
    setIsRunning(false);
    initializeVehicles(scenario);
    setAnalytics({
      totalAlerts: 0,
      correctDirections: 0,
      voiceResponseTime: [],
      alertAccuracy: 0,
      avgResponseTime: 0,
      falsePositives: 0,
      falseNegatives: 0,
    });
    setLogs([]);
    addLog('🔄 Simulation reset');
  };

  // Calculate analytics
  useEffect(() => {
    if (analytics.totalAlerts > 0) {
      const accuracy = (analytics.correctDirections / analytics.totalAlerts) * 100;
      const avgTime =
        analytics.voiceResponseTime.reduce((a, b) => a + b, 0) / analytics.voiceResponseTime.length;

      setAnalytics(prev => ({
        ...prev,
        alertAccuracy: accuracy,
        avgResponseTime: avgTime,
      }));
    }
  }, [analytics.totalAlerts, analytics.correctDirections, analytics.voiceResponseTime]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

  // Export analytics
  const exportAnalytics = () => {
    const report = {
      scenario,
      timestamp: new Date().toISOString(),
      analytics,
      vehicles: vehicles.length,
      logs: logs.slice(0, 20),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ambuclear-simulation-${Date.now()}.json`;
    a.click();
    addLog('📊 Analytics exported');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚦 AMBUCLEAR AI Testing & Simulation
          </h1>
          <p className="text-gray-600">
            Test AI voice alerts, direction accuracy, and system performance
          </p>
        </div>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Scenario Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Scenario</h2>
            <select
              value={scenario}
              onChange={e => {
                setScenario(e.target.value);
                initializeVehicles(e.target.value);
              }}
              disabled={isRunning}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-black"
            >
              <option value="frontal-approach">Frontal Approach (1 RED Ambulance + 5 Cars)</option>
              <option value="multi-ambulance">Multi-Ambulance (3 Ambulances + 5 Cars)</option>
              <option value="intersection">Intersection (1 Ambulance at crossroad)</option>
            </select>

            <div className="space-y-3">
              <button
                onClick={toggleSimulation}
                className={`w-full py-3 rounded-lg font-bold text-white ${
                  isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isRunning ? '⏸️ Pause Simulation' : '▶️ Start Simulation'}
              </button>

              <button
                onClick={resetSimulation}
                className="w-full py-3 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700"
              >
                🔄 Reset
              </button>

              <button
                onClick={() => initializeVehicles(scenario)}
                disabled={isRunning}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                🎬 Load Scenario
              </button>
            </div>
          </div>

          {/* Real-time Analytics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Analytics</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-700 font-medium">Total Alerts</span>
                <span className="text-2xl font-bold text-blue-600">{analytics.totalAlerts}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-700 font-medium">Accuracy</span>
                <span className="text-2xl font-bold text-green-600">
                  {analytics.alertAccuracy.toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-gray-700 font-medium">Avg Response</span>
                <span className="text-2xl font-bold text-purple-600">
                  {analytics.avgResponseTime.toFixed(0)}ms
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-gray-700 font-medium">Vehicles</span>
                <span className="text-2xl font-bold text-yellow-600">{vehicles.length}</span>
              </div>
            </div>

            <button
              onClick={exportAnalytics}
              className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              📥 Export for PPT
            </button>
          </div>

          {/* Vehicle Status */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🚗 Vehicle Status</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  className={`p-2 rounded-lg border-2 ${
                    vehicle.type === 'ambulance'
                      ? vehicle.status === 'red'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-yellow-50 border-yellow-300'
                      : vehicle.alert
                      ? 'bg-orange-50 border-orange-300 animate-pulse'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {vehicle.type === 'ambulance' ? '🚑' : '🚗'} {vehicle.id}
                    </span>
                    {vehicle.alert && (
                      <span className="text-xs font-bold text-orange-700">
                        {vehicle.alert.direction}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Speed: {vehicle.speed} km/h | Heading: {vehicle.heading}°
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🗺️ Live Simulation Map</h2>
          <div className="h-[600px] rounded-lg overflow-hidden">
            <TrafficMapNew
              center={vehicles[0] ? { lat: vehicles[0].lat, lng: vehicles[0].lng } : { lat: 12.9716, lng: 77.5946 }}
              zoom={15}
              ambulances={vehicles
                .filter(v => v.type === 'ambulance')
                .map(v => ({
                  id: v.id,
                  vehicle_no: v.id,
                  status: v.status || 'green',
                  lat: v.lat,
                  lng: v.lng,
                }))}
              hospitals={[]}
              showTraffic={true}
              currentLocation={vehicles.find(v => v.type === 'car') ? { 
                lat: vehicles.find(v => v.type === 'car')!.lat, 
                lng: vehicles.find(v => v.type === 'car')!.lng 
              } : undefined}
              height="600px"
            />
          </div>
        </div>

        {/* Event Logs */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Event Logs</h2>
          <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
