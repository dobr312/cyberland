import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import AccessControl "authorization/access-control";

actor CyberTokenCanister {
  
  let accessControlState = AccessControl.initState();

  public type Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  public type TransferArgs = {
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type TransferResult = {
    #Ok : Nat;
    #Err : TransferError;
  };

  public type MetadataValue = {
    #Text : Text;
    #Nat : Nat;
    #Blob : Blob;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var balances : OrderedMap.Map<Principal, Nat> = principalMap.empty<Nat>();
  
  // Authorized minters - only these canisters can mint tokens
  var authorizedMinters : [Principal] = [];

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

  // SECURITY FIX: Remove authentication requirement for balance queries
  // ICRC-1 standard requires public balance queries without access control
  // Specification explicitly states: "balance queries without access control restrictions"
  public query func icrc1_balance_of(account : Account) : async Nat {
    let owner = account.owner;
    
    Debug.print("Fetching CBR balance for Principal: " # debug_show(owner));
    
    let balance = switch (principalMap.get(balances, owner)) {
      case (?balance) { balance };
      case null { 0 };
    };
    
    Debug.print("CBR Balance Response: " # debug_show(balance) # " for Principal: " # debug_show(owner));
    balance;
  };

  public shared ({ caller }) func icrc1_transfer(args : TransferArgs) : async TransferResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.print("Transfer failed: Unauthorized caller " # debug_show(caller));
      return #Err(#GenericError {
        error_code = 1;
        message = "Unauthorized: Only authenticated users can transfer tokens";
      });
    };

    let from = args.from;
    let to = args.to;
    let amount = args.amount;

    Debug.print("Token transfer from: " # debug_show(from.owner) # " to: " # debug_show(to.owner) # " amount: " # debug_show(amount));

    if (from.owner != caller) {
      Debug.print("Transfer failed: Caller mismatch - caller: " # debug_show(caller) # " from: " # debug_show(from.owner));
      return #Err(#GenericError {
        error_code = 2;
        message = "Unauthorized: Cannot transfer from another user's account";
      });
    };

    let fromBalance = switch (principalMap.get(balances, from.owner)) {
      case (?balance) { balance };
      case null { 0 };
    };

    if (fromBalance < amount) {
      Debug.print("Transfer failed: Insufficient funds - required: " # debug_show(amount) # " available: " # debug_show(fromBalance));
      return #Err(#InsufficientFunds {
        balance = fromBalance;
      });
    };

    let toBalance = switch (principalMap.get(balances, to.owner)) {
      case (?balance) { balance };
      case null { 0 };
    };

    balances := principalMap.put(balances, from.owner, fromBalance - amount);
    balances := principalMap.put(balances, to.owner, toBalance + amount);

    let newFromBalance = fromBalance - amount;
    let newToBalance = toBalance + amount;
    
    Debug.print("Transfer successful - from new balance: " # debug_show(newFromBalance) # " to new balance: " # debug_show(newToBalance));

    #Ok(amount);
  };

  public query func icrc1_metadata() : async [(Text, MetadataValue)] {
    [
      ("icrc1:name", #Text("CYBER")),
      ("icrc1:symbol", #Text("CBR")),
      ("icrc1:decimals", #Nat(8)),
      ("icrc1:fee", #Nat(0)),
    ];
  };

  public query func icrc1_total_supply() : async Nat {
    var total = 0;
    for ((_, balance) in principalMap.entries(balances)) {
      total += balance;
    };
    total;
  };

  public shared ({ caller }) func addAuthorizedMinter(minter : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can add authorized minters");
    };
    
    // Check if already authorized
    for (existingMinter in authorizedMinters.vals()) {
      if (existingMinter == minter) {
        Debug.trap("Minter already authorized");
      };
    };
    
    authorizedMinters := Array.append(authorizedMinters, [minter]);
    Debug.print("Authorized minter added: " # debug_show(minter));
  };

  public shared ({ caller }) func removeAuthorizedMinter(minter : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can remove authorized minters");
    };
    
    authorizedMinters := Array.filter(authorizedMinters, func(m : Principal) : Bool { m != minter });
    Debug.print("Authorized minter removed: " # debug_show(minter));
  };

  public shared ({ caller }) func mint(to : Principal, amount : Nat) : async () {
    Debug.print("Mint request - caller: " # debug_show(caller) # " to: " # debug_show(to) # " amount: " # debug_show(amount));
    
    // Verify caller is an authorized minter
    var isAuthorized = false;
    for (minter in authorizedMinters.vals()) {
      if (caller == minter) {
        isAuthorized := true;
      };
    };
    
    if (not isAuthorized) {
      Debug.print("Mint failed: Unauthorized minter " # debug_show(caller));
      Debug.trap("Unauthorized: Only authorized minter canisters can mint tokens");
    };

    let currentBalance = switch (principalMap.get(balances, to)) {
      case (?balance) { balance };
      case null { 0 };
    };

    let newBalance = currentBalance + amount;
    balances := principalMap.put(balances, to, newBalance);
    
    Debug.print("Mint successful - recipient: " # debug_show(to) # " new balance: " # debug_show(newBalance));
  };

  // Diagnostic query method to check canister's own token balance
  public query ({ caller }) func getCanisterTokenBalance() : async Nat {
    // Only admins can check the canister's own balance for debugging
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view canister token balance");
    };
    
    let canisterPrincipal = Principal.fromActor(CyberTokenCanister);
    Debug.print("Fetching canister token balance for: " # debug_show(canisterPrincipal));
    
    let balance = switch (principalMap.get(balances, canisterPrincipal)) {
      case (?balance) { 
        Debug.print("Canister token balance: " # debug_show(balance));
        balance 
      };
      case null { 
        Debug.print("Canister token balance: 0 (no entry found)");
        0 
      };
    };
    
    balance;
  };

  public query ({ caller }) func adminGetAllBalances() : async [(Principal, Nat)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view all balances");
    };
    
    var result : [(Principal, Nat)] = [];
    for ((principal, balance) in principalMap.entries(balances)) {
      result := Array.append(result, [(principal, balance)]);
    };
    result;
  };

  public query ({ caller }) func getAuthorizedMinters() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view authorized minters");
    };
    authorizedMinters;
  };
};
