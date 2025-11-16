import { NextRequest, NextResponse } from 'next/server';
import { getControlRoomRecommendations, AmbulanceData } from '@/lib/groqAI';

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

    // Format ambulance data for AI analysis
    const ambulances: AmbulanceData[] = [{
      id: 'AMB-001',
      position: {
        lat: ambulance.lat,
        lng: ambulance.lng,
      },
      heading: 0,
      status: (ambulance.status?.toUpperCase() || 'RED') as 'RED' | 'YELLOW' | 'GREEN',
    }];

    // Get AI recommendations for traffic clearance
    const recommendations = await getControlRoomRecommendations(
      ambulances,
      [] // SOS alerts
    );

    const recommendation = recommendations.length > 0 
      ? recommendations[0].action + ' ' + recommendations[0].reason
      : 'Monitor traffic conditions and clear routes as needed.';

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
