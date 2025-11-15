import { NextRequest, NextResponse } from 'next/server';
import { TrafficService } from '@/lib/services/trafficService';

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, mode = 'driving' } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
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
    const result = await trafficService.getDirectionsWithTraffic(origin, destination, mode);

    // Convert seconds to readable format
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      return mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : `${seconds} sec`;
    };

    return NextResponse.json({
      success: true,
      data: {
        polyline: result.polyline,
        distance: `${(result.distance / 1000).toFixed(1)} km`,
        duration: formatDuration(result.duration),
        durationInTraffic: formatDuration(result.durationInTraffic),
        trafficDelay: formatDuration(result.trafficDelay),
        steps: result.steps,
        rawData: {
          distanceMeters: result.distance,
          durationSeconds: result.duration,
          durationInTrafficSeconds: result.durationInTraffic
        }
      }
    });
  } catch (error: any) {
    console.error('Route API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate route' },
      { status: 500 }
    );
  }
}
