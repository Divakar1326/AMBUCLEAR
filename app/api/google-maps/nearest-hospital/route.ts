import { NextRequest, NextResponse } from 'next/server';
import { TrafficService } from '@/lib/services/trafficService';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ambulanceLocation, hospitals } = body;

    if (!ambulanceLocation || !hospitals || !Array.isArray(hospitals)) {
      return NextResponse.json(
        { error: 'Ambulance location and hospitals array are required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    const trafficService = new TrafficService(apiKey);
    const nearest = await trafficService.findNearestHospital(ambulanceLocation, hospitals);

    if (!nearest) {
      return NextResponse.json(
        { error: 'No hospital found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hospital: nearest,
        ambulanceLocation
      }
    });
  } catch (error: any) {
    console.error('Nearest hospital API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to find nearest hospital' },
      { status: 500 }
    );
  }
}
