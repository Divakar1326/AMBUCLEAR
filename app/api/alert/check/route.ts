import { NextRequest, NextResponse } from 'next/server';
import { getAmbulances } from '@/lib/excel';
import { haversineDistance, isSameDirection } from '@/lib/gps';
import { generateVoiceInstruction } from '@/lib/ai';

const ALERT_RADIUS = parseFloat(process.env.ALERT_RADIUS_METERS || '500');
const HEADING_THRESHOLD = parseFloat(process.env.HEADING_DIFFERENCE_THRESHOLD || '30');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, heading } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Get all red-status ambulances
    const ambulances = getAmbulances().filter(a => a.status === 'red');

    // Check if any ambulance triggers alert
    for (const ambulance of ambulances) {
      const distance = haversineDistance(lat, lng, ambulance.lat, ambulance.lng);

      // Check distance condition
      if (distance <= ALERT_RADIUS) {
        // Check direction condition (if heading available)
        const userHeading = heading || 0;
        const sameDirection = isSameDirection(userHeading, ambulance.heading, HEADING_THRESHOLD);

        if (sameDirection || !heading) {
          // Generate instruction
          const instruction = await generateVoiceInstruction({
            distance,
            vehicleType: 'ambulance',
          });

          return NextResponse.json({
            alert: true,
            ambulance_id: ambulance.id,
            distance,
            instruction,
            vehicle_no: ambulance.vehicle_no,
          });
        }
      }
    }

    // No alert
    return NextResponse.json({ alert: false });
  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}
