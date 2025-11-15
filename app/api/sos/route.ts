import { NextRequest, NextResponse } from 'next/server';
import { getSOSRecords, createSOS, type SOSRecord } from '@/lib/excel';
import { broadcastSOSAlert } from '@/lib/websocket';

// GET all SOS records
export async function GET() {
  try {
    const sos = getSOSRecords();
    return NextResponse.json({ sos });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch SOS records' }, { status: 500 });
  }
}

// POST create new SOS alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ambulance_id, lat, lng } = body;

    if (!ambulance_id || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const id = 'sos_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const sosRecord: SOSRecord = {
      id,
      ambulance_id,
      lat,
      lng,
      active: true,
      timestamp: new Date().toISOString(),
    };

    createSOS(sosRecord);

    // Broadcast SOS to all clients
    await broadcastSOSAlert(sosRecord);

    return NextResponse.json({ success: true, sos: sosRecord }, { status: 201 });
  } catch (error) {
    console.error('SOS creation error:', error);
    return NextResponse.json({ error: 'Failed to create SOS' }, { status: 500 });
  }
}
