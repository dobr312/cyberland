import { useEffect, useState, useRef } from 'react';
import { Actor, HttpAgent } from '@icp-sdk/core/agent';
import { idlFactory } from '../token-backend.idl';
import type { tokenBackendInterface } from '../token-backend';
import { useInternetIdentity } from './useInternetIdentity';

const MAX_RETRIES = 25;
const RETRY_DELAYS = [
  1000, 1000, 2000, 2000, 3000, 3000, 5000, 5000, 7000, 7000,
  10000, 10000, 15000, 15000, 20000, 20000, 25000, 25000, 30000, 30000,
  35000, 35000, 40000, 40000, 45000
];
const ACTOR_TIMEOUT = 120000; // 120 seconds (maximum recommended)

// Multiple IC gateways for automatic failover
// PRIMARY: ic0.app (RESTORED AS PRIMARY - DFINITY official gateway)
const IC_GATEWAYS = [
  'https://ic0.app',            // Primary: DFINITY official gateway (RESTORED)
  'https://boundary.ic0.app',   // Secondary: Boundary node gateway
  'https://icp-api.io',         // Tertiary: API-focused gateway
] as const;

const LOCAL_HOST = 'http://localhost:4943';

async function selectOptimalGateway(gateways: readonly string[]): Promise<string> {
  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch(`${gateway}/api/v2/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log(`[CyberToken] ✓ Gateway selected: ${gateway}`);
      return gateway;
    } catch (error) {
      console.warn(`[CyberToken] Gateway ${gateway} unavailable, trying next...`);
    }
  }
  
  return gateways[0];
}

export function useTokenActor() {
  const { identity, isInitializing } = useInternetIdentity();
  const [actor, setActor] = useState<tokenBackendInterface | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (isInitializingRef.current || isInitializing) {
      return;
    }

    const initActorWithRetry = async () => {
      isInitializingRef.current = true;
      setIsFetching(true);
      setError(null);

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(`[CyberToken Actor] Initialization attempt ${attempt + 1}/${MAX_RETRIES} with 120s timeout`);

          const tokenCanisterId = import.meta.env.VITE_CYBER_TOKEN_CANISTER_ID || 
                                  import.meta.env.CANISTER_ID_CYBER_TOKEN ||
                                  'w4q3i-7yaaa-aaaam-ab3oq-cai';

          if (!tokenCanisterId) {
            throw new Error('Token Canister ID not configured');
          }

          const network = import.meta.env.VITE_DFX_NETWORK || 'ic';
          const host = network === 'local' ? LOCAL_HOST : await selectOptimalGateway(IC_GATEWAYS);

          console.log('[CyberToken Actor] Config:', { canisterId: tokenCanisterId, network, host });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Token actor timeout (120s)')), ACTOR_TIMEOUT);
          });

          const actorPromise = (async () => {
            const agent = await HttpAgent.create({
              host,
              identity: identity || undefined,
            });

            if (network === 'local') {
              try {
                await agent.fetchRootKey();
                console.log('[CyberToken Actor] ✓ Root key fetched');
              } catch (err) {
                console.warn('[CyberToken Actor] Root key fetch failed:', err);
              }
            }

            return Actor.createActor(idlFactory, {
              agent,
              canisterId: tokenCanisterId,
            }) as tokenBackendInterface;
          })();

          const newActor = await Promise.race([actorPromise, timeoutPromise]);

          console.log('[CyberToken Actor] ✓ Actor initialized successfully');
          setActor(newActor);
          setError(null);
          isInitializingRef.current = false;
          setIsFetching(false);
          return;

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[CyberToken Actor] Attempt ${attempt + 1} failed:`, errorMessage);

          if (errorMessage.includes('not configured')) {
            setError(errorMessage);
            setActor(null);
            isInitializingRef.current = false;
            setIsFetching(false);
            return;
          }

          if (attempt === MAX_RETRIES - 1) {
            console.error('[CyberToken Actor] All retry attempts exhausted');
            setError(`Failed after ${MAX_RETRIES} attempts with 120s timeout and gateway failover: ${errorMessage}`);
            setActor(null);
            isInitializingRef.current = false;
            setIsFetching(false);
            return;
          }

          const delay = RETRY_DELAYS[attempt];
          console.log(`[CyberToken Actor] Retrying in ${delay}ms...`);
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
    isReady: !isFetching && !!actor && !error
  };
}
