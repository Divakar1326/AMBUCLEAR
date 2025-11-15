/**
 * Enhanced Google Maps Traffic Service for AMBUCLEAR
 * Handles real-time traffic, GPS tracking, road snapping, and ETA calculations
 * Integrates: Maps JavaScript API, Directions API, Distance Matrix API, Roads API
 */

interface Location {
  lat: number;
  lng: number;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  start: Location;
  end: Location;
}

interface DirectionsResult {
  polyline: string;
  distance: number;
  duration: number;
  durationInTraffic: number;
  trafficDelay: number;
  steps: RouteStep[];
}

interface SnappedPoint {
  lat: number;
  lng: number;
  placeId: string;
  originalIndex?: number;
}

interface ETAResult {
  originIndex: number;
  destinationIndex: number;
  distance: string;
  distanceValue: number;
  duration: string;
  durationValue: number;
  durationInTraffic: string;
  durationInTrafficValue: number;
  trafficDelay: number;
  status: string;
}

interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export class TrafficService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';
  private roadsUrl = 'https://roads.googleapis.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get directions with real-time traffic data
   */
  async getDirectionsWithTraffic(
    origin: Location,
    destination: Location,
    mode: 'driving' | 'walking' | 'bicycling' = 'driving'
  ): Promise<DirectionsResult> {
    const url = `${this.baseUrl}/directions/json?` +
      `origin=${origin.lat},${origin.lng}&` +
      `destination=${destination.lat},${destination.lng}&` +
      `mode=${mode}&` +
      `departure_time=now&` +
      `traffic_model=best_guess&` +
      `key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status}`);
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        polyline: route.overview_polyline.points,
        distance: leg.distance.value,
        duration: leg.duration.value,
        durationInTraffic: leg.duration_in_traffic?.value || leg.duration.value,
        trafficDelay: (leg.duration_in_traffic?.value || leg.duration.value) - leg.duration.value,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions,
          distance: step.distance.value,
          duration: step.duration.value,
          start: step.start_location,
          end: step.end_location
        }))
      };
    } catch (error) {
      console.error('Traffic service error:', error);
      throw error;
    }
  }

  /**
   * Get traffic level for a specific location
   */
  async getTrafficLevel(location: Location, radius: number = 500): Promise<string> {
    const testDestination = {
      lat: location.lat + 0.005,
      lng: location.lng
    };

    try {
      const result = await this.getDirectionsWithTraffic(location, testDestination);
      const delay = result.trafficDelay;
      const baseTime = result.duration;
      const delayRatio = delay / baseTime;

      if (delayRatio > 1.5) return 'severe';
      if (delayRatio > 1.0) return 'high';
      if (delayRatio > 0.5) return 'medium';
      return 'low';
    } catch (error) {
      console.error('Traffic level check failed:', error);
      return 'unknown';
    }
  }

  /**
   * Snap GPS coordinates to nearest road (corrects GPS inaccuracies)
   */
  async snapToRoads(points: Location[], interpolate: boolean = true): Promise<SnappedPoint[]> {
    const path = points.map(p => `${p.lat},${p.lng}`).join('|');
    const url = `${this.roadsUrl}/snapToRoads?path=${path}&interpolate=${interpolate}&key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.snappedPoints) {
        throw new Error('Roads API error');
      }

      return data.snappedPoints.map((p: any) => ({
        lat: p.location.latitude,
        lng: p.location.longitude,
        placeId: p.placeId,
        originalIndex: p.originalIndex
      }));
    } catch (error) {
      console.error('Snap to roads error:', error);
      return points.map(p => ({ lat: p.lat, lng: p.lng, placeId: '' }));
    }
  }

  /**
   * Get ETA with traffic for multiple destinations (Distance Matrix API)
   */
  async getETAWithTraffic(origins: Location[], destinations: Location[]): Promise<ETAResult[]> {
    const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
    const destStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');
    
    const url = `${this.baseUrl}/distancematrix/json?` +
      `origins=${originsStr}&` +
      `destinations=${destStr}&` +
      `mode=driving&` +
      `departure_time=now&` +
      `traffic_model=best_guess&` +
      `key=${this.apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Distance Matrix API error: ${data.status}`);
      }

      const results: ETAResult[] = [];
      data.rows.forEach((row: any, originIndex: number) => {
        row.elements.forEach((element: any, destIndex: number) => {
          if (element.status === 'OK') {
            results.push({
              originIndex,
              destinationIndex: destIndex,
              distance: element.distance.text,
              distanceValue: element.distance.value,
              duration: element.duration.text,
              durationValue: element.duration.value,
              durationInTraffic: element.duration_in_traffic?.text || element.duration.text,
              durationInTrafficValue: element.duration_in_traffic?.value || element.duration.value,
              trafficDelay: (element.duration_in_traffic?.value || element.duration.value) - element.duration.value,
              status: element.status
            });
          }
        });
      });

      return results;
    } catch (error) {
      console.error('Distance Matrix error:', error);
      throw error;
    }
  }

  /**
   * Find nearest hospital with ETA
   */
  async findNearestHospital(ambulanceLocation: Location, hospitals: Hospital[]) {
    const destinations = hospitals.map(h => ({ lat: h.lat, lng: h.lng }));
    const etas = await this.getETAWithTraffic([ambulanceLocation], destinations);
    
    let nearest = null;
    let shortestTime = Infinity;
    
    etas.forEach((eta, index) => {
      if (eta.durationInTrafficValue < shortestTime) {
        shortestTime = eta.durationInTrafficValue;
        nearest = {
          ...hospitals[index],
          ...eta
        };
      }
    });
    
    return nearest;
  }

  /**
   * Decode polyline to coordinates array
   */
  decodePolyline(encoded: string): number[][] {
    const poly: number[][] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push([lat / 1e5, lng / 1e5]);
    }
    return poly;
  }
}
