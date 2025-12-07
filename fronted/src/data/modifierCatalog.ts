// Static modifier catalog with 45+ placeholder entries
// This data will be replaced with backend data once modifier management is fully integrated

export interface PlannedModifier {
  id: number;
  name: string;
  rarity_tier: 1 | 2 | 3 | 4;
  asset_url: string;
}

export const PLANNED_MODIFIER_CATALOG: PlannedModifier[] = [
  // Tier 1 - Common (15 entries)
  { id: 1, name: "Crystal Shard", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 2, name: "Data Fragment", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 3, name: "Nano Circuit", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 4, name: "Pixel Core", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 5, name: "Binary Chip", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 6, name: "Cyber Dust", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 7, name: "Neon Spark", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 8, name: "Code Byte", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 9, name: "Wire Mesh", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 10, name: "Glitch Token", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 11, name: "Static Charge", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 12, name: "Pulse Node", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 13, name: "Flux Capacitor", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 14, name: "Bit Stream", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },
  { id: 15, name: "Scan Matrix", rarity_tier: 1, asset_url: "/assets/generated/tier1-crystal-mod.dim_200x200.png" },

  // Tier 2 - Rare (15 entries)
  { id: 16, name: "Energy Orb", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 17, name: "Plasma Core", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 18, name: "Quantum Relay", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 19, name: "Neural Link", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 20, name: "Holo Prism", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 21, name: "Cyber Matrix", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 22, name: "Void Shard", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 23, name: "Photon Beam", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 24, name: "Laser Grid", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 25, name: "Neon Pulse", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 26, name: "Data Nexus", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 27, name: "Sync Module", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 28, name: "Echo Chamber", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 29, name: "Phase Shifter", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },
  { id: 30, name: "Warp Drive", rarity_tier: 2, asset_url: "/assets/generated/tier2-energy-orb-mod.dim_200x200.png" },

  // Tier 3 - Legendary (12 entries)
  { id: 31, name: "Quantum Portal", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 32, name: "Singularity Core", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 33, name: "Infinity Matrix", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 34, name: "Cosmic Nexus", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 35, name: "Void Engine", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 36, name: "Hyper Reactor", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 37, name: "Stellar Forge", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 38, name: "Dimension Gate", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 39, name: "Time Crystal", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 40, name: "Omega Sphere", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 41, name: "Genesis Cube", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 42, name: "Apex Conduit", rarity_tier: 3, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },

  // Tier 4 - Mythic (6 entries)
  { id: 43, name: "Eternal Nexus", rarity_tier: 4, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 44, name: "Primordial Core", rarity_tier: 4, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 45, name: "Celestial Artifact", rarity_tier: 4, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 46, name: "Divine Catalyst", rarity_tier: 4, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 47, name: "Transcendent Relic", rarity_tier: 4, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
  { id: 48, name: "Omnipotent Shard", rarity_tier: 4, asset_url: "/assets/generated/tier3-quantum-portal-mod.dim_200x200.png" },
];
