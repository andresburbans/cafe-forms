'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { exportCSV, exportXLSX, exportJSON } from '@/lib/exporter';
import { Toast, useToast } from '@/components/Toast';

export default function ExportarPage() {
  const { toast, showToast } = useToast();
  const [count, setCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { db.fincas.count().then(setCount); }, []);

  const handleExport = async (type: 'csv' | 'xlsx' | 'json') => {
    if (count === 0) { showToast('No hay datos para exportar'); return; }
    setExporting(true);
    try {
      if (type === 'csv') await exportCSV();
      else if (type === 'xlsx') await exportXLSX();
      else await exportJSON();
      showToast(`${type.toUpperCase()} exportado`);
    } catch (err) {
      showToast('Error exportando');
    }
    setExporting(false);
  };

  const handleSeed = async () => {
    setExporting(true);
    showToast('Generando 1000 fincas...');
    try {
      const fincas = Array.from({ length: 1000 }).map((_, i) => {
        const now = new Date();
        return {
          idFincaOficina: `TEST-${i}`,
          nombreFinca: `Finca Prueba ${i}`,
          nombreCaficultor: `Caficultor ${i}`,
          departamento: 'Huila',
          municipio: 'Pitalito',
          vereda: 'La Esperanza',
          altitud: 1500 + (i % 500),
          anosTradicion: 10 + (i % 20),
          genero_liderazgo: i % 2 === 0 ? 'Femenino' : 'Masculino',
          whatsapp: '3000000000',
          correo: `test${i}@ejemplo.com`,
          instagram: '',
          facebook: '',
          historia_finca: 'Historia generada para test de rendimiento.',
          areaTotalHa: 5 + (i % 5),
          areaCafeHa: 3 + (i % 3),
          produccion_anual_kg: 5000,
          edad_promedio_cafetales: 5,
          cosechaPrincipalIni: 8,
          cosechaPrincipalFin: 11,
          cosechaMitacaIni: null,
          cosechaMitacaFin: null,
          puntajeSCA: 84.5 + (i % 5),
          sinMedicionFormal: false,
          infraestructura_secado: ['Marquesina'],
          otraInfraestructuraSecado: '',
          variedades: ['Castillo', 'Caturra'],
          otraVariedad: '',
          metodosBeneficio: ['Lavado'],
          tipos_fermentacion: ['Fermentación tradicional'],
          otroTipoFermentacion: '',
          perfil_taza: ['Chocolate', 'Cítrico'],
          otroPerfilTaza: '',
          certificaciones: ['Ninguna'],
          otraCertificacion: '',
          ubicacionConservacion: 'No aplica',
          nombreZonaConservacion: '',
          areaBosqueHa: 1.5,
          numFuentesHidricas: 2,
          cultivosSombra: ['Plátano', 'Nogal'],
          otroCultivoSombra: '',
          manejoAgronomico: 'tradicional',
          manejo_aguas_mieles: 'Pozo séptico',
          otroManejoAguasMieles: '',
          fauna_biodiversidad: 'Aves comunes',
          gpsLat: 1.85,
          gpsLong: -76.05,
          accuracy_gps: 15,
          consentimientoImagen: true,
          observaciones: 'Prueba de carga.',
          surveyorId: 1,
          status: 'completo' as const,
          createdAt: now,
          updatedAt: now,
          timestamp_inicio: now.toISOString(),
          timestamp_fin: now.toISOString(),
          sync_status: 'offline' as const,
          rol_informante: 'Propietario',
        };
      });
      // @ts-ignore
      await db.fincas.bulkAdd(fincas);
      setCount(await db.fincas.count());
      showToast('1000 fincas creadas');
    } catch (e) {
      console.error(e);
      showToast('Error generando');
    }
    setExporting(false);
  };

  const handleWipe = async () => {
    if (!confirm('Borrar todas las fincas locales?')) return;
    await db.fincas.clear();
    setCount(await db.fincas.count());
    showToast('Base de datos limpiada');
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Exportar datos</h1>
        <p className="page-subtitle">{count} finca{count !== 1 ? 's' : ''} disponible{count !== 1 ? 's' : ''}</p>
      </div>

      <div className="card export-card mb-md">
        <div className="export-icon"></div>
        <h2 className="card-title">Exportar para análisis</h2>
        <p className="card-subtitle">Formato tabular para hojas de cálculo</p>
        <div className="export-buttons">
          <button className="btn btn-primary btn-block" onClick={() => handleExport('csv')} disabled={exporting}>
            Exportar CSV
          </button>
          <button className="btn btn-primary btn-block" onClick={() => handleExport('xlsx')} disabled={exporting}>
            Exportar XLSX (Excel)
          </button>
        </div>
      </div>

      <div className="card export-card">
        <div className="export-icon"></div>
        <h2 className="card-title">Backup completo (JSON)</h2>
        <p className="card-subtitle">Incluye fotos en base64. Para importar a base de datos.</p>
        <div className="export-buttons">
          <button className="btn btn-secondary btn-block" onClick={() => handleExport('json')} disabled={exporting}>
            Exportar JSON (Backup)
          </button>
        </div>
      </div>

      <div className="card mt-lg" style={{ textAlign: 'center' }}>
        <div className="form-hint">
          <strong>CSV/XLSX:</strong> Datos tabulares sin fotos. Ideal para Excel, Google Sheets.<br />
          <strong>JSON:</strong> Backup completo con fotos (base64). Para migración a DB/Firebase.
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="card mt-lg" style={{ borderColor: 'var(--color-danger)' }}>
          <h2 className="card-title" style={{ color: 'var(--color-danger)' }}>Dev Tools (Stress Test)</h2>
          <div className="row-2 mt-md">
            <button className="btn btn-secondary" onClick={handleSeed} disabled={exporting}>+ 1000 Fincas Mocks</button>
            <button className="btn btn-danger" onClick={handleWipe} disabled={exporting}>Wipe DB</button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} />}
    </>
  );
}
