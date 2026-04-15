import { Router, type IRouter } from "express";
import {
  getScoredHexes,
  getHexById,
  getHexGeoJson,
  getCitySummary,
  getLaunchZones,
  getLaunchZoneById,
  getHexesByLaunchZone,
} from "../lib/gis-algorithm";

const router: IRouter = Router();

router.get("/gis/hexes", async (_req, res): Promise<void> => {
  const minScoreRaw = _req.query.minScore;
  const minScore =
    typeof minScoreRaw === "string" ? parseFloat(minScoreRaw) : undefined;
  const hexes = getScoredHexes(
    minScore !== undefined && !isNaN(minScore) ? minScore : undefined
  );
  res.json(hexes);
});

router.get("/gis/hexes/geojson", async (req, res): Promise<void> => {
  const layer =
    typeof req.query.layer === "string" ? req.query.layer : "alpha";
  const geojson = getHexGeoJson(layer);
  res.json(geojson);
});

router.get("/gis/hexes/:h3Index", async (req, res): Promise<void> => {
  const h3Index = req.params.h3Index;
  const hex = getHexById(h3Index);
  if (!hex) {
    res.status(404).json({ error: "Hex not found" });
    return;
  }
  res.json(hex);
});

router.get("/gis/summary", async (_req, res): Promise<void> => {
  const summary = getCitySummary();
  res.json(summary);
});

router.get("/gis/launch-zones", async (_req, res): Promise<void> => {
  const zones = getLaunchZones();
  res.json(zones);
});

router.get("/gis/launch-zones/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid zone ID" });
    return;
  }
  const zone = getLaunchZoneById(id);
  if (!zone) {
    res.status(404).json({ error: "Launch zone not found" });
    return;
  }
  res.json(zone);
});

router.get("/gis/launch-zones/:id/hexes", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid zone ID" });
    return;
  }
  const hexes = getHexesByLaunchZone(id);
  res.json(hexes);
});

export default router;
