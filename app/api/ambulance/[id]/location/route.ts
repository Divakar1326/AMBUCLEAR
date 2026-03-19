import { NextRequest, NextResponse } from 'next/server';
import { updateAmbulance } from '@/lib/firestore';
import { broadcastAmbulanceUpdate } from '@/lib/websocket';
import { updateDemoAmbulance } from '@/lib/demoAmbulance';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { lat, lng, heading, destination, route_overview } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const updateData: any = {
      lat,
      lng,
      heading: heading || 0,
      timestamp: new Date().toISOString(),
    };

    // Keep destination in sync with the dashboard selection.
    // Explicit null clears stale destination in control room.
    if (destination !== undefined) {
      updateData.destination = destination;
    }

    if (route_overview !== undefined) {
      updateData.route_overview = route_overview;
    }

    let updated = await updateAmbulance(params.id, updateData);

    if (!updated) {
      updated = updateDemoAmbulance(params.id, updateData);
    }

    if (!updated) {
      return NextResponse.json({ error: 'Ambulance not found' }, { status: 404 });
    }

    // Broadcast update via WebSocket
    await broadcastAmbulanceUpdate(updated);

    return NextResponse.json({ success: true, ambulance: updated });
  } catch (error) {
    console.error('Location update error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
