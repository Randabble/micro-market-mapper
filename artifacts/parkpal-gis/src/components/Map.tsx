import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetHexGeoJson, useListLaunchZones } from "@workspace/api-client-react";
import type { HexFeatureProperties } from "@workspace/api-client-react";

interface MapProps {
  layerMode: "alpha" | "demand" | "supply" | "competition";
  showGoldilocks: boolean;
  minScore: number;
  selectedLaunchZoneId: number | null;
  onSelectHex: (h3Index: string) => void;
  onSelectLaunchZone: (id: number) => void;
}

const getAlphaColor = (score: number) => {
  return score > 50
    ? "#10b981"
    : score > 40
      ? "#0ea5e9"
      : score > 30
        ? "#0284c7"
        : score > 20
          ? "#0f766e"
          : score > 10
            ? "#1e3a5f"
            : "#0f172a";
};

const getHeatColor = (score: number) => {
  return score > 80
    ? "#ef4444"
    : score > 60
      ? "#f97316"
      : score > 40
        ? "#eab308"
        : score > 20
          ? "#3b82f6"
          : "#1e3a8a";
};

const getCompetitionColor = (penalty: number) => {
  const pct = penalty * 100;
  return pct > 60
    ? "#ef4444"
    : pct > 40
      ? "#f97316"
      : pct > 20
        ? "#eab308"
        : pct > 5
          ? "#22c55e"
          : "#10b981";
};

function getScore(props: HexFeatureProperties, mode: string): number {
  switch (mode) {
    case "demand":
      return props.demandScore;
    case "supply":
      return props.supplyScore;
    case "competition":
      return props.competitionPenalty * 100;
    default:
      return props.alphaScore;
  }
}

function getColor(props: HexFeatureProperties, mode: string): string {
  switch (mode) {
    case "demand":
      return getHeatColor(props.demandScore);
    case "supply":
      return getHeatColor(props.supplyScore);
    case "competition":
      return getCompetitionColor(props.competitionPenalty);
    default:
      return getAlphaColor(props.alphaScore);
  }
}

export function Map({
  layerMode,
  showGoldilocks,
  minScore,
  selectedLaunchZoneId,
  onSelectHex,
  onSelectLaunchZone,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const zoneLayerRef = useRef<L.LayerGroup | null>(null);

  const { data: geojsonData } = useGetHexGeoJson({ layer: layerMode });
  const { data: launchZones } = useListLaunchZones();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([47.62, -122.28], 11);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !geojsonData) return;

    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }

    const map = mapInstanceRef.current;

    const geoJsonLayer = L.geoJSON(geojsonData as any, {
      style: (feature: any) => {
        const props = feature.properties as HexFeatureProperties;
        const score = getScore(props, layerMode);
        const isHidden = props.alphaScore < minScore;
        const isGoldilocks = showGoldilocks && props.isGoldilocksZone;
        const isInSelectedZone =
          selectedLaunchZoneId !== null &&
          props.launchZoneId === selectedLaunchZoneId;

        return {
          fillColor: getColor(props, layerMode),
          weight: isInSelectedZone ? 2.5 : isGoldilocks ? 1.5 : 0.5,
          opacity: isHidden ? 0.05 : 0.8,
          color: isInSelectedZone
            ? "#f59e0b"
            : isGoldilocks
              ? "#f59e0b"
              : "#334155",
          fillOpacity: isHidden ? 0.03 : 0.55,
        };
      },
      onEachFeature: (feature: any, layer) => {
        const props = feature.properties as HexFeatureProperties;

        const tooltipContent = `
          <div style="font-family: monospace; font-size: 11px; line-height: 1.5;">
            <strong>${props.neighborhoodName}</strong><br/>
            Alpha: <span style="color:#10b981;font-weight:bold">${props.alphaScore}</span><br/>
            Demand: ${props.demandScore} | Supply: ${props.supplyScore}<br/>
            Competition: ${(props.competitionPenalty * 100).toFixed(0)}%
            ${props.isGoldilocksZone ? '<br/><span style="color:#f59e0b">&#9733; Goldilocks Zone</span>' : ""}
          </div>
        `;

        layer.bindTooltip(tooltipContent, {
          sticky: true,
          className: "hex-tooltip",
        });

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 2, color: "#fff", fillOpacity: 0.8 });
            l.bringToFront();
          },
          mouseout: (e) => {
            geoJsonLayerRef.current?.resetStyle(e.target);
          },
          click: () => {
            onSelectHex(props.h3Index);
          },
        });
      },
    });

    geoJsonLayer.addTo(map);
    geoJsonLayerRef.current = geoJsonLayer;
  }, [
    geojsonData,
    layerMode,
    minScore,
    showGoldilocks,
    selectedLaunchZoneId,
    onSelectHex,
  ]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (zoneLayerRef.current) {
      mapInstanceRef.current.removeLayer(zoneLayerRef.current);
      zoneLayerRef.current = null;
    }

    if (!showGoldilocks || !launchZones) return;

    const map = mapInstanceRef.current;
    const layerGroup = L.layerGroup();

    launchZones.forEach((zone) => {
      const isSelected = selectedLaunchZoneId === zone.id;

      const marker = L.circleMarker([zone.centroidLat, zone.centroidLng], {
        radius: Math.max(8, Math.min(18, zone.hexCount / 6)),
        fillColor: isSelected ? "#f59e0b" : "#10b981",
        color: "#fff",
        weight: isSelected ? 3 : 2,
        fillOpacity: isSelected ? 0.9 : 0.7,
      });

      marker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px;">
          <strong>#${zone.rank} ${zone.dominantNeighborhood}</strong><br/>
          ${zone.label}<br/>
          ${zone.hexCount} hexes | Alpha: ${zone.meanAlpha}<br/>
          Est. driveways: ${zone.estimatedDriveways}
        </div>`,
        { className: "hex-tooltip" }
      );

      marker.on("click", () => {
        onSelectLaunchZone(zone.id);
      });

      marker.addTo(layerGroup);
    });

    layerGroup.addTo(map);
    zoneLayerRef.current = layerGroup;
  }, [launchZones, selectedLaunchZoneId, showGoldilocks, onSelectLaunchZone]);

  const legendLabel =
    layerMode === "alpha"
      ? "Alpha Score"
      : layerMode === "demand"
        ? "Demand Index"
        : layerMode === "supply"
          ? "Supply Index"
          : "Competition";

  const legendColors =
    layerMode === "alpha"
      ? ["#0f172a", "#1e3a5f", "#0f766e", "#0284c7", "#0ea5e9", "#10b981"]
      : layerMode === "competition"
        ? ["#10b981", "#22c55e", "#eab308", "#f97316", "#ef4444"]
        : ["#1e3a8a", "#3b82f6", "#eab308", "#f97316", "#ef4444"];

  return (
    <div className="relative w-full h-full bg-background">
      <div
        ref={mapRef}
        className="w-full h-full z-0"
        data-testid="leaflet-map-container"
      />

      <div className="absolute bottom-6 left-6 z-[1000] bg-card/90 backdrop-blur-md border border-border p-4 rounded-lg shadow-xl pointer-events-none">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {legendLabel}
        </h4>
        <div className="flex items-center gap-0.5 h-3 w-48 rounded overflow-hidden">
          {legendColors.map((c, i) => (
            <div
              key={i}
              className="h-full flex-1"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 border border-white/30" />
          Launch Zone
        </div>
      </div>
    </div>
  );
}
