import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActorWithInit } from './useActorWithInit';
import { useTokenActor } from './useTokenActor';
import { useMarketplaceActor } from './useMarketplaceActor';
import { useGovernanceActor } from './useGovernanceActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { LandData, ClaimResult, UpgradeResult, UserProfile, TopLandEntry, LootCache, Modification, DiscoverCacheResult, Modifier } from '../backend';
import type { Account } from '../token-backend';
import type { Listing, BuyResult, ItemType } from '../marketplace-backend';
import type { Proposal, StakeResult, VoteResult } from '../governance-backend';

const QUERY_TIMEOUT = 30000; // 30 seconds timeout for queries

// Helper function to wrap async calls with timeout
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timeout - operation took longer than ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

export function useGetLandData() {
  const { actor, isFetching, isInitialized } = useActorWithInit();

  return useQuery<LandData[]>({
    queryKey: ['landData'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        const data = await withTimeout(
          actor.getLandData(),
          QUERY_TIMEOUT,
          'Get land data'
        );
        return data;
      } catch (error) {
        console.error('Error fetching land data:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load land data: ${error.message}` 
            : 'Failed to load land data'
        );
      }
    },
    enabled: !!actor && !isFetching && isInitialized,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

export function useGetTokenBalance() {
  const { actor: tokenActor, isFetching: tokenFetching } = useTokenActor();
  const { identity } = useInternetIdentity();

  return useQuery<bigint>({
    queryKey: ['tokenBalance'],
    queryFn: async () => {
      if (!tokenActor || !identity) {
        console.error('[Token Balance] Token actor or identity not initialized');
        throw new Error('Token actor or identity not initialized');
      }
      
      try {
        const principal = identity.getPrincipal();
        const account: Account = {
          owner: principal,
          subaccount: [],
        };
        
        console.log(`[Token Balance] 🔍 Querying balance for principal: ${principal.toText()}`);
        
        const balance = await withTimeout(
          tokenActor.icrc1_balance_of(account),
          QUERY_TIMEOUT,
          'Get token balance'
        );
        
        console.log(`[Token Balance] ✓ Fetched balance: ${balance.toString()} (raw e8s units)`);
        console.log(`[Token Balance] ✓ Decimal equivalent: ${Number(balance) / 1e8} CBR`);
        
        // Validate balance is a valid bigint
        if (typeof balance !== 'bigint') {
          console.error('[Token Balance] Invalid balance type received:', typeof balance);
          throw new Error('Invalid balance format received from token canister');
        }
        
        // Balance is returned as raw Nat (e8s for CBR with 8 decimals)
        // No conversion needed here - conversion happens in display layer using formatTokenBalance()
        return balance;
      } catch (error) {
        console.error('[Token Balance] ✗ Error fetching token balance:', error);
        
        // Provide more detailed error messages
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            throw new Error('Token balance query timed out - please check your connection');
          } else if (error.message.includes('not initialized')) {
            throw new Error('Token canister not properly initialized');
          } else {
            throw new Error(`Failed to load token balance: ${error.message}`);
          }
        }
        
        throw new Error('Failed to load token balance: Unknown error');
      }
    },
    enabled: !!tokenActor && !tokenFetching && !!identity,
    retry: 3, // Increased retry attempts for balance queries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 5000, // Cache for 5 seconds to reduce unnecessary calls
    refetchOnWindowFocus: true, // Refetch when user returns to window
    refetchOnMount: true, // Always refetch on component mount
  });
}

