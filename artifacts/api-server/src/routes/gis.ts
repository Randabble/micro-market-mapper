import { Router, type IRouter } from "express";
import {
  ListNeighborhoodsQueryParams,
  GetNeighborhoodsGeoJsonQueryParams,
  GetNeighborhoodParams,
} from "@workspace/api-zod";
import {
  getNeighborhoods,
  getNeighborhoodById,
  getNeighborhoodsGeoJson,
  getCitySummary,
  getMicroMarkets,
} from "../lib/gis-algorithm";

const router: IRouter = Router();

router.get("/gis/neighborhoods", async (req, res): Promise<void> => {
  const params = ListNeighborhoodsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { city, minScore } = params.data;
  const neighborhoods = getNeighborhoods(city ?? "seattle", minScore);
  res.json(neighborhoods);
});

router.get("/gis/neighborhoods/geojson", async (req, res): Promise<void> => {
  const params = GetNeighborhoodsGeoJsonQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { city, layer } = params.data;
  const geojson = getNeighborhoodsGeoJson(city ?? "seattle", layer ?? "alpha");
  res.json(geojson);
});

router.get("/gis/summary", async (req, res): Promise<void> => {
  const city =
    typeof req.query.city === "string" ? req.query.city : "seattle";
  const summary = getCitySummary(city);
  res.json(summary);
});

router.get("/gis/micro-markets", async (req, res): Promise<void> => {
  const city =
    typeof req.query.city === "string" ? req.query.city : "seattle";
  const limitRaw = req.query.limit;
  const limit =
    typeof limitRaw === "string" ? parseInt(limitRaw, 10) || 10 : 10;
  const markets = getMicroMarkets(city, limit);
  res.json(markets);
});

router.get("/gis/neighborhoods/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  const params = GetNeighborhoodParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const city =
    typeof req.query.city === "string" ? req.query.city : "seattle";
  const neighborhood = getNeighborhoodById(params.data.id, city);
  if (!neighborhood) {
    res.status(404).json({ error: "Neighborhood not found" });
    return;
  }
  res.json(neighborhood);
});

export default router;
