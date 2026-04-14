import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGetNeighborhoodsGeoJson, useListMicroMarkets } from "@workspace/api-client-react";
import type { NeighborhoodFeatureProperties } from "@workspace/api-client-react";

// Fix leaflet icon path issues
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

interface MapProps {
  layerMode: 'alpha' | 'demand' | 'scarcity' | 'residential';
  showGoldilocks: boolean;
  minScore: number;
  onSelectNeighborhood: (id: string) => void;
  onSelectMicroMarket: (id: string) => void;
}

const getColor = (score: number, mode: string) => {
  if (mode !== 'alpha') {
    // Generic heat scale for other metrics
    return score > 80 ? '#ef4444' :
           score > 60 ? '#f97316' :
           score > 40 ? '#eab308' :
           score > 20 ? '#3b82f6' : '#1e3a8a';
  }
  
  // Alpha Score Color Scale
  return score > 75 ? '#10b981' : // Emerald green (prime)
         score > 60 ? '#0ea5e9' : // Bright electric blue/green (strong)
         score > 45 ? '#0284c7' : // Cyan/blue (developing)
         score > 25 ? '#0f766e' : // Muted teal (marginal)
                      '#1e293b';  // Dark blue/slate (not viable)
};

export function Map({ layerMode, showGoldilocks, minScore, onSelectNeighborhood, onSelectMicroMarket }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const microMarketLayerRef = useRef<L.LayerGroup | null>(null);

  const { data: geojsonData } = useGetNeighborhoodsGeoJson({ layer: layerMode });
  const { data: microMarkets } = useListMicroMarkets();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([47.6062, -122.3321], 12); // Seattle

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update GeoJSON Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !geojsonData) return;

    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }

    const map = mapInstanceRef.current;

    const geoJsonLayer = L.geoJSON(geojsonData as any, {
      style: (feature: any) => {
        const props = feature.properties as NeighborhoodFeatureProperties;
        
        let score = props.alphaScore;
        if (layerMode === 'demand') score = props.demandIndex;
        if (layerMode === 'scarcity') score = props.publicScarcityIndex;
        if (layerMode === 'residential') score = props.residentialSupplyIndex;

        const isHidden = props.alphaScore < minScore;
        const isGoldilocksHighlight = showGoldilocks && props.isGoldilocksZone;

        return {
          fillColor: getColor(score, layerMode),
          weight: isGoldilocksHighlight ? 3 : 1,
          opacity: isHidden ? 0.1 : 1,
          color: isGoldilocksHighlight ? '#f59e0b' : '#334155', // Amber border for goldilocks
          dashArray: isGoldilocksHighlight ? '' : '3',
          fillOpacity: isHidden ? 0.1 : 0.6,
          className: isGoldilocksHighlight ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : ''
        };
      },
      onEachFeature: (feature: any, layer) => {
        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              weight: 3,
              color: '#fff',
              fillOpacity: 0.8
            });
            l.bringToFront();
          },
          mouseout: (e) => {
            geoJsonLayerRef.current?.resetStyle(e.target);
          },
          click: () => {
            onSelectNeighborhood(feature.properties.id);
          }
        });
      }
    });

    geoJsonLayer.addTo(map);
    geoJsonLayerRef.current = geoJsonLayer;

  }, [geojsonData, layerMode, minScore, showGoldilocks, onSelectNeighborhood]);

  // Update MicroMarkets Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !microMarkets) return;

    if (microMarketLayerRef.current) {
      mapInstanceRef.current.removeLayer(microMarketLayerRef.current);
    }

    const map = mapInstanceRef.current;
    const layerGroup = L.layerGroup();

    microMarkets.forEach(mm => {
      const circle = L.circle([mm.centroid.lat, mm.centroid.lng], {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.2,
        radius: mm.radiusMeters,
        weight: 2,
        dashArray: '4'
      });

      const marker = L.circleMarker([mm.centroid.lat, mm.centroid.lng], {
        radius: 6,
        fillColor: '#f59e0b',
        color: '#fff',
        weight: 2,
        fillOpacity: 1
      });

      marker.on('click', () => {
        onSelectMicroMarket(mm.id);
      });

      circle.addTo(layerGroup);
      marker.addTo(layerGroup);
    });

    layerGroup.addTo(map);
    microMarketLayerRef.current = layerGroup;

  }, [microMarkets, onSelectMicroMarket]);

  return (
    <div className="relative w-full h-full bg-background">
      <div ref={mapRef} className="w-full h-full z-0" data-testid="leaflet-map-container" />
      
      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-card/90 backdrop-blur-md border border-border p-4 rounded-lg shadow-xl pointer-events-none">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {layerMode === 'alpha' ? 'Alpha Score' : 
           layerMode === 'demand' ? 'Demand Index' :
           layerMode === 'scarcity' ? 'Public Scarcity' : 'Res. Supply'}
        </h4>
        <div className="flex items-center gap-1 h-3 w-48 rounded overflow-hidden">
          <div className="h-full flex-1" style={{ backgroundColor: layerMode === 'alpha' ? '#1e293b' : '#1e3a8a' }}></div>
          <div className="h-full flex-1" style={{ backgroundColor: layerMode === 'alpha' ? '#0f766e' : '#3b82f6' }}></div>
          <div className="h-full flex-1" style={{ backgroundColor: layerMode === 'alpha' ? '#0284c7' : '#eab308' }}></div>
          <div className="h-full flex-1" style={{ backgroundColor: layerMode === 'alpha' ? '#0ea5e9' : '#f97316' }}></div>
          <div className="h-full flex-1" style={{ backgroundColor: layerMode === 'alpha' ? '#10b981' : '#ef4444' }}></div>
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}
