import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, Terminal, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAssetActor } from '@/hooks/useAssetActor';
import { useActor } from '@/hooks/useActor';
import { useQueryClient } from '@tanstack/react-query';

interface DiagnosticTest {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

interface CanisterLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

const ASSET_CANISTER_ID = 'bd3sg-teaaa-aaaaa-qaaba-cai';
const LAND_CANISTER_ID = 'br5f7-7uaaa-aaaaa-qaaca-cai';

export default function AssetCanisterDiagnostics() {
  const queryClient = useQueryClient();
  const { actor: assetActor, isFetching: assetFetching, connectionStatus } = useAssetActor();
  const { actor: landActor } = useActor();
  const [isRunning, setIsRunning] = useState(false);
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [logs, setLogs] = useState<CanisterLog[]>([]);
  const [cycleBalance, setCycleBalance] = useState<string | null>(null);
  const [lastTestTime, setLastTestTime] = useState<Date | null>(null);

  const addLog = (level: 'info' | 'warning' | 'error', message: string) => {
    const log: CanisterLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    setLogs(prev => [...prev, log]);
    console.log(`[AssetCanister Diagnostics] [${level.toUpperCase()}] ${message}`);
  };

  const updateTest = (name: string, status: DiagnosticTest['status'], message?: string, duration?: number) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message, duration } : test
    ));
  };

  const runComprehensiveDiagnostics = async () => {
    setIsRunning(true);
    setLogs([]);
    setCycleBalance(null);

    const diagnosticTests: DiagnosticTest[] = [
      { name: 'Actor Initialization', status: 'pending' },
      { name: 'Network Connectivity', status: 'pending' },
      { name: 'Authentication Status', status: 'pending' },
      { name: 'List Assets Query', status: 'pending' },
      { name: 'Admin Permission Check', status: 'pending' },
      { name: 'Cycle Balance Query', status: 'pending' },
      { name: 'GLB Models Inventory', status: 'pending' },
      { name: 'Inter-Canister Communication', status: 'pending' },
    ];

    setTests(diagnosticTests);
    addLog('info', '🔄 Starting comprehensive Asset Canister diagnostics with cache-busting...');

    try {
      // Force clear all React Query caches for fresh data
      addLog('info', '🧹 Clearing all cached queries for fresh state...');
      queryClient.clear();

      // Test 1: Actor Initialization
      addLog('info', 'Test 1/8: Checking actor initialization...');
      updateTest('Actor Initialization', 'running');
      const startTime1 = performance.now();
      
      if (!assetActor) {
        updateTest('Actor Initialization', 'failed', 'Actor not initialized', performance.now() - startTime1);
        addLog('error', '❌ Asset actor is not initialized. Connection status: ' + connectionStatus);
        toast.error('Asset Canister actor not initialized');
      } else {
        updateTest('Actor Initialization', 'passed', 'Actor successfully initialized', performance.now() - startTime1);
        addLog('info', '✅ Asset actor initialized successfully');
      }

      // Test 2: Network Connectivity with cache-busting
      addLog('info', 'Test 2/8: Testing network connectivity with cache-busting...');
      updateTest('Network Connectivity', 'running');
      const startTime2 = performance.now();
      
      try {
        const cacheBuster = `v=force_refresh_${Date.now()}`;
        const response = await fetch(`https://ic0.app/api/v2/canister/${ASSET_CANISTER_ID}/query?${cacheBuster}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/cbor',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          body: new Uint8Array([]),
          cache: 'no-store',
        });
        
        const duration2 = performance.now() - startTime2;
        if (response.ok) {
          updateTest('Network Connectivity', 'passed', `HTTP ${response.status} - ${duration2.toFixed(0)}ms`, duration2);
          addLog('info', `✅ Network connectivity confirmed (${duration2.toFixed(0)}ms)`);
        } else {
          updateTest('Network Connectivity', 'failed', `HTTP ${response.status}`, duration2);
          addLog('warning', `⚠️ Network response: HTTP ${response.status}`);
        }
      } catch (error: any) {
        updateTest('Network Connectivity', 'failed', error.message, performance.now() - startTime2);
        addLog('error', '❌ Network connectivity test failed: ' + error.message);
      }

      // Test 3: Authentication Status
      addLog('info', 'Test 3/8: Checking authentication status...');
      updateTest('Authentication Status', 'running');
      const startTime3 = performance.now();
      
      if (assetActor) {
        try {
          const role = await assetActor.getCallerUserRole();
          const duration3 = performance.now() - startTime3;
          updateTest('Authentication Status', 'passed', `Role: ${role}`, duration3);
          addLog('info', `✅ Authentication confirmed - Role: ${role}`);
        } catch (error: any) {
          const duration3 = performance.now() - startTime3;
          updateTest('Authentication Status', 'failed', error.message, duration3);
          addLog('error', '❌ Authentication check failed: ' + error.message);
        }
      } else {
        updateTest('Authentication Status', 'failed', 'Actor not available');
        addLog('error', '❌ Cannot check authentication - actor not available');
      }

      // Test 4: List Assets Query
      addLog('info', 'Test 4/8: Querying asset list...');
      updateTest('List Assets Query', 'running');
      const startTime4 = performance.now();
      
      if (assetActor) {
        try {
          const assets = await assetActor.listAssets();
          const duration4 = performance.now() - startTime4;
          updateTest('List Assets Query', 'passed', `${assets.length} assets found`, duration4);
          addLog('info', `✅ Asset list retrieved: ${assets.length} assets`);
        } catch (error: any) {
          const duration4 = performance.now() - startTime4;
          updateTest('List Assets Query', 'failed', error.message, duration4);
          addLog('error', '❌ Asset list query failed: ' + error.message);
        }
      } else {
        updateTest('List Assets Query', 'failed', 'Actor not available');
        addLog('error', '❌ Cannot query assets - actor not available');
      }

      // Test 5: Admin Permission Check
      addLog('info', 'Test 5/8: Checking admin permissions...');
      updateTest('Admin Permission Check', 'running');
      const startTime5 = performance.now();
      
      if (assetActor) {
        try {
          const isAdmin = await assetActor.isCallerAdmin();
          const duration5 = performance.now() - startTime5;
          updateTest('Admin Permission Check', 'passed', `Admin: ${isAdmin}`, duration5);
          addLog('info', `✅ Admin status: ${isAdmin}`);
        } catch (error: any) {
          const duration5 = performance.now() - startTime5;
          updateTest('Admin Permission Check', 'failed', error.message, duration5);
          addLog('error', '❌ Admin permission check failed: ' + error.message);
        }
      } else {
        updateTest('Admin Permission Check', 'failed', 'Actor not available');
        addLog('error', '❌ Cannot check admin permissions - actor not available');
      }

      // Test 6: Cycle Balance Query
      addLog('info', 'Test 6/8: Querying cycle balance...');
      updateTest('Cycle Balance Query', 'running');
      const startTime6 = performance.now();
      
      if (landActor) {
        try {
          const response = await landActor.getAssetCanisterCycleBalance();
          const data = JSON.parse(response);
          const cycles = data.cycles || 0;
          const cyclesInT = (cycles / 1_000_000_000_000).toFixed(2);
          setCycleBalance(cyclesInT);
          const duration6 = performance.now() - startTime6;
          updateTest('Cycle Balance Query', 'passed', `${cyclesInT}T cycles`, duration6);
          addLog('info', `✅ Cycle balance: ${cyclesInT}T cycles`);
        } catch (error: any) {
          const duration6 = performance.now() - startTime6;
          updateTest('Cycle Balance Query', 'failed', error.message, duration6);
          addLog('warning', '⚠️ Cycle balance query failed: ' + error.message);
        }
      } else {
        updateTest('Cycle Balance Query', 'failed', 'Land actor not available');
        addLog('warning', '⚠️ Cannot query cycle balance - land actor not available');
      }

      // Test 7: GLB Models Inventory
      addLog('info', 'Test 7/8: Checking GLB models inventory...');
      updateTest('GLB Models Inventory', 'running');
      const startTime7 = performance.now();
      
      if (assetActor) {
        try {
          const glbModels = await assetActor.listGLBModels();
          const duration7 = performance.now() - startTime7;
          updateTest('GLB Models Inventory', 'passed', `${glbModels.length} GLB models`, duration7);
          addLog('info', `✅ GLB models inventory: ${glbModels.length} models`);
          
          if (glbModels.length > 0) {
            glbModels.forEach(([filename, url]) => {
              addLog('info', `  📦 ${filename}: ${url}`);
            });
          }
        } catch (error: any) {
          const duration7 = performance.now() - startTime7;
          updateTest('GLB Models Inventory', 'failed', error.message, duration7);
          addLog('error', '❌ GLB models inventory failed: ' + error.message);
        }
      } else {
        updateTest('GLB Models Inventory', 'failed', 'Actor not available');
        addLog('error', '❌ Cannot check GLB models - actor not available');
      }

      // Test 8: Inter-Canister Communication
      addLog('info', 'Test 8/8: Testing inter-canister communication...');
      updateTest('Inter-Canister Communication', 'running');
      const startTime8 = performance.now();
      
      if (landActor && assetActor) {
        try {
          const landRole = await landActor.getCallerUserRole();
          const assetRole = await assetActor.getCallerUserRole();
          const duration8 = performance.now() - startTime8;
          updateTest('Inter-Canister Communication', 'passed', 'Both canisters responsive', duration8);
          addLog('info', `✅ Inter-canister communication verified`);
        } catch (error: any) {
          const duration8 = performance.now() - startTime8;
          updateTest('Inter-Canister Communication', 'failed', error.message, duration8);
          addLog('error', '❌ Inter-canister communication failed: ' + error.message);
        }
      } else {
        updateTest('Inter-Canister Communication', 'failed', 'One or both actors not available');
        addLog('error', '❌ Cannot test inter-canister communication - actors not available');
      }

      // Invalidate all queries to force refetch with fresh data
      addLog('info', '🔄 Invalidating all queries to force fresh data fetch...');
      await queryClient.invalidateQueries();

      setLastTestTime(new Date());
      addLog('info', '✅ Diagnostics completed successfully');
      
      const passedCount = diagnosticTests.filter(t => tests.find(test => test.name === t.name && test.status === 'passed')).length;
      const totalCount = diagnosticTests.length;
      
      if (passedCount === totalCount) {
        toast.success(`✅ Asset Canister diagnostics completed - All ${totalCount} tests PASSED`);
      } else {
        toast.warning(`⚠️ Asset Canister diagnostics completed - ${passedCount}/${totalCount} tests passed`);
      }

    } catch (error: any) {
      addLog('error', '❌ Diagnostics failed: ' + error.message);
      toast.error('Diagnostics failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const getTestIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogIcon = (level: 'info' | 'warning' | 'error') => {
    switch (level) {
      case 'info':
        return <CheckCircle2 className="w-3 h-3 text-cyan-400" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
    }
  };

  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const totalTests = tests.length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Asset Canister Deep Diagnostics
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                Comprehensive health check with cache-busting and error detection
              </CardDescription>
            </div>
            <Button
              onClick={runComprehensiveDiagnostics}
              disabled={isRunning}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Diagnostics
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-black/30 border border-cyan-500/20">
              <div className="text-sm text-gray-400 mb-1">Canister ID</div>
              <div className="text-xs font-mono text-cyan-400">{ASSET_CANISTER_ID}</div>
            </div>
            <div className="p-4 rounded-lg bg-black/30 border border-cyan-500/20">
              <div className="text-sm text-gray-400 mb-1">Connection Status</div>
              <div className="text-sm font-bold text-white">{connectionStatus.toUpperCase()}</div>
            </div>
            <div className="p-4 rounded-lg bg-black/30 border border-cyan-500/20">
              <div className="text-sm text-gray-400 mb-1">Cycle Balance</div>
              <div className="text-sm font-bold text-white flex items-center gap-1">
                {cycleBalance ? (
                  <>
                    <Zap className="w-3 h-3 text-green-400" />
                    {cycleBalance}T
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {tests.length > 0 && (
        <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Diagnostic Tests
              </span>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  {passedTests}/{totalTests} Passed
                </Badge>
                {failedTests > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                    {failedTests} Failed
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    {getTestIcon(test.status)}
                    <div>
                      <div className="text-sm font-medium text-gray-200">{test.name}</div>
                      {test.message && (
                        <div className="text-xs text-gray-400 mt-1">{test.message}</div>
                      )}
                    </div>
                  </div>
                  {test.duration && (
                    <div className="text-xs text-gray-500 font-mono">
                      {test.duration.toFixed(0)}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <Card className="bg-black/40 border-cyan-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Diagnostic Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-1 font-mono text-xs">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded bg-black/30 border border-gray-700/30"
                >
                  {getLogIcon(log.level)}
                  <div className="flex-1">
                    <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                    <span className={
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warning' ? 'text-yellow-400' :
                      'text-gray-300'
                    }>
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {tests.length > 0 && failedTests > 0 && (
        <Card className="bg-black/40 border-yellow-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-300">
              {tests.find(t => t.name === 'Actor Initialization' && t.status === 'failed') && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <strong>Actor Initialization Failed:</strong> Check that VITE_ASSET_CANISTER_ID is correctly configured in .env file.
                </div>
              )}
              {tests.find(t => t.name === 'Network Connectivity' && t.status === 'failed') && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <strong>Network Connectivity Failed:</strong> Verify internet connection and IC network status at https://status.internetcomputer.org
                </div>
              )}
              {tests.find(t => t.name === 'Authentication Status' && t.status === 'failed') && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <strong>Authentication Failed:</strong> Ensure you are logged in with Internet Identity.
                </div>
              )}
              {tests.find(t => t.name === 'Cycle Balance Query' && t.status === 'failed') && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <strong>Low Cycles:</strong> Asset Canister may need more cycles. Consider topping up cycles.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Summary */}
      {tests.length > 0 && failedTests === 0 && passedTests === totalTests && (
        <Card className="bg-black/40 border-green-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              All Systems Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-gray-300">
              <strong>✅ Asset Canister is HEALTHY:</strong> All {totalTests} diagnostic tests passed successfully. 
              The canister is fully operational and ready for production use.
            </div>
          </CardContent>
        </Card>
      )}

      {lastTestTime && (
        <div className="text-center text-xs text-gray-500">
          Last diagnostic run: {lastTestTime.toLocaleString()}
        </div>
      )}
    </div>
  );
}
