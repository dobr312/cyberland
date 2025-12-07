import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

// Define ValidationResult interface locally to avoid import issues
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Inline validation function to avoid circular dependencies
function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for Land Canister ID
  const landCanisterId = import.meta.env.VITE_LAND_CANISTER_ID || import.meta.env.CANISTER_ID_BACKEND;
  if (!landCanisterId) {
    errors.push('VITE_LAND_CANISTER_ID is not configured');
  }

  // Check for Asset Canister ID
  const assetCanisterId = import.meta.env.VITE_ASSET_CANISTER_ID || import.meta.env.CANISTER_ID_ASSET_CANISTER;
  if (!assetCanisterId) {
    errors.push('VITE_ASSET_CANISTER_ID is not configured');
  }

  // Check for Token Canister ID
  const tokenCanisterId = import.meta.env.VITE_CYBER_TOKEN_CANISTER_ID || import.meta.env.CANISTER_ID_CYBER_TOKEN;
  if (!tokenCanisterId) {
    warnings.push('VITE_CYBER_TOKEN_CANISTER_ID is not configured');
  }

  // Check for network configuration
  const network = import.meta.env.VITE_DFX_NETWORK;
  if (!network) {
    errors.push('VITE_DFX_NETWORK is not configured');
  } else if (network !== 'ic' && network !== 'local') {
    warnings.push(`Unexpected VITE_DFX_NETWORK value: "${network}". Expected "ic" or "local".`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export default function ConfigValidator() {
  const validation = validateEnvironment();

  // Only show if there are errors
  if (validation.isValid) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-900/95 backdrop-blur-md border-b-2 border-red-500 shadow-[0_4px_20px_rgba(255,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-start space-x-4">
          <XCircle className="w-8 h-8 text-red-300 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-red-100 mb-2 tracking-wider">
              ⚠️ CONFIGURATION ERROR
            </h2>
            <p className="text-red-200 mb-3">
              Critical environment variables are missing. The application cannot function properly without these settings.
            </p>
            
            {/* Error List */}
            <div className="space-y-2 mb-4">
              {validation.errors.map((error, index) => (
                <div key={index} className="flex items-start space-x-2 bg-red-800/50 p-3 rounded border border-red-600/50">
                  <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                  <p className="text-red-100 text-sm">{error}</p>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-2 mb-4">
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start space-x-2 bg-yellow-900/30 p-3 rounded border border-yellow-600/50">
                    <AlertTriangle className="w-4 h-4 text-yellow-300 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-100 text-sm">{warning}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Fix Guide */}
            <div className="bg-black/40 p-4 rounded border border-red-500/30">
              <h3 className="text-red-100 font-bold mb-2 text-sm">QUICK FIX:</h3>
              <ol className="list-decimal list-inside space-y-1 text-red-200 text-xs font-mono">
                <li>Create or update <code className="bg-red-900/50 px-1 py-0.5 rounded">frontend/.env</code> file</li>
                <li>Add missing environment variables:
                  <pre className="mt-2 bg-black/60 p-2 rounded text-[#00ff41] overflow-x-auto">
{`VITE_DFX_NETWORK=ic
VITE_LAND_CANISTER_ID=br5f7-7uaaa-aaaaa-qaaca-cai
VITE_ASSET_CANISTER_ID=bd3sg-teaaa-aaaaa-qaaba-cai
VITE_CYBER_TOKEN_CANISTER_ID=w4q3i-7yaaa-aaaam-ab3oq-cai`}
                  </pre>
                </li>
                <li>Rebuild the frontend: <code className="bg-red-900/50 px-1 py-0.5 rounded">npm run build</code></li>
                <li>Reload this page</li>
              </ol>
            </div>

            {/* Troubleshooting */}
            <div className="mt-4 text-xs text-red-300">
              <p className="font-bold mb-1">TROUBLESHOOTING:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Get canister IDs: <code className="bg-red-900/50 px-1 py-0.5 rounded">dfx canister id &lt;canister_name&gt; --network ic</code></li>
                <li>Verify .env file location: <code className="bg-red-900/50 px-1 py-0.5 rounded">frontend/.env</code></li>
                <li>Check environment variables are loaded: <code className="bg-red-900/50 px-1 py-0.5 rounded">console.log(import.meta.env)</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
