'use client';
import { useState, useEffect } from 'react';
import { db, type Surveyor } from '@/lib/db';

export function useSurveyor() {
  const [surveyor, setSurveyor] = useState<Surveyor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.surveyors
      .toCollection()
      .first()
      .then((s) => {
        setSurveyor(s || null);
        setLoading(false);
      });
  }, []);

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
