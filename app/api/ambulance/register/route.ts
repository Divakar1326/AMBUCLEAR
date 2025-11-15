import { NextRequest, NextResponse } from 'next/server';
import { createAmbulance, type AmbulanceProfile } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, vehicle_no, hospital_name } = body;

    // Detailed validation
    if (!name || !phone || !vehicle_no || !hospital_name) {
      const missing = [];
      if (!name) missing.push('Name');
      if (!phone) missing.push('Phone');
      if (!vehicle_no) missing.push('Vehicle Number');
      if (!hospital_name) missing.push('Hospital Name');
      return NextResponse.json({ 
        error: `Missing required fields: ${missing.join(', ')}` 
      }, { status: 400 });
    }

    const id = 'amb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const newAmbulance: AmbulanceProfile = {
      id,
      name,
      phone,
      vehicle_no,
      hospital_name,
      status: 'green',
      lat: 0,
      lng: 0,
      heading: 0,
      timestamp: new Date().toISOString(),
    };

    console.log('Attempting to create ambulance:', newAmbulance);
    createAmbulance(newAmbulance);
    console.log('Ambulance created successfully:', id);

    return NextResponse.json({ id, ambulance: newAmbulance }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      error: `Registration failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}
