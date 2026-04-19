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

      {toast && <Toast message={toast} />}
    </>
  );
}
