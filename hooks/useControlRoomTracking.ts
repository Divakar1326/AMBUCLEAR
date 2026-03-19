'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPusherClient } from '@/lib/websocket';
import {
  type PublicSOSRecord,
  type TrackingAmbulance,
  type TrackingSOSRecord,
  upsertAmbulance,
} from '@/lib/tracking';

interface TrackingSnapshot {
  ambulances: TrackingAmbulance[];
  sosRecords: TrackingSOSRecord[];
  publicSOSRecords: PublicSOSRecord[];
}

const EMPTY_SNAPSHOT: TrackingSnapshot = {
  ambulances: [],
  sosRecords: [],
  publicSOSRecords: [],
};

export function useControlRoomTracking(active: boolean) {
  const [snapshot, setSnapshot] = useState<TrackingSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(false);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!active || refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setLoading(true);

    try {
      const [ambulancesRes, sosRes, publicSOSRes] = await Promise.all([
        fetch('/api/ambulance/all', { cache: 'no-store' }),
        fetch('/api/sos', { cache: 'no-store' }),
        fetch('/api/public/sos', { cache: 'no-store' }),
      ]);

      const [ambulancesData, sosData, publicSOSData] = await Promise.all([
        ambulancesRes.json(),
        sosRes.json(),
        publicSOSRes.json(),
      ]);

      setSnapshot({
        ambulances: ambulancesData.ambulances || [],
        sosRecords: sosData.sos || [],
        publicSOSRecords: publicSOSData.alerts || [],
      });
    } catch (error) {
      console.error('Error loading tracking snapshot:', error);
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      return;
    }

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [active, refresh]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const client = createPusherClient();
    const channel = client.subscribe('ambuclear');

    channel.bind('ambulance-update', (payload: TrackingAmbulance) => {
      setSnapshot((current) => ({
        ...current,
        ambulances: upsertAmbulance(current.ambulances, payload),
      }));
    });

    channel.bind('sos-alert', () => {
      refresh();
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe('ambuclear');
      client.disconnect();
    };
  }, [active, refresh]);

  return {
    ...snapshot,
    loading,
    refresh,
  };
}
