// Build information for cache busting and deployment verification
declare const __BUILD_TIMESTAMP__: string;

export const BUILD_INFO = {
  timestamp: typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : Date.now().toString(),
  version: `v${new Date(typeof __BUILD_TIMESTAMP__ !== 'undefined' ? parseInt(__BUILD_TIMESTAMP__) : Date.now()).toISOString()}`,
};

// Add cache-busting query parameter to URLs with force_refresh flag
export function addCacheBuster(url: string, forceRefresh = false): string {
  const separator = url.includes('?') ? '&' : '?';
  const timestamp = forceRefresh ? `force_refresh_${Date.now()}` : BUILD_INFO.timestamp;
  return `${url}${separator}v=${timestamp}`;
}

// Log build info on app initialization
export function logBuildInfo(): void {
  console.log('🚀 CyberGenesis Land Mint DApp');
  console.log('📦 Build Version:', BUILD_INFO.version);
  console.log('⏰ Build Timestamp:', BUILD_INFO.timestamp);
  console.log('🔄 Cache Busting: Enabled');
  console.log('🔥 Force Refresh: Available via ?v=force_refresh parameter');
}
