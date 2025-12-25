import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { LandData, Modification } from '../backend';

interface CyberCubeProps {
  landData: LandData;
  modifications: Modification[];
}

// Biome color mapping
const BIOME_COLORS: Record<string, string> = {
  FOREST_VALLEY: '#00ff41',
  ISLAND_ARCHIPELAGO: '#00d4ff',
  SNOW_PEAK: '#00ffff',
  DESERT_DUNE: '#ffaa00',
  VOLCANIC_CRAG: '#ff0000',
  MYTHIC_VOID: '#8800ff',
  MYTHIC_AETHER: '#ffffff',
};

// Skybox/background colors for biomes
const BIOME_BACKGROUNDS: Record<string, string> = {
  FOREST_VALLEY: '#1a3a1a',
  ISLAND_ARCHIPELAGO: '#0a2a4a',
  SNOW_PEAK: '#1a2a3a',
  DESERT_DUNE: '#3a2a1a',
  VOLCANIC_CRAG: '#3a1a1a',
  MYTHIC_VOID: '#1a0a2a',
  MYTHIC_AETHER: '#2a2a3a',
};

// Type for GLTF result from useGLTF
interface GLTFResult {
  scene: THREE.Group;
  scenes: THREE.Group[];
  animations: THREE.AnimationClip[];
  cameras: THREE.Camera[];
  asset: object;
}