export function useGetCanisterTokenBalance() {
  const { actor: tokenActor, isFetching: tokenFetching } = useTokenActor();

  return useQuery<bigint>({
    queryKey: ['canisterTokenBalance'],
    queryFn: async () => {
      if (!tokenActor) {
        console.error('[Canister Balance] Token actor not initialized');
        throw new Error('Token actor not initialized');
      }
      
      try {
        console.log('[Canister Balance] 🔍 Querying canister token balance...');
        
        const balance = await withTimeout(
          tokenActor.getCanisterTokenBalance(),
          QUERY_TIMEOUT,
          'Get canister token balance'
        );
        
        console.log(`[Canister Balance] ✓ Canister balance: ${balance.toString()} (raw e8s units)`);
        console.log(`[Canister Balance] ✓ Decimal equivalent: ${Number(balance) / 1e8} CBR`);
        
        return balance;
      } catch (error) {
        console.error('[Canister Balance] ✗ Error fetching canister balance:', error);
        
        if (error instanceof Error) {
          if (error.message.includes('Unauthorized')) {
            throw new Error('Admin access required to view canister balance');
          } else if (error.message.includes('timeout')) {
            throw new Error('Canister balance query timed out');
          } else {
            throw new Error(`Failed to load canister balance: ${error.message}`);
          }
        }
        
        throw new Error('Failed to load canister balance: Unknown error');
      }
    },
    enabled: !!tokenActor && !tokenFetching,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 10000, // Cache for 10 seconds
  });
}

export function useMintLand() {
  const { actor } = useActorWithInit();
  const queryClient = useQueryClient();

  return useMutation<LandData, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        const result = await withTimeout(
          actor.mintLand(),
          QUERY_TIMEOUT,
          'Mint land'
        );
        return result;
      } catch (error) {
        console.error('Error minting land:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to mint land: ${error.message}` 
            : 'Failed to mint land'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landData'] });
    },
  });
}

export function useClaimRewards() {
  const { actor } = useActorWithInit();
  const queryClient = useQueryClient();

  return useMutation<ClaimResult, Error, bigint>({
    mutationFn: async (landId: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        console.log(`[Claim Rewards] 🎯 Claiming rewards for land ID: ${landId}`);
        const result = await withTimeout(
          actor.claimRewards(landId),
          QUERY_TIMEOUT,
          'Claim rewards'
        );
        console.log(`[Claim Rewards] Result:`, result);
        return result;
      } catch (error) {
        console.error('[Claim Rewards] ✗ Error:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to claim rewards: ${error.message}` 
            : 'Failed to claim rewards'
        );
      }
    },
    onSuccess: async (result, landId) => {
      console.log('[Claim Rewards] ✓ Success - invalidating queries');
      
      // Invalidate queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['landData'] });
      await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
      await queryClient.invalidateQueries({ queryKey: ['topLands'] });
      
      // Log the claimed amount for debugging
      if (result.__kind__ === 'success') {
        console.log(`[Claim Rewards] ✓ Claimed ${result.success.tokensClaimed.toString()} tokens (raw e8s)`);
        console.log(`[Claim Rewards] ✓ Decimal: ${Number(result.success.tokensClaimed) / 1e8} CBR`);
        console.log(`[Claim Rewards] 🔄 Balance refetch triggered`);
      }
    },
  });
}

export function useUpgradePlot() {
  const { actor } = useActorWithInit();
  const queryClient = useQueryClient();

  return useMutation<UpgradeResult, Error, { landId: bigint; cost: bigint }>({
    mutationFn: async ({ landId, cost }) => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        console.log(`[Upgrade Plot] 🎯 Upgrading land ID: ${landId}, cost: ${cost.toString()} (raw e8s)`);
        const result = await withTimeout(
          actor.upgradePlot(landId, cost),
          QUERY_TIMEOUT,
          'Upgrade plot'
        );
        console.log(`[Upgrade Plot] Result:`, result);
        return result;
      } catch (error) {
        console.error('[Upgrade Plot] ✗ Error:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to upgrade plot: ${error.message}` 
            : 'Failed to upgrade plot'
        );
      }
    },
    onSuccess: async (result) => {
      console.log('[Upgrade Plot] ✓ Success - invalidating queries');
      
      // Invalidate queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['landData'] });
      await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
      await queryClient.invalidateQueries({ queryKey: ['topLands'] });
      
      // Log the upgrade details for debugging
      if (result.__kind__ === 'success') {
        console.log(`[Upgrade Plot] ✓ Upgraded to level ${result.success.newLevel}`);
        console.log(`[Upgrade Plot] 🔄 Balance refetch triggered`);
      }
    },
  });
}

