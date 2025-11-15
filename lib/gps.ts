// GPS utility functions for distance and heading calculations

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Calculate bearing (heading) from point 1 to point 2
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360; // Normalize to 0-360
}

/**
 * Calculate the difference between two headings
 * @param heading1 First heading in degrees (0-360)
 * @param heading2 Second heading in degrees (0-360)
 * @returns Absolute difference in degrees (0-180)
 */
export function headingDifference(heading1: number, heading2: number): number {
  let diff = Math.abs(heading1 - heading2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * Check if two entities are on the same route direction
 * @param heading1 Heading of entity 1 (degrees)
 * @param heading2 Heading of entity 2 (degrees)
 * @param threshold Maximum difference in degrees (default 30)
 * @returns True if headings are similar (same direction)
 */
export function isSameDirection(
  heading1: number,
  heading2: number,
  threshold: number = 30
): boolean {
  return headingDifference(heading1, heading2) <= threshold;
}

/**
 * Get current GPS position from browser
 * @returns Promise with position data
 */
export function getCurrentPosition(): Promise<{
  lat: number;
  lng: number;
  heading: number | null;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Watch GPS position continuously
 * @param callback Function to call on position update
 * @returns Watcher ID to clear later
 */
export function watchPosition(
  callback: (position: { lat: number; lng: number; heading: number | null }) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation not supported');
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading,
      });
    },
    (error) => {
      console.error('GPS watch error:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

/**
 * Clear GPS position watcher
 * @param watcherId ID returned from watchPosition
 */
export function clearWatch(watcherId: number) {
  navigator.geolocation.clearWatch(watcherId);
}

/**
 * Calculate heading from a series of positions (for when device doesn't provide heading)
 * @param positions Array of recent positions [{lat, lng, timestamp}]
 * @returns Calculated heading or null
 */
export function calculateHeadingFromPath(
  positions: Array<{ lat: number; lng: number; timestamp: number }>
): number | null {
  if (positions.length < 2) return null;

  // Use last two positions
  const p1 = positions[positions.length - 2];
  const p2 = positions[positions.length - 1];

  // Only calculate if positions are different and recent
  if (p2.timestamp - p1.timestamp > 10000) return null; // Too old
  if (p1.lat === p2.lat && p1.lng === p2.lng) return null; // Same position

  return calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
}
