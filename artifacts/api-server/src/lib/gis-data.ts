import { latLngToCell, cellToBoundary, cellToLatLng, gridDisk, cellArea, UNITS } from "h3-js";

export const TUNABLE = {
  H3_RESOLUTION: 8,
  WALK_RADIUS_M: 800,
  COMPETITION_RADIUS_M: 400,
  ALPHA_THRESHOLD: 40,
  DBSCAN_EPS_M: 1200,
  DBSCAN_MIN_SAMPLES: 3,
  COMPETITION_PENALTY_WEIGHT: 0.3,
  DRIVEWAY_RATE: 0.85,
} as const;

export interface HexRaw {
  h3Index: string;
  lat: number;
  lng: number;
  citationCount: number;
  poiCount: number;
  residentialParcelCount: number;
  publicParkingSpots: number;
  neighborhoodName: string;
}

interface ZoneCenter {
  lat: number;
  lng: number;
  name: string;
  citationBase: number;
  poiBase: number;
  residentialBase: number;
  parkingBase: number;
  radius: number;
}

const ZONE_CENTERS: ZoneCenter[] = [
  { lat: 47.6062, lng: -122.3321, name: "Downtown Seattle", citationBase: 280, poiBase: 18, residentialBase: 5, parkingBase: 120, radius: 0.025 },
  { lat: 47.6000, lng: -122.3320, name: "Pioneer Square", citationBase: 250, poiBase: 15, residentialBase: 8, parkingBase: 100, radius: 0.020 },
  { lat: 47.6222, lng: -122.3380, name: "South Lake Union", citationBase: 220, poiBase: 16, residentialBase: 10, parkingBase: 90, radius: 0.022 },
  { lat: 47.6190, lng: -122.3140, name: "Capitol Hill", citationBase: 150, poiBase: 12, residentialBase: 55, parkingBase: 25, radius: 0.025 },
  { lat: 47.6100, lng: -122.2820, name: "Madrona / Leschi", citationBase: 80, poiBase: 6, residentialBase: 75, parkingBase: 5, radius: 0.025 },
  { lat: 47.5650, lng: -122.2830, name: "Columbia City", citationBase: 65, poiBase: 5, residentialBase: 70, parkingBase: 6, radius: 0.025 },
  { lat: 47.6610, lng: -122.3340, name: "Wallingford", citationBase: 70, poiBase: 6, residentialBase: 80, parkingBase: 4, radius: 0.025 },
  { lat: 47.5630, lng: -122.3760, name: "West Seattle Junction", citationBase: 60, poiBase: 5, residentialBase: 78, parkingBase: 5, radius: 0.025 },
  { lat: 47.6510, lng: -122.3510, name: "Fremont", citationBase: 100, poiBase: 8, residentialBase: 45, parkingBase: 15, radius: 0.022 },
  { lat: 47.6650, lng: -122.3820, name: "Ballard", citationBase: 90, poiBase: 8, residentialBase: 50, parkingBase: 12, radius: 0.025 },
  { lat: 47.6600, lng: -122.3130, name: "University District", citationBase: 130, poiBase: 11, residentialBase: 35, parkingBase: 30, radius: 0.022 },
  { lat: 47.6860, lng: -122.3560, name: "Greenwood", citationBase: 30, poiBase: 3, residentialBase: 85, parkingBase: 2, radius: 0.022 },
  { lat: 47.6740, lng: -122.3520, name: "Phinney Ridge", citationBase: 25, poiBase: 2, residentialBase: 88, parkingBase: 2, radius: 0.022 },
  { lat: 47.6460, lng: -122.4000, name: "Magnolia", citationBase: 15, poiBase: 2, residentialBase: 90, parkingBase: 1, radius: 0.025 },
  { lat: 47.5450, lng: -122.3160, name: "Georgetown", citationBase: 50, poiBase: 4, residentialBase: 35, parkingBase: 15, radius: 0.020 },
  { lat: 47.5980, lng: -122.3230, name: "International District", citationBase: 200, poiBase: 14, residentialBase: 12, parkingBase: 70, radius: 0.020 },
  { lat: 47.6130, lng: -122.2010, name: "Bellevue Downtown", citationBase: 210, poiBase: 14, residentialBase: 8, parkingBase: 95, radius: 0.025 },
  { lat: 47.6160, lng: -122.1880, name: "Wilburton", citationBase: 90, poiBase: 7, residentialBase: 60, parkingBase: 15, radius: 0.022 },
  { lat: 47.6760, lng: -122.2040, name: "Kirkland Waterfront", citationBase: 55, poiBase: 5, residentialBase: 72, parkingBase: 8, radius: 0.022 },
  { lat: 47.6250, lng: -122.2250, name: "Medina / Clyde Hill", citationBase: 5, poiBase: 1, residentialBase: 92, parkingBase: 0, radius: 0.022 },
  { lat: 47.6730, lng: -122.1220, name: "Redmond", citationBase: 70, poiBase: 6, residentialBase: 40, parkingBase: 25, radius: 0.025 },
  { lat: 47.6100, lng: -122.1700, name: "Crossroads", citationBase: 75, poiBase: 6, residentialBase: 55, parkingBase: 18, radius: 0.022 },
  { lat: 47.5850, lng: -122.1500, name: "Eastgate", citationBase: 45, poiBase: 4, residentialBase: 65, parkingBase: 10, radius: 0.022 },
  { lat: 47.5900, lng: -122.2200, name: "Somerset", citationBase: 20, poiBase: 2, residentialBase: 82, parkingBase: 2, radius: 0.020 },
  { lat: 47.5800, lng: -122.3600, name: "White Center", citationBase: 40, poiBase: 3, residentialBase: 60, parkingBase: 8, radius: 0.020 },
  { lat: 47.6300, lng: -122.3600, name: "Queen Anne", citationBase: 110, poiBase: 9, residentialBase: 40, parkingBase: 20, radius: 0.022 },
  { lat: 47.5500, lng: -122.3000, name: "Beacon Hill", citationBase: 55, poiBase: 4, residentialBase: 65, parkingBase: 8, radius: 0.022 },
  { lat: 47.6900, lng: -122.2950, name: "Lake City", citationBase: 35, poiBase: 3, residentialBase: 70, parkingBase: 5, radius: 0.020 },
  { lat: 47.5250, lng: -122.3600, name: "Burien Edge", citationBase: 25, poiBase: 2, residentialBase: 55, parkingBase: 4, radius: 0.020 },
];

