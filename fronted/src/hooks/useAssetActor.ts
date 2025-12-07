import { useEffect, useState, useRef } from 'react';
import { Actor, HttpAgent } from '@icp-sdk/core/agent';
import { idlFactory } from '../asset-backend.idl';
import type { assetBackendInterface } from '../asset-backend';
import { useInternetIdentity } from './useInternetIdentity';
import { toast } from 'sonner';

const MAX_RETRIES = 25;
const RETRY_DELAYS = [
  1000, 1000, 2000, 2000, 3000, 3000, 5000, 5000, 7000, 7000,
  10000, 10000, 15000, 15000, 20000, 20000, 25000, 25000, 30000, 30000,
  35000, 35000, 40000, 40000, 45000
];
const ACTOR_TIMEOUT = 120000; // 120 seconds
const HEALTH_CHECK_TIMEOUT = 3000; // 3 seconds for fast health checks

// Multiple IC gateways for automatic failover
// PRIMARY: ic0.app (DFINITY official gateway)
const IC_GATEWAYS = [
  'https://ic0.app',            // Primary: DFINITY official gateway
  'https://boundary.ic0.app',   // Secondary: Boundary node gateway
  'https://icp-api.io',         // Tertiary: API-focused gateway
] as const;

const LOCAL_HOST = 'http://localhost:4943';

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: {
    assetCanisterId: string;
    network: string;
    gateways: readonly string[];
  };
}

function validateEnvironmentVariables(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const assetCanisterId = 
    import.meta.env.VITE_ASSET_CANISTER_ID || 
    import.meta.env.CANISTER_ID_ASSET_CANISTER;

  if (!assetCanisterId) {
    errors.push('VITE_ASSET_CANISTER_ID is not configured');
  } else if (assetCanisterId.length < 5) {
    errors.push(`Invalid Asset Canister ID format: "${assetCanisterId}"`);
  }

  const network = import.meta.env.VITE_DFX_NETWORK || 'ic';
  if (network !== 'ic' && network !== 'local') {
    warnings.push(`Unexpected VITE_DFX_NETWORK value: "${network}", using: ic`);
  }

  const isValid = errors.length === 0;

  if (isValid && assetCanisterId) {
    return {
      isValid: true,
      errors: [],
      warnings,
      config: {
        assetCanisterId,
        network: network === 'local' ? 'local' : 'ic',
        gateways: IC_GATEWAYS,
      },
    };
  }

  return {
    isValid: false,
    errors,
    warnings,
  };
}

