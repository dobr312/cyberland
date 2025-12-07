// Mainnet Configuration for CyberGenesis Land Mint DApp
// This file contains production-ready configuration for ICP mainnet deployment

export const MAINNET_CONFIG = {
  // Network configuration
  network: 'ic',
  host: 'https://ic0.app',
  
  // Canister IDs (to be updated after mainnet deployment)
  // VERIFIED CORRECT IDs - December 6, 2025
  canisters: {
    governance: process.env.GOVERNANCE_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai',
    asset: process.env.ASSET_CANISTER_ID || 'bd3sg-teaaa-aaaaa-qaaba-cai',
    token: process.env.TOKEN_CANISTER_ID || 'w4q3i-7yaaa-aaaam-ab3oq-cai', // CORRECTED: was w4q31-7yaaa-aaaam-ab3qq-cai
    land: process.env.LAND_CANISTER_ID || 'br5f7-7uaaa-aaaaa-qaaca-cai', // CORRECTED: was br5ff7-7uaaa-aaaaa-qaaca-cai
    marketplace: process.env.MARKETPLACE_CANISTER_ID || 'be2us-64aaa-aaaaa-qaabq-cai',
    frontend: process.env.FRONTEND_CANISTER_ID || '',
  },
  
  // Asset URLs (stable format for mainnet)
  assetBaseUrl: (canisterId: string) => `https://${canisterId}.raw.ic0.app`,
  
  // Model URL generator
  getModelUrl: (canisterId: string, filename: string) => 
    `https://${canisterId}.raw.ic0.app/${filename}`,
  
  // Tier-based model filenames
  modelFilenames: {
    tier1: 'tier1_common_crystal.glb',
    tier2: 'tier2_rare_energy_orb.glb',
    tier3: 'tier3_legendary_quantum_portal.glb',
    tier4: 'tier4_mythic_void_nexus.glb',
  },
  
  // Internet Identity configuration
  internetIdentity: {
    providerUrl: 'https://identity.ic0.app',
    derivationOrigin: undefined, // Use default for mainnet
  },
  
  // Plug Wallet configuration
  plugWallet: {
    whitelist: [] as string[], // To be populated with canister IDs
    host: 'https://mainnet.dfinity.network',
  },
  
  // Feature flags
  features: {
    enablePlugWallet: true,
    enableInternetIdentity: true,
    enable3DModels: true,
    enableMarketplace: true,
    enableGovernance: true,
    enableDiscovery: true,
  },
  
  // Performance settings
  performance: {
    modelLoadTimeout: 10000, // 10 seconds
    queryRetryAttempts: 3,
    queryRetryDelay: 1000,
  },
};

// Initialize mainnet configuration with deployed canister IDs
export function initializeMainnetConfig(canisterIds: {
  governance?: string;
  asset?: string;
  token?: string;
  land?: string;
  marketplace?: string;
  frontend?: string;
}) {
  Object.assign(MAINNET_CONFIG.canisters, canisterIds);
  
  // Update Plug Wallet whitelist with all canister IDs
  MAINNET_CONFIG.plugWallet.whitelist = Object.values(MAINNET_CONFIG.canisters).filter(Boolean);
  
  return MAINNET_CONFIG;
}

// Validate mainnet configuration
export function validateMainnetConfig(): boolean {
  const requiredCanisters = ['governance', 'asset', 'token', 'land', 'marketplace'];
  
  for (const canister of requiredCanisters) {
    if (!MAINNET_CONFIG.canisters[canister as keyof typeof MAINNET_CONFIG.canisters]) {
      console.error(`Missing canister ID for: ${canister}`);
      return false;
    }
  }
  
  return true;
}

// Get full model URL for a given tier
export function getMainnetModelUrl(tier: number): string {
  const assetCanisterId = MAINNET_CONFIG.canisters.asset;
  
  if (!assetCanisterId) {
    console.warn('Asset canister ID not configured, using fallback');
    return '';
  }
  
  const filename = MAINNET_CONFIG.modelFilenames[`tier${tier}` as keyof typeof MAINNET_CONFIG.modelFilenames];
  
  if (!filename) {
    console.warn(`No model filename configured for tier ${tier}`);
    return '';
  }
  
  return MAINNET_CONFIG.getModelUrl(assetCanisterId, filename);
}

export default MAINNET_CONFIG;