type LatLngPoly = [number, number][];

const WATER_BODIES: LatLngPoly[] = [
  // Lake Washington (main body)
  [
    [47.500, -122.260], [47.510, -122.270], [47.520, -122.272],
    [47.535, -122.270], [47.550, -122.268], [47.565, -122.265],
    [47.575, -122.262], [47.585, -122.258], [47.595, -122.255],
    [47.605, -122.258], [47.615, -122.260], [47.625, -122.258],
    [47.635, -122.257], [47.645, -122.255], [47.655, -122.252],
    [47.665, -122.248], [47.675, -122.244], [47.685, -122.238],
    [47.695, -122.230], [47.705, -122.222], [47.710, -122.215],
    [47.715, -122.208], [47.720, -122.200],
    [47.720, -122.220], [47.715, -122.230], [47.710, -122.238],
    [47.705, -122.245], [47.695, -122.252], [47.685, -122.258],
    [47.675, -122.262], [47.665, -122.268], [47.655, -122.272],
    [47.645, -122.275], [47.635, -122.278], [47.625, -122.280],
    [47.615, -122.282], [47.605, -122.282], [47.595, -122.280],
    [47.585, -122.278], [47.575, -122.280], [47.565, -122.282],
    [47.555, -122.285], [47.545, -122.288], [47.535, -122.290],
    [47.525, -122.290], [47.515, -122.288], [47.505, -122.283],
    [47.500, -122.278],
  ],
  // Puget Sound / Elliott Bay (west of Seattle)
  [
    [47.500, -122.425], [47.510, -122.425], [47.520, -122.420],
    [47.530, -122.415], [47.540, -122.410], [47.550, -122.405],
    [47.560, -122.400], [47.570, -122.398], [47.580, -122.395],
    [47.585, -122.390], [47.590, -122.385], [47.595, -122.380],
    [47.600, -122.375], [47.605, -122.370], [47.610, -122.365],
    [47.618, -122.360], [47.625, -122.365],
    [47.630, -122.368], [47.636, -122.370],
    [47.640, -122.375], [47.645, -122.380],
    [47.650, -122.385], [47.658, -122.392],
    [47.665, -122.400], [47.670, -122.405],
    [47.680, -122.410], [47.690, -122.415],
    [47.700, -122.420], [47.720, -122.425],
    [47.720, -122.500], [47.500, -122.500],
  ],
  // Lake Union + Ship Canal corridor
  [
    [47.630, -122.348], [47.633, -122.345], [47.637, -122.340],
    [47.640, -122.342], [47.643, -122.340], [47.645, -122.338],
    [47.647, -122.335], [47.648, -122.330], [47.647, -122.325],
    [47.645, -122.322], [47.643, -122.320], [47.640, -122.318],
    [47.637, -122.316], [47.635, -122.312], [47.634, -122.308],
    [47.634, -122.305], [47.635, -122.300], [47.636, -122.296],
    [47.638, -122.292], [47.640, -122.290],
    [47.645, -122.290], [47.643, -122.295],
    [47.642, -122.300], [47.641, -122.305],
    [47.641, -122.310], [47.642, -122.315],
    [47.645, -122.318], [47.648, -122.320],
    [47.652, -122.322], [47.655, -122.325],
    [47.656, -122.330], [47.655, -122.335],
    [47.652, -122.340], [47.648, -122.345],
    [47.645, -122.348], [47.640, -122.350],
    [47.636, -122.352], [47.633, -122.350],
  ],
  // Mercer Island gap / south Lake Washington narrows
  [
    [47.555, -122.230], [47.560, -122.228], [47.565, -122.225],
    [47.575, -122.222], [47.580, -122.220], [47.585, -122.218],
    [47.590, -122.220], [47.590, -122.240],
    [47.585, -122.242], [47.580, -122.244],
    [47.575, -122.245], [47.570, -122.245],
    [47.565, -122.243], [47.560, -122.240],
    [47.555, -122.238],
  ],
];

