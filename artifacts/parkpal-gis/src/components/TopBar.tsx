import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Layers, Map as MapIcon, Target, Home, Navigation2, Filter } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TopBarProps {
  layerMode: 'alpha' | 'demand' | 'scarcity' | 'residential';
  setLayerMode: (v: 'alpha' | 'demand' | 'scarcity' | 'residential') => void;
  showGoldilocks: boolean;
  setShowGoldilocks: (v: boolean) => void;
  minScore: number;
  setMinScore: (v: number) => void;
}

export function TopBar({ layerMode, setLayerMode, showGoldilocks, setShowGoldilocks, minScore, setMinScore }: TopBarProps) {
  return (
    <div className="h-14 border-b border-border bg-card/80 backdrop-blur-sm px-4 flex items-center justify-between z-10 w-full relative">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Navigation2 className="w-4 h-4 text-muted-foreground" />
          <Select defaultValue="seattle">
            <SelectTrigger className="h-8 w-[140px] bg-transparent border-border text-sm">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seattle">Seattle, WA</SelectItem>
              <SelectItem value="portland" disabled>Portland, OR</SelectItem>
              <SelectItem value="sf" disabled>San Francisco, CA</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-border hidden md:block"></div>

        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <ToggleGroup 
            type="single" 
            value={layerMode} 
            onValueChange={(v) => v && setLayerMode(v as any)}
            className="bg-background border border-border rounded-md p-0.5"
            data-testid="layer-toggles"
          >
            <ToggleGroupItem value="alpha" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Alpha Score
            </ToggleGroupItem>
            <ToggleGroupItem value="demand" className="h-7 px-3 text-xs data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground">
              Demand
            </ToggleGroupItem>
            <ToggleGroupItem value="scarcity" className="h-7 px-3 text-xs data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground">
              Scarcity
            </ToggleGroupItem>
            <ToggleGroupItem value="residential" className="h-7 px-3 text-xs data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground">
              Res. Supply
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 bg-background border border-border px-3 py-1.5 rounded-md">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground w-20">Min Score: <span className="text-foreground font-mono">{minScore}</span></span>
          <Slider 
            value={[minScore]} 
            onValueChange={(v) => setMinScore(v[0])} 
            max={100} 
            step={1}
            className="w-24"
            data-testid="min-score-slider"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="goldilocks" 
            checked={showGoldilocks}
            onCheckedChange={setShowGoldilocks}
            className="data-[state=checked]:bg-amber-500"
            data-testid="goldilocks-switch"
          />
          <Label htmlFor="goldilocks" className="text-xs font-semibold uppercase tracking-wider cursor-pointer">
            Show Goldilocks Zones
          </Label>
        </div>
      </div>
    </div>
  );
}
