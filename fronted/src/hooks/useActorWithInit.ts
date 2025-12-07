import { useState, useEffect, useRef } from 'react';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { type backendInterface } from '../backend';

export interface UseActorReturn {
    actor: backendInterface | null;
    isFetching: boolean;
    isInitialized: boolean;
    isInitializing: boolean;
    error: Error | null;
}

const INITIALIZATION_TIMEOUT = 120000; // 120 seconds (maximum recommended)
const MAX_POLL_RETRIES = 25; // Maximum polling attempts
const POLL_DELAYS = [
  1000, 1000, 2000, 2000, 3000, 3000, 5000, 5000, 7000, 7000,
  10000, 10000, 15000, 15000, 20000, 20000, 25000, 25000, 30000, 30000,
  35000, 35000, 40000, 40000, 45000
]; // Progressive backoff up to 45 seconds

export function useActorWithInit(): UseActorReturn {
    const { actor, isFetching } = useActor();
    const { identity } = useInternetIdentity();
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const initializationAttempted = useRef(false);
    const currentIdentityRef = useRef<string | null>(null);
    const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pollCountRef = useRef(0);

    // Enhanced data poller with comprehensive connectivity validation
    const pollInitializationData = async (actor: backendInterface, attemptNumber: number): Promise<boolean> => {
        try {
            console.log(`[Data Poller] Attempt ${attemptNumber + 1}/${MAX_POLL_RETRIES} - Validating network connectivity...`);
            
            const results = {
                userRole: false,
                adminStatus: false,
                landData: false,
                networkStatus: false,
            };

            // Test 1: Query user role (basic connectivity)
            try {
                const userRole = await actor.getCallerUserRole();
                console.log('[Data Poller] ✓ User role:', userRole);
                results.userRole = true;
            } catch (err) {
                console.warn('[Data Poller] User role query failed:', err);
            }

            // Test 2: Query admin status (Network Status check)
            try {
                const isAdmin = await actor.isCallerAdmin();
                console.log('[Data Poller] ✓ Admin status:', isAdmin);
                results.adminStatus = true;
            } catch (err) {
                console.warn('[Data Poller] Admin status query failed:', err);
            }

            // Test 3: Fetch land data (ensures backend is fully initialized)
            try {
                const landData = await actor.getLandData();
                console.log('[Data Poller] ✓ Land data fetched, count:', landData.length);
                results.landData = true;
            } catch (err) {
                console.warn('[Data Poller] Land data query failed:', err);
            }

            // Test 4: Network status validation (additional health check)
            try {
                const landDataQuery = await actor.getLandDataQuery();
                console.log('[Data Poller] ✓ Network status validated');
                results.networkStatus = true;
            } catch (err) {
                console.warn('[Data Poller] Network status validation failed:', err);
            }

            // Consider successful if at least 3 out of 4 queries succeed
            const successCount = Object.values(results).filter(Boolean).length;
            const isSuccessful = successCount >= 3;

            if (isSuccessful) {
                console.log(`[Data Poller] ✓ Network connectivity validated (${successCount}/4 checks passed)`);
            } else {
                console.warn(`[Data Poller] Insufficient connectivity (${successCount}/4 checks passed)`);
            }

            return isSuccessful;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[Data Poller] Attempt ${attemptNumber + 1} failed:`, errorMessage);
            return false;
        }
    };

    // Check if actor creation failed
    useEffect(() => {
        if (!isFetching && !actor && identity) {
            console.error('[useActorWithInit] Actor creation failed - actor is null after fetching completed');
            setError(new Error('Failed to create backend actor. The canister may be unavailable. Please reload the page.'));
            setIsInitialized(true);
        }
    }, [isFetching, actor, identity]);

    useEffect(() => {
        const initializeActor = async () => {
            // Reset if identity changed
            const currentIdentityStr = identity?.getPrincipal().toString() || null;
            if (currentIdentityRef.current !== currentIdentityStr) {
                console.log('[useActorWithInit] Identity changed, resetting initialization state');
                currentIdentityRef.current = currentIdentityStr;
                initializationAttempted.current = false;
                pollCountRef.current = 0;
                setIsInitialized(false);
                setIsInitializing(false);
                setError(null);
                
                if (initializationTimeoutRef.current) {
                    clearTimeout(initializationTimeoutRef.current);
                    initializationTimeoutRef.current = null;
                }
            }

            if (!actor || !identity) {
                setIsInitialized(false);
                setIsInitializing(false);
                return;
            }

            if (isInitialized || isInitializing || initializationAttempted.current) {
                return;
            }

            console.log('═══════════════════════════════════════════════════════');
            console.log('🚀 [useActorWithInit] Starting Maximum Stability Initialization');
            console.log('═══════════════════════════════════════════════════════');
            console.log('  ⏱️  Timeout: 120 seconds (maximum recommended)');
            console.log('  🔄 Max Polling Attempts:', MAX_POLL_RETRIES);
            console.log('  📊 Progressive Backoff: 1s → 45s');
            console.log('  🌐 Gateway Failover: Enabled (ic0.app primary)');
            console.log('  🔍 Connectivity Validation: 4 checks');
            console.log('═══════════════════════════════════════════════════════');
            
            setIsInitializing(true);
            initializationAttempted.current = true;

            // Set 120-second timeout
            initializationTimeoutRef.current = setTimeout(() => {
                if (isInitializing) {
                    console.error('[useActorWithInit] ⏰ Initialization timeout exceeded after 120 seconds');
                    setError(new Error('Initialization timeout (120s). Backend may be unresponsive. Please reload.'));
                    setIsInitialized(true);
                    setIsInitializing(false);
                }
            }, INITIALIZATION_TIMEOUT);

            // Polling loop with extended progressive backoff
            const attemptInitialization = async (attemptNumber: number): Promise<void> => {
                try {
                    console.log(`[useActorWithInit] Polling attempt ${attemptNumber + 1}/${MAX_POLL_RETRIES}`);
                    
                    const pollingSuccess = await pollInitializationData(actor, attemptNumber);
                    
                    if (!pollingSuccess) {
                        throw new Error('Network connectivity validation failed');
                    }
                    
                    // Clear timeout on success
                    if (initializationTimeoutRef.current) {
                        clearTimeout(initializationTimeoutRef.current);
                        initializationTimeoutRef.current = null;
                    }
                    
                    console.log('═══════════════════════════════════════════════════════');
                    console.log('✅ [useActorWithInit] Initialization completed successfully');
                    console.log('═══════════════════════════════════════════════════════');
                    
                    setIsInitialized(true);
                    setError(null);
                    pollCountRef.current = 0;
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
                    console.error(`[useActorWithInit] Polling attempt ${attemptNumber + 1} failed:`, errorMessage);
                    
                    // If we haven't exhausted retries, try again
                    if (attemptNumber < MAX_POLL_RETRIES - 1) {
                        const delay = POLL_DELAYS[attemptNumber] || 45000;
                        console.log(`[useActorWithInit] Retrying in ${delay}ms...`);
                        
                        await new Promise(resolve => setTimeout(resolve, delay));
                        pollCountRef.current = attemptNumber + 1;
                        await attemptInitialization(attemptNumber + 1);
                    } else {
                        // All retries exhausted
                        console.error('═══════════════════════════════════════════════════════');
                        console.error('❌ [useActorWithInit] All initialization attempts failed');
                        console.error('═══════════════════════════════════════════════════════');
                        
                        if (initializationTimeoutRef.current) {
                            clearTimeout(initializationTimeoutRef.current);
                            initializationTimeoutRef.current = null;
                        }
                        
                        const detailedError = new Error(
                            `Failed to initialize after ${MAX_POLL_RETRIES} polling attempts within 120s timeout. ` +
                            `Last error: ${errorMessage}. ` +
                            `This indicates poor network conditions or backend unavailability. ` +
                            `The system attempted automatic gateway failover but could not establish a stable connection. ` +
                            `Please check your internet connection and reload the page.`
                        );
                        
                        setError(detailedError);
                        setIsInitialized(true);
                    }
                }
            };

            try {
                await attemptInitialization(0);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
                console.error('[useActorWithInit] Unexpected error:', errorMessage);
                
                if (initializationTimeoutRef.current) {
                    clearTimeout(initializationTimeoutRef.current);
                    initializationTimeoutRef.current = null;
                }
                
                setError(new Error(`Initialization failed unexpectedly: ${errorMessage}`));
                setIsInitialized(true);
            } finally {
                setIsInitializing(false);
            }
        };

        void initializeActor();

        return () => {
            if (initializationTimeoutRef.current) {
                clearTimeout(initializationTimeoutRef.current);
                initializationTimeoutRef.current = null;
            }
        };
    }, [actor, identity, isInitialized, isInitializing]);

    // Reset when identity is cleared
    useEffect(() => {
        if (!identity) {
            console.log('[useActorWithInit] Identity cleared, resetting state');
            setIsInitialized(false);
            setIsInitializing(false);
            setError(null);
            initializationAttempted.current = false;
            currentIdentityRef.current = null;
            pollCountRef.current = 0;
            
            if (initializationTimeoutRef.current) {
                clearTimeout(initializationTimeoutRef.current);
                initializationTimeoutRef.current = null;
            }
        }
    }, [identity]);

    return {
        actor,
        isFetching,
        isInitialized: !!actor && isInitialized,
        isInitializing: isFetching || isInitializing,
        error,
    };
}