function pointInPolygon(lat: number, lng: number, poly: LatLngPoly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function isPointInWater(lat: number, lng: number): boolean {
  for (const poly of WATER_BODIES) {
    if (pointInPolygon(lat, lng, poly)) return true;
  }
  return false;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function distanceDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = lat1 - lat2;
  const dlng = (lng1 - lng2) * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

function interpolateFromZones(lat: number, lng: number, field: keyof ZoneCenter, rng: () => number): number {
  let totalWeight = 0;
  let totalValue = 0;

  for (const z of ZONE_CENTERS) {
    const dist = distanceDeg(lat, lng, z.lat, z.lng);
    const r = z.radius * 3;
    if (dist > r) continue;
    const w = Math.max(0, 1 - dist / r);
    const wCube = w * w * w;
    totalWeight += wCube;
    totalValue += wCube * (z[field] as number);
  }

  if (totalWeight === 0) return 0;
  const base = totalValue / totalWeight;
  const jitter = 1 + (rng() - 0.5) * 0.25;
  return Math.max(0, Math.round(base * jitter));
}

function findNeighborhoodName(lat: number, lng: number): string {
  let minDist = Infinity;
  let name = "Unknown";
  for (const z of ZONE_CENTERS) {
    const d = distanceDeg(lat, lng, z.lat, z.lng);
    if (d < minDist) {
      minDist = d;
      name = z.name;
    }
  }
  return name;
}

export function generateHexGrid(): HexRaw[] {
  const rng = seededRandom(42);
  const hexSet = new Set<string>();

  const latMin = 47.50;
  const latMax = 47.72;
  const lngMin = -122.42;
  const lngMax = -122.08;

  const step = 0.004;
  for (let lat = latMin; lat <= latMax; lat += step) {
    for (let lng = lngMin; lng <= lngMax; lng += step) {
      const h3Index = latLngToCell(lat, lng, TUNABLE.H3_RESOLUTION);
      hexSet.add(h3Index);
    }
  }

  const hexes: HexRaw[] = [];
  for (const h3Index of hexSet) {
    const [lat, lng] = cellToLatLng(h3Index);

    if (lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) continue;
    if (isPointInWater(lat, lng)) continue;

    const citationCount = interpolateFromZones(lat, lng, "citationBase", rng);
    const poiCount = interpolateFromZones(lat, lng, "poiBase", rng);
    const residentialParcelCount = interpolateFromZones(lat, lng, "residentialBase", rng);
    const publicParkingSpots = interpolateFromZones(lat, lng, "parkingBase", rng);
    const neighborhoodName = findNeighborhoodName(lat, lng);

    hexes.push({
      h3Index,
      lat,
      lng,
      citationCount,
      poiCount,
      residentialParcelCount,
      publicParkingSpots,
      neighborhoodName,
    });
  }

  return hexes;
}

export function getHexBoundaryGeoJson(h3Index: string): [number, number][] {
  const boundary = cellToBoundary(h3Index);
  const coords: [number, number][] = boundary.map(([lat, lng]) => [lng, lat]);
  coords.push(coords[0]);
  return coords;
}

export function getHexAreaKm2(h3Index: string): number {
  return cellArea(h3Index, UNITS.km2);
}

export function getHexNeighbors(h3Index: string, rings: number): string[] {
  return gridDisk(h3Index, rings);
}
