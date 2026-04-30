import React from 'react';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
  label: string;
  startMonth: number | null;
  endMonth: number | null;
  onChange: (start: number | null, end: number | null) => void;
  allowClear?: boolean;
}

export default function MonthRangeSelector({ label, startMonth, endMonth, onChange, allowClear = true }: Props) {
  const handleClick = (index: number) => {
    if (startMonth === null || (startMonth !== null && endMonth !== null)) {
      // Start a new range
      onChange(index, null);
    } else {
      // Complete the range
      if (index === startMonth) {
        // Unselect if clicking the same, or complete as a 1-month range
        // If clicking the same start month, clear the selection
        onChange(null, null);
      } else {
        const start = Math.min(startMonth, index);
        const end = Math.max(startMonth, index);
        onChange(start, end);
      }
    }
  };

  const isSelected = (index: number) => {
    if (startMonth === null) return false;
    if (endMonth === null) return index === startMonth;
    return index >= startMonth && index <= endMonth;
  };

  const isEndpoint = (index: number) => {
    if (startMonth === null) return false;
    if (endMonth === null) return index === startMonth;
    return index === startMonth || index === endMonth;
  };

  return (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
        {allowClear && (startMonth !== null) && (
          <button
            type="button"
            onClick={() => onChange(null, null)}
            style={{
              background: 'none', border: 'none', color: 'var(--color-text-muted)',
              fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline'
            }}
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="month-selector">
        {MONTHS.map((month, idx) => {
          const selected = isSelected(idx);
          const endpoint = isEndpoint(idx);
          return (
            <button
              key={month}
              type="button"
              className={`month-btn ${selected ? 'selected' : ''} ${endpoint ? 'endpoint' : ''}`}
              onClick={() => handleClick(idx)}
            >
              {month}
            </button>
          );
        })}
      </div>
      <p className="form-hint">Estos periodos nos ayudan a entender cuando tienes cafe disponible para la venta. Toca un mes de inicio y luego el mes de fin.</p>
    </div>
  );
}
