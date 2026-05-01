'use client';
import { useState, useEffect } from 'react';
import { db, type Surveyor } from '@/lib/db';
import { useAuth } from '@/lib/auth';

export function useSurveyor() {
  const { surveyorId } = useAuth();
  const [surveyor, setSurveyor] = useState<Surveyor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (surveyorId) {
        const s = await db.surveyors.get(surveyorId);
        setSurveyor(s || null);
      } else {
        // Fallback: get first surveyor (backward compat)
        const s = await db.surveyors.toCollection().first();
        setSurveyor(s || null);
      }
      setLoading(false);
    }
    load();
  }, [surveyorId]);

  const saveSurveyor = async (data: Omit<Surveyor, 'id' | 'createdAt'>) => {
    if (surveyor?.id) {
      await db.surveyors.update(surveyor.id, data);
      setSurveyor({ ...surveyor, ...data });
    } else {
      const id = await db.surveyors.add({ ...data, createdAt: new Date() });
      setSurveyor({ ...data, id, createdAt: new Date() });
    }
  };

  return { surveyor, loading, saveSurveyor };
}