async function checkGatewayHealth(gateway: string, canisterId: string, timeoutMs: number = HEALTH_CHECK_TIMEOUT): Promise<{ healthy: boolean; latency: number | null }> {
  try {
    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Use the stable /health endpoint via ic0.app gateway
    const cacheBuster = Date.now();
    const url = `https://${canisterId}.ic0.app/health`;
    
    const response = await fetch(`${url}?_=${cacheBuster}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);
    
    // Check if response contains "HEALTHY" text
    if (response.ok) {
      const text = await response.text();
      if (!text.includes('HEALTHY')) {
        console.warn(`[AssetCanister] Health check failed: ${text}`);
        return {
          healthy: false,
          latency,
        };
      }
    }
    
    return {
      healthy: response.ok,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: null,
    };
  }
}

async function selectOptimalGateway(gateways: readonly string[], canisterId: string): Promise<string> {
  console.log('[AssetCanister] Testing gateways for optimal connection...');
  
  // Test all gateways in parallel
  const healthChecks = await Promise.all(
    gateways.map(async (gateway) => ({
      gateway,
      ...(await checkGatewayHealth(gateway, canisterId)),
    }))
  );
  
  // Sort by health and latency
  const sortedGateways = healthChecks
    .filter(check => check.healthy)
    .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity));
  
  if (sortedGateways.length > 0) {
    const selected = sortedGateways[0];
    console.log(`[AssetCanister] ✓ Gateway selected: ${selected.gateway} (latency: ${selected.latency}ms)`);
    return selected.gateway;
  }
  
  console.warn('[AssetCanister] All gateways failed health check, using primary (ic0.app)');
  return gateways[0];
}

export function useAssetActor() {
  const { identity, isInitializing } = useInternetIdentity();
  const [actor, setActor] = useState<assetBackendInterface | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envValidation, setEnvValidation] = useState<EnvValidationResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  
  const isInitializingRef = useRef(false);
  const hasShownErrorToastRef = useRef(false);
  const currentIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset if identity changed
    const currentIdentityStr = identity?.getPrincipal().toString() || null;
    if (currentIdentityRef.current !== currentIdentityStr) {
      console.log('[AssetCanister] Identity changed, forcing full reconnection...');
      currentIdentityRef.current = currentIdentityStr;
      isInitializingRef.current = false;
      setActor(null);
      setIsFetching(true);
      setError(null);
      setConnectionStatus('connecting');
    }

    if (isInitializingRef.current || isInitializing) {
      return;
    }

    const validation = validateEnvironmentVariables();
    setEnvValidation(validation);

    if (!validation.isValid) {
      console.error('[AssetCanister Actor] Environment validation failed:', validation.errors);
      setError(validation.errors.join(' '));
      setActor(null);
      setIsFetching(false);
      setConnectionStatus('offline');
      return;
    }

    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        console.warn('[AssetCanister Actor]', warning);
      });
    }

    const initActorWithRetry = async () => {
      isInitializingRef.current = true;
      setIsFetching(true);
      setError(null);
      setConnectionStatus('connecting');

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(`[AssetCanister Actor] Initialization attempt ${attempt + 1}/${MAX_RETRIES} with 120s timeout`);

          const currentValidation = validateEnvironmentVariables();
          if (!currentValidation.isValid) {
            throw new Error(currentValidation.errors.join(' '));
          }

          const { assetCanisterId, network, gateways } = currentValidation.config!;
          
          const host = network === 'local' ? LOCAL_HOST : await selectOptimalGateway(gateways, assetCanisterId);

          console.log('═══════════════════════════════════════════════════════════════════════════');
          console.log('🌐 [AssetCanister Actor] Network Configuration');
          console.log('═══════════════════════════════════════════════════════════════════════════');
          console.log('  📍 Network:', network.toUpperCase());
          console.log('  🔗 Gateway:', host);
          console.log('  🆔 Canister ID:', assetCanisterId);
          console.log('  👤 Identity:', identity ? identity.getPrincipal().toString() : 'anonymous');
          console.log('  ⏱️  Timeout: 120 seconds');
          console.log('  🔄 Retry:', `${attempt + 1}/${MAX_RETRIES}`);
          console.log('  🌐 Failover: Enabled (ic0.app primary)');
          console.log('  🚀 Health Endpoint: /health');
          console.log('═══════════════════════════════════════════════════════════════════════════');

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Asset actor timeout (120s)')), ACTOR_TIMEOUT);
          });

          const actorPromise = (async () => {
            const agent = new HttpAgent({
              host: 'https://ic0.app',
              identity: identity || undefined,
            });

            console.log('[AssetCanister Actor] ✓ HttpAgent created');

            if (network === 'local') {
              try {
                await agent.fetchRootKey();
                console.log('[AssetCanister Actor] ✓ Root key fetched');
              } catch (err) {
                console.warn('[AssetCanister Actor] Root key fetch failed:', err);
              }
            }

            return Actor.createActor(idlFactory, {
              agent,
              canisterId: assetCanisterId,
            }) as assetBackendInterface;
          })();

          const newActor = await Promise.race([actorPromise, timeoutPromise]);

          // Quick connectivity test using listAssetsQuick (new lightweight endpoint)
          try {
            console.log('[AssetCanister Actor] Testing connectivity with listAssets...');
            
            const healthCheckPromise = (async () => {
              // Use the new lightweight listAssets endpoint
              const quickAssets = await newActor.listAssets();
              console.log('[AssetCanister Actor] ✓ Quick health check passed (listAssets)');
            })();

            const healthTimeout = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Health check timeout')), 5000);
            });

            await Promise.race([healthCheckPromise, healthTimeout]);
            
            console.log('[AssetCanister Actor] ✓ Connectivity test passed');
          } catch (testError) {
            console.warn('[AssetCanister Actor] Connectivity test failed:', testError);
            throw new Error('Asset Canister connectivity test failed');
          }

          console.log('[AssetCanister Actor] ✅ Actor initialized successfully');
          console.log('═══════════════════════════════════════════════════════════════════════════');
          
          setActor(newActor);
          setError(null);
          setConnectionStatus('connected');
          isInitializingRef.current = false;
          setIsFetching(false);
          
          if (hasShownErrorToastRef.current) {
            toast.success('Asset Canister Connected', {
              description: `Connected to ${network.toUpperCase()} network via ${host}`,
              duration: 3000,
            });
            hasShownErrorToastRef.current = false;
          }
          
          return;

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[AssetCanister Actor] Attempt ${attempt + 1} failed:`, errorMessage);

          if (
            errorMessage.includes('not configured') ||
            errorMessage.includes('Invalid Asset Canister ID')
          ) {
            setError(errorMessage);
            setActor(null);
            setConnectionStatus('offline');
            isInitializingRef.current = false;
            setIsFetching(false);
            return;
          }

          if (attempt === MAX_RETRIES - 1) {
            console.error('[AssetCanister Actor] All retry attempts exhausted');
            const finalError = `Failed after ${MAX_RETRIES} attempts with 120s timeout and gateway failover: ${errorMessage}`;
            setError(finalError);
            setActor(null);
            setConnectionStatus('offline');
            isInitializingRef.current = false;
            setIsFetching(false);
            
            if (!hasShownErrorToastRef.current) {
              toast.error('Asset Canister Connection Failed', {
                description: finalError,
                duration: 8000,
              });
              hasShownErrorToastRef.current = true;
            }
            return;
          }

          const delay = RETRY_DELAYS[attempt];
          console.log(`[AssetCanister Actor] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    initActorWithRetry();
  }, [identity, isInitializing]);

  return { 
    actor, 
    isFetching, 
    error,
    isReady: !isFetching && !!actor && !error,
    envValidation,
    connectionStatus,
  };
}
