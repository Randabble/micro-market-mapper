import { useGetCitySummary, useListLaunchZones, useGetHex } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapPin, TrendingUp, AlertTriangle, Home, Building, Info, ArrowUpRight, Hexagon, Target } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  selectedHexId: string | null;
  selectedLaunchZoneId: number | null;
  onSelectHex: (id: string | null) => void;
  onSelectLaunchZone: (id: number | null) => void;
}

export function Sidebar({ selectedHexId, selectedLaunchZoneId, onSelectHex, onSelectLaunchZone }: SidebarProps) {
  const { data: citySummary } = useGetCitySummary();
  const { data: launchZones } = useListLaunchZones();

  const { data: selectedHex } = useGetHex(selectedHexId || "", {
    query: {
      enabled: !!selectedHexId,
      queryKey: ["hex", selectedHexId],
    }
  });

  const selectedZone = launchZones?.find(z => z.id === selectedLaunchZoneId);

  return (
    <div className="h-full flex flex-col bg-card border-l border-border w-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
            P
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">ParkPal GIS</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">H3 Alpha Engine v3</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">

          {(selectedHex || selectedZone) && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Selection Detail</h2>
                <button
                  onClick={() => { onSelectHex(null); onSelectLaunchZone(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>

              {selectedHex && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Hexagon className="w-4 h-4 text-primary" />
                          {selectedHex.neighborhoodName}
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1">{selectedHex.h3Index}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-3xl font-bold text-primary font-mono">{selectedHex.alphaScore.toFixed(1)}</div>
                        <p className="text-[10px] text-muted-foreground uppercase">Alpha Score</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {selectedHex.launchZoneId !== null && (
                        <Badge variant="default" className="bg-amber-500 text-black hover:bg-amber-600">Launch Zone</Badge>
                      )}
                      {selectedHex.alphaScore >= 40 && (
                        <Badge variant="outline" className="border-primary text-primary">Above Threshold</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Demand</p>
                        <p className="text-lg font-mono">{selectedHex.demandScore.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Home className="w-3 h-3" /> Supply</p>
                        <p className="text-lg font-mono">{selectedHex.supplyScore.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Competition</p>
                        <p className="text-lg font-mono">{(selectedHex.competitionPenalty * 100).toFixed(0)}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Building className="w-3 h-3" /> Driveways</p>
                        <p className="text-lg font-mono">{selectedHex.estimatedDriveways}</p>
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Citations</p>
                        <p className="text-sm font-mono">{selectedHex.citationCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">POIs Nearby</p>
                        <p className="text-sm font-mono">{selectedHex.poiCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Res. Parcels</p>
                        <p className="text-sm font-mono">{selectedHex.residentialParcelCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Pub. Parking</p>
                        <p className="text-sm font-mono">{selectedHex.publicParkingSpots}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedZone && (
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Target className="w-5 h-5 text-amber-500" />
                          {selectedZone.dominantNeighborhood}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{selectedZone.label}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-3xl font-bold text-amber-500 font-mono">#{selectedZone.rank}</div>
                        <p className="text-[10px] text-muted-foreground uppercase">Overall Rank</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Mean Alpha</p>
                        <p className="text-lg font-mono text-primary">{selectedZone.meanAlpha.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Max Alpha</p>
                        <p className="text-lg font-mono">{selectedZone.maxAlpha.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Hex Cells</p>
                        <p className="text-lg font-mono">{selectedZone.hexCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Est. Driveways</p>
                        <p className="text-lg font-mono">{selectedZone.estimatedDriveways}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!selectedHex && !selectedZone && citySummary && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">City Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="font-medium">{citySummary.city}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Launch Zones</p>
                  <p className="font-mono text-xl text-amber-500">{citySummary.launchZoneCount}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Total Hexes</p>
                  <p className="font-mono text-xl">{citySummary.totalHexes}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Above Threshold</p>
                  <p className="font-mono text-xl text-primary">{citySummary.hexesAboveThreshold}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Avg Alpha</p>
                  <p className="font-mono text-xl text-primary">{citySummary.avgAlphaScore.toFixed(1)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Est. Driveways</p>
                  <p className="font-mono text-xl">{citySummary.totalEstimatedDriveways.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-card border border-primary/20 rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Top Hex</p>
                <p className="font-mono text-primary text-lg">{citySummary.topHexAlpha.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{citySummary.topHexH3}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Launch Zones
            </h2>
            <div className="space-y-2">
              {launchZones?.map(zone => (
                <div
                  key={zone.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${selectedLaunchZoneId === zone.id ? 'bg-primary/10 border-primary/50' : 'bg-card border-border hover:bg-accent'}`}
                  onClick={() => onSelectLaunchZone(zone.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-sm font-mono">
                      {zone.rank}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{zone.dominantNeighborhood}</p>
                      <p className="text-[10px] text-muted-foreground">{zone.hexCount} hexes | {zone.estimatedDriveways} driveways</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-primary font-bold">{zone.meanAlpha.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">{zone.label}</p>
                  </div>
                </div>
              ))}
              {(!launchZones || launchZones.length === 0) && (
                <p className="text-sm text-muted-foreground">No launch zones found above threshold.</p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="methodology" className="border-border">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wider hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    Algorithm v3 Methodology
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-4 pt-2">
                  <p>The Alpha Score uses H3 hexagonal grid cells (~460m diameter) with a corrected geometric-mean formula and DBSCAN clustering.</p>

                  <div className="bg-accent/50 p-3 rounded-md font-mono text-xs space-y-2 text-foreground">
                    <p><span className="text-primary">Step 1:</span> D = (citations/area) x log(1 + POIs)</p>
                    <p className="text-[10px] text-muted-foreground border-l-2 border-primary/50 pl-2">Citation density multiplied by log of nearby POI count, normalized 0-100.</p>

                    <div className="h-1" />

                    <p><span className="text-primary">Step 2:</span> S = sum(1 / (dist + 1)) for parcels in 800m</p>
                    <p className="text-[10px] text-muted-foreground border-l-2 border-primary/50 pl-2">Distance-decayed residential parcel count. Closer driveways matter more.</p>

                    <div className="h-1" />

                    <p><span className="text-primary">Step 3:</span> P = parking_spots_400m / area</p>
                    <p className="text-[10px] text-muted-foreground border-l-2 border-primary/50 pl-2">Competition penalty from nearby public parking, normalized 0-1.</p>

                    <div className="h-1" />

                    <p><span className="text-primary">Step 4:</span> Alpha = sqrt(D x S) x (1 - 0.3 x P)</p>
                    <p className="text-[10px] text-muted-foreground border-l-2 border-primary/50 pl-2">Geometric mean forces both D and S to be high. Competition suppresses up to 30%.</p>

                    <div className="h-1" />

                    <p><span className="text-primary">Step 5:</span> DBSCAN clustering on hexes with Alpha &gt; 40</p>
                    <p className="text-[10px] text-muted-foreground border-l-2 border-primary/50 pl-2">Contiguous high-scoring hexes form "Launch Zones" - ranked by mean Alpha x cluster size.</p>
                  </div>

                  <p>False positives are eliminated: pure downtown cores (high demand, zero driveways) and rural areas (high supply, zero demand) both score near zero.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
