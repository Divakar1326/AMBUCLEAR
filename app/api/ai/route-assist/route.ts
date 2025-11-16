import { NextRequest, NextResponse } from 'next/server';

interface Ambulance {
  id: string;
  name: string;
  vehicle_no: string;
  status: 'red' | 'yellow' | 'green';
  lat: number;
  lng: number;
  destination?: {
    name: string;
    lat: number;
    lng: number;
  };
}

interface SOSRecord {
  id: string;
  ambulance_id: string;
  lat: number;
  lng: number;
  active: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ambulances, sosRecords } = body;

    if (!ambulances || !Array.isArray(ambulances)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // AI Analysis Logic
    const priorityRoutes: any[] = [];
    const emergencyAmbulances = ambulances.filter((a: Ambulance) => a.status === 'red');
    const sosAmbulances = sosRecords?.map((s: SOSRecord) => s.ambulance_id) || [];

    // Analyze each emergency ambulance
    emergencyAmbulances.forEach((amb: Ambulance) => {
      const isSOS = sosAmbulances.includes(amb.id);
      const hasDestination = !!amb.destination;

      let priority = 'MEDIUM';
      let recommendation = '';
      let reason = '';

      // SOS ambulances get highest priority
      if (isSOS) {
        priority = 'HIGH';
        recommendation = 'CLEAR ALL TRAFFIC IMMEDIATELY - Emergency assistance needed';
        reason = 'Active SOS alert from this ambulance';
      } 
      // Red status with destination
      else if (hasDestination) {
        priority = 'HIGH';
        recommendation = `Clear route to ${amb.destination?.name} - Emergency patient transport`;
        reason = 'Active emergency response with confirmed destination';
      }
      // Red status without destination
      else {
        priority = 'MEDIUM';
        recommendation = 'Monitor and prepare to clear route once destination confirmed';
        reason = 'Emergency mode active but destination not yet set';
      }

      priorityRoutes.push({
        ambulance_id: amb.vehicle_no,
        driver: amb.name,
        status: amb.status,
        priority,
        route: hasDestination 
          ? `Current → ${amb.destination?.name}`
          : 'Awaiting destination',
        recommendation,
        reason,
        coordinates: {
          current: { lat: amb.lat, lng: amb.lng },
          destination: amb.destination || null,
        },
      });
    });

    // Sort by priority (HIGH first)
    priorityRoutes.sort((a, b) => {
      const priorityOrder: any = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Generate summary
    const highPriorityCount = priorityRoutes.filter(r => r.priority === 'HIGH').length;
    const summary = highPriorityCount > 0
      ? `${highPriorityCount} HIGH PRIORITY route${highPriorityCount > 1 ? 's' : ''} require immediate action`
      : emergencyAmbulances.length > 0
      ? `${emergencyAmbulances.length} emergency ambulance${emergencyAmbulances.length > 1 ? 's' : ''} active - Monitor closely`
      : 'All ambulances operating normally';

    // Additional recommendations
    const recommendations = {
      priority_routes: priorityRoutes,
      summary,
      total_emergency: emergencyAmbulances.length,
      total_sos: sosRecords?.length || 0,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, recommendations });
  } catch (error) {
    console.error('AI assist error:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
