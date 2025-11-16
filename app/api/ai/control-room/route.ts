import { NextRequest, NextResponse } from 'next/server';
import { getControlRoomRecommendations } from '@/lib/groqAI';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ambulance, nearbyCars } = body;

    if (!ambulance || !ambulance.lat || !ambulance.lng) {
      return NextResponse.json(
        { error: 'Missing ambulance location data' },
        { status: 400 }
      );
    }

    // Get AI recommendations for traffic clearance
    const recommendation = await getControlRoomRecommendations(
      {
        lat: ambulance.lat,
        lng: ambulance.lng,
        status: ambulance.status || 'red',
      },
      nearbyCars || []
    );

    return NextResponse.json({
      success: true,
      recommendation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Control room AI error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get AI recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
