import path from 'path';
import fs from 'fs';

// Data directory
const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const JSON_FILE = path.join(DATA_DIR, 'ambuclear_data.json');

// Type definitions for Excel sheets
export interface AmbulanceProfile {
  id: string;
  name: string;
  phone: string;
  vehicle_no: string;
  hospital_name: string;
  status: 'red' | 'yellow' | 'green';
  lat: number;
  lng: number;
  heading: number;
  timestamp: string;
  destination?: {
    name: string;
    lat: number;
    lng: number;
  };
}

export interface PublicUser {
  id: string;
  device_id: string;
  lat: number;
  lng: number;
  heading: number;
  alert_disabled_until: string | null;
  timestamp: string;
}

export interface SOSRecord {
  id: string;
  ambulance_id: string;
  lat: number;
  lng: number;
  active: boolean;
  timestamp: string;
}

// Initialize JSON database file if it doesn't exist
export function initializeExcel() {
  try {
    if (!fs.existsSync(JSON_FILE)) {
      console.log('Initializing JSON database at:', JSON_FILE);
      const initialData = {
        ambulance_profiles: [],
        public_users: [],
        sos: []
      };
      fs.writeFileSync(JSON_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      console.log('JSON database created successfully');
    }
  } catch (error) {
    console.error('Error initializing JSON database:', error);
    throw error;
  }
}

// Read data from JSON database
export function readSheet<T>(sheetName: string): T[] {
  try {
    initializeExcel();
    const fileContent = fs.readFileSync(JSON_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return data[sheetName] || [];
  } catch (error) {
    console.error(`Error reading ${sheetName}:`, error);
    return [];
  }
}

// Write data to JSON database
export function writeSheet<T>(sheetName: string, data: T[]) {
  try {
    initializeExcel();
    const fileContent = fs.readFileSync(JSON_FILE, 'utf-8');
    const allData = JSON.parse(fileContent);
    allData[sheetName] = data;
    fs.writeFileSync(JSON_FILE, JSON.stringify(allData, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${sheetName}:`, error);
    throw error;
  }
}

// Ambulance CRUD operations
export function getAmbulances(): AmbulanceProfile[] {
  return readSheet<AmbulanceProfile>('ambulance_profiles');
}

export function getAmbulanceById(id: string): AmbulanceProfile | null {
  const ambulances = getAmbulances();
  return ambulances.find(a => a.id === id) || null;
}

export function createAmbulance(ambulance: AmbulanceProfile) {
  try {
    console.log('Creating ambulance in Excel:', ambulance.id);
    const ambulances = getAmbulances();
    ambulances.push(ambulance);
    writeSheet('ambulance_profiles', ambulances);
    console.log('Ambulance saved successfully');
  } catch (error) {
    console.error('Error creating ambulance:', error);
    throw error;
  }
}

export function updateAmbulance(id: string, updates: Partial<AmbulanceProfile>) {
  const ambulances = getAmbulances();
  const index = ambulances.findIndex(a => a.id === id);
  if (index !== -1) {
    ambulances[index] = { ...ambulances[index], ...updates, timestamp: new Date().toISOString() };
    writeSheet('ambulance_profiles', ambulances);
    return ambulances[index];
  }
  return null;
}

export function deleteAmbulance(id: string) {
  const ambulances = getAmbulances();
  const filtered = ambulances.filter(a => a.id !== id);
  writeSheet('ambulance_profiles', filtered);
}

// Public users CRUD operations
export function getPublicUsers(): PublicUser[] {
  return readSheet<PublicUser>('public_users');
}

export function getPublicUserById(id: string): PublicUser | null {
  const users = getPublicUsers();
  return users.find(u => u.id === id) || null;
}

export function upsertPublicUser(user: PublicUser) {
  const users = getPublicUsers();
  const index = users.findIndex(u => u.device_id === user.device_id);
  if (index !== -1) {
    users[index] = user;
  } else {
    users.push(user);
  }
  writeSheet('public_users', users);
}

// SOS CRUD operations
export function getSOSRecords(): SOSRecord[] {
  return readSheet<SOSRecord>('sos');
}

export function createSOS(sos: SOSRecord) {
  const records = getSOSRecords();
  records.push(sos);
  writeSheet('sos', records);
}

export function updateSOS(id: string, updates: Partial<SOSRecord>) {
  const records = getSOSRecords();
  const index = records.findIndex(s => s.id === id);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    writeSheet('sos', records);
    return records[index];
  }
  return null;
}

export function getActiveSOSRecords(): SOSRecord[] {
  return getSOSRecords().filter(s => s.active);
}
