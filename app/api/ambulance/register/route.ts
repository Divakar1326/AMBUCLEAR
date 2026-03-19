import { NextRequest, NextResponse } from 'next/server';
import { createAmbulance, getAmbulanceById, type AmbulanceProfile } from '@/lib/firestore';
import {
  createAmbulanceCode,
  getNameTokens,
  normalizeLicenseNumber,
  normalizeTextForMatch,
} from '@/lib/ambulanceIdentity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      auth_uid,
      email,
      name,
      phone,
      vehicle_no,
      service_type,
      driving_license_number,
      documents,
      verification,
    } = body;

    // Detailed validation
    if (!auth_uid || !email || !name || !phone || !vehicle_no || !service_type || !driving_license_number || !documents?.ambulance_photo_url || !documents?.driving_license_photo_url) {
      const missing = [];
      if (!auth_uid) missing.push('Auth UID');
      if (!email) missing.push('Email');
      if (!name) missing.push('Name');
      if (!phone) missing.push('Phone');
      if (!vehicle_no) missing.push('Vehicle Number');
      if (!service_type) missing.push('Service Type');
      if (!driving_license_number) missing.push('Driving License Number');
      if (!documents?.ambulance_photo_url) missing.push('Ambulance Photo');
      if (!documents?.driving_license_photo_url) missing.push('Driving License Photo');
      return NextResponse.json({ 
        error: `Missing required fields: ${missing.join(', ')}` 
      }, { status: 400 });
    }

    const id = createAmbulanceCode(vehicle_no);
    const existingAmbulance = await getAmbulanceById(id);

    if (existingAmbulance) {
      return NextResponse.json({
        error: `Ambulance code ${id} already exists for this vehicle number.`,
      }, { status: 409 });
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
      hospital_name: service_type === 'hospital' ? 'Hospital Service' : 
                     service_type === 'government' ? 'Government Service' : 'Private Service',
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

    console.log('Attempting to create ambulance:', newAmbulance);
    await createAmbulance(newAmbulance);
    console.log('Ambulance created successfully:', id);

    return NextResponse.json({ id, ambulance: newAmbulance, verification_status: verificationStatus }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      error: `Registration failed: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}
