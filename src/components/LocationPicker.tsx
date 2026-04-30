'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { findClosestMunicipio } from '@/lib/geoUtils';
import { MUNICIPIOS_GEO, DEPARTAMENTOS, getMunicipios } from '@/lib/municipiosGeo';

interface Props {
  departamento: string;
  municipio: string;
  onChangeDepartamento: (dep: string) => void;
  onChangeMunicipio: (mun: string) => void;
}

export default function LocationPicker({ departamento, municipio, onChangeDepartamento, onChangeMunicipio }: Props) {
  const [depQuery, setDepQuery] = useState(departamento);
  const [munQuery, setMunQuery] = useState(municipio);
  const [depOpen, setDepOpen] = useState(false);
  const [munOpen, setMunOpen] = useState(false);
  const depRef = useRef<HTMLDivElement>(null);
  const munRef = useRef<HTMLDivElement>(null);

  // Filtered suggestions
  const depSuggestions = DEPARTAMENTOS.filter((d) =>
    d.toLowerCase().includes(depQuery.toLowerCase())
  );

  const munList = departamento ? getMunicipios(departamento) : [];
  const munSuggestions = munList.filter((m) =>
    m.toLowerCase().includes(munQuery.toLowerCase())
  );

  const selectDep = useCallback((dep: string) => {
    setDepQuery(dep);
    onChangeDepartamento(dep);
    onChangeMunicipio('');
    setMunQuery('');
    setDepOpen(false);
  }, [onChangeDepartamento, onChangeMunicipio]);

  const selectMun = useCallback((mun: string) => {
    setMunQuery(mun);
    onChangeMunicipio(mun);
    setMunOpen(false);
  }, [onChangeMunicipio]);

  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const result = findClosestMunicipio(latitude, longitude, MUNICIPIOS_GEO);
        if (result && !departamento && !municipio) {
          selectDep(result.departamento);
          setMunQuery(result.municipio);
          onChangeMunicipio(result.municipio);
        }
      },
      (err) => console.warn('Silent GPS detection failed:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [departamento, municipio, selectDep, onChangeMunicipio]);

  useEffect(() => {
    // Only auto-detect if fields are empty to avoid overwriting user data
    if (!departamento && !municipio) {
      detectGPS();
    }
  }, []); // Run once on mount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="row-2">
        {/* Departamento Autocomplete */}
        <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={depRef}>
          <label className="form-label" htmlFor="input-departamento">Departamento</label>
          <input
            id="input-departamento"
            className="form-input"
            value={depQuery}
            placeholder="Ej: Valle"
            autoComplete="off"
            onChange={(e) => {
              setDepQuery(e.target.value);
              setDepOpen(true);
              if (!e.target.value) {
                onChangeDepartamento('');
                onChangeMunicipio('');
                setMunQuery('');
              }
            }}
            onFocus={() => setDepOpen(true)}
            onBlur={() => setTimeout(() => setDepOpen(false), 180)}
          />
          {depOpen && depSuggestions.length > 0 && (
            <ul className="autocomplete-list">
              {depSuggestions.map((d) => (
                <li
                  key={d}
                  className={`autocomplete-item ${d === departamento ? 'active' : ''}`}
                  onMouseDown={() => selectDep(d)}
                >
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Municipio Autocomplete */}
        <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={munRef}>
          <label className="form-label" htmlFor="input-municipio">Municipio</label>
          <input
            id="input-municipio"
            className="form-input"
            value={munQuery}
            placeholder={departamento ? 'Municipio' : '...'}
            autoComplete="off"
            disabled={!departamento}
            onChange={(e) => {
              setMunQuery(e.target.value);
              setMunOpen(true);
              if (!e.target.value) onChangeMunicipio('');
            }}
            onFocus={() => setMunOpen(true)}
            onBlur={() => setTimeout(() => setMunOpen(false), 180)}
          />
          {munOpen && munSuggestions.length > 0 && (
            <ul className="autocomplete-list">
              {munSuggestions.map((m) => (
                <li
                  key={m}
                  className={`autocomplete-item ${m === municipio ? 'active' : ''}`}
                  onMouseDown={() => selectMun(m)}
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
