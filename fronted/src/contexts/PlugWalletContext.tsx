import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { toast } from 'sonner';

interface PlugWalletContextType {
  isConnected: boolean;
  principal: Principal | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  createActor: <T>(canisterId: string, idlFactory: any) => T | null;
}

const PlugWalletContext = createContext<PlugWalletContextType | undefined>(undefined);

interface PlugWalletProviderProps {
  children: ReactNode;
  whitelist: string[];
}

export function PlugWalletProvider({ children, whitelist }: PlugWalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if Plug is installed
  const isPlugInstalled = useCallback(() => {
    return typeof window !== 'undefined' && !!window.ic?.plug;
  }, []);

  // Check existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!isPlugInstalled()) return;

      try {
        const plug = window.ic?.plug;
        if (!plug) return;

        const connected = await plug.isConnected();
        if (connected) {
          const principalId = await plug.agent.getPrincipal();
          setPrincipal(principalId);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error checking Plug connection:', error);
      }
    };

    checkConnection();
  }, [isPlugInstalled]);

  const connect = useCallback(async () => {
    if (!isPlugInstalled()) {
      toast.error('Plug Wallet not detected', {
        description: 'Please install Plug Wallet extension',
      });
      window.open('https://plugwallet.ooo/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const plug = window.ic?.plug;
      if (!plug) {
        throw new Error('Plug wallet not available');
      }

      const connected = await plug.requestConnect({
        whitelist,
        host: window.location.origin,
      });

      if (connected) {
        const principalId = await plug.agent.getPrincipal();
        setPrincipal(principalId);
        setIsConnected(true);
        toast.success('Wallet Connected', {
          description: `Principal: ${principalId.toString().slice(0, 8)}...`,
        });
      }
    } catch (error) {
      console.error('Error connecting to Plug:', error);
      toast.error('Connection Failed', {
        description: error instanceof Error ? error.message : 'Failed to connect wallet',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [whitelist, isPlugInstalled]);

  const disconnect = useCallback(() => {
    const plug = window.ic?.plug;
    if (isPlugInstalled() && plug?.disconnect) {
      plug.disconnect();
    }
    setIsConnected(false);
    setPrincipal(null);
    toast.info('Wallet Disconnected');
  }, [isPlugInstalled]);

  const createActor = useCallback(
    <T,>(canisterId: string, idlFactory: any): T | null => {
      if (!isConnected || !isPlugInstalled()) return null;

      try {
        const plug = window.ic?.plug;
        if (!plug) return null;

        const actor = plug.createActor({
          canisterId,
          interfaceFactory: idlFactory,
        });
        return actor as T;
      } catch (error) {
        console.error('Error creating actor:', error);
        return null;
      }
    },
    [isConnected, isPlugInstalled]
  );

  const value: PlugWalletContextType = {
    isConnected,
    principal,
    isConnecting,
    connect,
    disconnect,
    createActor,
  };

  return <PlugWalletContext.Provider value={value}>{children}</PlugWalletContext.Provider>;
}

export function usePlugWallet() {
  const context = useContext(PlugWalletContext);
  if (context === undefined) {
    throw new Error('usePlugWallet must be used within a PlugWalletProvider');
  }
  return context;
}

// Type declarations for Plug Wallet
declare global {
  interface Window {
    ic?: {
      plug?: {
        requestConnect: (options: { whitelist: string[]; host?: string }) => Promise<boolean>;
        isConnected: () => Promise<boolean>;
        disconnect?: () => void;
        createActor: <T>(options: { canisterId: string; interfaceFactory: any }) => T;
        agent: {
          getPrincipal: () => Promise<Principal>;
        };
      };
    };
  }
}
