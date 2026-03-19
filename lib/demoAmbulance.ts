import fs from 'fs';
import path from 'path';
import type { AmbulanceProfile } from './firestore';

export const DEMO_AMBULANCE_ID = 'AMB-TN01AB2026';

const DEMO_FILE = path.join(process.cwd(), 'data', 'demo_ambulance_state.json');
let inMemoryDemoState: AmbulanceProfile | null = null;

const DEMO_AMBULANCE_FALLBACK: AmbulanceProfile = {
  id: DEMO_AMBULANCE_ID,
  auth_uid: 'demo-auth-uid',
  email: 'demo@ambuclear.local',
  name: 'Demo Driver',
  phone: '9999999999',
  vehicle_no: 'TN-01-AB-2026',
  hospital_name: 'Apollo Hospital Chennai',
  driving_license_number: 'DEMO1234567890',
  verification_status: 'verified',
  verification_score: 95,
  verification_extracted_text: 'DEMO OCR TEXT',
  documents: {
    ambulance_photo_url: '',
    driving_license_photo_url: '',
    uploaded_at: new Date().toISOString(),
  },
  status: 'green',
  lat: 13.0827,
  lng: 80.2707,
  heading: 0,
  timestamp: new Date().toISOString(),
};

function ensureDemoFile() {
  const demoDir = path.dirname(DEMO_FILE);
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  if (!fs.existsSync(DEMO_FILE)) {
    fs.writeFileSync(DEMO_FILE, JSON.stringify(DEMO_AMBULANCE_FALLBACK, null, 2), 'utf-8');
  }
}

function readDemoState(): AmbulanceProfile {
  if (inMemoryDemoState) {
    return { ...DEMO_AMBULANCE_FALLBACK, ...inMemoryDemoState };
  }

  try {
    ensureDemoFile();
    const raw = fs.readFileSync(DEMO_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as AmbulanceProfile;
    return { ...DEMO_AMBULANCE_FALLBACK, ...parsed };
  } catch {
    return { ...DEMO_AMBULANCE_FALLBACK };
  }
}

function writeDemoState(state: AmbulanceProfile) {
  inMemoryDemoState = state;

  try {
    ensureDemoFile();
    fs.writeFileSync(DEMO_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Vercel/serverless filesystems are often read-only at runtime.
    // Keep demo state in memory so APIs can still respond successfully.
  }
}

export function getDemoAmbulanceById(id: string): AmbulanceProfile | null {
  if (id !== DEMO_AMBULANCE_ID) {
    return null;
  }

  return readDemoState();
}

export function listDemoAmbulances(): AmbulanceProfile[] {
  return [readDemoState()];
}

export function updateDemoAmbulance(
  id: string,
  updates: Partial<AmbulanceProfile>
): AmbulanceProfile | null {
  if (id !== DEMO_AMBULANCE_ID) {
    return null;
  }

  const current = readDemoState();
  const next = {
    ...current,
    ...updates,
    timestamp: new Date().toISOString(),
  };

  writeDemoState(next);
  return next;
}
