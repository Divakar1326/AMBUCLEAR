import { NextRequest, NextResponse } from 'next/server';
import { getAmbulanceByAuthUid } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const uid = request.nextUrl.searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'Missing auth UID' }, { status: 400 });
    }

    const ambulance = await getAmbulanceByAuthUid(uid);

    if (!ambulance) {
      return NextResponse.json({ error: 'Ambulance profile not found' }, { status: 404 });
    }

    return NextResponse.json({ ambulance });
  } catch (error) {
    console.error('Error loading auth profile:', error);
    return NextResponse.json({ error: 'Failed to load ambulance profile' }, { status: 500 });
  }
}