// Land Model Component - loads GLB based on biome with proper fallback
function LandModel({ biome, upgradeLevel }: { biome: string; upgradeLevel: number }) {
  const assetCanisterId = import.meta.env.VITE_ASSET_CANISTER_ID || import.meta.env.CANISTER_ID_ASSET_CANISTER || 'bd3sg-teaaa-aaaaa-qaaba-cai';
  
  // Generate stable URL for land type GLB model using ic0.app
  const modelUrl = useMemo(() => {
    if (!assetCanisterId) {
      console.warn('[CyberCube] Asset canister ID not configured, using fallback cube');
      return null;
    }
    // Use ic0.app as the primary gateway for asset loading
    const url = `https://${assetCanisterId}.ic0.app/${biome}.glb`;
    console.log(`[CyberCube] Loading 3D model for biome ${biome}:`, url);
    return url;
  }, [assetCanisterId, biome]);

  const meshRef = useRef<THREE.Group>(null);

  // Try to load the GLB model with error handling
  let gltf: GLTFResult | null = null;
  let loadError = false;
  
  try {
    if (modelUrl) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      gltf = useGLTF(modelUrl) as GLTFResult;
      console.log(`[CyberCube] ✓ Successfully loaded GLB model for ${biome}`);
    }
  } catch (error) {
    console.warn(`[CyberCube] ⚠ Failed to load GLB model for ${biome}, using fallback cube:`, error);
    loadError = true;
  }

  // Animate based on upgrade level
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.position.y = Math.sin(time * 0.5) * 0.1 * (upgradeLevel + 1);
      meshRef.current.rotation.y = time * 0.2;
    }
  });

  const biomeColor = BIOME_COLORS[biome] || '#00ff41';
  const scale = 1 + upgradeLevel * 0.2;

  // If GLB model loaded successfully, render it
  if (gltf && gltf.scene && !loadError) {
    return (
      <group ref={meshRef} scale={[scale, scale, scale]}>
        <primitive object={gltf.scene.clone()} />
        {/* Add glow effect for mythic biomes */}
        {(biome === 'MYTHIC_VOID' || biome === 'MYTHIC_AETHER') && (
          <pointLight color={biomeColor} intensity={2} distance={5} />
        )}
      </group>
    );
  }

  // Fallback to animated cube if model not available
  console.log(`[CyberCube] Rendering fallback animated cube for ${biome}`);
  return (
    <mesh ref={meshRef} scale={[scale, scale, scale]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial
        color={biomeColor}
        emissive={biomeColor}
        emissiveIntensity={0.3 + upgradeLevel * 0.1}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

// Modification Model Component
function ModificationModel({ modification, zone }: { modification: Modification; zone: 'A' | 'B' | 'C' }) {
  const meshRef = useRef<THREE.Group>(null);

  // Try to load the modification GLB model
  let gltf: GLTFResult | null = null;
  try {
    if (modification.model_url) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      gltf = useGLTF(modification.model_url) as GLTFResult;
    }
  } catch (error) {
    console.warn(`[CyberCube] Failed to load modification model:`, error);
  }

  // Position based on zone
  const position = useMemo((): [number, number, number] => {
    switch (zone) {
      case 'A': // Perimeter/Edge
        return [3, 0, 0];
      case 'B': // Surface
        return [0, 0, 3];
      case 'C': // Centerpiece
        return [0, 3, 0];
      default:
        return [0, 0, 0];
    }
  }, [zone]);

  const scale = zone === 'C' ? 1.5 : 1.0;

  // Animate
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.rotation.y = time * 0.5;
    }
  });

  // Glow color based on rarity (convert bigint to number for comparison)
  const glowColor = useMemo(() => {
    const tier = Number(modification.rarity_tier);
    switch (tier) {
      case 1: return '#ffffff';
      case 2: return '#00d4ff';
      case 3: return '#8800ff';
      case 4: return '#ffaa00';
      default: return '#ffffff';
    }
  }, [modification.rarity_tier]);

  if (gltf && gltf.scene) {
    return (
      <group ref={meshRef} position={position} scale={[scale, scale, scale]}>
        <primitive object={gltf.scene.clone()} />
        {Number(modification.rarity_tier) >= 3 && (
          <pointLight color={glowColor} intensity={2} distance={3} />
        )}
      </group>
    );
  }

  // Fallback sphere
  return (
    <mesh ref={meshRef} position={position} scale={[scale, scale, scale]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial
        color={glowColor}
        emissive={glowColor}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

// Main Scene Component
function Scene({ landData, modifications }: CyberCubeProps) {
  const backgroundColor = BIOME_BACKGROUNDS[landData.biome] || '#1a1a2a';

  // Categorize modifications by zone (convert bigint to number for comparison)
  const modsByZone = useMemo(() => {
    const zones = { A: [] as Modification[], B: [] as Modification[], C: [] as Modification[] };
    modifications.forEach(mod => {
      const tier = Number(mod.rarity_tier);
      if (tier === 1) zones.A.push(mod);
      else if (tier === 2) zones.B.push(mod);
      else zones.C.push(mod);
    });
    return zones;
  }, [modifications]);

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00d4ff" />

      <Suspense fallback={null}>
        <LandModel biome={landData.biome} upgradeLevel={Number(landData.upgradeLevel)} />
        
        {/* Render modifications by zone */}
        {modsByZone.A.map((mod, idx) => (
          <ModificationModel key={`A-${idx}`} modification={mod} zone="A" />
        ))}
        {modsByZone.B.map((mod, idx) => (
          <ModificationModel key={`B-${idx}`} modification={mod} zone="B" />
        ))}
        {modsByZone.C.map((mod, idx) => (
          <ModificationModel key={`C-${idx}`} modification={mod} zone="C" />
        ))}
      </Suspense>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
      />
    </>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#00d4ff" wireframe />
    </mesh>
  );
}

export default function CyberCube({ landData, modifications }: CyberCubeProps) {
  console.log('[CyberCube] Rendering 3D visualization for land:', {
    biome: landData.biome,
    upgradeLevel: landData.upgradeLevel.toString(),
    modificationsCount: modifications.length,
  });

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-[#00ff41]/30 shadow-lg shadow-[#00ff41]/20 bg-black">
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <Suspense fallback={<LoadingFallback />}>
          <Scene landData={landData} modifications={modifications} />
        </Suspense>
      </Canvas>
    </div>
  );
}
