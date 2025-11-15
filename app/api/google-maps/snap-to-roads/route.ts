import { NextRequest, NextResponse } from 'next/server';
import { TrafficService } from '@/lib/services/trafficService';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { points, interpolate = true } = body;

    if (!points || !Array.isArray(points)) {
      return NextResponse.json(
        { error: 'Points array is required' },
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
    const snappedPoints = await trafficService.snapToRoads(points, interpolate);

    return NextResponse.json({
      success: true,
      data: {
        snappedPoints,
        originalCount: points.length,
        snappedCount: snappedPoints.length,
        interpolated: interpolate
      }
    });
  } catch (error: any) {
    console.error('Snap to roads API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to snap points to roads' },
      { status: 500 }
    );
  }
}
