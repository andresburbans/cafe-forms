'use client';

import { useEffect } from 'react';
import { syncAllOfflineSurveys } from '@/lib/firestoreService';

export default function SyncManager() {
  useEffect(() => {
    // Initial sync on mount
    if (navigator.onLine) {
      syncAllOfflineSurveys();
    }

    // Listener for connection recovery
    const handleOnline = () => {
      console.log('Conexión recuperada. Iniciando sincronización...');
      syncAllOfflineSurveys();
    };

    window.addEventListener('online', handleOnline);
    
    // Periodic check every 5 minutes if online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncAllOfflineSurveys();
      }
    }, 1000 * 60 * 5);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  return null; // Silent component
}
