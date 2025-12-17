import { useGLTF } from '@react-three/drei';
import { useEffect, useState, useMemo } from 'react';

// Explicit biome-to-filename mapping with CDN URLs
// TEMPORARILY DISABLED KTX2: All models use standard .glb format for testing
const BIOME_MODEL_MAP: Record<string, string> = {
  FOREST_VALLEY: "https://cdn.jsdelivr.net/gh/dobr312/cyberland/public/models/FOREST_VALLEY.glb",
  ISLAND_ARCHIPELAGO: "https://cdn.jsdelivr.net/gh/dobr312/cyberland/public/models/ISLAND_ARCHIPELAGO.glb",
  SNOW_PEAK: "https://cdn.jsdelivr.net/gh/dobr312/cyberland/public/models/SNOW_PEAK.glb",
  DESERT_DUNE: "https://cdn.jsdelivr.net/gh/dobr312/cyberland/public/models/DESERT_DUNE.glb",
  VOLCANIC_CRAG: "https://cdn.jsdelivr.net/gh/dobr312/cyberland/public/models/VOLCANIC_CRAG.glb",
  MYTHIC_VOID: "https://cdn.jsdelivr.net/gh/dobr312/cyberland/public/models/MYTHIC_VOID.glb",
  MYTHIC_AETHER: "https://cdn.jsdelivr.net/gh/dobr312/cyberland/public/models/MYTHIC_AETHER.glb"
};

interface LandModelProps {
  biome: string;
  onError?: (error: string) => void;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
}

export default function LandModel({ biome, onError, onLoadStart, onLoadComplete }: LandModelProps) {
  const [hasError, setHasError] = useState(false);

  // Compute modelUrl from biome - memoized to prevent unnecessary re-renders
  const modelUrl = useMemo(() => {
    console.log('[LandModel] Computing modelUrl for biome:', biome);
    
    // Check if biome is defined and not empty
    if (!biome || biome.trim() === '') {
      console.warn('[LandModel] ⚠️ Biome is undefined or empty');
      return '';
    }

    // Get URL from mapping
    const url = BIOME_MODEL_MAP[biome];
    
    if (!url || url.trim() === '') {
      console.warn('[LandModel] ⚠️ No URL found for biome:', biome);
      return '';
    }

    console.log('[LandModel] ✅ Model URL computed:', url);
    return url;
  }, [biome]);

  // Log modelUrl immediately before useGLTF processes it
  useEffect(() => {
    if (modelUrl) {
      console.log('[LandModel] 🔗 Model URL being passed to useGLTF:', modelUrl);
      if (onLoadStart) onLoadStart();
    }
  }, [modelUrl, onLoadStart]);

  // Report validation errors
  useEffect(() => {
    if (!biome || biome.trim() === '') {
      const errorMsg = 'Биом не определён';
      setHasError(true);
      if (onError) onError(errorMsg);
      return;
    }

    if (!modelUrl || modelUrl.trim() === '') {
      const errorMsg = `Модель для биома ${biome} не найдена`;
      setHasError(true);
      if (onError) onError(errorMsg);
      return;
    }

    setHasError(false);
  }, [biome, modelUrl, onError]);

  // MUST call useGLTF unconditionally at top level (React Hooks rules)
  // Pass empty string if no valid URL to prevent 404 during initial validation
  const gltf = useGLTF(
    modelUrl || '', 
    false, // Disable DRACO compression
    undefined,
    (loader) => {
      // TEMPORARILY DISABLE KTX2Loader for testing
      console.log('[LandModel] 🔧 KTX2Loader temporarily disabled for testing standard GLB files');
      // Note: KTX2Loader is not being initialized/configured
    }
  );

  // Notify parent when model is successfully loaded
  useEffect(() => {
    if (gltf && gltf.scene && modelUrl && !hasError) {
      console.log('[LandModel] ✅ Model loaded successfully');
      if (onLoadComplete) onLoadComplete();
    }
  }, [gltf, modelUrl, hasError, onLoadComplete]);

  // Don't render if there's a validation error or no valid URL
  if (hasError || !modelUrl || modelUrl.trim() === '') {
    return null;
  }

  // Don't render if gltf hasn't loaded yet
  if (!gltf || !gltf.scene) {
    return null;
  }

  // Render the loaded model
  return <primitive object={gltf.scene} scale={1.5} />;
}