export function useUpdatePlotName() {
  const { actor } = useActorWithInit();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { landId: bigint; name: string }>({
    mutationFn: async ({ landId, name }) => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        await withTimeout(
          actor.updatePlotName(landId, name),
          QUERY_TIMEOUT,
          'Update plot name'
        );
      } catch (error) {
        console.error('Error updating plot name:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to update plot name: ${error.message}` 
            : 'Failed to update plot name'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landData'] });
      queryClient.invalidateQueries({ queryKey: ['topLands'] });
    },
  });
}

export function useUpdateDecoration() {
  const { actor } = useActorWithInit();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { landId: bigint; url: string }>({
    mutationFn: async ({ landId, url }) => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        await withTimeout(
          actor.updateDecoration(landId, url),
          QUERY_TIMEOUT,
          'Update decoration'
        );
      } catch (error) {
        console.error('Error updating decoration:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to update decoration: ${error.message}` 
            : 'Failed to update decoration'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landData'] });
    },
  });
}

export function useGetTopLands(limit: number = 10) {
  const { actor, isFetching, isInitialized } = useActorWithInit();

  return useQuery<TopLandEntry[]>({
    queryKey: ['topLands', limit],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        const lands = await withTimeout(
          actor.getTopLands(BigInt(limit)),
          QUERY_TIMEOUT,
          'Get top lands'
        );
        return lands;
      } catch (error) {
        console.error('Error fetching top lands:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load leaderboard: ${error.message}` 
            : 'Failed to load leaderboard'
        );
      }
    },
    enabled: !!actor && !isFetching && isInitialized,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching, isInitialized } = useActorWithInit();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        const profile = await withTimeout(
          actor.getCallerUserProfile(),
          QUERY_TIMEOUT,
          'Get user profile'
        );
        return profile;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load user profile: ${error.message}` 
            : 'Failed to load user profile'
        );
      }
    },
    enabled: !!actor && !actorFetching && isInitialized,
    retry: 2,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && isInitialized && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActorWithInit();
  const queryClient = useQueryClient();

  return useMutation<void, Error, UserProfile>({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        await withTimeout(
          actor.saveCallerUserProfile(profile),
          QUERY_TIMEOUT,
          'Save user profile'
        );
      } catch (error) {
        console.error('Error saving user profile:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to save user profile: ${error.message}` 
            : 'Failed to save user profile'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Loot Cache and Modification Queries

export function useGetMyLootCaches() {
  const { actor, isFetching, isInitialized } = useActorWithInit();

  return useQuery<LootCache[]>({
    queryKey: ['myLootCaches'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        const caches = await withTimeout(
          actor.getMyLootCaches(),
          QUERY_TIMEOUT,
          'Get loot caches'
        );
        return caches;
      } catch (error) {
        console.error('Error fetching loot caches:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load loot caches: ${error.message}` 
            : 'Failed to load loot caches'
        );
      }
    },
    enabled: !!actor && !isFetching && isInitialized,
    retry: 2,
  });
}

export function useGetMyModifications() {
  const { actor, isFetching, isInitialized } = useActorWithInit();

  return useQuery<Modification[]>({
    queryKey: ['myModifications'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        const mods = await withTimeout(
          actor.getMyModifications(),
          QUERY_TIMEOUT,
          'Get modifications'
        );
        return mods;
      } catch (error) {
        console.error('Error fetching modifications:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load modifications: ${error.message}` 
            : 'Failed to load modifications'
        );
      }
    },
    enabled: !!actor && !isFetching && isInitialized,
    retry: 2,
  });
}

