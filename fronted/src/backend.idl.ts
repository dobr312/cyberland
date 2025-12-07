import { IDL } from '@icp-sdk/core/candid';

export const idlFactory = ({ IDL }: { IDL: typeof import('@icp-sdk/core/candid').IDL }) => {
  const UserRole = IDL.Variant({
    'admin': IDL.Null,
    'user': IDL.Null,
    'guest': IDL.Null,
  });
  const UserProfile = IDL.Record({ 'name': IDL.Text });
  const Coordinates = IDL.Record({ 'lat': IDL.Float64, 'lon': IDL.Float64 });
  const Time = IDL.Int;
  const LandData = IDL.Record({
    'decorationURL': IDL.Opt(IDL.Text),
    'baseTokenMultiplier': IDL.Float64,
    'lastChargeUpdate': Time,
    'upgradeLevel': IDL.Nat,
    'principal': IDL.Principal,
    'landId': IDL.Nat,
    'lastClaimTime': Time,
    'biome': IDL.Text,
    'chargeCap': IDL.Nat,
    'cycleCharge': IDL.Int,
    'plotName': IDL.Text,
    'coordinates': Coordinates,
  });
  const ClaimResult = IDL.Variant({
    'success': IDL.Record({
      'tokensClaimed': IDL.Nat,
      'newBalance': IDL.Nat,
      'nextClaimTime': Time,
    }),
    'mintFailed': IDL.Text,
    'cooldown': IDL.Record({
      'currentBalance': IDL.Nat,
      'remainingTime': IDL.Int,
    }),
    'insufficientCharge': IDL.Record({
      'required': IDL.Nat,
      'current': IDL.Int,
    }),
  });
  const LootCache = IDL.Record({
    'owner': IDL.Principal,
    'tier': IDL.Nat,
    'cache_id': IDL.Nat,
    'discovered_at': Time,
    'is_opened': IDL.Bool,
  });
  const DiscoverCacheResult = IDL.Variant({
    'success': LootCache,
    'insufficientTokens': IDL.Record({
      'required': IDL.Nat,
      'current': IDL.Nat,
    }),
    'paymentFailed': IDL.Text,
    'insufficientCharge': IDL.Record({
      'required': IDL.Nat,
      'current': IDL.Int,
    }),
  });
  const Modifier = IDL.Record({
    'name': IDL.Text,
    'asset_url': IDL.Text,
    'mod_id': IDL.Nat,
    'rarity_tier': IDL.Nat,
    'multiplier_value': IDL.Float64,
  });
  const Modification = IDL.Record({
    'model_url': IDL.Text,
    'mod_id': IDL.Nat,
    'rarity_tier': IDL.Nat,
    'multiplier_value': IDL.Float64,
  });
  const TopLandEntry = IDL.Record({
    'upgradeLevel': IDL.Nat,
    'principal': IDL.Principal,
    'tokenBalance': IDL.Nat,
    'plotName': IDL.Text,
  });
  const UpgradeResult = IDL.Variant({
    'maxLevelReached': IDL.Null,
    'success': IDL.Record({
      'newLevel': IDL.Nat,
      'remainingTokens': IDL.Nat,
    }),
    'insufficientTokens': IDL.Record({
      'required': IDL.Nat,
      'current': IDL.Nat,
    }),
  });
  const http_header = IDL.Record({
    'value': IDL.Text,
    'name': IDL.Text,
  });
  const http_request_result = IDL.Record({
    'status': IDL.Nat,
    'body': IDL.Vec(IDL.Nat8),
    'headers': IDL.Vec(http_header),
  });
  const TransformationInput = IDL.Record({
    'context': IDL.Vec(IDL.Nat8),
    'response': http_request_result,
  });
  const TransformationOutput = IDL.Record({
    'status': IDL.Nat,
    'body': IDL.Vec(IDL.Nat8),
    'headers': IDL.Vec(http_header),
  });
  
  return IDL.Service({
    'adminGetLandData': IDL.Func([IDL.Principal], [IDL.Opt(IDL.Vec(LandData))], ['query']),
    'adminSetAllModifiers': IDL.Func([IDL.Vec(Modifier)], [], []),
    'assignCallerUserRole': IDL.Func([IDL.Principal, UserRole], [], []),
    'claimRewards': IDL.Func([IDL.Nat], [ClaimResult], []),
    'discoverLootCache': IDL.Func([IDL.Nat], [DiscoverCacheResult], []),
    'getAllModifiers': IDL.Func([], [IDL.Vec(Modifier)], ['query']),
    'getAssetCanisterCycleBalance': IDL.Func([], [IDL.Text], []),
    'getCallerUserProfile': IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole': IDL.Func([], [UserRole], ['query']),
    'getCurrentCbrBalance': IDL.Func([], [IDL.Nat], ['query']),
    'getHighestRarityModification': IDL.Func([], [IDL.Opt(Modification)], ['query']),
    'getLandCanisterCycleBalance': IDL.Func([], [IDL.Text], []),
    'getLandData': IDL.Func([], [IDL.Vec(LandData)], []),
    'getLandDataQuery': IDL.Func([], [IDL.Opt(IDL.Vec(LandData))], ['query']),
    'getLandOwner': IDL.Func([IDL.Nat], [IDL.Opt(IDL.Principal)], []),
    'getModifierById': IDL.Func([IDL.Nat], [IDL.Opt(Modifier)], ['query']),
    'getModifiersByTier': IDL.Func([IDL.Nat], [IDL.Vec(Modifier)], ['query']),
    'getMyLootCaches': IDL.Func([], [IDL.Vec(LootCache)], ['query']),
    'getMyModifications': IDL.Func([], [IDL.Vec(Modification)], ['query']),
    'getTopLands': IDL.Func([IDL.Nat], [IDL.Vec(TopLandEntry)], ['query']),
    'getUserProfile': IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    'initializeAccessControl': IDL.Func([], [], []),
    'isCallerAdmin': IDL.Func([], [IDL.Bool], ['query']),
    'mintLand': IDL.Func([], [LandData], []),
    'processCache': IDL.Func([IDL.Nat], [Modification], []),
    'saveCallerUserProfile': IDL.Func([UserProfile], [], []),
    'setGovernanceCanister': IDL.Func([IDL.Principal], [], []),
    'setMarketplaceCanister': IDL.Func([IDL.Principal], [], []),
    'setTokenCanister': IDL.Func([IDL.Principal], [], []),
    'transform': IDL.Func([TransformationInput], [TransformationOutput], ['query']),
    'transferLand': IDL.Func([IDL.Principal, IDL.Nat], [IDL.Bool], []),
    'updateDecoration': IDL.Func([IDL.Nat, IDL.Text], [], []),
    'updatePlotName': IDL.Func([IDL.Nat, IDL.Text], [], []),
    'upgradePlot': IDL.Func([IDL.Nat, IDL.Nat], [UpgradeResult], []),
    'useConsumableBuff': IDL.Func([IDL.Nat], [], []),
  });
};
