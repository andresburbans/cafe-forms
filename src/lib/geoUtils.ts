// Bounding boxes for each municipality capital (approx center)
// Used for offline GPS → municipality resolution via Haversine
export interface MunicipioGeo {
  departamento: string;
  municipio: string;
  lat: number;
  lng: number;
}

// Haversine formula – returns distance in km between two lat/lng points
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns the closest { departamento, municipio } to given GPS coords
export function findClosestMunicipio(
  lat: number,
  lng: number,
  dataset: MunicipioGeo[]
): MunicipioGeo | null {
  if (!dataset.length) return null;
  let best = dataset[0];
  let bestDist = haversineKm(lat, lng, best.lat, best.lng);
  for (const m of dataset) {
    const d = haversineKm(lat, lng, m.lat, m.lng);
    if (d < bestDist) { bestDist = d; best = m; }
  }
  return best;
}
