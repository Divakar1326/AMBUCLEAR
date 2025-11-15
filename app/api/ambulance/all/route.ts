import { NextRequest, NextResponse } from 'next/server';
import {
  getAmbulances,
  createAmbulance,
  type AmbulanceProfile,
} from '@/lib/excel';

// GET all ambulances
export async function GET() {
  try {
    const ambulances = getAmbulances();
    return NextResponse.json({ ambulances });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ambulances' }, { status: 500 });
  }
}

// POST create new ambulance (register)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, vehicle_no, hospital_name } = body;

    if (!name || !phone || !vehicle_no || !hospital_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    createAmbulance(newAmbulance);

    return NextResponse.json({ id, ambulance: newAmbulance }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register ambulance' }, { status: 500 });
  }
}
