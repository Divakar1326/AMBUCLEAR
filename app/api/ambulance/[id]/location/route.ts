import { NextRequest, NextResponse } from 'next/server';
import { updateAmbulance } from '@/lib/firestore';
import { broadcastAmbulanceUpdate } from '@/lib/websocket';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { lat, lng, heading, destination } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const updateData: any = {
      lat,
      lng,
      heading: heading || 0,
      timestamp: new Date().toISOString(),
    };

    // Add destination if provided
    if (destination) {
      updateData.destination = destination;
    }

    const updated = updateAmbulance(params.id, updateData);

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
