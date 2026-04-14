import { SEATTLE_NEIGHBORHOODS, type NeighborhoodRaw } from "./gis-data";

export interface Neighborhood {
  id: string;
  name: string;
  city: string;
  alphaScore: number;
  demandIndex: number;
  publicScarcityIndex: number;
  residentialSupplyIndex: number;
  balanceScore: number;
  walkToWinRatio: number;
  supplyScarcityIndex: number;
  citationDensity: number;
  poiProximityScore: number;
  commuterDensity: number;
  residentialParcelDensity: number;
  commercialParkingCount: number;
  isGoldilocksZone: boolean;
  isMicroMarket: boolean;
  centroid: { lat: number; lng: number };
  zoningType: string;
  neighborhoodType: string;
}

export interface NeighborhoodFeatureProperties {
  id: string;
  name: string;
  alphaScore: number;
  demandIndex: number;
  publicScarcityIndex: number;
  residentialSupplyIndex: number;
  balanceScore: number;
  isGoldilocksZone: boolean;
  isMicroMarket: boolean;
  zoningType: string;
  neighborhoodType: string;
}

export interface NeighborhoodFeature {
  type: "Feature";
  properties: NeighborhoodFeatureProperties;
  geometry: {
    type: "Polygon";
    coordinates: [number, number][][];
  };
}

export interface NeighborhoodGeoJson {
  type: "FeatureCollection";
  features: NeighborhoodFeature[];
}

export interface CitySummary {
  city: string;
  totalNeighborhoods: number;
  goldilocksZoneCount: number;
  microMarketCount: number;
  avgAlphaScore: number;
  topNeighborhood: string;
  topScore: number;
  medianDemandIndex: number;
  medianSupplyIndex: number;
  totalEstimatedDriveways: number;
  algorithmVersion: string;
}

export interface MicroMarket {
  id: string;
  name: string;
  neighborhoodId: string;
  alphaScore: number;
  centroid: { lat: number; lng: number };
  radiusMeters: number;
  estimatedDriveways: number;
  nearbyDemandPois: number;
  walkToWinRatio: number;
  demandRank: number;
  overallRank: number;
  opportunityLabel: string;
}

function computeAlphaScore(
  demandIndex: number,
  publicScarcityIndex: number,
  residentialSupplyIndex: number
): { alphaScore: number; balanceScore: number } {
  const D = demandIndex;
  const Ppub = publicScarcityIndex;
  const Sres = residentialSupplyIndex;

  const balanceScore = Math.sqrt(D * Sres);
  const alphaScore = balanceScore * (0.65 + 0.35 * (Ppub / 100));

  return {
    balanceScore: Math.round(balanceScore * 10) / 10,
    alphaScore: Math.round(alphaScore * 10) / 10,
  };
}

function computeWalkToWin(raw: NeighborhoodRaw): number {
  const densityFactor = raw.residentialParcelDensity / 600;
  const demandFactor = raw.demandIndex / 100;
  const scarcityFactor = raw.publicScarcityIndex / 100;
  return Math.round(densityFactor * demandFactor * scarcityFactor * 1800);
}

