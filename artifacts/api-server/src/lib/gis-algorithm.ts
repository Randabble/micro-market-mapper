import {
  generateHexGrid,
  getHexBoundaryGeoJson,
  getHexAreaKm2,
  TUNABLE,
  type HexRaw,
} from "./gis-data";

export interface ScoredHex {
  h3Index: string;
  lat: number;
  lng: number;
  resolution: number;
  demandScore: number;
  supplyScore: number;
  competitionPenalty: number;
  alphaScore: number;
  citationCount: number;
  poiCount: number;
  residentialParcelCount: number;
  publicParkingSpots: number;
  estimatedDriveways: number;
  neighborhoodName: string;
  launchZoneId: number | null;
}

export interface LaunchZone {
  id: number;
  rank: number;
  centroidLat: number;
  centroidLng: number;
  hexCount: number;
  meanAlpha: number;
  maxAlpha: number;
  totalResidentialParcels: number;
  estimatedDriveways: number;
  dominantNeighborhood: string;
  label: string;
}

export interface HexFeatureProperties {
  h3Index: string;
  resolution: number;
  alphaScore: number;
  demandScore: number;
  supplyScore: number;
  competitionPenalty: number;
  neighborhoodName: string;
  launchZoneId: number | null;
  isGoldilocksZone: boolean;
}

export interface HexFeature {
  type: "Feature";
  properties: HexFeatureProperties;
  geometry: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
}

export interface HexGeoJson {
  type: "FeatureCollection";
  features: HexFeature[];
}

export interface CitySummary {
  city: string;
  totalHexes: number;
  hexesAboveThreshold: number;
  launchZoneCount: number;
  avgAlphaScore: number;
  topZoneName: string;
  topZoneScore: number;
  topHexH3: string;
  topHexAlpha: number;
  topHexLat: number;
  topHexLng: number;
  medianDemandScore: number;
  medianSupplyScore: number;
  totalEstimatedDriveways: number;
  algorithmVersion: string;
  resolutionBreakdown: { res7: number; res8: number; res9: number };
}

let cachedResult: {
  hexes: ScoredHex[];
  launchZones: LaunchZone[];
} | null = null;

function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => ((v - min) / range) * 100);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeDemandRaw(hex: HexRaw, areaKm2: number): number {
  if (areaKm2 === 0) return 0;
  return (hex.citationCount / areaKm2) * Math.log(1 + hex.poiCount);
}

function findNearbyHexes(hex: HexRaw, allHexes: HexRaw[], radiusM: number): HexRaw[] {
  const result: HexRaw[] = [];
  for (const other of allHexes) {
    const dist = haversineDist(hex.lat, hex.lng, other.lat, other.lng);
    if (dist <= radiusM) result.push(other);
  }
  return result;
}

function computeSupplyRaw(hex: HexRaw, allHexes: HexRaw[], areaMap: Map<string, number>): number {
  const nearby = findNearbyHexes(hex, allHexes, TUNABLE.WALK_RADIUS_M);
  let total = 0;
  for (const neighbor of nearby) {
    if (neighbor.residentialParcelCount === 0) continue;
    const nArea = areaMap.get(neighbor.h3Index) || 1;
    const density = neighbor.residentialParcelCount / nArea;
    const dist = haversineDist(hex.lat, hex.lng, neighbor.lat, neighbor.lng);
    total += density / (dist + 1);
  }
  return total;
}

function computeCompetitionRaw(hex: HexRaw, allHexes: HexRaw[], areaMap: Map<string, number>): number {
  const nearby = findNearbyHexes(hex, allHexes, TUNABLE.COMPETITION_RADIUS_M);
  let totalDensity = 0;
  for (const neighbor of nearby) {
    const nArea = areaMap.get(neighbor.h3Index) || 1;
    totalDensity += neighbor.publicParkingSpots / nArea;
  }
  return totalDensity;
}

function dbscanCluster(
  points: { idx: number; lat: number; lng: number }[],
  epsMeters: number,
  minPts: number
): Map<number, number> {
  const n = points.length;
  const labels = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  let clusterId = 0;

  function regionQuery(pIdx: number): number[] {
    const neighbors: number[] = [];
    const p = points[pIdx];
    for (let i = 0; i < n; i++) {
      if (i === pIdx) continue;
      const d = haversineDist(p.lat, p.lng, points[i].lat, points[i].lng);
      if (d <= epsMeters) neighbors.push(i);
    }
    return neighbors;
  }

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;

    const neighbors = regionQuery(i);
    if (neighbors.length < minPts - 1) {
      labels[i] = -1;
      continue;
    }

    labels[i] = clusterId;
    const queue = [...neighbors];
    const inQueue = new Set(neighbors);

    while (queue.length > 0) {
      const j = queue.shift()!;
      if (!visited[j]) {
        visited[j] = true;
        const jNeighbors = regionQuery(j);
        if (jNeighbors.length >= minPts - 1) {
          for (const k of jNeighbors) {
            if (!inQueue.has(k)) {
              queue.push(k);
              inQueue.add(k);
            }
          }
        }
      }
      if (labels[j] === -1) {
        labels[j] = clusterId;
      }
    }

    clusterId++;
  }

  const result = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    if (labels[i] >= 0) {
      result.set(points[i].idx, labels[i]);
    }
  }
  return result;
}

