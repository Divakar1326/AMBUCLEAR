import { NextRequest, NextResponse } from 'next/server';
import { getAmbulances } from '@/lib/firestore';
import { haversineDistance } from '@/lib/gps';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status')?.split(',') || [];
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const radiusStr = searchParams.get('radius') || '10000'; // 10km default

    const ambulances = getAmbulances();

    let filtered = ambulances;

    // Filter by status
    if (statusFilter.length > 0) {
      filtered = filtered.filter(a => statusFilter.includes(a.status));
    }

    // Filter by distance if location provided
    if (latStr && lngStr) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const radius = parseFloat(radiusStr);

      filtered = filtered
        .map(a => ({
          ...a,
          distance: haversineDistance(lat, lng, a.lat, a.lng),
        }))
        .filter(a => a.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    }

    return NextResponse.json({ ambulances: filtered });
  } catch (error) {
    console.error('Nearby ambulances error:', error);
    return NextResponse.json({ error: 'Failed to fetch nearby ambulances' }, { status: 500 });
  }
}
