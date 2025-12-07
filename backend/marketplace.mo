import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import AccessControl "authorization/access-control";

actor MarketplaceCanister {
  
  let accessControlState = AccessControl.initState();

  public type Listing = {
    listingId : Nat;
    tokenId : Nat;
    seller : Principal;
    price : Nat;
    isActive : Bool;
  };

  public type BuyResult = {
    #success : { buyer : Principal; seller : Principal; price : Nat };
    #listingNotFound;
    #listingNotActive;
    #insufficientFunds : { required : Nat; available : Nat };
    #transferFailed : Text;
    #cannotBuyOwnListing;
  };

  public type UserProfile = {
    name : Text;
  };

  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);
  var listings : OrderedMap.Map<Nat, Listing> = natMap.empty<Listing>();
  var nextListingId : Nat = 0;

  // Token ID to seller mapping for ownership tracking
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var tokenOwners : OrderedMap.Map<Nat, Principal> = natMap.empty<Principal>();
  var userProfiles : OrderedMap.Map<Principal, UserProfile> = principalMap.empty<UserProfile>();

  // Configurable canister principals - must be set by admin after deployment
  var landCanisterPrincipal : ?Principal = null;
  var tokenCanisterPrincipal : ?Principal = null;

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

  // Admin configuration functions
  public shared ({ caller }) func setLandCanister(canisterId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set land canister");
    };
    landCanisterPrincipal := ?canisterId;
  };

  public shared ({ caller }) func setTokenCanister(canisterId : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set token canister");
    };
    tokenCanisterPrincipal := ?canisterId;
  };

  public shared ({ caller }) func listLand(tokenId : Nat, price : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can list land");
    };

    if (price == 0) {
      Debug.trap("Invalid price: Price must be greater than 0");
    };

    // Verify land canister is configured
    let landCanister = switch (landCanisterPrincipal) {
      case null {
        Debug.trap("Configuration error: Land canister not set. Admin must call setLandCanister first.");
      };
      case (?canisterId) {
        actor (Principal.toText(canisterId)) : actor {
          getLandOwner : (Nat) -> async ?Principal;
          transferLand : (Principal, Nat) -> async Bool;
        };
      };
    };

    // Verify caller owns the land via inter-canister call
    let ownerResult = await landCanister.getLandOwner(tokenId);
    let currentOwner = switch (ownerResult) {
      case (?owner) { owner };
      case null {
        Debug.trap("Land not found or ownership cannot be verified");
      };
    };

    if (currentOwner != caller) {
      Debug.trap("Unauthorized: You don't own this land");
    };

    // Check if land is already listed
    for ((_, listing) in natMap.entries(listings)) {
      if (listing.tokenId == tokenId and listing.isActive) {
        Debug.trap("Land is already listed");
      };
    };

    // Transfer land to marketplace for escrow
    let transferResult = await landCanister.transferLand(Principal.fromActor(MarketplaceCanister), tokenId);
    if (not transferResult) {
      Debug.trap("Failed to transfer land to marketplace escrow");
    };

    let listingId = nextListingId;
    nextListingId += 1;

    let listing : Listing = {
      listingId;
      tokenId;
      seller = caller;
      price;
      isActive = true;
    };

    listings := natMap.put(listings, listingId, listing);
    tokenOwners := natMap.put(tokenOwners, tokenId, Principal.fromActor(MarketplaceCanister));
    
    Debug.print("Land listed successfully - ListingId: " # Nat.toText(listingId) # " TokenId: " # Nat.toText(tokenId) # " Seller: " # debug_show(caller) # " Price: " # Nat.toText(price));
    
    listingId;
  };

  public shared ({ caller }) func buyLand(listingId : Nat) : async BuyResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can buy land");
    };

    switch (natMap.get(listings, listingId)) {
      case null {
        return #listingNotFound;
      };
      case (?listing) {
        if (not listing.isActive) {
          return #listingNotActive;
        };

        if (caller == listing.seller) {
          return #cannotBuyOwnListing;
        };

        // Verify canisters are configured
        let landCanister = switch (landCanisterPrincipal) {
          case null {
            Debug.trap("Configuration error: Land canister not set");
          };
          case (?canisterId) {
            actor (Principal.toText(canisterId)) : actor {
              transferLand : (Principal, Nat) -> async Bool;
            };
          };
        };

        let tokenCanister = switch (tokenCanisterPrincipal) {
          case null {
            Debug.trap("Configuration error: Token canister not set");
          };
          case (?canisterId) {
            actor (Principal.toText(canisterId)) : actor {
              icrc1_balance_of : ({ owner : Principal; subaccount : ?Blob }) -> async Nat;
              icrc1_transfer : ({
                from : { owner : Principal; subaccount : ?Blob };
                to : { owner : Principal; subaccount : ?Blob };
                amount : Nat;
                fee : ?Nat;
                memo : ?Blob;
                created_at_time : ?Nat64;
              }) -> async {
                #Ok : Nat;
                #Err : {
                  #BadFee : { expected_fee : Nat };
                  #BadBurn : { min_burn_amount : Nat };
                  #InsufficientFunds : { balance : Nat };
                  #TooOld;
                  #CreatedInFuture : { ledger_time : Nat64 };
                  #Duplicate : { duplicate_of : Nat };
                  #TemporarilyUnavailable;
                  #GenericError : { error_code : Nat; message : Text };
                };
              };
            };
          };
        };

        Debug.print("Marketplace purchase - Buyer: " # debug_show(caller) # " Seller: " # debug_show(listing.seller) # " Amount: " # Nat.toText(listing.price));

        // Verify buyer has sufficient tokens
        let buyerBalance = await tokenCanister.icrc1_balance_of({ owner = caller; subaccount = null });
        if (buyerBalance < listing.price) {
          Debug.print("Marketplace Purchase Failed: Insufficient funds - Required: " # Nat.toText(listing.price) # " Available: " # Nat.toText(buyerBalance));
          return #insufficientFunds { required = listing.price; available = buyerBalance };
        };

        // Execute atomic swap:
        // 1. Transfer tokens from buyer to seller
        let transferResult = await tokenCanister.icrc1_transfer({
          from = { owner = caller; subaccount = null };
          to = { owner = listing.seller; subaccount = null };
          amount = listing.price;
          fee = null;
          memo = null;
          created_at_time = null;
        });

        switch (transferResult) {
          case (#Err(error)) {
            Debug.print("Marketplace Purchase Failed: Token transfer error - " # debug_show(error));
            return #transferFailed("Token transfer failed");
          };
          case (#Ok(_)) {
            Debug.print("Token transfer successful");
            
            // 2. Transfer NFT from marketplace to buyer
            let nftTransferResult = await landCanister.transferLand(caller, listing.tokenId);
            if (not nftTransferResult) {
              Debug.print("NFT transfer failed - initiating rollback");
              // Rollback: transfer tokens back to buyer
              ignore await tokenCanister.icrc1_transfer({
                from = { owner = listing.seller; subaccount = null };
                to = { owner = caller; subaccount = null };
                amount = listing.price;
                fee = null;
                memo = null;
                created_at_time = null;
              });
              return #transferFailed("NFT transfer failed - tokens refunded");
            };

            Debug.print("NFT transfer successful");

            // Update ownership tracking
            tokenOwners := natMap.put(tokenOwners, listing.tokenId, caller);

            // Mark listing as inactive
            let updatedListing = {
              listing with
              isActive = false;
            };
            listings := natMap.put(listings, listingId, updatedListing);

            Debug.print("Marketplace purchase completed successfully");

            #success {
              buyer = caller;
              seller = listing.seller;
              price = listing.price;
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func cancelListing(listingId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can cancel listings");
    };

    switch (natMap.get(listings, listingId)) {
      case null {
        Debug.trap("Listing not found");
      };
      case (?listing) {
        if (listing.seller != caller) {
          Debug.trap("Unauthorized: Only the seller can cancel this listing");
        };

        if (not listing.isActive) {
          Debug.trap("Listing is already inactive");
        };

        // Verify land canister is configured
        let landCanister = switch (landCanisterPrincipal) {
          case null {
            Debug.trap("Configuration error: Land canister not set");
          };
          case (?canisterId) {
            actor (Principal.toText(canisterId)) : actor {
              transferLand : (Principal, Nat) -> async Bool;
            };
          };
        };

        // Return NFT ownership to seller
        let transferResult = await landCanister.transferLand(caller, listing.tokenId);
        if (not transferResult) {
          Debug.trap("Failed to return land to seller");
        };

        tokenOwners := natMap.put(tokenOwners, listing.tokenId, caller);

        let updatedListing = {
          listing with
          isActive = false;
        };
        listings := natMap.put(listings, listingId, updatedListing);
        
        Debug.print("Listing cancelled successfully - ListingId: " # Nat.toText(listingId) # " Seller: " # debug_show(caller));
      };
    };
  };

  // Marketplace Query Functions - Require authenticated user (at least guest level)

  public query ({ caller }) func getActiveListing(listingId : Nat) : async ?Listing {
    // Require authenticated principal (including guests) for marketplace browsing
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Debug.trap("Unauthorized: Only authenticated users can browse marketplace");
    };

    switch (natMap.get(listings, listingId)) {
      case (?listing) {
        if (listing.isActive) { ?listing } else { null };
      };
      case null { null };
    };
  };

  public query ({ caller }) func getAllActiveListings() : async [Listing] {
    // Require authenticated principal (including guests) for marketplace catalog browsing
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Debug.trap("Unauthorized: Only authenticated users can browse marketplace catalog");
    };

    var activeListings : [Listing] = [];
    for ((_, listing) in natMap.entries(listings)) {
      if (listing.isActive) {
        activeListings := Array.append(activeListings, [listing]);
      };
    };
    activeListings;
  };

  public query ({ caller }) func getMyListings() : async [Listing] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view their listings");
    };

    var myListings : [Listing] = [];
    for ((_, listing) in natMap.entries(listings)) {
      if (listing.seller == caller) {
        myListings := Array.append(myListings, [listing]);
      };
    };
    myListings;
  };

  public query ({ caller }) func adminGetAllListings() : async [Listing] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view all listings");
    };

    var allListings : [Listing] = [];
    for ((_, listing) in natMap.entries(listings)) {
      allListings := Array.append(allListings, [listing]);
    };
    allListings;
  };

  public shared ({ caller }) func adminCancelListing(listingId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can force cancel listings");
    };

    switch (natMap.get(listings, listingId)) {
      case null {
        Debug.trap("Listing not found");
      };
      case (?listing) {
        // Verify land canister is configured
        let landCanister = switch (landCanisterPrincipal) {
          case null {
            Debug.trap("Configuration error: Land canister not set");
          };
          case (?canisterId) {
            actor (Principal.toText(canisterId)) : actor {
              transferLand : (Principal, Nat) -> async Bool;
            };
          };
        };

        // Return NFT to original seller
        let transferResult = await landCanister.transferLand(listing.seller, listing.tokenId);
        if (not transferResult) {
          Debug.trap("Failed to return land to seller");
        };

        tokenOwners := natMap.put(tokenOwners, listing.tokenId, listing.seller);
        
        let updatedListing = {
          listing with
          isActive = false;
        };
        listings := natMap.put(listings, listingId, updatedListing);
        
        Debug.print("Admin cancelled listing - ListingId: " # Nat.toText(listingId) # " Admin: " # debug_show(caller));
      };
    };
  };
};
