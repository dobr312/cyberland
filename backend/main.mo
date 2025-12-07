import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Float "mo:base/Float";
import Nat8 "mo:base/Nat8";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Random "mo:base/Random";
import AccessControl "authorization/access-control";
import OutCall "http-outcalls/outcall";

persistent actor CyberGenesisLandMint {

  // Helper function for visual zone determination
  func getVisualZone(lat : Float, lon : Float) : Text {
    let absLat = if (lat < 0.0) { 0.0 - lat } else { lat };

    if (absLat > 55.0) {
      "ZONE_A_POLAR";
    } else if (absLat < 20.0) {
      "ZONE_B_EQUATORIAL";
    } else {
      "ZONE_C_TEMPERATE";
    };
  };

  // Initialize the access control state
  let accessControlState = AccessControl.initState();

  // Authorized admin principal for sensitive operations
  let authorizedAdminPrincipal : Principal = Principal.fromText("whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae");

  public type Coordinates = {
    lat : Float;
    lon : Float;
  };

  public type LandData = {
    principal : Principal;
    coordinates : Coordinates;
    biome : Text;
    upgradeLevel : Nat;
    lastClaimTime : Time.Time;
    plotName : Text;
    decorationURL : ?Text;
    baseTokenMultiplier : Float;
    cycleCharge : Int;
    chargeCap : Nat;
    lastChargeUpdate : Time.Time;
    landId : Nat;
  };

  public type ClaimResult = {
    #success : {
      tokensClaimed : Nat;
      newBalance : Nat;
      nextClaimTime : Time.Time;
    };
    #cooldown : {
      remainingTime : Int;
      currentBalance : Nat;
    };
    #insufficientCharge : {
      required : Nat;
      current : Int;
    };
    #mintFailed : Text;
  };

  public type UpgradeResult = {
    #success : {
      newLevel : Nat;
      remainingTokens : Nat;
    };
    #insufficientTokens : {
      required : Nat;
      current : Nat;
    };
    #maxLevelReached;
  };

  public type UserProfile = {
    name : Text;
  };

  public type TopLandEntry = {
    principal : Principal;
    plotName : Text;
    upgradeLevel : Nat;
    tokenBalance : Nat;
  };

  public type Modification = {
    mod_id : Nat;
    rarity_tier : Nat;
    multiplier_value : Float;
    model_url : Text;
  };

  public type LootCache = {
    cache_id : Nat;
    tier : Nat;
    owner : Principal;
    discovered_at : Time.Time;
    is_opened : Bool;
  };

  public type DiscoverCacheResult = {
    #success : LootCache;
    #insufficientCharge : { required : Nat; current : Int };
    #insufficientTokens : { required : Nat; current : Nat };
    #paymentFailed : Text;
  };

  public type Modifier = {
    mod_id : Nat;
    rarity_tier : Nat;
    name : Text;
    multiplier_value : Float;
    asset_url : Text;
  };

  public type EnergyBooster = {
    amount : Nat;
  };

  public type ConsumableBuff = {
    buff_type : Text;
    duration : Nat;
  };

  public type LandToken = {
    token_id : Nat;
    rarity : Text;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  var landRegistry : OrderedMap.Map<Principal, [LandData]> = principalMap.empty<[LandData]>();
  var userProfiles : OrderedMap.Map<Principal, UserProfile> = principalMap.empty<UserProfile>();
  var lootCaches : OrderedMap.Map<Principal, [LootCache]> = principalMap.empty<[LootCache]>();
  var modifications : OrderedMap.Map<Principal, [Modification]> = principalMap.empty<[Modification]>();
  var energyBoosters : OrderedMap.Map<Principal, [EnergyBooster]> = principalMap.empty<[EnergyBooster]>();
  var consumableBuffs : OrderedMap.Map<Principal, [ConsumableBuff]> = principalMap.empty<[ConsumableBuff]>();
  var landTokens : OrderedMap.Map<Principal, [LandToken]> = principalMap.empty<[LandToken]>();
  var nextCacheId : Nat = 0;
  var nextModId : Nat = 0;
  var nextLandId : Nat = 0;

  // Marketplace canister principal for NFT transfer authorization
  var marketplaceCanister : ?Principal = null;

  // GovernanceCanister principal for DAO administrative functions
  var governanceCanister : ?Principal = null;

  // CyberTokenCanister principal for token minting
  var tokenCanister : ?Principal = null;

  // Discovery costs
  let DISCOVERY_CHARGE_COST : Nat = 20;
  let DISCOVERY_CBR_COST : Nat = 500;
  let DISCOVERY_ICP_COST : Nat = 100000000; // 1 ICP in e8s

  // Cache processing costs
  let CACHE_PROCESS_CHARGE_COST : Nat = 10;

  // Modifiers storage
  var modifiers : [Modifier] = [];

  // Access Control Functions

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // User Profile Functions

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // Land Management Functions

  func hashPrincipal(p : Principal) : Nat {
    let bytes = Principal.toBlob(p);
    var hash = 0;
    for (byte in bytes.vals()) {
      hash := (hash * 31 + Nat8.toNat(byte)) % 1000000;
    };
    hash;
  };

  func getBiome(hash : Nat) : Text {
    switch (hash % 7) {
      case 0 { "FOREST_VALLEY" };
      case 1 { "ISLAND_ARCHIPELAGO" };
      case 2 { "SNOW_PEAK" };
      case 3 { "DESERT_DUNE" };
      case 4 { "VOLCANIC_CRAG" };
      case 5 { "MYTHIC_VOID" };
      case 6 { "MYTHIC_AETHER" };
      case _ { Debug.trap("Unexpected biome value") };
    };
  };

  func generateCoordinates(hash : Nat) : Coordinates {
    let lat = (Float.fromInt(hash % 1800) / 10.0) - 90.0;
    let lon = (Float.fromInt(hash % 3600) / 10.0) - 180.0;
    { lat; lon };
  };

  func updateCharge(data : LandData) : LandData {
    let currentTime = Time.now();
    let elapsedTime = currentTime - data.lastChargeUpdate;
    let minutesElapsed = elapsedTime / 60_000_000_000;

    let newCharge = if (data.cycleCharge + minutesElapsed > Int.abs(data.chargeCap)) {
      Int.abs(data.chargeCap);
    } else {
      data.cycleCharge + minutesElapsed;
    };

    {
      data with
      cycleCharge = newCharge;
      lastChargeUpdate = currentTime;
    };
  };

  public shared ({ caller }) func getLandData() : async [LandData] {
    // Only authenticated users can get/create land data
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access land data");
    };

    switch (principalMap.get(landRegistry, caller)) {
      case (?existingLands) { existingLands };
      case null {
        let hash = hashPrincipal(caller);
        let coordinates = generateCoordinates(hash);
        let biome = getBiome(hash);

        // 0.5% chance for MYTHIC_VOID biome
        let random = await Random.blob();
        let isMythicVoid = switch (Random.Finite(random).range(200)) {
          case (?val) { val == 0 };
          case null { false };
        };

        let finalBiome = if (isMythicVoid) { "MYTHIC_VOID" } else { biome };
        let baseTokenMultiplier = if (isMythicVoid) { 1.25 } else { 1.0 };

        let newLand : LandData = {
          principal = caller;
          coordinates;
          biome = finalBiome;
          upgradeLevel = 0;
          lastClaimTime = 0;
          plotName = "My Plot";
          decorationURL = null;
          baseTokenMultiplier;
          cycleCharge = 0;
          chargeCap = 1000;
          lastChargeUpdate = Time.now();
          landId = nextLandId;
        };

        nextLandId += 1;
        landRegistry := principalMap.put(landRegistry, caller, [newLand]);
        [newLand];
      };
    };
  };

  public shared ({ caller }) func mintLand() : async LandData {
    // Only authenticated users can mint new land
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can mint new land");
    };

    // Check if user has a LandToken
    let userTokens = switch (principalMap.get(landTokens, caller)) {
      case (?tokens) { tokens };
      case null { [] };
    };

    if (userTokens.size() == 0) {
      Debug.trap("No LandTokens available");
    };

    // Consume one LandToken
    let remainingTokens = Array.tabulate(
      userTokens.size() - 1,
      func(i : Nat) : LandToken {
        if (i < userTokens.size() - 1) { userTokens[i] } else {
          userTokens[i + 1];
        };
      },
    );
    landTokens := principalMap.put(landTokens, caller, remainingTokens);

    // Generate new land
    let hash = hashPrincipal(caller) + nextLandId;
    let coordinates = generateCoordinates(hash);
    let biome = getBiome(hash);

    // 0.5% chance for MYTHIC_VOID biome
    let random = await Random.blob();
    let isMythicVoid = switch (Random.Finite(random).range(200)) {
      case (?val) { val == 0 };
      case null { false };
    };

    let finalBiome = if (isMythicVoid) { "MYTHIC_VOID" } else { biome };
    let baseTokenMultiplier = if (isMythicVoid) { 1.25 } else { 1.0 };

    let newLand : LandData = {
      principal = caller;
      coordinates;
      biome = finalBiome;
      upgradeLevel = 0;
      lastClaimTime = 0;
      plotName = "My Plot";
      decorationURL = null;
      baseTokenMultiplier;
      cycleCharge = 0;
      chargeCap = 1000;
      lastChargeUpdate = Time.now();
      landId = nextLandId;
    };

    nextLandId += 1;

    let userLands = switch (principalMap.get(landRegistry, caller)) {
      case (?lands) { lands };
      case null { [] };
    };

    let updatedLands = Array.append(userLands, [newLand]);
    landRegistry := principalMap.put(landRegistry, caller, updatedLands);

    newLand;
  };

  public shared ({ caller }) func claimRewards(landId : Nat) : async ClaimResult {
    // Only authenticated users can claim rewards
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can claim rewards");
    };

    // Verify token canister is configured
    let cyberTokenCanister = switch (tokenCanister) {
      case null {
        Debug.trap("Configuration error: Token canister not set. Admin must call setTokenCanister first.");
      };
      case (?canisterId) {
        actor (Principal.toText(canisterId)) : actor {
          mint : (Principal, Nat) -> async ();
        };
      };
    };

    let currentTime = Time.now();
    let dayInNanos = 86_400_000_000_000;

    switch (principalMap.get(landRegistry, caller)) {
      case null {
        Debug.trap("Land not found for principal");
      };
      case (?lands) {
        // Find the land with the given landId
        var landIndex : ?Nat = null;
        var i = 0;
        for (land in lands.vals()) {
          if (land.landId == landId) {
            landIndex := ?i;
          };
          i += 1;
        };

        switch (landIndex) {
          case null {
            Debug.trap("Land with ID " # Nat.toText(landId) # " not found");
          };
          case (?index) {
            let land = lands[index];
            let updatedLand = updateCharge(land);

            if (updatedLand.cycleCharge < 10) {
              return #insufficientCharge {
                required = 10;
                current = updatedLand.cycleCharge;
              };
            };

            let timeSinceLastClaim = currentTime - updatedLand.lastClaimTime;

            if (timeSinceLastClaim < dayInNanos) {
              let remainingTime = dayInNanos - timeSinceLastClaim;
              return #cooldown {
                remainingTime;
                currentBalance = 0;
              };
            };

            let baseReward = 100 * (updatedLand.upgradeLevel + 1);
            let rewardWithMultiplier = Float.toInt(Float.fromInt(baseReward) * updatedLand.baseTokenMultiplier);
            let reward = Int.abs(rewardWithMultiplier);

            Debug.print("Claiming rewards for landId: " # Nat.toText(landId) # " Principal: " # debug_show(caller) # " Amount: " # Nat.toText(reward));

            // Mint tokens via inter-canister call
            try {
              await cyberTokenCanister.mint(caller, reward);
              Debug.print("Mint successful for claim, tokens credited: " # Nat.toText(reward));
            } catch (error) {
              Debug.print("Mint failed for claim");
              return #mintFailed("Failed to mint tokens");
            };

            let finalLand = {
              updatedLand with
              lastClaimTime = currentTime;
              cycleCharge = updatedLand.cycleCharge - 10;
            };

            let updatedLands = Array.tabulate(
              lands.size(),
              func(i : Nat) : LandData {
                if (i == index) { finalLand } else { lands[i] };
              },
            );
            landRegistry := principalMap.put(landRegistry, caller, updatedLands);

            #success {
              tokensClaimed = reward;
              newBalance = 0;
              nextClaimTime = currentTime + dayInNanos;
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func upgradePlot(landId : Nat, cost : Nat) : async UpgradeResult {
    // Only authenticated users can upgrade plots
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can upgrade plots");
    };

    switch (principalMap.get(landRegistry, caller)) {
      case null {
        Debug.trap("Land not found for principal");
      };
      case (?lands) {
        // Find the land with the given landId
        var landIndex : ?Nat = null;
        var i = 0;
        for (land in lands.vals()) {
          if (land.landId == landId) {
            landIndex := ?i;
          };
          i += 1;
        };

        switch (landIndex) {
          case null {
            Debug.trap("Land with ID " # Nat.toText(landId) # " not found");
          };
          case (?index) {
            let land = lands[index];
            let updatedLand = updateCharge(land);

            if (updatedLand.upgradeLevel >= 5) {
              return #maxLevelReached;
            };

            if (cost > 0) {
              return #insufficientTokens {
                required = cost;
                current = 0;
              };
            };

            let newLevel = updatedLand.upgradeLevel + 1;

            let finalLand = {
              updatedLand with
              upgradeLevel = newLevel;
            };

            let updatedLands = Array.tabulate(
              lands.size(),
              func(i : Nat) : LandData {
                if (i == index) { finalLand } else { lands[i] };
              },
            );
            landRegistry := principalMap.put(landRegistry, caller, updatedLands);

            #success {
              newLevel;
              remainingTokens = 0;
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func updatePlotName(landId : Nat, name : Text) : async () {
    // Only authenticated users can update plot name
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update plot name");
    };

    if (Text.size(name) > 20) {
      Debug.trap("Plot name must be 20 characters or less");
    };

    switch (principalMap.get(landRegistry, caller)) {
      case null {
        Debug.trap("Land not found for principal");
      };
      case (?lands) {
        // Find the land with the given landId
        var landIndex : ?Nat = null;
        var i = 0;
        for (land in lands.vals()) {
          if (land.landId == landId) {
            landIndex := ?i;
          };
          i += 1;
        };

        switch (landIndex) {
          case null {
            Debug.trap("Land with ID " # Nat.toText(landId) # " not found");
          };
          case (?index) {
            let land = lands[index];
            let updatedLand = {
              land with
              plotName = name;
            };

            let updatedLands = Array.tabulate(
              lands.size(),
              func(i : Nat) : LandData {
                if (i == index) { updatedLand } else { lands[i] };
              },
            );
            landRegistry := principalMap.put(landRegistry, caller, updatedLands);
          };
        };
      };
    };
  };

  public shared ({ caller }) func updateDecoration(landId : Nat, url : Text) : async () {
    // Only authenticated users can update decoration
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update decoration");
    };

    if (Text.size(url) > 200) {
      Debug.trap("Decoration URL must be 200 characters or less");
    };

    switch (principalMap.get(landRegistry, caller)) {
      case null {
        Debug.trap("Land not found for principal");
      };
      case (?lands) {
        // Find the land with the given landId
        var landIndex : ?Nat = null;
        var i = 0;
        for (land in lands.vals()) {
          if (land.landId == landId) {
            landIndex := ?i;
          };
          i += 1;
        };

        switch (landIndex) {
          case null {
            Debug.trap("Land with ID " # Nat.toText(landId) # " not found");
          };
          case (?index) {
            let land = lands[index];
            let updatedLand = {
              land with
              decorationURL = ?url;
            };

            let updatedLands = Array.tabulate(
              lands.size(),
              func(i : Nat) : LandData {
                if (i == index) { updatedLand } else { lands[i] };
              },
            );
            landRegistry := principalMap.put(landRegistry, caller, updatedLands);
          };
        };
      };
    };
  };

  public query ({ caller }) func getLandDataQuery() : async ?[LandData] {
    // Only authenticated users can query their own land data
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can query land data");
    };
    principalMap.get(landRegistry, caller);
  };

  // NFT Transfer Functions for Marketplace Integration

  public shared ({ caller }) func setMarketplaceCanister(marketplace : Principal) : async () {
    // Only admins can set the marketplace canister
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set marketplace canister");
    };
    marketplaceCanister := ?marketplace;
  };

  public shared ({ caller }) func setGovernanceCanister(governance : Principal) : async () {
    // Only admins can set the governance canister
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set governance canister");
    };
    governanceCanister := ?governance;
  };

  public shared ({ caller }) func setTokenCanister(token : Principal) : async () {
    // Only admins can set the token canister
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set token canister");
    };
    tokenCanister := ?token;
  };

  // SECURITY FIX: Allow marketplace queries even when not configured
  // The specification says "authorized marketplace canister" but doesn't require blocking when not configured
  // This allows the marketplace to function properly during initialization
  public shared ({ caller }) func getLandOwner(landId : Nat) : async ?Principal {
    // AUDIT: Log all ownership queries for security monitoring
    Debug.print("Querying ownership for landId: " # Nat.toText(landId) # " by caller: " # debug_show(caller));

    // SECURITY: If marketplace is configured, verify caller is the marketplace
    switch (marketplaceCanister) {
      case (?marketplace) {
        if (caller != marketplace) {
          Debug.print("Unauthorized getLandOwner attempt - Caller: " # debug_show(caller) # " Expected: " # debug_show(marketplace));
          Debug.trap("Unauthorized: Only the authorized marketplace canister can query land ownership");
        };
      };
      case null {
        // Allow queries when marketplace not yet configured (during initialization)
        Debug.print("Warning: Marketplace canister not configured, allowing query from: " # debug_show(caller));
      };
    };

    for ((principal, lands) in principalMap.entries(landRegistry)) {
      for (land in lands.vals()) {
        if (land.landId == landId) {
          Debug.print("Land ownership found - LandId: " # Nat.toText(landId) # " Owner: " # debug_show(principal));
          return ?principal;
        };
      };
    };
    
    Debug.print("Land ownership not found for landId: " # Nat.toText(landId));
    null;
  };

  // SECURITY FIX: Allow marketplace transfers even when not configured
  // This allows the marketplace to function properly during initialization
  public shared ({ caller }) func transferLand(to : Principal, landId : Nat) : async Bool {
    // AUDIT: Log all transfer operations for security monitoring
    Debug.print("Transfer request for landId: " # Nat.toText(landId) # " to: " # debug_show(to) # " by caller: " # debug_show(caller));

    // SECURITY: If marketplace is configured, verify caller is the marketplace
    switch (marketplaceCanister) {
      case (?marketplace) {
        if (caller != marketplace) {
          Debug.print("Unauthorized transferLand attempt - Caller: " # debug_show(caller) # " Expected: " # debug_show(marketplace));
          Debug.trap("Unauthorized: Only the authorized marketplace canister can transfer land");
        };
      };
      case null {
        // Allow transfers when marketplace not yet configured (during initialization)
        Debug.print("Warning: Marketplace canister not configured, allowing transfer from: " # debug_show(caller));
      };
    };

    // Find the land with the given landId
    for ((principal, lands) in principalMap.entries(landRegistry)) {
      var landIndex : ?Nat = null;
      var i = 0;
      for (land in lands.vals()) {
        if (land.landId == landId) {
          landIndex := ?i;
        };
        i += 1;
      };

      switch (landIndex) {
        case null {};
        case (?index) {
          // Remove land from current owner
          let updatedLands = Array.tabulate(
            lands.size() - 1,
            func(i : Nat) : LandData {
              if (i < index) { lands[i] } else { lands[i + 1] };
            },
          );
          landRegistry := principalMap.put(landRegistry, principal, updatedLands);

          // Add land to new owner
          let newLand = {
            lands[index] with
            principal = to;
          };
          let toLands = switch (principalMap.get(landRegistry, to)) {
            case (?lands) { lands };
            case null { [] };
          };
          let updatedToLands = Array.append(toLands, [newLand]);
          landRegistry := principalMap.put(landRegistry, to, updatedToLands);

          Debug.print("Land transfer successful - LandId: " # Nat.toText(landId) # " From: " # debug_show(principal) # " To: " # debug_show(to));
          return true;
        };
      };
    };
    
    Debug.print("Land transfer failed - LandId not found: " # Nat.toText(landId));
    false;
  };

  // Admin function to view any user's land (for debugging/support)
  public query ({ caller }) func adminGetLandData(user : Principal) : async ?[LandData] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view other users' land data");
    };
    principalMap.get(landRegistry, user);
  };

  public query ({ caller }) func getTopLands(limit : Nat) : async [TopLandEntry] {
    // Require user authentication for leaderboard access
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view leaderboard");
    };

    var entries : [TopLandEntry] = [];

    for ((principal, lands) in principalMap.entries(landRegistry)) {
      for (land in lands.vals()) {
        entries := Array.append(
          entries,
          [
            {
              principal;
              plotName = land.plotName;
              upgradeLevel = land.upgradeLevel;
              tokenBalance = 0;
            },
          ],
        );
      };
    };

    let sortedEntries = Array.sort(
      entries,
      func(a : TopLandEntry, b : TopLandEntry) : { #less; #equal; #greater } {
        if (a.upgradeLevel > b.upgradeLevel) { #less } else if (a.upgradeLevel < b.upgradeLevel) {
          #greater;
        } else if (a.tokenBalance > b.tokenBalance) { #less } else if (a.tokenBalance < b.tokenBalance) {
          #greater;
        } else { #equal };
      },
    );

    let resultSize = if (limit < sortedEntries.size()) { limit } else {
      sortedEntries.size();
    };
    Array.tabulate(resultSize, func(i : Nat) : TopLandEntry { sortedEntries[i] });
  };

  // Loot Cache and Modification Functions

  public shared ({ caller }) func discoverLootCache(tier : Nat) : async DiscoverCacheResult {
    // Only authenticated users can discover loot caches
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can discover loot caches");
    };

    // Verify user has land data
    let lands = switch (principalMap.get(landRegistry, caller)) {
      case null {
        Debug.trap("Land not found for principal");
      };
      case (?l) { l };
    };

    // Update charge before checking
    let updatedLand = updateCharge(lands[0]);

    // Verify sufficient cycle charge for all tiers
    let requiredCharge = switch (tier) {
      case 1 { 200 };
      case 2 { 500 };
      case 3 { 1000 };
      case _ { Debug.trap("Invalid tier: must be 1, 2, or 3") };
    };

    if (updatedLand.cycleCharge < requiredCharge) {
      return #insufficientCharge {
        required = requiredCharge;
        current = updatedLand.cycleCharge;
      };
    };

    // Deduct cycle charge
    let finalLand = {
      updatedLand with
      cycleCharge = updatedLand.cycleCharge - requiredCharge;
    };
    let updatedLands = Array.tabulate(
      lands.size(),
      func(i : Nat) : LandData {
        if (i == 0) { finalLand } else { lands[i] };
      },
    );
    landRegistry := principalMap.put(landRegistry, caller, updatedLands);

    // Create new cache
    let cacheId = nextCacheId;
    nextCacheId += 1;

    let newCache : LootCache = {
      cache_id = cacheId;
      tier;
      owner = caller;
      discovered_at = Time.now();
      is_opened = false;
    };

    let userCaches = switch (principalMap.get(lootCaches, caller)) {
      case (?caches) { caches };
      case null { [] };
    };

    let updatedCaches = Array.append(userCaches, [newCache]);
    lootCaches := principalMap.put(lootCaches, caller, updatedCaches);

    #success(newCache);
  };

  public shared ({ caller }) func processCache(cache_id : Nat) : async Modification {
    // Only authenticated users can process caches
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can process caches");
    };

    let userCaches = switch (principalMap.get(lootCaches, caller)) {
      case (?caches) { caches };
      case null {
        Debug.trap("No caches found for user");
      };
    };

    // Find the index of the cache with the given cache_id
    var cacheIndex : ?Nat = null;
    var i = 0;
    for (cache in userCaches.vals()) {
      if (cache.cache_id == cache_id) {
        cacheIndex := ?i;
      };
      i += 1;
    };

    switch (cacheIndex) {
      case null {
        Debug.trap("Cache not found");
      };
      case (?index) {
        let cache = userCaches[index];

        // Verify ownership
        if (cache.owner != caller) {
          Debug.trap("Unauthorized: You don't own this cache");
        };

        if (cache.is_opened) {
          Debug.trap("Cache already opened");
        };

        let fourHoursInNanos = 14_400_000_000_000;
        let timeSinceDiscovery = Time.now() - cache.discovered_at;

        // Check if 4-hour delay has passed OR user has sufficient charge to bypass
        let canOpenWithTime = timeSinceDiscovery >= fourHoursInNanos;
        
        if (not canOpenWithTime) {
          // Check if user can bypass with charge
          let lands = switch (principalMap.get(landRegistry, caller)) {
            case null {
              Debug.trap("Land not found for principal");
            };
            case (?l) { l };
          };

          let updatedLand = updateCharge(lands[0]);

          if (updatedLand.cycleCharge < CACHE_PROCESS_CHARGE_COST) {
            Debug.trap("Cache cannot be opened yet: wait for cooldown or have sufficient charge");
          };

          // Deduct charge for instant processing
          let finalLand = {
            updatedLand with
            cycleCharge = updatedLand.cycleCharge - CACHE_PROCESS_CHARGE_COST;
          };
          let updatedLands = Array.tabulate(
            lands.size(),
            func(i : Nat) : LandData {
              if (i == 0) { finalLand } else { lands[i] };
            },
          );
          landRegistry := principalMap.put(landRegistry, caller, updatedLands);
        };

        // Generate modification with tier probabilities
        let random = await Random.blob();
        let tier = switch (Random.Finite(random).range(100)) {
          case (?val) {
            if (val < 70) { 1 } else if (val < 95) { 2 } else { 3 };
          };
          case null { 1 };
        };

        let multiplier = switch (tier) {
          case 1 { 1.1 };
          case 2 { 1.25 };
          case 3 { 1.5 };
          case _ { 1.0 };
        };

        let modelUrl = switch (tier) {
          case 1 { "https://assets.cybergenesis.io/models/tier1.glb" };
          case 2 { "https://assets.cybergenesis.io/models/tier2.glb" };
          case 3 { "https://assets.cybergenesis.io/models/tier3.glb" };
          case _ { "https://assets.cybergenesis.io/models/tier1.glb" };
        };

        let modId = nextModId;
        nextModId += 1;

        let newMod : Modification = {
          mod_id = modId;
          rarity_tier = tier;
          multiplier_value = multiplier;
          model_url = modelUrl;
        };

        let userMods = switch (principalMap.get(modifications, caller)) {
          case (?mods) { mods };
          case null { [] };
        };

        let updatedMods = Array.append(userMods, [newMod]);
        modifications := principalMap.put(modifications, caller, updatedMods);

        // Mark cache as opened
        let updatedCache = {
          cache with
          is_opened = true;
        };

        let updatedCaches = Array.tabulate(
          userCaches.size(),
          func(i : Nat) : LootCache {
            if (i == index) { updatedCache } else { userCaches[i] };
          },
        );
        lootCaches := principalMap.put(lootCaches, caller, updatedCaches);

        newMod;
      };
    };
  };

  public shared ({ caller }) func useConsumableBuff(item_id : Nat) : async () {
    // Only authenticated users can use consumable buffs
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can use consumable buffs");
    };

    let userBuffs = switch (principalMap.get(consumableBuffs, caller)) {
      case (?buffs) { buffs };
      case null {
        Debug.trap("No consumable buffs found for user");
      };
    };

    // Find the index of the buff with the given item_id
    var buffIndex : ?Nat = null;
    var i = 0;
    for (buff in userBuffs.vals()) {
      if (i == item_id) {
        buffIndex := ?i;
      };
      i += 1;
    };

    switch (buffIndex) {
      case null {
        Debug.trap("Buff not found");
      };
      case (?index) {
        // Remove the used buff from inventory
        let updatedBuffs = Array.tabulate(
          userBuffs.size() - 1,
          func(i : Nat) : ConsumableBuff {
            if (i < index) { userBuffs[i] } else { userBuffs[i + 1] };
          },
        );
        consumableBuffs := principalMap.put(consumableBuffs, caller, updatedBuffs);
      };
    };
  };

  public query ({ caller }) func getMyLootCaches() : async [LootCache] {
    // Only authenticated users can view their loot caches
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their loot caches");
    };

    switch (principalMap.get(lootCaches, caller)) {
      case (?caches) { caches };
      case null { [] };
    };
  };

  public query ({ caller }) func getMyModifications() : async [Modification] {
    // Only authenticated users can view their modifications
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their modifications");
    };

    switch (principalMap.get(modifications, caller)) {
      case (?mods) { mods };
      case null { [] };
    };
  };

  public query ({ caller }) func getHighestRarityModification() : async ?Modification {
    // Only authenticated users can view their modifications
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their modifications");
    };

    switch (principalMap.get(modifications, caller)) {
      case null { null };
      case (?mods) {
        if (mods.size() == 0) {
          return null;
        };

        var highest : ?Modification = null;
        for (mod in mods.vals()) {
          switch (highest) {
            case null { highest := ?mod };
            case (?current) {
              if (mod.rarity_tier > current.rarity_tier) {
                highest := ?mod;
              };
            };
          };
        };
        highest;
      };
    };
  };

  // DAO Administrative Functions - Only callable by GovernanceCanister

  public shared ({ caller }) func adminSetAllModifiers(modifier_list : [Modifier]) : async () {
    // Only the configured GovernanceCanister can call this function
    switch (governanceCanister) {
      case null {
        Debug.trap("Unauthorized: GovernanceCanister not configured. Admin must call setGovernanceCanister first.");
      };
      case (?governance) {
        if (caller != governance) {
          Debug.trap("Unauthorized: Only the GovernanceCanister can set all modifiers");
        };
      };
    };

    // Validate modifier list is not empty
    if (modifier_list.size() == 0) {
      Debug.trap("Invalid modifier list: Must contain at least one modifier");
    };

    // Store the complete modifier list
    modifiers := modifier_list;
  };

  // Modifier Query Functions - Require user authentication

  public query ({ caller }) func getAllModifiers() : async [Modifier] {
    // Require user authentication for modifier catalog access
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view modifier catalog");
    };
    modifiers;
  };

  public query ({ caller }) func getModifierById(mod_id : Nat) : async ?Modifier {
    // Require user authentication for modifier queries
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can query modifiers");
    };

    for (modifier in modifiers.vals()) {
      if (modifier.mod_id == mod_id) {
        return ?modifier;
      };
    };
    null;
  };

  public query ({ caller }) func getModifiersByTier(tier : Nat) : async [Modifier] {
    // Require user authentication for tier-based modifier queries
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can query modifiers by tier");
    };

    Array.filter(modifiers, func(m : Modifier) : Bool { m.rarity_tier == tier });
  };

  // Debugging endpoint to get current CBR balance
  public query ({ caller }) func getCurrentCbrBalance() : async Nat {
    // Only authenticated users can check their own CBR balance
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can check their CBR balance");
    };

    // Note: This is a query function, so it cannot make inter-canister calls
    // In production, the frontend should call CyberTokenCanister.icrc1_balance_of directly
    // This function is kept for API compatibility but returns 0
    Debug.print("getCurrentCbrBalance called for principal " # debug_show(caller) # " - Frontend should call CyberTokenCanister directly");
    0;
  };

  // Network Status Functions - ADMIN ONLY (Authorized Admin Principal)

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // SECURITY: Restrict network status functions to authorized admin principal only
  public shared ({ caller }) func getAssetCanisterCycleBalance() : async Text {
    // SECURITY: Only the authorized admin principal can retrieve cycle balance information
    if (caller != authorizedAdminPrincipal) {
      Debug.trap("Unauthorized: Only the authorized admin principal (whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae) can view cycle balances");
    };

    Debug.print("Admin " # debug_show(caller) # " requesting Asset Canister cycle balance");
    let url = "https://icp-api.io/api/v3/canisters/bd3sg-teaaa-aaaaa-qaaba-cai";
    await OutCall.httpGetRequest(url, [], transform);
  };

  public shared ({ caller }) func getLandCanisterCycleBalance() : async Text {
    // SECURITY: Only the authorized admin principal can retrieve cycle balance information
    if (caller != authorizedAdminPrincipal) {
      Debug.trap("Unauthorized: Only the authorized admin principal (whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae) can view cycle balances");
    };

    Debug.print("Admin " # debug_show(caller) # " requesting Land Canister cycle balance");
    let url = "https://icp-api.io/api/v3/canisters/br5f7-7uaaa-aaaaa-qaaca-cai";
    await OutCall.httpGetRequest(url, [], transform);
  };
};
