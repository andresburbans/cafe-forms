import { db as firestore } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db as localDb, type Finca, type FincaFoto } from './db';
import { compressForFirestore } from './imageCompressor';

/**
 * Recursively removes undefined values from an object.
 * Firestore does not support 'undefined'.
 */
function cleanData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanData);
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanData(v)])
    );
  }
  return obj;
}

/**
 * Uploads a survey and its photos from local DB to Firestore
 * using the Client SDK directly.
 */
export async function syncSurveyToFirestore(fincaId: number): Promise<boolean> {
  try {
    // 1. Fetch survey from local DB
    const finca = await localDb.fincas.get(fincaId);
    if (!finca) throw new Error('Finca no encontrada');

    // 2. Fetch photos from local DB
    const fotos = await localDb.fotos.where('fincaId').equals(fincaId).toArray();

    // 3. Process photos to Base64 (compressed)
    const processedFotos = await Promise.all(
      fotos.map(async (f) => ({
        tipo: f.tipo,
        nombre: f.nombre,
        base64: await compressForFirestore(f.blob, 200),
        createdAt: f.createdAt.toISOString(),
      }))
    );

    // 4. Prepare and CLEAN document data
    const rawDocData = {
      ...finca,
      createdAt: finca.createdAt instanceof Date ? finca.createdAt.toISOString() : finca.createdAt,
      updatedAt: finca.updatedAt instanceof Date ? finca.updatedAt.toISOString() : finca.updatedAt,
      fotos: processedFotos,
      localId: finca.id,
      syncedAt: serverTimestamp(),
      _source: 'client-sdk',
    };

    const docData = cleanData(rawDocData);

    // 5. Write directly to Firestore using Client SDK
    const surveyRef = collection(firestore, 'encuestas');
    const docRef = await addDoc(surveyRef, docData);

    // 6. Update local status
    await localDb.fincas.update(fincaId, { sync_status: 'online' });

    console.log(
      `%c✓ Encuesta ${fincaId} sincronizada con Firestore (ID: ${docRef.id})`,
      'color: #4caf50; font-weight: bold;'
    );
    return true;
  } catch (error: any) {
    console.error(`Error sincronizando encuesta ${fincaId}:`, error.message || error);
    return false;
  }
}

/**
 * Attempts to sync all offline surveys (up to 20 at a time).
 */
export async function syncAllOfflineSurveys(): Promise<void> {
  const offlineFincas = await localDb.fincas
    .where('sync_status')
    .equals('offline')
    .reverse()
    .limit(20)
    .toArray();

  if (offlineFincas.length === 0) return;

  console.log(`Iniciando sincronización de ${offlineFincas.length} encuestas pendientes...`);

  for (const finca of offlineFincas) {
    if (finca.id) {
      const ok = await syncSurveyToFirestore(finca.id);
      if (ok) await new Promise(r => setTimeout(r, 500));
    }
  }
}
