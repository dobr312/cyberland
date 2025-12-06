import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import AccessControl "authorization/access-control";

actor GovernanceCanister {
  
  let accessControlState = AccessControl.initState();

  public type Proposal = {
    id : Nat;
    title : Text;
    description : Text;
    proposer : Principal;
    createdAt : Time.Time;
    votesYes : Nat;
    votesNo : Nat;
    isActive : Bool;
  };

  public type Vote = {
    voter : Principal;
    proposalId : Nat;
    choice : Bool;
    weight : Nat;
  };

  public type StakeResult = {
    #success : { newStake : Nat };
    #insufficientTokens : { required : Nat; available : Nat };
    #transferFailed : Text;
  };

  public type VoteResult = {
    #success : { weight : Nat };
    #proposalNotFound;
    #proposalNotActive;
    #alreadyVoted;
    #notStaker;
  };

  public type UserProfile = {
    name : Text;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);

  var stakedBalances : OrderedMap.Map<Principal, Nat> = principalMap.empty<Nat>();
  var proposals : OrderedMap.Map<Nat, Proposal> = natMap.empty<Proposal>();
  var votes : OrderedMap.Map<Nat, [Vote]> = natMap.empty<[Vote]>();
  var nextProposalId : Nat = 0;
  var userProfiles : OrderedMap.Map<Principal, UserProfile> = principalMap.empty<UserProfile>();

  // Minimum stake required to create proposals (configurable by admin)
  var minimumStakeForProposal : Nat = 1000;

  let tokenCanisterPrincipal : Principal = Principal.fromText("w4q3i-7yaaa-aaaam-ab3oq-cai");

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

  public shared ({ caller }) func stakeTokens(amount : Nat) : async StakeResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can stake tokens");
    };

    if (amount == 0) {
      Debug.trap("Invalid amount: Must stake more than 0 tokens");
    };

    // In production: verify caller has sufficient tokens and transfer to governance canister
    // let balance = await CyberTokenCanister.icrc1_balance_of({ owner = caller; subaccount = null });
    // if (balance < amount) { return #insufficientTokens { required = amount; available = balance }; };
    // let transferResult = await CyberTokenCanister.icrc1_transfer({...});

    let currentStake = switch (principalMap.get(stakedBalances, caller)) {
      case (?stake) { stake };
      case null { 0 };
    };

    let newStake = currentStake + amount;
    stakedBalances := principalMap.put(stakedBalances, caller, newStake);

    #success { newStake };
  };

  public shared ({ caller }) func unstakeTokens(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can unstake tokens");
    };

    let currentStake = switch (principalMap.get(stakedBalances, caller)) {
      case (?stake) { stake };
      case null { 0 };
    };

    if (amount > currentStake) {
      Debug.trap("Insufficient staked balance");
    };

    let newStake = currentStake - amount;
    stakedBalances := principalMap.put(stakedBalances, caller, newStake);

    // In production: transfer tokens back to caller
    // await CyberTokenCanister.icrc1_transfer({...});
  };

  public query ({ caller }) func getStakedBalance() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view staked balance");
    };

    switch (principalMap.get(stakedBalances, caller)) {
      case (?stake) { stake };
      case null { 0 };
    };
  };

  public shared ({ caller }) func createProposal(title : Text, description : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can create proposals");
    };

    let stakedAmount = switch (principalMap.get(stakedBalances, caller)) {
      case (?stake) { stake };
      case null { 0 };
    };

    if (stakedAmount < minimumStakeForProposal) {
      Debug.trap("Insufficient stake: Must have at least " # Nat.toText(minimumStakeForProposal) # " tokens staked to create proposals");
    };

    if (Text.size(title) == 0 or Text.size(title) > 100) {
      Debug.trap("Invalid title: Must be between 1 and 100 characters");
    };

    if (Text.size(description) == 0 or Text.size(description) > 1000) {
      Debug.trap("Invalid description: Must be between 1 and 1000 characters");
    };

    let proposalId = nextProposalId;
    nextProposalId += 1;

    let proposal : Proposal = {
      id = proposalId;
      title;
      description;
      proposer = caller;
      createdAt = Time.now();
      votesYes = 0;
      votesNo = 0;
      isActive = true;
    };

    proposals := natMap.put(proposals, proposalId, proposal);
    votes := natMap.put(votes, proposalId, []);

    proposalId;
  };

  public shared ({ caller }) func vote(proposalId : Nat, choice : Bool) : async VoteResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can vote");
    };

    let stakedAmount = switch (principalMap.get(stakedBalances, caller)) {
      case (?stake) { stake };
      case null { 0 };
    };

    if (stakedAmount == 0) {
      return #notStaker;
    };

    switch (natMap.get(proposals, proposalId)) {
      case null {
        return #proposalNotFound;
      };
      case (?proposal) {
        if (not proposal.isActive) {
          return #proposalNotActive;
        };

        let proposalVotes = switch (natMap.get(votes, proposalId)) {
          case (?v) { v };
          case null { [] };
        };

        for (vote in proposalVotes.vals()) {
          if (vote.voter == caller) {
            return #alreadyVoted;
          };
        };

        let newVote : Vote = {
          voter = caller;
          proposalId;
          choice;
          weight = stakedAmount;
        };

        let updatedVotes = Array.append(proposalVotes, [newVote]);
        votes := natMap.put(votes, proposalId, updatedVotes);

        let updatedProposal = if (choice) {
          {
            proposal with
            votesYes = proposal.votesYes + stakedAmount;
          };
        } else {
          {
            proposal with
            votesNo = proposal.votesNo + stakedAmount;
          };
        };

        proposals := natMap.put(proposals, proposalId, updatedProposal);

        #success { weight = stakedAmount };
      };
    };
  };

  public query ({ caller }) func getProposal(proposalId : Nat) : async ?Proposal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view proposals");
    };
    natMap.get(proposals, proposalId);
  };

  public query ({ caller }) func getAllActiveProposals() : async [Proposal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view proposals");
    };

    var activeProposals : [Proposal] = [];
    for ((_, proposal) in natMap.entries(proposals)) {
      if (proposal.isActive) {
        activeProposals := Array.append(activeProposals, [proposal]);
      };
    };
    activeProposals;
  };

  public query ({ caller }) func getAllProposals() : async [Proposal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view proposals");
    };

    var allProposals : [Proposal] = [];
    for ((_, proposal) in natMap.entries(proposals)) {
      allProposals := Array.append(allProposals, [proposal]);
    };
    allProposals;
  };

  public query ({ caller }) func getMyVotes() : async [Vote] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view their votes");
    };

    var myVotes : [Vote] = [];
    for ((_, proposalVotes) in natMap.entries(votes)) {
      for (vote in proposalVotes.vals()) {
        if (vote.voter == caller) {
          myVotes := Array.append(myVotes, [vote]);
        };
      };
    };
    myVotes;
  };

  public shared ({ caller }) func adminCloseProposal(proposalId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can close proposals");
    };

    switch (natMap.get(proposals, proposalId)) {
      case null {
        Debug.trap("Proposal not found");
      };
      case (?proposal) {
        let updatedProposal = {
          proposal with
          isActive = false;
        };
        proposals := natMap.put(proposals, proposalId, updatedProposal);
      };
    };
  };

  public shared ({ caller }) func adminSetMinimumStake(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set minimum stake");
    };
    minimumStakeForProposal := amount;
  };

  public query ({ caller }) func adminGetAllStakes() : async [(Principal, Nat)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view all stakes");
    };

    var allStakes : [(Principal, Nat)] = [];
    for ((principal, stake) in principalMap.entries(stakedBalances)) {
      allStakes := Array.append(allStakes, [(principal, stake)]);
    };
    allStakes;
  };

  public query ({ caller }) func getMinimumStakeForProposal() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view minimum stake requirement");
    };
    minimumStakeForProposal;
  };
};
