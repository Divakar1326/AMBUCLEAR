import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Type definitions
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

// Collections
const AMBULANCES = 'ambulance_profiles';
const PUBLIC_USERS = 'public_users';
const SOS_RECORDS = 'sos';

// ============ AMBULANCE CRUD ============

export async function getAmbulances(): Promise<AmbulanceProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, AMBULANCES));
    return snapshot.docs.map(doc => doc.data() as AmbulanceProfile);
  } catch (error) {
    console.error('Error getting ambulances:', error);
    return [];
  }
}

export async function getAmbulanceById(id: string): Promise<AmbulanceProfile | null> {
  try {
    const docRef = doc(db, AMBULANCES, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as AmbulanceProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting ambulance:', error);
    return null;
  }
}

export async function createAmbulance(ambulance: AmbulanceProfile): Promise<void> {
  try {
    console.log('Creating ambulance in Firestore:', ambulance.id);
    await setDoc(doc(db, AMBULANCES, ambulance.id), ambulance);
    console.log('Ambulance saved successfully');
  } catch (error) {
    console.error('Error creating ambulance:', error);
    throw error;
  }
}

export async function updateAmbulance(id: string, updates: Partial<AmbulanceProfile>): Promise<AmbulanceProfile | null> {
  try {
    const docRef = doc(db, AMBULANCES, id);
    await updateDoc(docRef, { ...updates, timestamp: new Date().toISOString() });
    
    const updated = await getAmbulanceById(id);
    return updated;
  } catch (error) {
    console.error('Error updating ambulance:', error);
    return null;
  }
}

export async function deleteAmbulance(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, AMBULANCES, id));
  } catch (error) {
    console.error('Error deleting ambulance:', error);
    throw error;
  }
}

// ============ PUBLIC USERS CRUD ============

export async function getPublicUsers(): Promise<PublicUser[]> {
  try {
    const snapshot = await getDocs(collection(db, PUBLIC_USERS));
    return snapshot.docs.map(doc => doc.data() as PublicUser);
  } catch (error) {
    console.error('Error getting public users:', error);
    return [];
  }
}

export async function getPublicUserById(id: string): Promise<PublicUser | null> {
  try {
    const docRef = doc(db, PUBLIC_USERS, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as PublicUser;
    }
    return null;
  } catch (error) {
    console.error('Error getting public user:', error);
    return null;
  }
}

export async function upsertPublicUser(user: PublicUser): Promise<void> {
  try {
    await setDoc(doc(db, PUBLIC_USERS, user.device_id), user);
  } catch (error) {
    console.error('Error upserting public user:', error);
    throw error;
  }
}

// ============ SOS CRUD ============

export async function getSOSRecords(): Promise<SOSRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, SOS_RECORDS));
    return snapshot.docs.map(doc => doc.data() as SOSRecord);
  } catch (error) {
    console.error('Error getting SOS records:', error);
    return [];
  }
}

export async function createSOS(sos: SOSRecord): Promise<void> {
  try {
    await setDoc(doc(db, SOS_RECORDS, sos.id), sos);
  } catch (error) {
    console.error('Error creating SOS:', error);
    throw error;
  }
}

export async function updateSOS(id: string, updates: Partial<SOSRecord>): Promise<SOSRecord | null> {
  try {
    const docRef = doc(db, SOS_RECORDS, id);
    await updateDoc(docRef, updates);
    
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as SOSRecord : null;
  } catch (error) {
    console.error('Error updating SOS:', error);
    return null;
  }
}

export async function getActiveSOSRecords(): Promise<SOSRecord[]> {
  try {
    const q = query(collection(db, SOS_RECORDS), where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SOSRecord);
  } catch (error) {
    console.error('Error getting active SOS records:', error);
    return [];
  }
}
