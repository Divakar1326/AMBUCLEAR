export interface AmbulanceDestination {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  source?: string;
  selected_at?: string;
}

export interface AmbulanceRouteOverview {
  locked: boolean;
  distance?: string;
  durationInTraffic?: string;
  trafficDelay?: number;
  updated_at?: string;
}

export interface TrackingAmbulance {
  id: string;
  name: string;
  phone?: string;
  vehicle_no: string;
  hospital_name?: string;
  status: 'red' | 'yellow' | 'green';
  lat: number;
  lng: number;
  heading?: number;
  timestamp: string;
  destination?: AmbulanceDestination | null;
  route_overview?: AmbulanceRouteOverview | null;
}

export interface TrackingSOSRecord {
  id: string;
  ambulance_id?: string;
  device_id?: string;
  lat: number;
  lng: number;
  active: boolean;
  timestamp: string;
  type?: string;
  note?: string;
}

export interface PublicSOSRecord {
  id: string;
  device_id?: string;
  lat: number;
  lng: number;
  active: boolean;
  timestamp: string;
  note?: string;
}

export function upsertAmbulance(list: TrackingAmbulance[], update: TrackingAmbulance): TrackingAmbulance[] {
  const index = list.findIndex((ambulance) => ambulance.id === update.id);

  if (index === -1) {
    return [update, ...list];
  }

  const next = [...list];
  next[index] = {
    ...next[index],
    ...update,
    destination: update.destination ?? next[index].destination ?? null,
    route_overview: update.route_overview ?? next[index].route_overview ?? null,
  };
  return next;
}
