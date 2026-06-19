import express from "express";
import cors from "cors";
import {
  latLngToCell,
  cellToBoundary,
  cellToLatLng,
  cellToChildren,
  cellToParent,
  cellArea,
  UNITS,
  getResolution,
} from "h3-js";

// ─── Tunable constants ────────────────────────────────────────────────────────

const TUNABLE = {
  WALK_RADIUS_M: 800,
  COMPETITION_RADIUS_M: 400,
  ALPHA_THRESHOLD: 40,
  DBSCAN_EPS_M: 1200,
  DBSCAN_MIN_SAMPLES: 3,
  COMPETITION_PENALTY_WEIGHT: 0.3,
  DRIVEWAY_RATE: 0.85,
  RES_DENSE: 9,
  RES_URBAN: 8,
  RES_SUBURBAN: 7,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface HexRaw {
  h3Index: string;
  lat: number;
  lng: number;
  resolution: number;
  citationCount: number;
  poiCount: number;
  residentialParcelCount: number;
  publicParkingSpots: number;
  neighborhoodName: string;
}

type DensityTier = "dense" | "urban" | "suburban";

interface ZoneCenter {
  lat: number;
  lng: number;
  name: string;
  citationBase: number;
  poiBase: number;
  residentialBase: number;
  parkingBase: number;
  radius: number;
  density: DensityTier;
}

// ─── Zone data ────────────────────────────────────────────────────────────────

const ZONE_CENTERS: ZoneCenter[] = [
  { lat: 47.6062, lng: -122.3321, name: "Downtown Seattle", citationBase: 280, poiBase: 18, residentialBase: 5, parkingBase: 120, radius: 0.025, density: "urban" },
  { lat: 47.6000, lng: -122.3320, name: "Pioneer Square", citationBase: 250, poiBase: 15, residentialBase: 8, parkingBase: 100, radius: 0.020, density: "urban" },
  { lat: 47.6222, lng: -122.3380, name: "South Lake Union", citationBase: 220, poiBase: 16, residentialBase: 10, parkingBase: 90, radius: 0.022, density: "urban" },
  { lat: 47.6190, lng: -122.3140, name: "Capitol Hill", citationBase: 150, poiBase: 12, residentialBase: 55, parkingBase: 25, radius: 0.025, density: "dense" },
  { lat: 47.6100, lng: -122.2820, name: "Madrona / Leschi", citationBase: 80, poiBase: 6, residentialBase: 75, parkingBase: 5, radius: 0.025, density: "urban" },
  { lat: 47.5650, lng: -122.2830, name: "Columbia City", citationBase: 65, poiBase: 5, residentialBase: 70, parkingBase: 6, radius: 0.025, density: "urban" },
  { lat: 47.6610, lng: -122.3340, name: "Wallingford", citationBase: 70, poiBase: 6, residentialBase: 80, parkingBase: 4, radius: 0.025, density: "urban" },
  { lat: 47.5630, lng: -122.3760, name: "West Seattle Junction", citationBase: 60, poiBase: 5, residentialBase: 78, parkingBase: 5, radius: 0.025, density: "urban" },
  { lat: 47.6510, lng: -122.3510, name: "Fremont", citationBase: 100, poiBase: 8, residentialBase: 45, parkingBase: 15, radius: 0.022, density: "urban" },
  { lat: 47.6650, lng: -122.3820, name: "Ballard", citationBase: 90, poiBase: 8, residentialBase: 50, parkingBase: 12, radius: 0.025, density: "urban" },
  { lat: 47.6600, lng: -122.3130, name: "University District", citationBase: 130, poiBase: 11, residentialBase: 35, parkingBase: 30, radius: 0.022, density: "dense" },
  { lat: 47.6860, lng: -122.3560, name: "Greenwood", citationBase: 30, poiBase: 3, residentialBase: 85, parkingBase: 2, radius: 0.022, density: "suburban" },
  { lat: 47.6740, lng: -122.3520, name: "Phinney Ridge", citationBase: 25, poiBase: 2, residentialBase: 88, parkingBase: 2, radius: 0.022, density: "suburban" },
  { lat: 47.6460, lng: -122.4000, name: "Magnolia", citationBase: 15, poiBase: 2, residentialBase: 90, parkingBase: 1, radius: 0.025, density: "suburban" },
  { lat: 47.5450, lng: -122.3160, name: "Georgetown", citationBase: 50, poiBase: 4, residentialBase: 35, parkingBase: 15, radius: 0.020, density: "suburban" },
  { lat: 47.5980, lng: -122.3230, name: "International District", citationBase: 200, poiBase: 14, residentialBase: 12, parkingBase: 70, radius: 0.020, density: "urban" },
  { lat: 47.6130, lng: -122.2010, name: "Bellevue Downtown", citationBase: 210, poiBase: 14, residentialBase: 8, parkingBase: 95, radius: 0.025, density: "urban" },
  { lat: 47.6160, lng: -122.1880, name: "Wilburton", citationBase: 90, poiBase: 7, residentialBase: 60, parkingBase: 15, radius: 0.022, density: "urban" },
  { lat: 47.6760, lng: -122.2040, name: "Kirkland Waterfront", citationBase: 55, poiBase: 5, residentialBase: 72, parkingBase: 8, radius: 0.022, density: "suburban" },
  { lat: 47.6250, lng: -122.2250, name: "Medina / Clyde Hill", citationBase: 5, poiBase: 1, residentialBase: 92, parkingBase: 0, radius: 0.022, density: "suburban" },
  { lat: 47.6730, lng: -122.1220, name: "Redmond", citationBase: 70, poiBase: 6, residentialBase: 40, parkingBase: 25, radius: 0.025, density: "suburban" },
  { lat: 47.6100, lng: -122.1700, name: "Crossroads", citationBase: 75, poiBase: 6, residentialBase: 55, parkingBase: 18, radius: 0.022, density: "suburban" },
  { lat: 47.5850, lng: -122.1500, name: "Eastgate", citationBase: 45, poiBase: 4, residentialBase: 65, parkingBase: 10, radius: 0.022, density: "suburban" },
  { lat: 47.5900, lng: -122.2200, name: "Somerset", citationBase: 20, poiBase: 2, residentialBase: 82, parkingBase: 2, radius: 0.020, density: "suburban" },
  { lat: 47.5800, lng: -122.3600, name: "White Center", citationBase: 40, poiBase: 3, residentialBase: 60, parkingBase: 8, radius: 0.020, density: "suburban" },
  { lat: 47.6300, lng: -122.3600, name: "Queen Anne", citationBase: 110, poiBase: 9, residentialBase: 40, parkingBase: 20, radius: 0.022, density: "urban" },
  { lat: 47.5500, lng: -122.3000, name: "Beacon Hill", citationBase: 55, poiBase: 4, residentialBase: 65, parkingBase: 8, radius: 0.022, density: "suburban" },
  { lat: 47.6900, lng: -122.2950, name: "Lake City", citationBase: 35, poiBase: 3, residentialBase: 70, parkingBase: 5, radius: 0.020, density: "suburban" },
  { lat: 47.5250, lng: -122.3600, name: "Burien Edge", citationBase: 25, poiBase: 2, residentialBase: 55, parkingBase: 4, radius: 0.020, density: "suburban" },
];

type LatLngPoly = [number, number][];

const WATER_BODIES: LatLngPoly[] = [
  [[47.505,-122.262],[47.510,-122.268],[47.518,-122.272],[47.528,-122.275],[47.538,-122.278],[47.548,-122.280],[47.558,-122.282],[47.565,-122.282],[47.572,-122.280],[47.580,-122.276],[47.588,-122.272],[47.595,-122.268],[47.602,-122.266],[47.610,-122.264],[47.618,-122.262],[47.625,-122.260],[47.632,-122.258],[47.640,-122.256],[47.648,-122.254],[47.655,-122.250],[47.662,-122.246],[47.670,-122.242],[47.678,-122.236],[47.685,-122.230],[47.692,-122.224],[47.698,-122.218],[47.705,-122.212],[47.712,-122.205],[47.718,-122.198],[47.722,-122.190],[47.722,-122.225],[47.718,-122.235],[47.712,-122.242],[47.705,-122.248],[47.698,-122.254],[47.692,-122.258],[47.685,-122.262],[47.678,-122.265],[47.670,-122.268],[47.662,-122.272],[47.655,-122.275],[47.648,-122.278],[47.640,-122.280],[47.632,-122.282],[47.625,-122.284],[47.618,-122.285],[47.610,-122.286],[47.602,-122.286],[47.595,-122.284],[47.588,-122.290],[47.580,-122.294],[47.572,-122.296],[47.565,-122.298],[47.558,-122.298],[47.548,-122.296],[47.538,-122.294],[47.528,-122.292],[47.518,-122.290],[47.510,-122.285],[47.505,-122.280]],
  [[47.500,-122.500],[47.500,-122.408],[47.510,-122.405],[47.520,-122.400],[47.530,-122.395],[47.540,-122.390],[47.550,-122.388],[47.560,-122.385],[47.570,-122.382],[47.575,-122.380],[47.580,-122.378],[47.585,-122.375],[47.590,-122.372],[47.595,-122.368],[47.600,-122.365],[47.605,-122.360],[47.610,-122.355],[47.615,-122.350],[47.618,-122.348],[47.625,-122.360],[47.630,-122.365],[47.636,-122.368],[47.640,-122.372],[47.645,-122.378],[47.650,-122.382],[47.655,-122.388],[47.660,-122.392],[47.665,-122.395],[47.670,-122.398],[47.675,-122.400],[47.680,-122.402],[47.685,-122.405],[47.690,-122.408],[47.695,-122.410],[47.700,-122.412],[47.710,-122.415],[47.720,-122.418],[47.720,-122.500]],
  [[47.630,-122.350],[47.632,-122.348],[47.635,-122.345],[47.637,-122.342],[47.640,-122.344],[47.643,-122.342],[47.645,-122.340],[47.647,-122.336],[47.649,-122.332],[47.650,-122.328],[47.649,-122.324],[47.647,-122.320],[47.645,-122.317],[47.642,-122.314],[47.640,-122.312],[47.637,-122.310],[47.635,-122.307],[47.634,-122.304],[47.634,-122.300],[47.635,-122.296],[47.637,-122.292],[47.640,-122.288],[47.645,-122.288],[47.643,-122.293],[47.641,-122.298],[47.640,-122.304],[47.640,-122.310],[47.641,-122.316],[47.644,-122.320],[47.648,-122.323],[47.652,-122.325],[47.655,-122.328],[47.657,-122.332],[47.657,-122.337],[47.655,-122.342],[47.652,-122.346],[47.648,-122.348],[47.644,-122.350],[47.640,-122.352],[47.636,-122.354],[47.633,-122.352]],
  [[47.655,-122.395],[47.658,-122.392],[47.660,-122.388],[47.662,-122.384],[47.664,-122.380],[47.666,-122.376],[47.667,-122.370],[47.666,-122.365],[47.664,-122.362],[47.660,-122.358],[47.656,-122.355],[47.652,-122.352],[47.652,-122.360],[47.653,-122.368],[47.654,-122.375],[47.654,-122.382],[47.654,-122.390],[47.655,-122.395]],
  [[47.548,-122.228],[47.555,-122.225],[47.562,-122.222],[47.570,-122.218],[47.578,-122.215],[47.585,-122.214],[47.590,-122.216],[47.590,-122.240],[47.585,-122.244],[47.578,-122.246],[47.570,-122.248],[47.562,-122.248],[47.555,-122.245],[47.548,-122.240]],
  [[47.548,-122.248],[47.555,-122.252],[47.562,-122.255],[47.570,-122.258],[47.575,-122.260],[47.575,-122.272],[47.570,-122.275],[47.562,-122.275],[47.555,-122.272],[47.548,-122.268]],
];

// ─── GIS helpers ─────────────────────────────────────────────────────────────

function pointInPolygon(lat: number, lng: number, poly: LatLngPoly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function isPointInWater(lat: number, lng: number): boolean {
  return WATER_BODIES.some((poly) => pointInPolygon(lat, lng, poly));
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function distanceDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = lat1 - lat2;
  const dlng = (lng1 - lng2) * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

function coordSeed(lat: number, lng: number, salt: number): number {
  const raw = Math.floor(lat * 1e6) * 31 + Math.floor(lng * 1e6) * 37 + salt;
  return (raw & 0x7fffffff) || 1;
}

function interpolateFromZones(lat: number, lng: number, field: keyof ZoneCenter, fieldIdx: number): number {
  let totalWeight = 0, totalValue = 0;
  for (const z of ZONE_CENTERS) {
    const dist = distanceDeg(lat, lng, z.lat, z.lng);
    const r = z.radius * 3;
    if (dist > r) continue;
    const w = Math.max(0, 1 - dist / r) ** 3;
    totalWeight += w;
    totalValue += w * (z[field] as number);
  }
  if (totalWeight === 0) return 0;
  const base = totalValue / totalWeight;
  const jitter = 1 + (seededRandom(coordSeed(lat, lng, fieldIdx))() - 0.5) * 0.25;
  return Math.max(0, Math.round(base * jitter));
}

function findNeighborhoodName(lat: number, lng: number): string {
  let minDist = Infinity, name = "Unknown";
  for (const z of ZONE_CENTERS) {
    const d = distanceDeg(lat, lng, z.lat, z.lng);
    if (d < minDist) { minDist = d; name = z.name; }
  }
  return name;
}

function getTargetResolution(lat: number, lng: number): number {
  let minDist = Infinity, density: DensityTier = "suburban";
  for (const z of ZONE_CENTERS) {
    const d = distanceDeg(lat, lng, z.lat, z.lng);
    if (d < minDist) { minDist = d; density = z.density; }
  }
  return density === "dense" ? TUNABLE.RES_DENSE : density === "urban" ? TUNABLE.RES_URBAN : TUNABLE.RES_SUBURBAN;
}

function generateHexGrid(): HexRaw[] {
  const latMin = 47.50, latMax = 47.72, lngMin = -122.42, lngMax = -122.08;
  const baseStep = 0.004;
  const baseHexSet = new Set<string>();
  for (let lat = latMin; lat <= latMax; lat += baseStep)
    for (let lng = lngMin; lng <= lngMax; lng += baseStep)
      baseHexSet.add(latLngToCell(lat, lng, TUNABLE.RES_URBAN));

  const resDecisions = new Map<string, number>();
  const suburbanParents = new Map<string, Set<string>>();
  for (const h8 of baseHexSet) {
    const [lat, lng] = cellToLatLng(h8);
    if (lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) continue;
    const targetRes = getTargetResolution(lat, lng);
    resDecisions.set(h8, targetRes);
    if (targetRes === TUNABLE.RES_SUBURBAN) {
      const parent = cellToParent(h8, TUNABLE.RES_SUBURBAN);
      if (!suburbanParents.has(parent)) suburbanParents.set(parent, new Set());
      suburbanParents.get(parent)!.add(h8);
    }
  }

  const finalHexSet = new Set<string>();
  const consumedByParent = new Set<string>();
  for (const [parent, _children] of suburbanParents) {
    const parentChildren = cellToChildren(parent, TUNABLE.RES_URBAN);
    if (parentChildren.every((c) => resDecisions.get(c) === TUNABLE.RES_SUBURBAN || !resDecisions.has(c))) {
      finalHexSet.add(parent);
      parentChildren.forEach((c) => consumedByParent.add(c));
    }
  }
  for (const h8 of baseHexSet) {
    if (consumedByParent.has(h8)) continue;
    const targetRes = resDecisions.get(h8);
    if (!targetRes) continue;
    if (targetRes === TUNABLE.RES_DENSE) cellToChildren(h8, TUNABLE.RES_DENSE).forEach((c) => finalHexSet.add(c));
    else finalHexSet.add(h8);
  }

  const refArea = cellArea(latLngToCell(47.6, -122.3, TUNABLE.RES_URBAN), UNITS.km2);
  const allHexes: HexRaw[] = [];
  for (const h3Index of finalHexSet) {
    const [lat, lng] = cellToLatLng(h3Index);
    if (lat < latMin || lat > latMax || lng < lngMin || lng > lngMax) continue;
    const areaScale = cellArea(h3Index, UNITS.km2) / refArea;
    allHexes.push({
      h3Index, lat, lng, resolution: getResolution(h3Index),
      citationCount: Math.round(interpolateFromZones(lat, lng, "citationBase", 0) * areaScale),
      poiCount: Math.max(1, Math.round(interpolateFromZones(lat, lng, "poiBase", 1) * Math.sqrt(areaScale))),
      residentialParcelCount: Math.round(interpolateFromZones(lat, lng, "residentialBase", 2) * areaScale),
      publicParkingSpots: Math.round(interpolateFromZones(lat, lng, "parkingBase", 3) * areaScale),
      neighborhoodName: findNeighborhoodName(lat, lng),
    });
  }
  return allHexes.filter((h) => !isPointInWater(h.lat, h.lng));
}

function getHexBoundaryGeoJson(h3Index: string): [number, number][] {
  const boundary = cellToBoundary(h3Index);
  const coords: [number, number][] = boundary.map(([lat, lng]) => [lng, lat]);
  coords.push(coords[0]);
  return coords;
}

function getHexAreaKm2(h3Index: string): number {
  return cellArea(h3Index, UNITS.km2);
}

// ─── Scoring algorithm ────────────────────────────────────────────────────────

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  return values.map((v) => ((v - min) / range) * 100);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findNearbyHexes(hex: HexRaw, allHexes: HexRaw[], radiusM: number): HexRaw[] {
  return allHexes.filter((o) => haversineDist(hex.lat, hex.lng, o.lat, o.lng) <= radiusM);
}

function computeDemandRaw(hex: HexRaw, areaKm2: number): number {
  return areaKm2 === 0 ? 0 : (hex.citationCount / areaKm2) * Math.log(1 + hex.poiCount);
}

function computeSupplyRaw(hex: HexRaw, allHexes: HexRaw[], areaMap: Map<string, number>): number {
  return findNearbyHexes(hex, allHexes, TUNABLE.WALK_RADIUS_M).reduce((total, n) => {
    if (n.residentialParcelCount === 0) return total;
    const dist = haversineDist(hex.lat, hex.lng, n.lat, n.lng);
    return total + (n.residentialParcelCount / (areaMap.get(n.h3Index) || 1)) / (dist + 1);
  }, 0);
}

function computeCompetitionRaw(hex: HexRaw, allHexes: HexRaw[], areaMap: Map<string, number>): number {
  return findNearbyHexes(hex, allHexes, TUNABLE.COMPETITION_RADIUS_M).reduce(
    (total, n) => total + n.publicParkingSpots / (areaMap.get(n.h3Index) || 1), 0
  );
}

function dbscanCluster(points: { idx: number; lat: number; lng: number }[], epsMeters: number, minPts: number): Map<number, number> {
  const n = points.length, labels = new Array(n).fill(-1), visited = new Array(n).fill(false);
  let clusterId = 0;
  const regionQuery = (pIdx: number) => points.reduce<number[]>((acc, _, i) => {
    if (i !== pIdx && haversineDist(points[pIdx].lat, points[pIdx].lng, points[i].lat, points[i].lng) <= epsMeters)
      acc.push(i);
    return acc;
  }, []);
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const neighbors = regionQuery(i);
    if (neighbors.length < minPts - 1) { labels[i] = -1; continue; }
    labels[i] = clusterId;
    const queue = [...neighbors], inQueue = new Set(neighbors);
    while (queue.length > 0) {
      const j = queue.shift()!;
      if (!visited[j]) {
        visited[j] = true;
        const jn = regionQuery(j);
        if (jn.length >= minPts - 1) jn.forEach((k) => { if (!inQueue.has(k)) { queue.push(k); inQueue.add(k); } });
      }
      if (labels[j] === -1) labels[j] = clusterId;
    }
    clusterId++;
  }
  const result = new Map<number, number>();
  for (let i = 0; i < n; i++) if (labels[i] >= 0) result.set(points[i].idx, labels[i]);
  return result;
}

// ─── Cached computation ───────────────────────────────────────────────────────

interface ScoredHex {
  h3Index: string; lat: number; lng: number; resolution: number;
  demandScore: number; supplyScore: number; competitionPenalty: number; alphaScore: number;
  citationCount: number; poiCount: number; residentialParcelCount: number;
  publicParkingSpots: number; estimatedDriveways: number; neighborhoodName: string;
  launchZoneId: number | null;
}
interface LaunchZone {
  id: number; rank: number; centroidLat: number; centroidLng: number;
  hexCount: number; meanAlpha: number; maxAlpha: number;
  totalResidentialParcels: number; estimatedDriveways: number;
  dominantNeighborhood: string; label: string;
}

let cache: { hexes: ScoredHex[]; launchZones: LaunchZone[] } | null = null;

function computeAll() {
  if (cache) return cache;
  const rawHexes = generateHexGrid();
  const areaMap = new Map<string, number>();
  rawHexes.forEach((h) => areaMap.set(h.h3Index, getHexAreaKm2(h.h3Index)));

  const rawDemand = rawHexes.map((h) => computeDemandRaw(h, areaMap.get(h.h3Index)!));
  const rawSupply = rawHexes.map((h) => computeSupplyRaw(h, rawHexes, areaMap));
  const rawComp = rawHexes.map((h) => computeCompetitionRaw(h, rawHexes, areaMap));
  const normDemand = minMaxNormalize(rawDemand);
  const normSupply = minMaxNormalize(rawSupply);
  const maxComp = Math.max(...rawComp) + 0.0001;
  const normPenalty = rawComp.map((c) => c / maxComp);
  const alphaScores = rawHexes.map((_, i) =>
    Math.sqrt(normDemand[i] * normSupply[i]) * (1 - TUNABLE.COMPETITION_PENALTY_WEIGHT * normPenalty[i])
  );

  const aboveThreshold = rawHexes
    .map((h, idx) => ({ idx, lat: h.lat, lng: h.lng }))
    .filter((_, i) => alphaScores[i] >= TUNABLE.ALPHA_THRESHOLD);
  const clusterMap = dbscanCluster(aboveThreshold, TUNABLE.DBSCAN_EPS_M, TUNABLE.DBSCAN_MIN_SAMPLES);
  const hexZoneMap = new Map<number, number>();
  for (const [idx, zoneId] of clusterMap) hexZoneMap.set(idx, zoneId);

  const hexes: ScoredHex[] = rawHexes.map((h, i) => ({
    h3Index: h.h3Index, lat: h.lat, lng: h.lng, resolution: h.resolution,
    demandScore: Math.round(normDemand[i] * 10) / 10,
    supplyScore: Math.round(normSupply[i] * 10) / 10,
    competitionPenalty: Math.round(normPenalty[i] * 1000) / 1000,
    alphaScore: Math.round(alphaScores[i] * 10) / 10,
    citationCount: h.citationCount, poiCount: h.poiCount,
    residentialParcelCount: h.residentialParcelCount, publicParkingSpots: h.publicParkingSpots,
    estimatedDriveways: Math.round(h.residentialParcelCount * TUNABLE.DRIVEWAY_RATE),
    neighborhoodName: h.neighborhoodName, launchZoneId: hexZoneMap.get(i) ?? null,
  }));

  const ZONE_LABELS = ["Prime Launch Target","High-Conviction Zone","Strong Goldilocks Fit","Emerging Opportunity","Validated Demand Cluster","Supply Gap Zone","Walk-to-Win Candidate","Early Adopter Zone","Anchor Block Candidate","Revenue-Ready Zone","Growth Corridor","Demand Hotspot","Residential Stronghold","Transit-Adjacent Opportunity","Neighborhood Edge Play"];
  const zoneGroups = new Map<number, ScoredHex[]>();
  hexes.forEach((h) => { if (h.launchZoneId !== null) { if (!zoneGroups.has(h.launchZoneId)) zoneGroups.set(h.launchZoneId, []); zoneGroups.get(h.launchZoneId)!.push(h); } });

  const launchZones: LaunchZone[] = [...zoneGroups.entries()]
    .map(([id, members]) => {
      const meanAlpha = members.reduce((s, m) => s + m.alphaScore, 0) / members.length;
      const nameCounts = new Map<string, number>();
      members.forEach((m) => nameCounts.set(m.neighborhoodName, (nameCounts.get(m.neighborhoodName) || 0) + 1));
      const dominantNeighborhood = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return {
        id, rank: 0,
        centroidLat: Math.round(members.reduce((s, m) => s + m.lat, 0) / members.length * 10000) / 10000,
        centroidLng: Math.round(members.reduce((s, m) => s + m.lng, 0) / members.length * 10000) / 10000,
        hexCount: members.length,
        meanAlpha: Math.round(meanAlpha * 10) / 10,
        maxAlpha: Math.round(Math.max(...members.map((m) => m.alphaScore)) * 10) / 10,
        totalResidentialParcels: members.reduce((s, m) => s + m.residentialParcelCount, 0),
        estimatedDriveways: Math.round(members.reduce((s, m) => s + m.residentialParcelCount, 0) * TUNABLE.DRIVEWAY_RATE),
        dominantNeighborhood, label: "",
      };
    })
    .sort((a, b) => (b.meanAlpha * Math.log(1 + b.hexCount)) - (a.meanAlpha * Math.log(1 + a.hexCount)))
    .map((z, i) => ({ ...z, rank: i + 1, label: ZONE_LABELS[i] || `Opportunity Zone ${i + 1}` }));

  cache = { hexes, launchZones };
  return cache;
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

app.get("/api/gis/hexes", (req, res) => {
  const { hexes } = computeAll();
  const minScore = typeof req.query.minScore === "string" ? parseFloat(req.query.minScore) : undefined;
  res.json(minScore !== undefined && !isNaN(minScore) ? hexes.filter((h) => h.alphaScore >= minScore) : hexes);
});

app.get("/api/gis/hexes/geojson", (req, res) => {
  const { hexes } = computeAll();
  const layer = typeof req.query.layer === "string" ? req.query.layer : "alpha";
  res.json({
    type: "FeatureCollection",
    features: hexes.map((h) => ({
      type: "Feature",
      properties: {
        h3Index: h.h3Index, resolution: h.resolution, alphaScore: h.alphaScore,
        demandScore: h.demandScore, supplyScore: h.supplyScore,
        competitionPenalty: h.competitionPenalty, neighborhoodName: h.neighborhoodName,
        launchZoneId: h.launchZoneId, isGoldilocksZone: h.alphaScore >= TUNABLE.ALPHA_THRESHOLD,
      },
      geometry: { type: "Polygon", coordinates: [getHexBoundaryGeoJson(h.h3Index)] },
    })),
  });
});

app.get("/api/gis/hexes/:h3Index", (req, res) => {
  const { hexes } = computeAll();
  const hex = hexes.find((h) => h.h3Index === req.params.h3Index);
  hex ? res.json(hex) : res.status(404).json({ error: "Hex not found" });
});

app.get("/api/gis/summary", (_req, res) => {
  const { hexes, launchZones } = computeAll();
  const sorted = [...hexes].sort((a, b) => b.alphaScore - a.alphaScore);
  const top = sorted[0], topZone = launchZones[0];
  res.json({
    city: "Seattle / Bellevue", totalHexes: hexes.length,
    hexesAboveThreshold: hexes.filter((h) => h.alphaScore >= TUNABLE.ALPHA_THRESHOLD).length,
    launchZoneCount: launchZones.length,
    avgAlphaScore: Math.round(hexes.reduce((s, h) => s + h.alphaScore, 0) / hexes.length * 10) / 10,
    topZoneName: topZone?.dominantNeighborhood ?? "N/A", topZoneScore: topZone?.meanAlpha ?? 0,
    topHexH3: top?.h3Index ?? "", topHexAlpha: top?.alphaScore ?? 0,
    topHexLat: top?.lat ?? 0, topHexLng: top?.lng ?? 0,
    medianDemandScore: Math.round(median(hexes.map((h) => h.demandScore)) * 10) / 10,
    medianSupplyScore: Math.round(median(hexes.map((h) => h.supplyScore)) * 10) / 10,
    totalEstimatedDriveways: hexes.reduce((s, h) => s + h.estimatedDriveways, 0),
    algorithmVersion: "v3.1-multiRes-h3-dbscan",
    resolutionBreakdown: {
      res7: hexes.filter((h) => h.resolution === 7).length,
      res8: hexes.filter((h) => h.resolution === 8).length,
      res9: hexes.filter((h) => h.resolution === 9).length,
    },
  });
});

app.get("/api/gis/launch-zones", (_req, res) => res.json(computeAll().launchZones));

app.get("/api/gis/launch-zones/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid zone ID" });
  const zone = computeAll().launchZones.find((z) => z.id === id);
  zone ? res.json(zone) : res.status(404).json({ error: "Launch zone not found" });
});

app.get("/api/gis/launch-zones/:id/hexes", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid zone ID" });
  res.json(computeAll().hexes.filter((h) => h.launchZoneId === id));
});

export default app;