function computeAll(): { hexes: ScoredHex[]; launchZones: LaunchZone[] } {
  if (cachedResult) return cachedResult;

  const rawHexes = generateHexGrid();

  const areaMap = new Map<string, number>();
  const hexAreas: number[] = [];
  for (const h of rawHexes) {
    const a = getHexAreaKm2(h.h3Index);
    areaMap.set(h.h3Index, a);
    hexAreas.push(a);
  }

  const rawDemand = rawHexes.map((h, i) => computeDemandRaw(h, hexAreas[i]));
  const rawSupply = rawHexes.map((h) => computeSupplyRaw(h, rawHexes, areaMap));
  const rawCompetition = rawHexes.map((h) => computeCompetitionRaw(h, rawHexes, areaMap));

  const normDemand = minMaxNormalize(rawDemand);
  const normSupply = minMaxNormalize(rawSupply);

  const maxComp = Math.max(...rawCompetition) + 0.0001;
  const normPenalty = rawCompetition.map((c) => c / maxComp);

  const alphaScores = rawHexes.map((_, i) => {
    const D = normDemand[i];
    const S = normSupply[i];
    const P = normPenalty[i];
    return Math.sqrt(D * S) * (1 - TUNABLE.COMPETITION_PENALTY_WEIGHT * P);
  });

  const aboveThreshold: { idx: number; lat: number; lng: number }[] = [];
  for (let i = 0; i < rawHexes.length; i++) {
    if (alphaScores[i] >= TUNABLE.ALPHA_THRESHOLD) {
      aboveThreshold.push({ idx: i, lat: rawHexes[i].lat, lng: rawHexes[i].lng });
    }
  }

  const clusterMap = dbscanCluster(
    aboveThreshold,
    TUNABLE.DBSCAN_EPS_M,
    TUNABLE.DBSCAN_MIN_SAMPLES
  );

  const hexZoneMap = new Map<number, number>();
  for (const [idx, zoneId] of clusterMap) {
    hexZoneMap.set(idx, zoneId);
  }

  const scoredHexes: ScoredHex[] = rawHexes.map((h, i) => ({
    h3Index: h.h3Index,
    lat: h.lat,
    lng: h.lng,
    resolution: h.resolution,
    demandScore: Math.round(normDemand[i] * 10) / 10,
    supplyScore: Math.round(normSupply[i] * 10) / 10,
    competitionPenalty: Math.round(normPenalty[i] * 1000) / 1000,
    alphaScore: Math.round(alphaScores[i] * 10) / 10,
    citationCount: h.citationCount,
    poiCount: h.poiCount,
    residentialParcelCount: h.residentialParcelCount,
    publicParkingSpots: h.publicParkingSpots,
    estimatedDriveways: Math.round(h.residentialParcelCount * TUNABLE.DRIVEWAY_RATE),
    neighborhoodName: h.neighborhoodName,
    launchZoneId: hexZoneMap.get(i) ?? null,
  }));

  const zoneGroups = new Map<number, ScoredHex[]>();
  for (const hex of scoredHexes) {
    if (hex.launchZoneId !== null) {
      if (!zoneGroups.has(hex.launchZoneId)) zoneGroups.set(hex.launchZoneId, []);
      zoneGroups.get(hex.launchZoneId)!.push(hex);
    }
  }

  const ZONE_LABELS = [
    "Prime Launch Target",
    "High-Conviction Zone",
    "Strong Goldilocks Fit",
    "Emerging Opportunity",
    "Validated Demand Cluster",
    "Supply Gap Zone",
    "Walk-to-Win Candidate",
    "Early Adopter Zone",
    "Anchor Block Candidate",
    "Revenue-Ready Zone",
    "Growth Corridor",
    "Demand Hotspot",
    "Residential Stronghold",
    "Transit-Adjacent Opportunity",
    "Neighborhood Edge Play",
  ];

  const unsortedZones: LaunchZone[] = [];
  for (const [zoneId, members] of zoneGroups) {
    const meanAlpha =
      members.reduce((sum, m) => sum + m.alphaScore, 0) / members.length;
    const maxAlpha = Math.max(...members.map((m) => m.alphaScore));
    const centroidLat =
      members.reduce((sum, m) => sum + m.lat, 0) / members.length;
    const centroidLng =
      members.reduce((sum, m) => sum + m.lng, 0) / members.length;
    const totalParcels = members.reduce(
      (sum, m) => sum + m.residentialParcelCount,
      0
    );

    const nameCounts = new Map<string, number>();
    for (const m of members) {
      nameCounts.set(m.neighborhoodName, (nameCounts.get(m.neighborhoodName) || 0) + 1);
    }
    let dominantNeighborhood = "";
    let maxCount = 0;
    for (const [name, count] of nameCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantNeighborhood = name;
      }
    }

    unsortedZones.push({
      id: zoneId,
      rank: 0,
      centroidLat: Math.round(centroidLat * 10000) / 10000,
      centroidLng: Math.round(centroidLng * 10000) / 10000,
      hexCount: members.length,
      meanAlpha: Math.round(meanAlpha * 10) / 10,
      maxAlpha: Math.round(maxAlpha * 10) / 10,
      totalResidentialParcels: totalParcels,
      estimatedDriveways: Math.round(totalParcels * TUNABLE.DRIVEWAY_RATE),
      dominantNeighborhood,
      label: "",
    });
  }

  unsortedZones.sort((a, b) => {
    const scoreA = a.meanAlpha * Math.log(1 + a.hexCount);
    const scoreB = b.meanAlpha * Math.log(1 + b.hexCount);
    return scoreB - scoreA;
  });

  const launchZones = unsortedZones.map((z, i) => ({
    ...z,
    rank: i + 1,
    label: ZONE_LABELS[i] || `Opportunity Zone ${i + 1}`,
  }));

  cachedResult = { hexes: scoredHexes, launchZones };
  return cachedResult;
}

