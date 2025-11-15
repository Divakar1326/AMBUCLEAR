import { NextRequest, NextResponse } from 'next/server';
import { getAmbulances } from '@/lib/excel';
import { haversineDistance, isSameDirection } from '@/lib/gps';
import { generateVoiceInstruction } from '@/lib/ai';

const ALERT_RADIUS = parseFloat(process.env.ALERT_RADIUS_METERS || '500');
const HEADING_THRESHOLD = parseFloat(process.env.HEADING_DIFFERENCE_THRESHOLD || '30');

// Helper to get traffic-aware AI instructions
async function getTrafficAwareInstructions(userLat: number, userLng: number, emergencyLevel: string) {
  try {
    // Get current traffic level
    const trafficResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/google-maps/traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: { lat: userLat, lng: userLng } })
    });
    
    const trafficData = await trafficResponse.json();
    const trafficLevel = trafficData.success ? trafficData.data.trafficLevel : 'unknown';
    
    // Get AI-powered instructions
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/google-maps/ai-instructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ambulanceLocation: { lat: userLat, lng: userLng },
        emergencyLevel,
        trafficLevel,
        roadType: 'main-road',
        lanes: 2
      })
    });
    
    const aiData = await aiResponse.json();
    if (aiData.success) {
      return {
        instruction: aiData.data.instruction,
        voiceInstruction: aiData.data.voiceInstruction,
        trafficLevel,
        urgency: aiData.data.urgency
      };
    }
  } catch (error) {
    console.error('Error getting traffic-aware instructions:', error);
  }
  
  return null;
}

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
          // Get traffic-aware AI instructions
          const aiInstructions = await getTrafficAwareInstructions(lat, lng, ambulance.status);
          
          // Fallback to basic instruction if AI fails
          let instruction = await generateVoiceInstruction({
            distance,
            vehicleType: 'ambulance',
          });
          
          let voiceInstruction = instruction;
          let trafficLevel = 'unknown';
          let urgency = 'high';
          
          if (aiInstructions) {
            instruction = aiInstructions.instruction;
            voiceInstruction = aiInstructions.voiceInstruction;
            trafficLevel = aiInstructions.trafficLevel;
            urgency = aiInstructions.urgency;
          }

          return NextResponse.json({
            alert: true,
            ambulance_id: ambulance.id,
            distance,
            instruction,
            voiceInstruction,
            trafficLevel,
            urgency,
            vehicle_no: ambulance.vehicle_no,
            status: ambulance.status,
            name: ambulance.name
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
