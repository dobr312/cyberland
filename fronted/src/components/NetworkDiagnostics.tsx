import React, { useState, useEffect, useRef } from 'react';
import { Activity, Wifi, WifiOff, AlertTriangle, CheckCircle2, Clock, Zap, Globe } from 'lucide-react';
import { useAssetActor } from '../hooks/useAssetActor';

interface NetworkMetrics {
  status: 'connected' | 'disconnected' | 'checking';
  latency: number | null;
  lastCheck: Date | null;
  consecutiveFailures: number;
  uptime: number;
}

export default function NetworkDiagnostics() {
  const { actor: assetActor, isReady, envValidation } = useAssetActor();
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    status: 'checking',
    latency: null,
    lastCheck: null,
    consecutiveFailures: 0,
    uptime: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  // Perform health check ping to Asset Canister
  const performHealthCheck = async (): Promise<{ success: boolean; latency: number }> => {
    if (!assetActor) {
      return { success: false, latency: 0 };
    }

    const startTime = performance.now();
    
    try {
      // Perform a lightweight query to test connectivity
      await assetActor.listAssets();
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      console.log(`[Network Diagnostics] Health check successful - Latency: ${latency}ms`);
      return { success: true, latency };
    } catch (error) {
      console.error('[Network Diagnostics] Health check failed:', error);
      return { success: false, latency: 0 };
    }
  };

  // Update metrics based on health check result
  const updateMetrics = async () => {
    const result = await performHealthCheck();
    const now = new Date();
    const uptimeSeconds = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);

    setMetrics(prev => ({
      status: result.success ? 'connected' : 'disconnected',
      latency: result.success ? result.latency : prev.latency,
      lastCheck: now,
      consecutiveFailures: result.success ? 0 : prev.consecutiveFailures + 1,
      uptime: uptimeSeconds,
    }));
  };

  // Set up periodic health checks
  useEffect(() => {
    if (!isReady) {
      setMetrics(prev => ({
        ...prev,
        status: 'checking',
      }));
      return;
    }

    // Initial check
    updateMetrics();

    // Set up interval for periodic checks (every 10 seconds)
    checkIntervalRef.current = setInterval(() => {
      updateMetrics();
    }, 10000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isReady, assetActor]);

  // Determine status color and icon
  const getStatusDisplay = () => {
    switch (metrics.status) {
      case 'connected':
        return {
          icon: <Wifi className="w-5 h-5 text-[#00ff41]" />,
          color: 'text-[#00ff41]',
          bgColor: 'bg-[#00ff41]/10',
          borderColor: 'border-[#00ff41]/30',
          label: 'CONNECTED',
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-5 h-5 text-red-500" />,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'DISCONNECTED',
        };
      case 'checking':
      default:
        return {
          icon: <Activity className="w-5 h-5 text-yellow-500 animate-pulse" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: 'CHECKING',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Get latency status
  const getLatencyStatus = () => {
    if (metrics.latency === null) return { color: 'text-gray-500', label: 'N/A' };
    if (metrics.latency < 100) return { color: 'text-[#00ff41]', label: 'EXCELLENT' };
    if (metrics.latency < 300) return { color: 'text-[#00d4ff]', label: 'GOOD' };
    if (metrics.latency < 1000) return { color: 'text-yellow-500', label: 'FAIR' };
    return { color: 'text-red-500', label: 'POOR' };
  };

  const latencyStatus = getLatencyStatus();

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="bg-black/40 backdrop-blur-md border border-[#00d4ff]/30 rounded-lg shadow-[0_0_15px_rgba(0,212,255,0.3)] overflow-hidden">
      {/* Compact Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {statusDisplay.icon}
          <div className="text-left">
            <h3 className="text-sm font-bold text-white tracking-wider">NETWORK STATUS</h3>
            <p className={`text-xs font-mono ${statusDisplay.color}`}>{statusDisplay.label}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {metrics.latency !== null && (
            <div className="text-right">
              <p className="text-xs text-gray-400">LATENCY</p>
              <p className={`text-sm font-mono font-bold ${latencyStatus.color}`}>
                {metrics.latency}ms
              </p>
            </div>
          )}
          <Activity className={`w-4 h-4 text-[#00d4ff] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#00d4ff]/20">
          {/* Connection Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Latency Card */}
            <div className={`p-3 rounded-lg border ${statusDisplay.borderColor} ${statusDisplay.bgColor}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Latency</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${latencyStatus.color}`}>
                {metrics.latency !== null ? `${metrics.latency}ms` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">{latencyStatus.label}</p>
            </div>

            {/* Uptime Card */}
            <div className="p-3 rounded-lg border border-[#00ff41]/30 bg-[#00ff41]/10">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-[#00ff41]" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Uptime</span>
              </div>
              <p className="text-2xl font-bold font-mono text-[#00ff41]">
                {formatUptime(metrics.uptime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">SESSION DURATION</p>
            </div>
          </div>

          {/* Last Check Info */}
          {metrics.lastCheck && (
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>LAST CHECK:</span>
              <span className="text-[#00d4ff]">{metrics.lastCheck.toLocaleTimeString()}</span>
            </div>
          )}

          {/* Failure Warning */}
          {metrics.consecutiveFailures > 0 && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-yellow-500 font-bold">CONNECTION ISSUES DETECTED</p>
                <p className="text-xs text-yellow-400 mt-1">
                  {metrics.consecutiveFailures} consecutive failure{metrics.consecutiveFailures > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Environment Configuration Status */}
          {envValidation && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {envValidation.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Environment Configuration
                </span>
              </div>
              
              {envValidation.isValid && envValidation.config && (
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between items-center p-2 bg-[#00ff41]/5 rounded border border-[#00ff41]/20">
                    <span className="text-gray-500 flex items-center space-x-2">
                      <Globe className="w-3 h-3 text-[#00ff41]" />
                      <span>Network Target:</span>
                    </span>
                    <span className="text-[#00ff41] font-bold">{envValidation.config.network.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Canister ID:</span>
                    <span className="text-[#00d4ff]">{envValidation.config.assetCanisterId.slice(0, 15)}...</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-500">Gateway Nodes:</span>
                    {envValidation.config.gateways.map((gateway, index) => (
                      <div key={index} className="flex items-center space-x-2 pl-2">
                        <span className="text-[#00d4ff]/50">•</span>
                        <span className="text-[#00d4ff]">{gateway}</span>
                        {index === 0 && (
                          <span className="text-[#00ff41] text-[10px] px-1 py-0.5 bg-[#00ff41]/10 rounded">PRIMARY</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!envValidation.isValid && (
                <div className="space-y-1">
                  {envValidation.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-400">• {error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Network Target Confirmation Banner */}
          {envValidation?.isValid && envValidation.config?.network === 'ic' && (
            <div className="p-3 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-[#00ff41]" />
                <p className="text-xs text-[#00ff41] font-bold">
                  ✓ CONNECTED TO PUBLIC INTERNET COMPUTER NETWORK
                </p>
              </div>
              <p className="text-xs text-[#00ff41]/70 mt-1 ml-6">
                All operations are targeting the mainnet (ic) network with automatic gateway failover
              </p>
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={updateMetrics}
            disabled={!isReady}
            className="w-full px-4 py-2 bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 border border-[#00d4ff]/50 rounded text-[#00d4ff] text-xs font-bold tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            REFRESH STATUS
          </button>
        </div>
      )}
    </div>
  );
}