export function getScoredHexes(minScore?: number): ScoredHex[] {
  const { hexes } = computeAll();
  if (minScore !== undefined) {
    return hexes.filter((h) => h.alphaScore >= minScore);
  }
  return hexes;
}

export function getHexById(h3Index: string): ScoredHex | null {
  const { hexes } = computeAll();
  return hexes.find((h) => h.h3Index === h3Index) ?? null;
}

export function getHexGeoJson(layer = "alpha"): HexGeoJson {
  const { hexes } = computeAll();

  const features: HexFeature[] = hexes.map((h) => ({
    type: "Feature",
    properties: {
      h3Index: h.h3Index,
      resolution: h.resolution,
      alphaScore: h.alphaScore,
      demandScore: h.demandScore,
      supplyScore: h.supplyScore,
      competitionPenalty: h.competitionPenalty,
      neighborhoodName: h.neighborhoodName,
      launchZoneId: h.launchZoneId,
      isGoldilocksZone: h.alphaScore >= TUNABLE.ALPHA_THRESHOLD,
    },
    geometry: {
      type: "Polygon",
      coordinates: [getHexBoundaryGeoJson(h.h3Index)],
    },
  }));

  return { type: "FeatureCollection", features };
}

export function getLaunchZones(): LaunchZone[] {
  const { launchZones } = computeAll();
  return launchZones;
}

export function getLaunchZoneById(id: number): LaunchZone | null {
  const { launchZones } = computeAll();
  return launchZones.find((z) => z.id === id) ?? null;
}

export function getHexesByLaunchZone(zoneId: number): ScoredHex[] {
  const { hexes } = computeAll();
  return hexes.filter((h) => h.launchZoneId === zoneId);
}

export function getCitySummary(): CitySummary {
  const { hexes, launchZones } = computeAll();

  const sorted = [...hexes].sort((a, b) => b.alphaScore - a.alphaScore);
  const top = sorted[0];
  const aboveThreshold = hexes.filter(
    (h) => h.alphaScore >= TUNABLE.ALPHA_THRESHOLD
  );
  const avgAlpha =
    Math.round(
      (hexes.reduce((s, h) => s + h.alphaScore, 0) / hexes.length) * 10
    ) / 10;

  const topZone = launchZones[0];

  const res7 = hexes.filter((h) => h.resolution === 7).length;
  const res8 = hexes.filter((h) => h.resolution === 8).length;
  const res9 = hexes.filter((h) => h.resolution === 9).length;

  return {
    city: "Seattle / Bellevue",
    totalHexes: hexes.length,
    hexesAboveThreshold: aboveThreshold.length,
    launchZoneCount: launchZones.length,
    avgAlphaScore: avgAlpha,
    topZoneName: topZone?.dominantNeighborhood ?? "N/A",
    topZoneScore: topZone?.meanAlpha ?? 0,
    topHexH3: top?.h3Index ?? "",
    topHexAlpha: top?.alphaScore ?? 0,
    topHexLat: top?.lat ?? 0,
    topHexLng: top?.lng ?? 0,
    medianDemandScore:
      Math.round(median(hexes.map((h) => h.demandScore)) * 10) / 10,
    medianSupplyScore:
      Math.round(median(hexes.map((h) => h.supplyScore)) * 10) / 10,
    totalEstimatedDriveways: hexes.reduce(
      (s, h) => s + h.estimatedDriveways,
      0
    ),
    algorithmVersion: "v3.1-multiRes-h3-dbscan",
    resolutionBreakdown: { res7, res8, res9 },
  };
}