export function useDiscoverLootCache() {
  const { actor } = useActorWithInit();
  const queryClient = useQueryClient();

  return useMutation<DiscoverCacheResult, Error, bigint>({
    mutationFn: async (tier: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        console.log(`[Discovery] 🎯 Attempting to discover Tier ${tier} cache`);
        const result = await withTimeout(
          actor.discoverLootCache(tier),
          QUERY_TIMEOUT,
          'Discover loot cache'
        );
        console.log(`[Discovery] Result:`, result);
        return result;
      } catch (error) {
        console.error('[Discovery] ✗ Error discovering loot cache:', error);
        
        // Parse error message for better user feedback
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('InsufficientFunds') || errorMessage.includes('Insufficient')) {
          throw new Error('Insufficient tokens or charge to discover cache');
        } else if (errorMessage.includes('Unauthorized')) {
          throw new Error('Unauthorized: Please log in to discover caches');
        } else {
          throw new Error(`Failed to discover cache: ${errorMessage}`);
        }
      }
    },
    onSuccess: async (result) => {
      console.log('[Discovery] ✓ Success - invalidating queries');
      
      // Invalidate queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['myLootCaches'] });
      await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
      await queryClient.invalidateQueries({ queryKey: ['landData'] });
      
      // Log discovery details for debugging
      if (result.__kind__ === 'success') {
        console.log(`[Discovery] ✓ Discovered cache ID: ${result.success.cache_id}, Tier: ${result.success.tier}`);
        console.log(`[Discovery] 🔄 Balance refetch triggered`);
      }
    },
  });
}

export function useProcessCache() {
  const { actor } = useActorWithInit();
  const queryClient = useQueryClient();

  return useMutation<Modification, Error, bigint>({
    mutationFn: async (cacheId: bigint) => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        console.log(`[Cache Processing] 🎯 Opening cache ID: ${cacheId}`);
        const mod = await withTimeout(
          actor.processCache(cacheId),
          QUERY_TIMEOUT,
          'Process cache'
        );
        console.log(`[Cache Processing] Received modification:`, mod);
        return mod;
      } catch (error) {
        console.error('[Cache Processing] ✗ Error processing cache:', error);
        
        // Parse error message for better user feedback
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('already opened')) {
          throw new Error('Cache has already been opened');
        } else if (errorMessage.includes('cannot be opened yet')) {
          throw new Error('Cache cannot be opened yet: wait for cooldown or have sufficient charge');
        } else if (errorMessage.includes('not found')) {
          throw new Error('Cache not found');
        } else {
          throw new Error(`Failed to process cache: ${errorMessage}`);
        }
      }
    },
    onSuccess: (mod) => {
      console.log('[Cache Processing] ✓ Success - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['myLootCaches'] });
      queryClient.invalidateQueries({ queryKey: ['myModifications'] });
      queryClient.invalidateQueries({ queryKey: ['landData'] });
      
      // Log modification details for debugging
      console.log(`[Cache Processing] ✓ Unlocked Tier ${mod.rarity_tier} modification with ${mod.multiplier_value}x multiplier`);
    },
  });
}

// Modifier Management Queries (DAO Administrative)

export function useGetAllModifiers() {
  const { actor, isFetching, isInitialized } = useActorWithInit();

  return useQuery<Modifier[]>({
    queryKey: ['allModifiers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        const modifiers = await withTimeout(
          actor.getAllModifiers(),
          QUERY_TIMEOUT,
          'Get all modifiers'
        );
        return modifiers;
      } catch (error) {
        console.error('Error fetching all modifiers:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load modifiers: ${error.message}` 
            : 'Failed to load modifiers'
        );
      }
    },
    enabled: !!actor && !isFetching && isInitialized,
    retry: 2,
    staleTime: 60000, // Modifiers are relatively static, cache for 1 minute
  });
}

export function useGetModifierById(modId: bigint | null) {
  const { actor, isFetching, isInitialized } = useActorWithInit();

  return useQuery<Modifier | null>({
    queryKey: ['modifier', modId?.toString()],
    queryFn: async () => {
      if (!actor || !modId) throw new Error('Actor or modifier ID not available');
      try {
        const modifier = await withTimeout(
          actor.getModifierById(modId),
          QUERY_TIMEOUT,
          'Get modifier by ID'
        );
        return modifier;
      } catch (error) {
        console.error('Error fetching modifier by ID:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load modifier: ${error.message}` 
            : 'Failed to load modifier'
        );
      }
    },
    enabled: !!actor && !isFetching && isInitialized && modId !== null,
    retry: 2,
  });
}

