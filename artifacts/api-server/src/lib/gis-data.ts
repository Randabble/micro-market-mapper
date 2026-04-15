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
  // Lake Washington — west shore (Seattle side) traced north to south,
  // then east shore (Bellevue/Kirkland side) south to north
  [
    [47.505, -122.262], [47.510, -122.268], [47.518, -122.272],
    [47.528, -122.275], [47.538, -122.278], [47.548, -122.280],
    [47.558, -122.282], [47.565, -122.282], [47.572, -122.280],
    [47.580, -122.276], [47.588, -122.272], [47.595, -122.268],
    [47.602, -122.266], [47.610, -122.264], [47.618, -122.262],
    [47.625, -122.260], [47.632, -122.258], [47.640, -122.256],
    [47.648, -122.254], [47.655, -122.250], [47.662, -122.246],
    [47.670, -122.242], [47.678, -122.236], [47.685, -122.230],
    [47.692, -122.224], [47.698, -122.218], [47.705, -122.212],
    [47.712, -122.205], [47.718, -122.198], [47.722, -122.190],
    [47.722, -122.225], [47.718, -122.235], [47.712, -122.242],
    [47.705, -122.248], [47.698, -122.254], [47.692, -122.258],
    [47.685, -122.262], [47.678, -122.265], [47.670, -122.268],
    [47.662, -122.272], [47.655, -122.275], [47.648, -122.278],
    [47.640, -122.280], [47.632, -122.282], [47.625, -122.284],
    [47.618, -122.285], [47.610, -122.286], [47.602, -122.286],
    [47.595, -122.284], [47.588, -122.290], [47.580, -122.294],
    [47.572, -122.296], [47.565, -122.298], [47.558, -122.298],
    [47.548, -122.296], [47.538, -122.294], [47.528, -122.292],
    [47.518, -122.290], [47.510, -122.285], [47.505, -122.280],
  ],
  // Puget Sound / Elliott Bay — covers the entire waterfront west of Seattle
  // from Burien north through Magnolia, Shilshole Bay, up to Shoreline
  [
    [47.500, -122.500], [47.500, -122.408],
    [47.510, -122.405], [47.520, -122.400],
    [47.530, -122.395], [47.540, -122.390],
    [47.550, -122.388], [47.560, -122.385],
    [47.570, -122.382], [47.575, -122.380],
    [47.580, -122.378], [47.585, -122.375],
    [47.590, -122.372], [47.595, -122.368],
    [47.600, -122.365], [47.605, -122.360],
    [47.610, -122.355], [47.615, -122.350],
    [47.618, -122.348],
    [47.625, -122.360], [47.630, -122.365],
    [47.636, -122.368],
    [47.640, -122.372], [47.645, -122.378],
    [47.650, -122.382], [47.655, -122.388],
    [47.660, -122.392], [47.665, -122.395],
    [47.670, -122.398], [47.675, -122.400],
    [47.680, -122.402], [47.685, -122.405],
    [47.690, -122.408], [47.695, -122.410],
    [47.700, -122.412], [47.710, -122.415],
    [47.720, -122.418],
    [47.720, -122.500],
  ],
  // Lake Union + Ship Canal + Portage Bay
  [
    [47.630, -122.350], [47.632, -122.348], [47.635, -122.345],
    [47.637, -122.342], [47.640, -122.344], [47.643, -122.342],
    [47.645, -122.340], [47.647, -122.336], [47.649, -122.332],
    [47.650, -122.328], [47.649, -122.324], [47.647, -122.320],
    [47.645, -122.317], [47.642, -122.314], [47.640, -122.312],
    [47.637, -122.310], [47.635, -122.307], [47.634, -122.304],
    [47.634, -122.300], [47.635, -122.296], [47.637, -122.292],
    [47.640, -122.288],
    [47.645, -122.288], [47.643, -122.293],
    [47.641, -122.298], [47.640, -122.304],
    [47.640, -122.310], [47.641, -122.316],
    [47.644, -122.320], [47.648, -122.323],
    [47.652, -122.325], [47.655, -122.328],
    [47.657, -122.332], [47.657, -122.337],
    [47.655, -122.342], [47.652, -122.346],
    [47.648, -122.348], [47.644, -122.350],
    [47.640, -122.352], [47.636, -122.354],
    [47.633, -122.352],
  ],
  // Salmon Bay / Shilshole Bay — between Ballard and Magnolia
  [
    [47.655, -122.395], [47.658, -122.392], [47.660, -122.388],
    [47.662, -122.384], [47.664, -122.380], [47.666, -122.376],
    [47.667, -122.370], [47.666, -122.365], [47.664, -122.362],
    [47.660, -122.358], [47.656, -122.355], [47.652, -122.352],
    [47.652, -122.360], [47.653, -122.368],
    [47.654, -122.375], [47.654, -122.382],
    [47.654, -122.390], [47.655, -122.395],
  ],
  // Mercer Island / south Lake Washington east channel
  [
    [47.548, -122.228], [47.555, -122.225], [47.562, -122.222],
    [47.570, -122.218], [47.578, -122.215], [47.585, -122.214],
    [47.590, -122.216],
    [47.590, -122.240], [47.585, -122.244],
    [47.578, -122.246], [47.570, -122.248],
    [47.562, -122.248], [47.555, -122.245],
    [47.548, -122.240],
  ],
  // Mercer Island / south Lake Washington west channel
  [
    [47.548, -122.248], [47.555, -122.252], [47.562, -122.255],
    [47.570, -122.258], [47.575, -122.260],
    [47.575, -122.272], [47.570, -122.275],
    [47.562, -122.275], [47.555, -122.272],
    [47.548, -122.268],
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

  const allHexes: HexRaw[] = [];
  for (const h3Index of hexSet) {
    const [lat, lng] = cellToLatLng(h3Index);

    if (lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) continue;

    const citationCount = interpolateFromZones(lat, lng, "citationBase", rng);
    const poiCount = interpolateFromZones(lat, lng, "poiBase", rng);
    const residentialParcelCount = interpolateFromZones(lat, lng, "residentialBase", rng);
    const publicParkingSpots = interpolateFromZones(lat, lng, "parkingBase", rng);
    const neighborhoodName = findNeighborhoodName(lat, lng);

    allHexes.push({
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

  return allHexes.filter((h) => !isPointInWater(h.lat, h.lng));
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
