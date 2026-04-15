import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { Map } from "@/components/Map";

export default function Dashboard() {
  const [layerMode, setLayerMode] = useState<"alpha" | "demand" | "supply" | "competition">("alpha");
  const [showGoldilocks, setShowGoldilocks] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const [selectedLaunchZoneId, setSelectedLaunchZoneId] = useState<number | null>(null);

  const handleSelectHex = (id: string | null) => {
    setSelectedHexId(id);
    if (id) setSelectedLaunchZoneId(null);
  };

  const handleSelectLaunchZone = (id: number | null) => {
    setSelectedLaunchZoneId(id);
    if (id !== null) setSelectedHexId(null);
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
            selectedLaunchZoneId={selectedLaunchZoneId}
            onSelectHex={handleSelectHex}
            onSelectLaunchZone={handleSelectLaunchZone}
          />
        </div>
        <div className="w-[380px] lg:w-[420px] shrink-0 h-full relative z-10 shadow-2xl">
          <Sidebar
            selectedHexId={selectedHexId}
            selectedLaunchZoneId={selectedLaunchZoneId}
            onSelectHex={handleSelectHex}
            onSelectLaunchZone={handleSelectLaunchZone}
          />
        </div>
      </div>
    </div>
  );
}
