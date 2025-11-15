import { NextRequest, NextResponse } from 'next/server';
import { getAmbulanceById } from '@/lib/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ambulance = getAmbulanceById(params.id);

    if (!ambulance) {
      return NextResponse.json({ error: 'Ambulance not found' }, { status: 404 });
    }

    return NextResponse.json({ ambulance });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ambulance' }, { status: 500 });
  }
}
