/**
 * Alert System Test & Simulation Script
 * 
 * This script helps test the AMBUCLEAR alert engine by simulating
 * ambulance movements and public user positions.
 * 
 * Usage:
 * 1. Open the application in browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this script
 * 4. Run simulation functions
 */

// Simulation configuration
const SIM_CONFIG = {
  // Chennai coordinates (sample area)
  baseLocation: { lat: 13.0827, lng: 80.2707 },
  alertRadius: 500, // meters
  headingThreshold: 30, // degrees
};

// Helper: Calculate new position based on distance and bearing
function calculateNewPosition(lat, lng, distanceMeters, bearing) {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const θ = (bearing * Math.PI) / 180;
  const δ = distanceMeters / R;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (λ2 * 180) / Math.PI,
  };
}

// Test 1: Check alert with nearby ambulance (should trigger)
async function testAlertNearby() {
  console.log('🧪 Test 1: Nearby ambulance (should trigger alert)');

  const publicPosition = SIM_CONFIG.baseLocation;
  const ambulancePosition = calculateNewPosition(
    publicPosition.lat,
    publicPosition.lng,
    300, // 300m away
    90 // East direction
  );

  console.log('Public user:', publicPosition);
  console.log('Ambulance:', ambulancePosition);

  const response = await fetch('/api/alert/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: publicPosition.lat,
      lng: publicPosition.lng,
      heading: 90, // Same direction
    }),
  });

  const result = await response.json();
  console.log('✅ Result:', result);
  console.log('Alert triggered:', result.alert ? 'YES ✓' : 'NO ✗');
}

// Test 2: Check alert with far ambulance (should NOT trigger)
async function testAlertFar() {
  console.log('🧪 Test 2: Far ambulance (should NOT trigger alert)');

  const publicPosition = SIM_CONFIG.baseLocation;
  const ambulancePosition = calculateNewPosition(
    publicPosition.lat,
    publicPosition.lng,
    1000, // 1km away - beyond threshold
    90
  );

  console.log('Public user:', publicPosition);
  console.log('Ambulance:', ambulancePosition);

  const response = await fetch('/api/alert/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: publicPosition.lat,
      lng: publicPosition.lng,
      heading: 90,
    }),
  });

  const result = await response.json();
  console.log('✅ Result:', result);
  console.log('Alert triggered:', result.alert ? 'YES ✗ (FAIL)' : 'NO ✓ (PASS)');
}

// Test 3: Check alert with opposite direction (should NOT trigger)
async function testAlertOppositeDirection() {
  console.log('🧪 Test 3: Opposite direction (should NOT trigger alert)');

  const publicPosition = SIM_CONFIG.baseLocation;

  const response = await fetch('/api/alert/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: publicPosition.lat,
      lng: publicPosition.lng,
      heading: 90, // Going East
    }),
  });

  const result = await response.json();
  console.log('✅ Result:', result);
  console.log('Alert triggered:', result.alert ? 'YES' : 'NO');
}

// Simulate ambulance movement
async function simulateAmbulanceMovement(ambulanceId, duration = 30000) {
  console.log('🚑 Simulating ambulance movement for', duration / 1000, 'seconds');

  let position = SIM_CONFIG.baseLocation;
  const bearing = 45; // Northeast
  const speed = 15; // m/s (54 km/h)
  const interval = 3000; // Update every 3 seconds

  const intervalId = setInterval(async () => {
    position = calculateNewPosition(position.lat, position.lng, speed * 3, bearing);

    console.log('📍 Ambulance position:', position);

    await fetch(`/api/ambulance/${ambulanceId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: position.lat,
        lng: position.lng,
        heading: bearing,
      }),
    });
  }, interval);

  setTimeout(() => {
    clearInterval(intervalId);
    console.log('✅ Simulation complete');
  }, duration);

  return intervalId;
}

// Run all tests
async function runAllTests() {
  console.log('🎯 Starting AMBUCLEAR Alert System Tests\n');

  await testAlertNearby();
  console.log('\n');

  await new Promise((resolve) => setTimeout(resolve, 2000));
  await testAlertFar();
  console.log('\n');

  await new Promise((resolve) => setTimeout(resolve, 2000));
  await testAlertOppositeDirection();
  console.log('\n');

  console.log('✅ All tests complete!');
}

// Create test ambulance
async function createTestAmbulance() {
  console.log('📝 Creating test ambulance...');

  const response = await fetch('/api/ambulance/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Driver',
      phone: '9999999999',
      vehicle_no: 'TEST-001',
      hospital_name: 'Test Hospital',
    }),
  });

  const data = await response.json();
  console.log('✅ Test ambulance created:', data.id);

  // Set to RED status
  await fetch(`/api/ambulance/${data.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'red' }),
  });

  console.log('🔴 Status set to RED');

  return data.id;
}

// Export functions for console use
window.ambulanceSimulator = {
  testAlertNearby,
  testAlertFar,
  testAlertOppositeDirection,
  runAllTests,
  simulateAmbulanceMovement,
  createTestAmbulance,
  calculateNewPosition,
};

console.log('🚑 AMBUCLEAR Simulator loaded!');
console.log('Available functions:');
console.log('  - ambulanceSimulator.runAllTests()');
console.log('  - ambulanceSimulator.createTestAmbulance()');
console.log('  - ambulanceSimulator.simulateAmbulanceMovement(ambulanceId)');
console.log('  - ambulanceSimulator.testAlertNearby()');
console.log('  - ambulanceSimulator.testAlertFar()');
console.log('  - ambulanceSimulator.testAlertOppositeDirection()');