export function useGetModifiersByTier(tier: bigint | null) {
  const { actor, isFetching, isInitialized } = useActorWithInit();

  return useQuery<Modifier[]>({
    queryKey: ['modifiersByTier', tier?.toString()],
    queryFn: async () => {
      if (!actor || tier === null) throw new Error('Actor or tier not available');
      try {
        const modifiers = await withTimeout(
          actor.getModifiersByTier(tier),
          QUERY_TIMEOUT,
          'Get modifiers by tier'
        );
        return modifiers;
      } catch (error) {
        console.error('Error fetching modifiers by tier:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load modifiers by tier: ${error.message}` 
            : 'Failed to load modifiers by tier'
        );
      }
    },
    enabled: !!actor && !isFetching && isInitialized && tier !== null,
    retry: 2,
  });
}

// Marketplace Queries

export function useGetAllActiveListings() {
  const { actor, isFetching } = useMarketplaceActor();

  return useQuery<Listing[]>({
    queryKey: ['activeListings'],
    queryFn: async () => {
      if (!actor) throw new Error('Marketplace actor not initialized');
      try {
        const listings = await withTimeout(
          actor.getAllActiveListings(),
          QUERY_TIMEOUT,
          'Get active listings'
        );
        return listings;
      } catch (error) {
        console.error('Error fetching active listings:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load marketplace listings: ${error.message}` 
            : 'Failed to load marketplace listings'
        );
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
    retry: 2,
  });
}

export function useListItem() {
  const { actor } = useMarketplaceActor();
  const queryClient = useQueryClient();

  return useMutation<bigint, Error, { itemId: bigint; itemType: ItemType; price: bigint }>({
    mutationFn: async ({ itemId, itemType, price }) => {
      if (!actor) throw new Error('Marketplace actor not initialized');
      try {
        const listingId = await withTimeout(
          actor.list_item(itemId, itemType, price),
          QUERY_TIMEOUT,
          'List item'
        );
        return listingId;
      } catch (error) {
        console.error('Error listing item:', error);
        
        // Parse error message for better user feedback
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('already listed')) {
          throw new Error('Item is already listed on the marketplace');
        } else if (errorMessage.includes("don't own")) {
          throw new Error('You do not own this item');
        } else if (errorMessage.includes('Invalid price')) {
          throw new Error('Invalid price: Price must be greater than 0');
        } else {
          throw new Error(`Failed to list item: ${errorMessage}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeListings'] });
      queryClient.invalidateQueries({ queryKey: ['userListings'] });
    },
  });
}

export function useBuyItem() {
  const { actor } = useMarketplaceActor();
  const queryClient = useQueryClient();

  return useMutation<BuyResult, Error, bigint>({
    mutationFn: async (listingId: bigint) => {
      if (!actor) throw new Error('Marketplace actor not initialized');
      try {
        console.log(`[Marketplace] 🎯 Attempting to buy listing ID: ${listingId}`);
        const result = await withTimeout(
          actor.buy_item(listingId),
          QUERY_TIMEOUT,
          'Buy item'
        );
        console.log(`[Marketplace] Buy result:`, result);
        return result;
      } catch (error) {
        console.error('[Marketplace] ✗ Error buying item:', error);
        
        // Parse error message for better user feedback
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('InsufficientFunds') || errorMessage.includes('Insufficient')) {
          throw new Error('Insufficient CBR tokens to purchase this item');
        } else if (errorMessage.includes('not found')) {
          throw new Error('Listing not found or no longer available');
        } else if (errorMessage.includes('not active')) {
          throw new Error('Listing is no longer active');
        } else if (errorMessage.includes('own listing')) {
          throw new Error('Cannot buy your own listing');
        } else if (errorMessage.includes('TransferError') || errorMessage.includes('transfer failed')) {
          throw new Error('Token transfer failed - transaction aborted');
        } else {
          throw new Error(`Failed to buy item: ${errorMessage}`);
        }
      }
    },
    onSuccess: async () => {
      console.log('[Marketplace] ✓ Purchase successful - invalidating queries');
      
      // Invalidate queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['activeListings'] });
      await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
      await queryClient.invalidateQueries({ queryKey: ['landData'] });
      await queryClient.invalidateQueries({ queryKey: ['myModifications'] });
      
      console.log('[Marketplace] 🔄 Balance refetch triggered');
    },
  });
}

export function useCancelListing() {
  const { actor } = useMarketplaceActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, bigint>({
    mutationFn: async (listingId: bigint) => {
      if (!actor) throw new Error('Marketplace actor not initialized');
      try {
        await withTimeout(
          actor.cancelListing(listingId),
          QUERY_TIMEOUT,
          'Cancel listing'
        );
      } catch (error) {
        console.error('Error cancelling listing:', error);
        
        // Parse error message for better user feedback
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('not found')) {
          throw new Error('Listing not found');
        } else if (errorMessage.includes('not the seller')) {
          throw new Error('Only the seller can cancel this listing');
        } else if (errorMessage.includes('already inactive')) {
          throw new Error('Listing is already inactive');
        } else {
          throw new Error(`Failed to cancel listing: ${errorMessage}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeListings'] });
      queryClient.invalidateQueries({ queryKey: ['userListings'] });
    },
  });
}

// Governance Queries

export function useGetStakedBalance() {
  const { actor, isFetching } = useGovernanceActor();

  return useQuery<bigint>({
    queryKey: ['stakedBalance'],
    queryFn: async () => {
      if (!actor) throw new Error('Governance actor not initialized');
      try {
        const balance = await withTimeout(
          actor.getStakedBalance(),
          QUERY_TIMEOUT,
          'Get staked balance'
        );
        return balance;
      } catch (error) {
        console.error('Error fetching staked balance:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load staked balance: ${error.message}` 
            : 'Failed to load staked balance'
        );
      }
    },
    enabled: !!actor && !isFetching,
    retry: 2,
  });
}

export function useStakeTokens() {
  const { actor } = useGovernanceActor();
  const queryClient = useQueryClient();

  return useMutation<StakeResult, Error, bigint>({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error('Governance actor not initialized');
      try {
        console.log(`[Governance] 🎯 Staking ${amount.toString()} tokens`);
        const result = await withTimeout(
          actor.stakeTokens(amount),
          QUERY_TIMEOUT,
          'Stake tokens'
        );
        console.log(`[Governance] Stake result:`, result);
        return result;
      } catch (error) {
        console.error('[Governance] ✗ Error staking tokens:', error);
        
        // Parse error message for better user feedback
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('Invalid amount')) {
          throw new Error('Invalid amount: Must stake more than 0 tokens');
        } else {
          throw new Error(`Failed to stake tokens: ${errorMessage}`);
        }
      }
    },
    onSuccess: async () => {
      console.log('[Governance] ✓ Stake successful - invalidating queries');
      
      // Invalidate queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['stakedBalance'] });
      await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
      
      console.log('[Governance] 🔄 Balance refetch triggered');
    },
  });
}

export function useGetAllActiveProposals() {
  const { actor, isFetching } = useGovernanceActor();

  return useQuery<Proposal[]>({
    queryKey: ['activeProposals'],
    queryFn: async () => {
      if (!actor) throw new Error('Governance actor not initialized');
      try {
        const proposals = await withTimeout(
          actor.getAllActiveProposals(),
          QUERY_TIMEOUT,
          'Get active proposals'
        );
        return proposals;
      } catch (error) {
        console.error('Error fetching active proposals:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to load proposals: ${error.message}` 
            : 'Failed to load proposals'
        );
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 20000,
    retry: 2,
  });
}

export function useCreateProposal() {
  const { actor } = useGovernanceActor();
  const queryClient = useQueryClient();

  return useMutation<bigint, Error, { title: string; description: string }>({
    mutationFn: async ({ title, description }) => {
      if (!actor) throw new Error('Governance actor not initialized');
      try {
        const proposalId = await withTimeout(
          actor.createProposal(title, description),
          QUERY_TIMEOUT,
          'Create proposal'
        );
        return proposalId;
      } catch (error) {
        console.error('Error creating proposal:', error);
        
        // Parse error message for better user feedback
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('Insufficient stake')) {
          throw new Error('Insufficient stake: You need more staked tokens to create proposals');
        } else if (errorMessage.includes('Invalid title')) {
          throw new Error('Invalid title: Must be between 1 and 100 characters');
        } else if (errorMessage.includes('Invalid description')) {
          throw new Error('Invalid description: Must be between 1 and 1000 characters');
        } else {
          throw new Error(`Failed to create proposal: ${errorMessage}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeProposals'] });
    },
  });
}

export function useVote() {
  const { actor } = useGovernanceActor();
  const queryClient = useQueryClient();

  return useMutation<VoteResult, Error, { proposalId: bigint; choice: boolean }>({
    mutationFn: async ({ proposalId, choice }) => {
      if (!actor) throw new Error('Governance actor not initialized');
      try {
        const result = await withTimeout(
          actor.vote(proposalId, choice),
          QUERY_TIMEOUT,
          'Vote'
        );
        return result;
      } catch (error) {
        console.error('Error voting:', error);
        throw new Error(
          error instanceof Error 
            ? `Failed to vote: ${error.message}` 
            : 'Failed to vote'
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeProposals'] });
      queryClient.invalidateQueries({ queryKey: ['myVotes'] });
    },
  });
}

// Debugging function to manually refresh and log balance
export function useDebugTokenBalance() {
  const { actor: tokenActor } = useTokenActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation<bigint, Error>({
    mutationFn: async () => {
      if (!tokenActor || !identity) {
        throw new Error('Token actor or identity not initialized');
      }
      
      try {
        const principal = identity.getPrincipal();
        const account: Account = {
          owner: principal,
          subaccount: [],
        };
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔍 [DEBUG] Manual Balance Refresh Triggered');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📍 Principal: ${principal.toText()}`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
        console.log('───────────────────────────────────────────────────────');
        
        const balance = await tokenActor.icrc1_balance_of(account);
        
        console.log('✅ Balance Query Successful');
        console.log(`💰 Raw Balance (e8s): ${balance.toString()}`);
        console.log(`💵 Decimal Balance: ${Number(balance) / 1e8} CBR`);
        console.log(`🔢 Balance Type: ${typeof balance}`);
        console.log('═══════════════════════════════════════════════════════');
        
        return balance;
      } catch (error) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('❌ [DEBUG] Balance Query Failed');
        console.log('═══════════════════════════════════════════════════════');
        console.error('Error:', error);
        console.log('═══════════════════════════════════════════════════════');
        throw error;
      }
    },
    onSuccess: async (balance) => {
      // Force refetch of balance query
      await queryClient.invalidateQueries({ queryKey: ['tokenBalance'] });
      console.log('🔄 Balance cache invalidated - UI will update');
    },
  });
}

// Admin-only function to check canister token balance
export function useDebugCanisterBalance() {
  const queryClient = useQueryClient();

  return useMutation<bigint, Error>({
    mutationFn: async () => {
      // This will use the query hook's logic
      const result = await queryClient.fetchQuery({
        queryKey: ['canisterTokenBalance'],
      });
      return result as bigint;
    },
    onSuccess: (balance) => {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🏦 [DEBUG] Canister Token Balance Check');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`💰 Canister Balance (e8s): ${balance.toString()}`);
      console.log(`💵 Decimal Balance: ${Number(balance) / 1e8} CBR`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      console.log('═══════════════════════════════════════════════════════');
    },
  });
}
