import { NextRequest, NextResponse } from 'next/server';
import { TrafficService } from '@/lib/services/trafficService';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origins, destinations } = body;

    if (!origins || !Array.isArray(origins) || !destinations || !Array.isArray(destinations)) {
      return NextResponse.json(
        { error: 'Origins and destinations arrays are required' },
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
    const results = await trafficService.getETAWithTraffic(origins, destinations);

    return NextResponse.json({
      success: true,
      data: {
        results,
        originCount: origins.length,
        destinationCount: destinations.length,
        totalCombinations: results.length
      }
    });
  } catch (error: any) {
    console.error('ETA Matrix API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate ETAs' },
      { status: 500 }
    );
  }
}
