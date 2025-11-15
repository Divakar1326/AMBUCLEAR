import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
let pusherServer: Pusher | null = null;

export function getPusherServer() {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
      useTLS: true,
    });
  }
  return pusherServer;
}

// Broadcast ambulance location update
export async function broadcastAmbulanceUpdate(ambulanceData: any) {
  try {
    const pusher = getPusherServer();
    await pusher.trigger('ambuclear', 'ambulance-update', ambulanceData);
  } catch (error) {
    console.error('Error broadcasting ambulance update:', error);
  }
}

// Broadcast SOS alert
export async function broadcastSOSAlert(sosData: any) {
  try {
    const pusher = getPusherServer();
    await pusher.trigger('ambuclear', 'sos-alert', sosData);
  } catch (error) {
    console.error('Error broadcasting SOS:', error);
  }
}

// Broadcast alert to specific device
export async function sendAlertToDevice(deviceId: string, alertData: any) {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(`device-${deviceId}`, 'emergency-alert', alertData);
  } catch (error) {
    console.error('Error sending alert to device:', error);
  }
}

// Client-side Pusher hook (for use in React components)
export function createPusherClient() {
  return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
  });
}
