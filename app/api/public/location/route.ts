import { NextRequest, NextResponse } from 'next/server';
import { upsertPublicUser, type PublicUser } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, lat, lng, heading } = body;

    if (!device_id || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const user: PublicUser = {
      id: device_id,
      device_id,
      lat,
      lng,
      heading: heading || 0,
      alert_disabled_until: null,
      timestamp: new Date().toISOString(),
    };

    try {
      await upsertPublicUser(user);
    } catch (writeError: any) {
      // Keep client GPS flow alive even if Firestore rules block anonymous writes.
      if (writeError?.code !== 'permission-denied') {
        throw writeError;
      }
      console.warn('Public location write skipped (permission denied).');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Public location update error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
