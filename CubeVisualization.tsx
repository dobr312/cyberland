import React from 'react';
import CyberCube from './CyberCube';
import type { LandData, Modification } from '../backend';

interface CubeVisualizationProps {
  landData: LandData;
  modifications: Modification[];
}

export default function CubeVisualization({ landData, modifications }: CubeVisualizationProps) {
  // Categorize modifications by zone for statistics
  const modsByZone = React.useMemo(() => {
    const zones = { A: 0, B: 0, C: 0 };
    modifications.forEach(mod => {
      const tier = Number(mod.rarity_tier);
      if (tier === 1) zones.A++;
      else if (tier === 2) zones.B++;
      else zones.C++;
    });
    return zones;
  }, [modifications]);

  return (
    <div className="space-y-4">
      {/* 3D Visualization */}
      <CyberCube landData={landData} modifications={modifications} />

      {/* Controls and Info */}
      <div className="bg-black/40 backdrop-blur-md border border-[#00d4ff]/30 rounded-lg p-4">
        <h3 className="text-[#00d4ff] font-bold mb-2">Controls</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• <span className="text-[#00ff41]">Left Click + Drag</span>: Rotate view</li>
          <li>• <span className="text-[#00ff41]">Right Click + Drag</span>: Pan camera</li>
          <li>• <span className="text-[#00ff41]">Scroll</span>: Zoom in/out</li>
        </ul>
      </div>

      {/* Land Info */}
      <div className="bg-black/40 backdrop-blur-md border border-[#00ff41]/30 rounded-lg p-4">
        <h3 className="text-[#00ff41] font-bold mb-2">Land Information</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">Biome:</span>
            <span className="text-white ml-2">{landData.biome.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-gray-400">Upgrade Level:</span>
            <span className="text-[#00d4ff] ml-2">{landData.upgradeLevel.toString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Coordinates:</span>
            <span className="text-white ml-2">
              {landData.coordinates.lat.toFixed(2)}, {landData.coordinates.lon.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Multiplier:</span>
            <span className="text-[#00ff41] ml-2">{landData.baseTokenMultiplier}x</span>
          </div>
        </div>
      </div>

      {/* Modifier Distribution */}
      {modifications.length > 0 && (
        <div className="bg-black/40 backdrop-blur-md border border-[#8800ff]/30 rounded-lg p-4">
          <h3 className="text-[#8800ff] font-bold mb-2">Modifier Distribution</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="text-gray-400 text-xs">Zone A (Edge)</div>
              <div className="text-white font-bold">{modsByZone.A}</div>
              <div className="text-gray-500 text-xs">Common</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Zone B (Surface)</div>
              <div className="text-[#00d4ff] font-bold">{modsByZone.B}</div>
              <div className="text-gray-500 text-xs">Rare</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-xs">Zone C (Center)</div>
              <div className="text-[#8800ff] font-bold">{modsByZone.C}</div>
              <div className="text-gray-500 text-xs">Legendary+</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
