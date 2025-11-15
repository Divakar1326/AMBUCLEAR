import { NextRequest, NextResponse } from 'next/server';
import { updateAmbulance } from '@/lib/firestore';
import { broadcastAmbulanceUpdate } from '@/lib/websocket';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!['red', 'yellow', 'green'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = updateAmbulance(params.id, {
      status,
      timestamp: new Date().toISOString(),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Ambulance not found' }, { status: 404 });
    }

    // Broadcast status change
    await broadcastAmbulanceUpdate(updated);

    return NextResponse.json({ success: true, ambulance: updated });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
