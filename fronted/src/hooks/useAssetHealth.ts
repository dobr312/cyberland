import { useState, useEffect } from 'react';

type AssetHealthStatus = 'checking' | 'healthy' | 'error';

/**
 * React hook for monitoring Asset Canister health status
 * Performs delayed health check (1 second delay) with cache-busting
 * Returns current health status: 'checking' | 'healthy' | 'error'
 */
export function useAssetHealth() {
  const [status, setStatus] = useState<AssetHealthStatus>('checking');

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      // 1 second delay before checking
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!mounted) return;

      try {
        const assetCanisterId = 'bd3sg-teaaa-aaaaa-qaaba-cai';
        const healthUrl = `https://${assetCanisterId}.ic0.app/health?_=${Date.now()}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });

        clearTimeout(timeoutId);

        if (mounted) {
          if (response.ok && response.status === 200) {
            setStatus('healthy');
          } else {
            setStatus('error');
          }
        }
      } catch (error) {
        console.error('Asset health check failed:', error);
        if (mounted) {
          setStatus('error');
        }
      }
    };

    checkHealth();

    return () => {
      mounted = false;
    };
  }, []);

  return status;
}
