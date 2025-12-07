import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface GatewayTestResult {
  gateway: string;
  status: 'success' | 'failed' | 'timeout';
  responseTime: number;
  httpStatus?: number;
  error?: string;
}

interface CanisterHealthReport {
  canisterId: string;
  canisterName: string;
  gatewayResults: GatewayTestResult[];
  overallStatus: 'online' | 'degraded' | 'offline';
  cycleBalance?: string;
  memoryUsage?: string;
  recommendations: string[];
}

const GATEWAYS = [
  'https://boundary.ic0.app',
  'https://ic0.app',
  'https://icp-api.io',
];

const LAND_CANISTER_ID = 'br5f7-7uaaa-aaaaa-qaaca-cai';
const ASSET_CANISTER_ID = 'bd3sg-teaaa-aaaaa-qaaba-cai';

export default function CanisterDiagnostics() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [landReport, setLandReport] = useState<CanisterHealthReport | null>(null);
  const [assetReport, setAssetReport] = useState<CanisterHealthReport | null>(null);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  // Auto-refresh every 60 seconds when enabled
  useEffect(() => {
    if (autoRefreshEnabled) {
      const interval = setInterval(() => {
        runHealthCheck(true);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [autoRefreshEnabled]);

  const testGatewayConnectivity = async (
    gateway: string,
    canisterId: string
  ): Promise<GatewayTestResult> => {
    const startTime = performance.now();
    const timeout = 10000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Add cache-busting parameter to force fresh data
      const cacheBuster = `v=force_refresh_${Date.now()}`;
      const url = `${gateway}/api/v2/canister/${canisterId}/query?${cacheBuster}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/cbor',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: new Uint8Array([]),
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      return {
        gateway,
        status: response.ok ? 'success' : 'failed',
        responseTime,
        httpStatus: response.status,
      };
    } catch (error: any) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      if (error.name === 'AbortError') {
        return {
          gateway,
          status: 'timeout',
          responseTime: timeout,
          error: 'Request timeout',
        };
      }

      return {
        gateway,
        status: 'failed',
        responseTime,
        error: error.message || 'Network error',
      };
    }
  };

  const determineOverallStatus = (results: GatewayTestResult[]): 'online' | 'degraded' | 'offline' => {
    const successCount = results.filter(r => r.status === 'success').length;
    
    if (successCount === results.length) return 'online';
    if (successCount > 0) return 'degraded';
    return 'offline';
  };

  const generateRecommendations = (
    canisterName: string,
    results: GatewayTestResult[],
    overallStatus: 'online' | 'degraded' | 'offline'
  ): string[] => {
    const recommendations: string[] = [];

    if (overallStatus === 'offline') {
      recommendations.push(`All gateways failed for ${canisterName}. Check if canister is deployed and running.`);
      recommendations.push('Verify canister ID is correct and matches deployed backend.');
      recommendations.push('Check Internet Computer network status at https://status.internetcomputer.org');
    } else if (overallStatus === 'degraded') {
      const failedGateways = results.filter(r => r.status !== 'success').map(r => r.gateway);
      recommendations.push(`Some gateways are unstable: ${failedGateways.join(', ')}`);
      
      const successfulGateways = results.filter(r => r.status === 'success');
      if (successfulGateways.length > 0) {
        const fastest = successfulGateways.reduce((prev, current) => 
          prev.responseTime < current.responseTime ? prev : current
        );
        recommendations.push(`Use ${fastest.gateway} as primary gateway (${fastest.responseTime}ms response time).`);
      }
    } else {
      const fastest = results.reduce((prev, current) => 
        prev.responseTime < current.responseTime ? prev : current
      );
      const slowest = results.reduce((prev, current) => 
        prev.responseTime > current.responseTime ? prev : current
      );

      if (slowest.responseTime > 2000) {
        recommendations.push(`${slowest.gateway} is slow (${slowest.responseTime}ms). Consider using faster alternatives.`);
      }

      recommendations.push(`Optimal gateway: ${fastest.gateway} (${fastest.responseTime}ms response time).`);
      
      if (fastest.responseTime < 500) {
        recommendations.push(`Excellent connectivity to ${canisterName}. All systems operational.`);
      }
    }

    return recommendations;
  };

  const runHealthCheck = async (silent = false) => {
    setIsRunning(true);
    if (!silent) {
      toast.info('🔄 Starting comprehensive network health check with cache-busting...');
    }

    try {
      // Force clear all React Query caches for fresh data
      console.log('🧹 Clearing all cached queries for fresh state...');
      queryClient.clear();

      // Test LandCanister connectivity across all gateways
      console.log('🔍 Testing LandCanister connectivity with cache-busting...');
      const landResults = await Promise.all(
        GATEWAYS.map(gateway => testGatewayConnectivity(gateway, LAND_CANISTER_ID))
      );

      const landStatus = determineOverallStatus(landResults);
      const landRecommendations = generateRecommendations('LandCanister', landResults, landStatus);

      const landHealthReport: CanisterHealthReport = {
        canisterId: LAND_CANISTER_ID,
        canisterName: 'LandCanister',
        gatewayResults: landResults,
        overallStatus: landStatus,
        recommendations: landRecommendations,
      };

      setLandReport(landHealthReport);
      console.log('✅ LandCanister health report:', landHealthReport);

      // Test AssetCanister connectivity across all gateways
      console.log('🔍 Testing AssetCanister connectivity with cache-busting...');
      const assetResults = await Promise.all(
        GATEWAYS.map(gateway => testGatewayConnectivity(gateway, ASSET_CANISTER_ID))
      );

      const assetStatus = determineOverallStatus(assetResults);
      const assetRecommendations = generateRecommendations('AssetCanister', assetResults, assetStatus);

      const assetHealthReport: CanisterHealthReport = {
        canisterId: ASSET_CANISTER_ID,
        canisterName: 'AssetCanister',
        gatewayResults: assetResults,
        overallStatus: assetStatus,
        recommendations: assetRecommendations,
      };

      setAssetReport(assetHealthReport);
      console.log('✅ AssetCanister health report:', assetHealthReport);

      setLastTestTime(new Date());
      
      // Invalidate all queries to force refetch with fresh data
      console.log('🔄 Invalidating all queries to force fresh data fetch...');
      await queryClient.invalidateQueries();
      
      if (!silent) {
        const allHealthy = landStatus === 'online' && assetStatus === 'online';
        if (allHealthy) {
          toast.success('✅ Network health check completed - All systems HEALTHY');
        } else {
          toast.warning('⚠️ Network health check completed - Some issues detected');
        }
      }
    } catch (error: any) {
      console.error('❌ Health check error:', error);
      if (!silent) {
        toast.error('Failed to complete health check: ' + error.message);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: 'online' | 'degraded' | 'offline') => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="w-3 h-3 mr-1" />HEALTHY</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50"><AlertTriangle className="w-3 h-3 mr-1" />DEGRADED</Badge>;
      case 'offline':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50"><XCircle className="w-3 h-3 mr-1" />OFFLINE</Badge>;
    }
  };

  const getGatewayStatusIcon = (status: 'success' | 'failed' | 'timeout') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'timeout':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const renderCanisterReport = (report: CanisterHealthReport | null) => {
    if (!report) return null;

    return (
      <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {report.canisterName}
              </CardTitle>
              <CardDescription className="text-gray-400 font-mono text-xs mt-1">
                {report.canisterId}
              </CardDescription>
            </div>
            {getStatusBadge(report.overallStatus)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gateway Test Results */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Gateway Connectivity</h4>
            <div className="space-y-2">
              {report.gatewayResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    {getGatewayStatusIcon(result.status)}
                    <div>
                      <div className="text-sm font-medium text-gray-200">
                        {result.gateway.replace('https://', '')}
                      </div>
                      {result.error && (
                        <div className="text-xs text-red-400">{result.error}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-cyan-400">
                      {result.responseTime}ms
                    </div>
                    {result.httpStatus && (
                      <div className="text-xs text-gray-500">
                        HTTP {result.httpStatus}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300">Recommendations</h4>
              <div className="space-y-2">
                {report.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm text-gray-300"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Network & Canister Health Diagnostics
          </CardTitle>
          <CardDescription className="text-gray-400">
            Real-time connectivity testing with cache-busting across all Internet Computer gateways
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {lastTestTime ? (
                <span>Last test: {lastTestTime.toLocaleTimeString()} {autoRefreshEnabled && '(Auto-refresh ON)'}</span>
              ) : (
                <span>No tests run yet</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                variant={autoRefreshEnabled ? "default" : "outline"}
                size="sm"
                className={autoRefreshEnabled ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                <Zap className="w-4 h-4 mr-2" />
                {autoRefreshEnabled ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
              </Button>
              <Button
                onClick={() => runHealthCheck(false)}
                disabled={isRunning}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Run Health Check
                  </>
                )}
              </Button>
            </div>
          </div>

          {isRunning && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm text-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="font-semibold">Testing in progress with cache-busting...</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-400 ml-6">
                <li>Clearing all cached queries for fresh state</li>
                <li>Testing connectivity to LandCanister ({LAND_CANISTER_ID})</li>
                <li>Testing connectivity to AssetCanister ({ASSET_CANISTER_ID})</li>
                <li>Measuring response times across 3 gateways</li>
                <li>Validating HTTP status codes</li>
                <li>Generating stability recommendations</li>
                <li>Invalidating queries to force fresh data fetch</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LandCanister Report */}
      {renderCanisterReport(landReport)}

      {/* AssetCanister Report */}
      {renderCanisterReport(assetReport)}

      {/* Summary Card */}
      {landReport && assetReport && (
        <Card className="bg-black/40 border-green-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Overall Network Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-black/30 border border-gray-700/50">
                <div className="text-sm text-gray-400 mb-1">LandCanister Status</div>
                <div className={`text-2xl font-bold ${
                  landReport.overallStatus === 'online' ? 'text-green-400' :
                  landReport.overallStatus === 'degraded' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {landReport.overallStatus === 'online' ? 'HEALTHY' : landReport.overallStatus.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {landReport.gatewayResults.filter(r => r.status === 'success').length}/
                  {landReport.gatewayResults.length} gateways operational
                </div>
              </div>
              <div className="p-4 rounded-lg bg-black/30 border border-gray-700/50">
                <div className="text-sm text-gray-400 mb-1">AssetCanister Status</div>
                <div className={`text-2xl font-bold ${
                  assetReport.overallStatus === 'online' ? 'text-green-400' :
                  assetReport.overallStatus === 'degraded' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {assetReport.overallStatus === 'online' ? 'HEALTHY' : assetReport.overallStatus.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {assetReport.gatewayResults.filter(r => r.status === 'success').length}/
                  {assetReport.gatewayResults.length} gateways operational
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
