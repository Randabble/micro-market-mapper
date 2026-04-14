import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { Map } from "@/components/Map";

export default function Dashboard() {
  const [layerMode, setLayerMode] = useState<'alpha' | 'demand' | 'scarcity' | 'residential'>('alpha');
  const [showGoldilocks, setShowGoldilocks] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<string | null>(null);
  const [selectedMicroMarketId, setSelectedMicroMarketId] = useState<string | null>(null);

  const handleSelectNeighborhood = (id: string | null) => {
    setSelectedNeighborhoodId(id);
    if (id) setSelectedMicroMarketId(null);
  };

  const handleSelectMicroMarket = (id: string | null) => {
    setSelectedMicroMarketId(id);
    if (id) setSelectedNeighborhoodId(null);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden dark text-foreground">
      <TopBar 
        layerMode={layerMode}
        setLayerMode={setLayerMode}
        showGoldilocks={showGoldilocks}
        setShowGoldilocks={setShowGoldilocks}
        minScore={minScore}
        setMinScore={setMinScore}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 h-full relative z-0">
          <Map 
            layerMode={layerMode}
            showGoldilocks={showGoldilocks}
            minScore={minScore}
            onSelectNeighborhood={handleSelectNeighborhood}
            onSelectMicroMarket={handleSelectMicroMarket}
          />
        </div>
        <div className="w-[380px] lg:w-[420px] shrink-0 h-full relative z-10 shadow-2xl">
          <Sidebar 
            selectedNeighborhoodId={selectedNeighborhoodId}
            selectedMicroMarketId={selectedMicroMarketId}
            onSelectNeighborhood={handleSelectNeighborhood}
            onSelectMicroMarket={handleSelectMicroMarket}
          />
        </div>
      </div>
    </div>
  );
}
