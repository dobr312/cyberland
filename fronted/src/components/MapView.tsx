import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LandData } from '../backend';
import { MapPin } from 'lucide-react';

interface MapViewProps {
  landData: LandData;
}

export default function MapView({ landData }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getBiomeColor = (biome: string): string => {
    const normalizedBiome = biome.toUpperCase().replace(/_/g, '_');
    
    switch (normalizedBiome) {
      case 'FOREST_VALLEY':
        return '#00ff88';
      case 'ISLAND_ARCHIPELAGO':
        return '#00ccff';
      case 'SNOW_PEAK':
        return '#00f3ff';
      case 'DESERT_DUNE':
        return '#ffaa00';
      case 'VOLCANIC_CRAG':
        return '#ff0066';
      case 'MYTHIC_VOID':
        return '#9333ea';
      case 'MYTHIC_AETHER':
        return '#00ccff';
      default:
        return '#00ff88';
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
    ctx.lineWidth = 1;

    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Convert coordinates to canvas position
    const lat = landData.coordinates.lat;
    const lon = landData.coordinates.lon;
    
    // Map lat/lon to canvas coordinates
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;

    const biomeColor = getBiomeColor(landData.biome);

    // Draw glow effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
    gradient.addColorStop(0, biomeColor + '80');
    gradient.addColorStop(0.5, biomeColor + '40');
    gradient.addColorStop(1, biomeColor + '00');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 50, y - 50, 100, 100);

    // Draw marker
    ctx.fillStyle = biomeColor;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw marker border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pulsing ring
    ctx.strokeStyle = biomeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.stroke();

  }, [landData]);

  return (
    <Card className="glassmorphism border-primary/30 animate-in fade-in slide-in-from-bottom duration-700">
      <CardHeader>
        <CardTitle className="font-orbitron text-2xl text-glow-teal flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          COORDINATE MAP
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-primary/20">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className="w-full h-full"
          />
          
          {/* Coordinate labels */}
          <div className="absolute top-4 left-4 glassmorphism px-3 py-2 rounded border border-primary/20">
            <p className="font-jetbrains text-xs text-muted-foreground">Latitude</p>
            <p className="font-orbitron text-sm font-bold text-primary">
              {landData.coordinates.lat.toFixed(4)}°
            </p>
          </div>
          
          <div className="absolute top-4 right-4 glassmorphism px-3 py-2 rounded border border-primary/20">
            <p className="font-jetbrains text-xs text-muted-foreground">Longitude</p>
            <p className="font-orbitron text-sm font-bold text-primary">
              {landData.coordinates.lon.toFixed(4)}°
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
