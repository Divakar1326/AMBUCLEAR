import { NextRequest, NextResponse } from 'next/server';
import { TrafficService } from '@/lib/services/trafficService';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location } = body;

    if (!location || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: 'Location with lat and lng is required' },
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
    const trafficLevel = await trafficService.getTrafficLevel(location);

    return NextResponse.json({
      success: true,
      data: {
        location,
        trafficLevel,
        description: {
          low: 'Smooth traffic flow',
          medium: 'Moderate traffic delays',
          high: 'Heavy traffic congestion',
          severe: 'Severe traffic jams',
          unknown: 'Traffic data unavailable'
        }[trafficLevel]
      }
    });
  } catch (error: any) {
    console.error('Traffic level API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get traffic level' },
      { status: 500 }
    );
  }
}
