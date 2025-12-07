import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react';
import type { LandData } from '../backend';
import { useMintLand } from '../hooks/useQueries';
import { toast } from 'sonner';

interface LandSelectorProps {
  lands: LandData[];
  selectedLandId: bigint;
  onSelectLand: (landId: bigint) => void;
}

export default function LandSelector({ lands, selectedLandId, onSelectLand }: LandSelectorProps) {
  const mintLand = useMintLand();
  const [isMinting, setIsMinting] = useState(false);

  const currentIndex = lands.findIndex(land => land.landId === selectedLandId);
  const currentLand = lands[currentIndex];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onSelectLand(lands[currentIndex - 1].landId);
    }
  };

  const handleNext = () => {
    if (currentIndex < lands.length - 1) {
      onSelectLand(lands[currentIndex + 1].landId);
    }
  };

  const handleMintNewLand = async () => {
    setIsMinting(true);
    try {
      const newLand = await mintLand.mutateAsync();
      toast.success('New Land Minted!', {
        description: `${newLand.biome} at ${newLand.coordinates.lat.toFixed(2)}°, ${newLand.coordinates.lon.toFixed(2)}°`,
      });
      onSelectLand(newLand.landId);
    } catch (error) {
      toast.error('Failed to mint land', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsMinting(false);
    }
  };

  const getBiomeColor = (biome: string): string => {
    const normalizedBiome = biome.toUpperCase().replace(/_/g, '_');
    
    switch (normalizedBiome) {
      case 'FOREST_VALLEY':
        return 'text-green-500';
      case 'ISLAND_ARCHIPELAGO':
        return 'text-cyan-400';
      case 'SNOW_PEAK':
        return 'text-primary';
      case 'DESERT_DUNE':
        return 'text-orange-400';
      case 'VOLCANIC_CRAG':
        return 'text-destructive';
      case 'MYTHIC_VOID':
        return 'text-purple-500';
      case 'MYTHIC_AETHER':
        return 'text-blue-400';
      default:
        return 'text-primary';
    }
  };

  return (
    <Card className="glassmorphism border-primary/30 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              variant="outline"
              size="sm"
              className="font-orbitron border-primary/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Desktop: Dropdown Selector */}
            <div className="hidden sm:block">
              <Select
                value={selectedLandId.toString()}
                onValueChange={(value) => onSelectLand(BigInt(value))}
              >
                <SelectTrigger className="w-[280px] font-orbitron border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lands.map((land, index) => (
                    <SelectItem key={land.landId.toString()} value={land.landId.toString()}>
                      <div className="flex items-center gap-2">
                        <MapPin className={`h-4 w-4 ${getBiomeColor(land.biome)}`} />
                        <span className="font-orbitron">
                          {land.plotName} ({land.biome})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile: Simple Counter */}
            <div className="sm:hidden glassmorphism px-4 py-2 rounded border border-primary/20">
              <p className="font-orbitron text-sm">
                Land {currentIndex + 1} of {lands.length}
              </p>
              <p className={`font-jetbrains text-xs ${getBiomeColor(currentLand.biome)}`}>
                {currentLand.plotName}
              </p>
            </div>

            <Button
              onClick={handleNext}
              disabled={currentIndex === lands.length - 1}
              variant="outline"
              size="sm"
              className="font-orbitron border-primary/30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Mint New Land Button */}
          <Button
            onClick={handleMintNewLand}
            disabled={isMinting || mintLand.isPending}
            variant="default"
            size="sm"
            className="font-orbitron bg-accent hover:bg-accent/90 box-glow-green"
          >
            {isMinting || mintLand.isPending ? (
              <span className="animate-pulse">MINTING...</span>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">MINT NEW LAND</span>
                <span className="sm:hidden">MINT</span>
              </>
            )}
          </Button>
        </div>

        {/* Current Land Info */}
        <div className="mt-3 pt-3 border-t border-primary/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className="font-jetbrains text-xs text-muted-foreground uppercase">Biome</p>
              <p className={`font-orbitron text-sm font-bold ${getBiomeColor(currentLand.biome)}`}>
                {currentLand.biome}
              </p>
            </div>
            <div>
              <p className="font-jetbrains text-xs text-muted-foreground uppercase">Level</p>
              <p className="font-orbitron text-sm font-bold text-accent">
                {currentLand.upgradeLevel.toString()}
              </p>
            </div>
            <div>
              <p className="font-jetbrains text-xs text-muted-foreground uppercase">Latitude</p>
              <p className="font-orbitron text-sm font-bold text-primary">
                {currentLand.coordinates.lat.toFixed(2)}°
              </p>
            </div>
            <div>
              <p className="font-jetbrains text-xs text-muted-foreground uppercase">Longitude</p>
              <p className="font-orbitron text-sm font-bold text-primary">
                {currentLand.coordinates.lon.toFixed(2)}°
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
