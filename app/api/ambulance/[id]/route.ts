import { NextRequest, NextResponse } from 'next/server';
import { getAmbulanceById } from '@/lib/firestore';
import { getDemoAmbulanceById } from '@/lib/demoAmbulance';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ambulance = await getAmbulanceById(params.id);
    if (ambulance) {
      return NextResponse.json({ ambulance });
    }

    const demoAmbulance = getDemoAmbulanceById(params.id);
    if (demoAmbulance) {
      return NextResponse.json({ ambulance: demoAmbulance });
    }

    return NextResponse.json({ error: 'Ambulance not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ambulance' }, { status: 500 });
  }
}
