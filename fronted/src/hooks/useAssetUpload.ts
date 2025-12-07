import { useState, useCallback } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory as assetIdlFactory } from '../asset-backend.idl';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * React hook for uploading GLB files to Asset Canister
 * Uses window.ic.plug.agent for authentication
 * Validates authorization and calls uploadLandModel method
 */
export function useAssetUpload() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const uploadGLB = useCallback(async (
    file: File,
    landTypeName: string
  ): Promise<UploadResult> => {
    setUploadState({ isUploading: true, progress: 0, error: null });

    try {
      // Check if Plug wallet is available
      if (!window.ic?.plug) {
        throw new Error('Plug wallet not found. Please install Plug wallet extension.');
      }

      // Check if Plug is connected
      const isConnected = await window.ic.plug.isConnected();
      if (!isConnected) {
        throw new Error('Plug wallet not connected. Please connect your wallet first.');
      }

      // Get the agent from Plug
      const agent = window.ic.plug.agent as HttpAgent;
      if (!agent) {
        throw new Error('Failed to get Plug wallet agent.');
      }

      setUploadState(prev => ({ ...prev, progress: 10 }));

      // Create Asset Canister actor
      const assetCanisterId = 'bd3sg-teaaa-aaaaa-qaaba-cai';
      const assetActor = Actor.createActor(assetIdlFactory, {
        agent,
        canisterId: assetCanisterId,
      });

      setUploadState(prev => ({ ...prev, progress: 20 }));

      // Read file as ArrayBuffer
      const fileBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });

      setUploadState(prev => ({ ...prev, progress: 40 }));

      // Convert to Uint8Array and then to Array for Candid
      const uint8Array = new Uint8Array(fileBytes);
      const byteArray = Array.from(uint8Array);

      setUploadState(prev => ({ ...prev, progress: 60 }));

      // Call uploadLandModel method
      const result = await (assetActor as any).uploadLandModel(
        landTypeName,
        byteArray
      );

      setUploadState(prev => ({ ...prev, progress: 100 }));

      // Success
      setUploadState({ isUploading: false, progress: 100, error: null });

      return {
        success: true,
        url: result,
      };
    } catch (error: any) {
      console.error('GLB upload error:', error);
      
      const errorMessage = error.message || 'Upload failed. Please try again.';
      setUploadState({ isUploading: false, progress: 0, error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const resetUpload = useCallback(() => {
    setUploadState({ isUploading: false, progress: 0, error: null });
  }, []);

  return {
    uploadGLB,
    resetUpload,
    ...uploadState,
  };
}
