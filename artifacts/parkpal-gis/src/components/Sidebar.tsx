import { useState } from "react";
import { useGetCitySummary, useListNeighborhoods, useListMicroMarkets, useGetNeighborhood } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapPin, TrendingUp, AlertTriangle, Home, Building, Info, Navigation, ArrowUpRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  selectedNeighborhoodId: string | null;
  selectedMicroMarketId: string | null;
  onSelectNeighborhood: (id: string | null) => void;
  onSelectMicroMarket: (id: string | null) => void;
}

export function Sidebar({ selectedNeighborhoodId, selectedMicroMarketId, onSelectNeighborhood, onSelectMicroMarket }: SidebarProps) {
  const { data: citySummary, isLoading: isLoadingSummary } = useGetCitySummary();
  const { data: neighborhoods, isLoading: isLoadingNeighborhoods } = useListNeighborhoods();
  const { data: microMarkets, isLoading: isLoadingMicroMarkets } = useListMicroMarkets();
  
  const { data: fullNeighborhood, isLoading: isLoadingNeighborhood } = useGetNeighborhood(selectedNeighborhoodId || "", {
    query: {
      enabled: !!selectedNeighborhoodId,
      queryKey: selectedNeighborhoodId ? [selectedNeighborhoodId] : []
    }
  });

  const selectedNeighborhood = fullNeighborhood || neighborhoods?.find(n => n.id === selectedNeighborhoodId);
  const selectedMicroMarket = microMarkets?.find(m => m.id === selectedMicroMarketId);

  const topNeighborhoods = neighborhoods?.slice().sort((a, b) => b.alphaScore - a.alphaScore).slice(0, 5) || [];

  return (
    <div className="h-full flex flex-col bg-card border-l border-border w-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
            P
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">ParkPal GIS</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Alpha Score Engine</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          
          {/* Detail Panel */}
          {(selectedNeighborhood || selectedMicroMarket) && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">Selection Detail</h2>
                <button 
                  onClick={() => { onSelectNeighborhood(null); onSelectMicroMarket(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              
              {selectedNeighborhood && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{selectedNeighborhood.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{selectedNeighborhood.city} • {selectedNeighborhood.neighborhoodType}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-3xl font-bold text-primary font-mono">{selectedNeighborhood.alphaScore.toFixed(1)}</div>
                        <p className="text-[10px] text-muted-foreground uppercase">Alpha Score</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {selectedNeighborhood.isGoldilocksZone && (
                        <Badge variant="default" className="bg-amber-500 text-black hover:bg-amber-600">Goldilocks Zone</Badge>
                      )}
                      {selectedNeighborhood.isMicroMarket && (
                        <Badge variant="outline" className="border-primary text-primary">Micro-Market</Badge>
                      )}
                      <Badge variant="secondary" className="uppercase text-[10px]">{selectedNeighborhood.zoningType}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Demand</p>
                        <p className="text-lg font-mono">{selectedNeighborhood.demandIndex.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Pub. Scarcity</p>
                        <p className="text-lg font-mono">{selectedNeighborhood.publicScarcityIndex.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Home className="w-3 h-3" /> Res. Supply</p>
                        <p className="text-lg font-mono">{selectedNeighborhood.residentialSupplyIndex.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Building className="w-3 h-3" /> Comm. Spots</p>
                        <p className="text-lg font-mono">{selectedNeighborhood.commercialParkingCount}</p>
                      </div>
                    </div>

                    <Separator className="bg-border/50" />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Walk-to-Win Ratio</p>
                        <p className="text-sm font-mono">{selectedNeighborhood.walkToWinRatio.toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Balance Score</p>
                        <p className="text-sm font-mono">{selectedNeighborhood.balanceScore.toFixed(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedMicroMarket && (
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-amber-500" />
                          {selectedMicroMarket.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Radius: {selectedMicroMarket.radiusMeters}m</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-3xl font-bold text-amber-500 font-mono">#{selectedMicroMarket.overallRank}</div>
                        <p className="text-[10px] text-muted-foreground uppercase">Overall Rank</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-none">{selectedMicroMarket.opportunityLabel}</Badge>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Alpha Score</p>
                        <p className="text-lg font-mono">{selectedMicroMarket.alphaScore.toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Est. Driveways</p>
                        <p className="text-lg font-mono">{selectedMicroMarket.estimatedDriveways}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Nearby POIs</p>
                        <p className="text-lg font-mono">{selectedMicroMarket.nearbyDemandPois}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Demand Rank</p>
                        <p className="text-lg font-mono">#{selectedMicroMarket.demandRank}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!selectedNeighborhood && !selectedMicroMarket && citySummary && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">City Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="font-medium">{citySummary.city}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Goldilocks Zones</p>
                  <p className="font-mono text-xl text-amber-500">{citySummary.goldilocksZoneCount}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Avg Alpha Score</p>
                  <p className="font-mono text-xl text-primary">{citySummary.avgAlphaScore.toFixed(1)}</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Micro-Markets</p>
                  <p className="font-mono text-xl">{citySummary.microMarketCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Neighborhoods List */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Top Neighborhoods
            </h2>
            <div className="space-y-2">
              {topNeighborhoods.map(n => (
                <div 
                  key={n.id} 
                  className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${selectedNeighborhoodId === n.id ? 'bg-primary/10 border-primary/50' : 'bg-card border-border hover:bg-accent'}`}
                  onClick={() => onSelectNeighborhood(n.id)}
                  data-testid={`neighborhood-item-${n.id}`}
                >
                  <div>
                    <p className="font-medium text-sm">{n.name}</p>
                    <p className="text-xs text-muted-foreground">{n.neighborhoodType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-primary font-bold">{n.alphaScore.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Methodology Accordion */}
          <div className="pt-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="methodology" className="border-border">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wider hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    Algorithm Methodology
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-4 pt-2">
                  <p>The Alpha Score uses a corrected geometric mean formula to identify perfect marketplace launch zones.</p>
                  
                  <div className="bg-accent/50 p-3 rounded-md font-mono text-xs space-y-2 text-foreground">
                    <p><span className="text-primary">Step 1:</span> Balance Score B = sqrt(D × Sres)</p>
                    <p className="text-[10px] text-muted-foreground border-l-2 border-primary/50 pl-2">Forces BOTH demand (D) AND supply (Sres) to be high simultaneously. If either is zero, score collapses to zero.</p>
                    
                    <div className="h-2" />
                    
                    <p><span className="text-primary">Step 2:</span> AlphaScore = B × (0.65 + 0.35 × Ppub/100)</p>
                    <p className="text-[10px] text-muted-foreground border-l-2 border-primary/50 pl-2">Scarcity of commercial parking (Ppub) multiplies the opportunity.</p>
                  </div>
                  
                  <p>This eliminates false positives: pure downtown cores (high demand, zero residential driveways) and rural areas (high supply, zero demand) both score near zero.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
        </div>
      </ScrollArea>
    </div>
  );
}
