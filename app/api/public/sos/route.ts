import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for public SOS alerts (in production, use a database)
const publicSOSAlerts: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, lat, lng, note } = body;

    if (!device_id || !lat || !lng) {
      return NextResponse.json(
        { error: 'Device ID, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const sosAlert = {
      id: `public_sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      device_id,
      lat,
      lng,
      note: note || 'Public driver emergency',
      active: true,
      timestamp: new Date().toISOString(),
      type: 'public_driver'
    };

    publicSOSAlerts.push(sosAlert);

    console.log('🆘 Public SOS Alert received:', sosAlert);

    return NextResponse.json({
      success: true,
      message: 'SOS alert sent to control room',
      sos: sosAlert
    });
  } catch (error: any) {
    console.error('Error creating public SOS alert:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send SOS alert' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    alerts: publicSOSAlerts.filter(alert => alert.active)
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, active } = body;

    const alert = publicSOSAlerts.find(a => a.id === id);
    if (alert) {
      alert.active = active;
      return NextResponse.json({ success: true, alert });
    }

    return NextResponse.json(
      { error: 'Alert not found' },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update alert' },
      { status: 500 }
    );
  }
}
