import { NextRequest, NextResponse } from 'next/server';
import {
  getAmbulances,
  createAmbulance,
  getAmbulanceById,
  type AmbulanceProfile,
} from '@/lib/firestore';
import {
  createAmbulanceCode,
  getNameTokens,
  normalizeLicenseNumber,
  normalizeTextForMatch,
} from '@/lib/ambulanceIdentity';
import { DEMO_AMBULANCE_ID, listDemoAmbulances } from '@/lib/demoAmbulance';

// GET all ambulances
export async function GET() {
  try {
    const ambulances = await getAmbulances();
    const hasDemo = ambulances.some((ambulance) => ambulance.id === DEMO_AMBULANCE_ID);
    const combined = hasDemo ? ambulances : [...ambulances, ...listDemoAmbulances()];

    return NextResponse.json({ ambulances: combined });
  } catch (error) {
    console.error('Error fetching ambulances:', error);
    return NextResponse.json({ error: 'Failed to fetch ambulances' }, { status: 500 });
  }
}

// POST create new ambulance (register)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      auth_uid,
      email,
      name,
      phone,
      vehicle_no,
      hospital_name,
      driving_license_number,
      documents,
      verification,
    } = body;

    if (!auth_uid || !email || !name || !phone || !vehicle_no || !hospital_name || !driving_license_number || !documents?.ambulance_photo_url || !documents?.driving_license_photo_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = createAmbulanceCode(vehicle_no);
    const existingAmbulance = await getAmbulanceById(id);

    if (existingAmbulance) {
      return NextResponse.json({ error: `Ambulance code ${id} already exists` }, { status: 409 });
    }

    const normalizedExtractedText = normalizeTextForMatch(verification?.extracted_text || '');
    const normalizedLicenseNumber = normalizeLicenseNumber(driving_license_number);
    const matchedLicense = normalizedExtractedText.includes(normalizedLicenseNumber);
    const matchedName = getNameTokens(name).some((token) => normalizedExtractedText.includes(token));
    const ocrConfidence = Number(verification?.ocr_confidence || 0);
    const verificationScore = [matchedLicense ? 55 : 0, matchedName ? 25 : 0, Math.min(20, Math.round(ocrConfidence / 5))].reduce((sum, value) => sum + value, 0);
    const verificationStatus = verificationScore >= 70 ? 'verified' : 'pending';

    const newAmbulance: AmbulanceProfile = {
      id,
      auth_uid,
      email,
      name,
      phone,
      vehicle_no,
      hospital_name,
      driving_license_number: normalizedLicenseNumber,
      verification_status: verificationStatus,
      verification_score: verificationScore,
      verification_extracted_text: (verification?.extracted_text || '').slice(0, 2000),
      documents: {
        ambulance_photo_url: documents.ambulance_photo_url,
        driving_license_photo_url: documents.driving_license_photo_url,
        uploaded_at: new Date().toISOString(),
      },
      status: 'green',
      lat: 0,
      lng: 0,
      heading: 0,
      timestamp: new Date().toISOString(),
    };

    await createAmbulance(newAmbulance);

    return NextResponse.json({ id, ambulance: newAmbulance, verification_status: verificationStatus }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register ambulance' }, { status: 500 });
  }
}