function computeSupplyScarcityIndex(raw: NeighborhoodRaw): number {
  const spotsPerCommuter =
    (raw.commercialParkingCount * 80) / Math.max(raw.commuterDensity, 1);
  const spotsPerFifty = spotsPerCommuter * 50;
  const rawScore = Math.max(0, 1 - spotsPerFifty) * 100;
  return Math.round(rawScore * 10) / 10;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeNeighborhoods(city = "seattle"): Neighborhood[] {
  const source = SEATTLE_NEIGHBORHOODS.filter((n) => n.city === city);

  const computed = source.map((raw) => {
    const { alphaScore, balanceScore } = computeAlphaScore(
      raw.demandIndex,
      raw.publicScarcityIndex,
      raw.residentialSupplyIndex
    );
    const walkToWinRatio = computeWalkToWin(raw);
    const supplyScarcityIndex = computeSupplyScarcityIndex(raw);

    return {
      id: raw.id,
      name: raw.name,
      city: raw.city,
      alphaScore,
      demandIndex: raw.demandIndex,
      publicScarcityIndex: raw.publicScarcityIndex,
      residentialSupplyIndex: raw.residentialSupplyIndex,
      balanceScore,
      walkToWinRatio,
      supplyScarcityIndex,
      citationDensity: raw.citationDensity,
      poiProximityScore: raw.poiProximityScore,
      commuterDensity: raw.commuterDensity,
      residentialParcelDensity: raw.residentialParcelDensity,
      commercialParkingCount: raw.commercialParkingCount,
      isGoldilocksZone: false,
      isMicroMarket: false,
      centroid: { lat: raw.centroid[0], lng: raw.centroid[1] },
      zoningType: raw.zoningType,
      neighborhoodType: raw.neighborhoodType,
    } as Neighborhood;
  });

  const sorted = [...computed].sort((a, b) => b.alphaScore - a.alphaScore);
  const goldilocksThreshold = 60;
  const top5Ids = new Set(sorted.slice(0, 5).map((n) => n.id));

  return computed.map((n) => ({
    ...n,
    isGoldilocksZone: n.alphaScore >= goldilocksThreshold,
    isMicroMarket: top5Ids.has(n.id),
  }));
}

export function getNeighborhoods(
  city = "seattle",
  minScore?: number
): Neighborhood[] {
  const all = computeNeighborhoods(city);
  if (minScore !== undefined) {
    return all.filter((n) => n.alphaScore >= minScore);
  }
  return all;
}

export function getNeighborhoodById(
  id: string,
  city = "seattle"
): Neighborhood | null {
  return computeNeighborhoods(city).find((n) => n.id === id) ?? null;
}

export function getNeighborhoodsGeoJson(
  city = "seattle",
  layer = "alpha"
): NeighborhoodGeoJson {
  const neighborhoods = computeNeighborhoods(city);
  const source = SEATTLE_NEIGHBORHOODS.filter((n) => n.city === city);

  const features: NeighborhoodFeature[] = neighborhoods.map((n) => {
    const raw = source.find((s) => s.id === n.id)!;
    return {
      type: "Feature",
      properties: {
        id: n.id,
        name: n.name,
        alphaScore: n.alphaScore,
        demandIndex: n.demandIndex,
        publicScarcityIndex: n.publicScarcityIndex,
        residentialSupplyIndex: n.residentialSupplyIndex,
        balanceScore: n.balanceScore,
        isGoldilocksZone: n.isGoldilocksZone,
        isMicroMarket: n.isMicroMarket,
        zoningType: n.zoningType,
        neighborhoodType: n.neighborhoodType,
      },
      geometry: {
        type: "Polygon",
        coordinates: [raw.polygon],
      },
    };
  });

  return { type: "FeatureCollection", features };
}

export function getCitySummary(city = "seattle"): CitySummary {
  const neighborhoods = computeNeighborhoods(city);

  const sorted = [...neighborhoods].sort((a, b) => b.alphaScore - a.alphaScore);
  const top = sorted[0];

  const avgAlphaScore =
    Math.round(
      (neighborhoods.reduce((sum, n) => sum + n.alphaScore, 0) /
        neighborhoods.length) *
        10
    ) / 10;

  const totalEstimatedDriveways = neighborhoods.reduce(
    (sum, n) => sum + n.walkToWinRatio,
    0
  );

  return {
    city,
    totalNeighborhoods: neighborhoods.length,
    goldilocksZoneCount: neighborhoods.filter((n) => n.isGoldilocksZone).length,
    microMarketCount: neighborhoods.filter((n) => n.isMicroMarket).length,
    avgAlphaScore,
    topNeighborhood: top?.name ?? "N/A",
    topScore: top?.alphaScore ?? 0,
    medianDemandIndex:
      Math.round(median(neighborhoods.map((n) => n.demandIndex)) * 10) / 10,
    medianSupplyIndex:
      Math.round(
        median(neighborhoods.map((n) => n.residentialSupplyIndex)) * 10
      ) / 10,
    totalEstimatedDriveways,
    algorithmVersion: "v2.0-geometric-mean",
  };
}

export function getMicroMarkets(city = "seattle", limit = 10): MicroMarket[] {
  const neighborhoods = computeNeighborhoods(city);
  const source = SEATTLE_NEIGHBORHOODS.filter((n) => n.city === city);

  const byDemand = [...neighborhoods].sort(
    (a, b) => b.demandIndex - a.demandIndex
  );
  const demandRankMap = new Map(byDemand.map((n, i) => [n.id, i + 1]));

  const sorted = [...neighborhoods].sort((a, b) => b.alphaScore - a.alphaScore);

  const opportunityLabels = [
    "Prime Launch Target",
    "High-Conviction Zone",
    "Strong Goldilocks Fit",
    "Emerging Micro-Market",
    "Validated Demand Cluster",
    "Supply Gap Opportunity",
    "Walk-to-Win Candidate",
    "Early Adopter Zone",
    "Anchor Block Candidate",
    "Revenue-Ready Zone",
  ];

  return sorted.slice(0, limit).map((n, i) => {
    const raw = source.find((s) => s.id === n.id)!;
    return {
      id: `mm-${n.id}`,
      name: `${n.name} Core`,
      neighborhoodId: n.id,
      alphaScore: n.alphaScore,
      centroid: { lat: raw.centroid[0], lng: raw.centroid[1] },
      radiusMeters: 400,
      estimatedDriveways: n.walkToWinRatio,
      nearbyDemandPois: Math.round(n.poiProximityScore / 10),
      walkToWinRatio: n.walkToWinRatio,
      demandRank: demandRankMap.get(n.id) ?? i + 1,
      overallRank: i + 1,
      opportunityLabel: opportunityLabels[i] ?? "Opportunity Zone",
    };
  });
}
