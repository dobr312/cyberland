import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlugWallet } from '../contexts/PlugWalletContext';
import { toast } from 'sonner';
import { idlFactory as tokenIdlFactory } from '../token-backend.idl';
import { idlFactory as marketplaceIdlFactory } from '../marketplace-backend.idl';
import { idlFactory as governanceIdlFactory } from '../governance-backend.idl';
import { loadConfig } from '../config';
import type { tokenBackendInterface } from '../token-backend';
import type { marketplaceBackendInterface, ItemType } from '../marketplace-backend';
import type { governanceBackendInterface } from '../governance-backend';

// Note: We use the existing actor hooks for land canister operations
// since they already work with Internet Identity authentication

// Hook to execute transactions with Plug Wallet
export function usePlugWalletTransaction<TData, TVariables>(
  canisterType: 'token' | 'marketplace' | 'governance',
  mutationFn: (actor: any, variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    invalidateQueries?: string[];
  }
) {
  const { isConnected, createActor } = usePlugWallet();
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      if (!isConnected) {
        throw new Error('Plug Wallet not connected');
      }

      const config = await loadConfig();
      let canisterId: string;
      let idlFactory: any;

      switch (canisterType) {
        case 'token':
          canisterId = config.backend_canister_id;
          idlFactory = tokenIdlFactory;
          break;
        case 'marketplace':
          canisterId = config.backend_canister_id;
          idlFactory = marketplaceIdlFactory;
          break;
        case 'governance':
          canisterId = config.backend_canister_id;
          idlFactory = governanceIdlFactory;
          break;
        default:
          throw new Error('Invalid canister type');
      }

      const actor = createActor(canisterId, idlFactory);
      if (!actor) {
        throw new Error('Failed to create actor');
      }

      return mutationFn(actor, variables);
    },
    onSuccess: (data) => {
      if (options?.onSuccess) {
        options.onSuccess(data);
      }
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }
    },
    onError: (error) => {
      toast.error('Transaction Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// Specific transaction hooks using Plug Wallet for marketplace operations

export function usePlugBuyItem() {
  return usePlugWalletTransaction<any, bigint>(
    'marketplace',
    async (actor: marketplaceBackendInterface, listingId: bigint) => {
      return actor.buy_item(listingId);
    },
    {
      invalidateQueries: ['activeListings', 'tokenBalance', 'landData', 'myModifications'],
    }
  );
}

export function usePlugListItem() {
  return usePlugWalletTransaction<bigint, { itemId: bigint; itemType: ItemType; price: bigint }>(
    'marketplace',
    async (actor: marketplaceBackendInterface, { itemId, itemType, price }) => {
      return actor.list_item(itemId, itemType, price);
    },
    {
      invalidateQueries: ['activeListings', 'userListings'],
    }
  );
}

export function usePlugCancelListing() {
  return usePlugWalletTransaction<void, bigint>(
    'marketplace',
    async (actor: marketplaceBackendInterface, listingId: bigint) => {
      return actor.cancelListing(listingId);
    },
    {
      invalidateQueries: ['activeListings', 'userListings'],
    }
  );
}

// Governance transaction hooks using Plug Wallet

export function usePlugStakeTokens() {
  return usePlugWalletTransaction<any, bigint>(
    'governance',
    async (actor: governanceBackendInterface, amount: bigint) => {
      return actor.stakeTokens(amount);
    },
    {
      invalidateQueries: ['stakedBalance', 'tokenBalance'],
    }
  );
}

export function usePlugCreateProposal() {
  return usePlugWalletTransaction<bigint, { title: string; description: string }>(
    'governance',
    async (actor: governanceBackendInterface, { title, description }) => {
      return actor.createProposal(title, description);
    },
    {
      invalidateQueries: ['activeProposals'],
    }
  );
}

export function usePlugVote() {
  return usePlugWalletTransaction<any, { proposalId: bigint; choice: boolean }>(
    'governance',
    async (actor: governanceBackendInterface, { proposalId, choice }) => {
      return actor.vote(proposalId, choice);
    },
    {
      invalidateQueries: ['activeProposals', 'myVotes'],
    }
  );
}
