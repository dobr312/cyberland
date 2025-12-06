import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import AccessControl "authorization/access-control";

actor AssetCanister {

  let accessControlState = AccessControl.initState();

  public type Asset = {
    filename : Text;
    data : Blob;
    contentType : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  // HTTP Types
  public type HttpRequest = {
    method : Text;
    url : Text;
    headers : [HttpHeader];
    body : Blob;
    certificate_version : ?Nat16;
  };

  public type HttpResponse = {
    status_code : Nat16;
    headers : [HttpHeader];
    body : Blob;
    streaming_strategy : ?StreamingStrategy;
  };

  public type HttpHeader = {
    name : Text;
    value : Text;
  };

  public type StreamingStrategy = {
    #Callback : {
      token : StreamingCallbackToken;
      callback : query StreamingCallbackToken -> async StreamingCallbackResponse;
    };
  };

  public type StreamingCallbackToken = {
    key : Text;
    index : Nat;
    content_encoding : Text;
  };

  public type StreamingCallbackResponse = {
    body : Blob;
    token : ?StreamingCallbackToken;
  };

  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  var assets : OrderedMap.Map<Text, Asset> = textMap.empty<Asset>();
  var userProfiles : OrderedMap.Map<Principal, UserProfile> = principalMap.empty<UserProfile>();

  // GovernanceCanister principal for administrative control
  var governanceCanister : ?Principal = null;

  // Authorized admin principal for GLB model uploads (Internet Identity whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae)
  let authorizedAdminPrincipal : Principal = Principal.fromText("whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae");

  // HTTP Request Handler - NO ACCESS CONTROL for health checks
  public query func http_request(request : HttpRequest) : async HttpResponse {
    let path = request.url;

    // Fast health check endpoint - no access control, no complex logic
    if (path == "/health-fast") {
      return {
        status_code = 200;
        headers = [
          { name = "Content-Type"; value = "text/plain" },
          { name = "Access-Control-Allow-Origin"; value = "*" },
          { name = "Access-Control-Allow-Methods"; value = "GET, POST, OPTIONS" },
          { name = "Access-Control-Allow-Headers"; value = "Content-Type" },
        ];
        body = Text.encodeUtf8("OK");
        streaming_strategy = null;
      };
    };

    // Standard health check endpoint - no access control
    if (path == "/" or path == "/health") {
      return {
        status_code = 200;
        headers = [
          { name = "Content-Type"; value = "text/plain" },
          { name = "Access-Control-Allow-Origin"; value = "*" },
          { name = "Access-Control-Allow-Methods"; value = "GET, POST, OPTIONS" },
          { name = "Access-Control-Allow-Headers"; value = "Content-Type" },
        ];
        body = Text.encodeUtf8("HEALTHY");
        streaming_strategy = null;
      };
    };

    {
      status_code = 404;
      headers = [
        { name = "Content-Type"; value = "text/plain" },
        { name = "Access-Control-Allow-Origin"; value = "*" },
        { name = "Access-Control-Allow-Methods"; value = "GET, POST, OPTIONS" },
        { name = "Access-Control-Allow-Headers"; value = "Content-Type" },
      ];
      body = Text.encodeUtf8("Not Found");
      streaming_strategy = null;
    };
  };

  // Quick Asset Listing Function - returns first 5 assets for status checks
  public query func listAssetsQuick() : async [Text] {
    var filenames : [Text] = [];
    var count = 0;
    for ((filename, _) in textMap.entries(assets)) {
      if (count < 5) {
        filenames := Array.append(filenames, [filename]);
        count += 1;
      };
    };
    filenames;
  };

  // Access Control Functions

  // SECURITY FIX: Allow first caller to become admin (standard pattern)
  // This follows the same pattern as other canisters in the system
  public shared ({ caller }) func initializeAccessControl() : async () {
    Debug.print("Asset Canister access control initialization by: " # debug_show(caller));
    AccessControl.initialize(accessControlState, caller);
    Debug.print("Asset Canister access control initialized successfully");
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

  // Administrative Configuration

  public shared ({ caller }) func setGovernanceCanister(governance : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set governance canister");
    };
    governanceCanister := ?governance;
  };

  // Asset Management Functions - Only GovernanceCanister can upload/manage assets

  public shared ({ caller }) func uploadAsset(filename : Text, data : Blob) : async () {
    // Only the configured GovernanceCanister can upload assets
    switch (governanceCanister) {
      case null {
        Debug.trap("Unauthorized: GovernanceCanister not configured. Admin must call setGovernanceCanister first.");
      };
      case (?governance) {
        if (caller != governance) {
          Debug.trap("Unauthorized: Only the GovernanceCanister can upload assets");
        };
      };
    };

    if (Text.size(filename) == 0 or Text.size(filename) > 200) {
      Debug.trap("Invalid filename: Must be between 1 and 200 characters");
    };

    if (Blob.toArray(data).size() == 0) {
      Debug.trap("Invalid asset data: Cannot be empty");
    };

    // Determine content type from filename extension
    let contentType = if (Text.endsWith(filename, #text(".glb"))) {
      "model/gltf-binary";
    } else if (Text.endsWith(filename, #text(".obj"))) {
      "model/obj";
    } else if (Text.endsWith(filename, #text(".png"))) {
      "image/png";
    } else if (Text.endsWith(filename, #text(".jpg")) or Text.endsWith(filename, #text(".jpeg"))) {
      "image/jpeg";
    } else {
      "application/octet-stream";
    };

    let asset : Asset = {
      filename;
      data;
      contentType;
    };

    assets := textMap.put(assets, filename, asset);
  };

  // Admin-only GLB model upload function restricted to Internet Identity whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae
  public shared ({ caller }) func uploadLandModel(landTypeName : Text, modelData : Blob) : async Text {
    // STRICT GUARD CLAUSE: Only Internet Identity whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae can upload GLB models
    if (caller != authorizedAdminPrincipal) {
      Debug.trap("Unauthorized: Only the authorized admin principal (Internet Identity whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae) can upload GLB models");
    };

    // Validate land type name - must be one of the 7 static land types
    let validLandTypes = [
      "FOREST_VALLEY",
      "ISLAND_ARCHIPELAGO",
      "SNOW_PEAK",
      "DESERT_DUNE",
      "VOLCANIC_CRAG",
      "MYTHIC_VOID",
      "MYTHIC_AETHER",
    ];

    var isValidLandType = false;
    for (landType in validLandTypes.vals()) {
      if (landType == landTypeName) {
        isValidLandType := true;
      };
    };

    if (not isValidLandType) {
      Debug.trap("Invalid land type: Must be one of FOREST_VALLEY, ISLAND_ARCHIPELAGO, SNOW_PEAK, DESERT_DUNE, VOLCANIC_CRAG, MYTHIC_VOID, or MYTHIC_AETHER");
    };

    // Validate model data
    if (Blob.toArray(modelData).size() == 0) {
      Debug.trap("Invalid file data: Cannot be empty");
    };

    // Validate file size (max 50MB for GLB models)
    let maxSizeBytes = 52_428_800; // 50MB (52,428,800 bytes)
    if (Blob.toArray(modelData).size() > maxSizeBytes) {
      Debug.trap("File size exceeds 50 MB limit");
    };

    // Create filename by appending .glb extension to land type name
    let filename = landTypeName # ".glb";

    // Create asset with proper MIME type for GLB
    let asset : Asset = {
      filename;
      data = modelData;
      contentType = "model/gltf-binary";
    };

    // Store asset
    assets := textMap.put(assets, filename, asset);

    // Generate and return stable URL
    let canisterId = Principal.toText(Principal.fromActor(AssetCanister));
    let stableUrl = "https://" # canisterId # ".raw.ic0.app/" # filename;

    Debug.print("GLB model uploaded successfully by admin - Land Type: " # landTypeName # " Filename: " # filename # " URL: " # stableUrl);

    stableUrl;
  };

  // Emergency admin method for fallback access when GovernanceCanister is unavailable
  public shared ({ caller }) func emergencyAdmin() : async Text {
    // SECURITY: Only the authorized admin principal can assign emergency admin status
    if (caller != authorizedAdminPrincipal) {
      Debug.trap("Unauthorized: Only the authorized admin principal (whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae) can assign emergency admin status");
    };

    Debug.print("Emergency admin status assigned to: " # debug_show(caller));
    
    // Assign admin role to the authorized principal
    AccessControl.assignRole(accessControlState, caller, caller, #admin);
    
    "Emergency admin status assigned successfully to " # debug_show(caller);
  };

  public shared ({ caller }) func batchUploadAssets(assetList : [(Text, Blob)]) : async () {
    // Only the configured GovernanceCanister can batch upload assets
    switch (governanceCanister) {
      case null {
        Debug.trap("Unauthorized: GovernanceCanister not configured. Admin must call setGovernanceCanister first.");
      };
      case (?governance) {
        if (caller != governance) {
          Debug.trap("Unauthorized: Only the GovernanceCanister can batch upload assets");
        };
      };
    };

    if (assetList.size() == 0) {
      Debug.trap("Invalid asset list: Must contain at least one asset");
    };

    for ((filename, data) in assetList.vals()) {
      if (Text.size(filename) == 0 or Text.size(filename) > 200) {
        Debug.trap("Invalid filename in batch: Must be between 1 and 200 characters");
      };

      if (Blob.toArray(data).size() == 0) {
        Debug.trap("Invalid asset data in batch: Cannot be empty");
      };

      let contentType = if (Text.endsWith(filename, #text(".glb"))) {
        "model/gltf-binary";
      } else if (Text.endsWith(filename, #text(".obj"))) {
        "model/obj";
      } else if (Text.endsWith(filename, #text(".png"))) {
        "image/png";
      } else if (Text.endsWith(filename, #text(".jpg")) or Text.endsWith(filename, #text(".jpeg"))) {
        "image/jpeg";
      } else {
        "application/octet-stream";
      };

      let asset : Asset = {
        filename;
        data;
        contentType;
      };

      assets := textMap.put(assets, filename, asset);
    };
  };

  public shared ({ caller }) func deleteAsset(filename : Text) : async () {
    // Only the configured GovernanceCanister can delete assets
    switch (governanceCanister) {
      case null {
        Debug.trap("Unauthorized: GovernanceCanister not configured. Admin must call setGovernanceCanister first.");
      };
      case (?governance) {
        if (caller != governance) {
          Debug.trap("Unauthorized: Only the GovernanceCanister can delete assets");
        };
      };
    };

    switch (textMap.get(assets, filename)) {
      case null {
        Debug.trap("Asset not found");
      };
      case (?_) {
        assets := textMap.delete(assets, filename);
      };
    };
  };

  // Asset Query Functions - Require authenticated user (at least guest level)

  public query ({ caller }) func getAssetUrl(filename : Text) : async Text {
    // Require authenticated principal (including guests) for asset URL access
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Debug.trap("Unauthorized: Only authenticated users can access asset URLs");
    };

    switch (textMap.get(assets, filename)) {
      case null {
        Debug.trap("Asset not found");
      };
      case (?_) {
        // Return stable URL format for mainnet deployment
        // Format: https://[ASSET_CANISTER_ID].raw.ic0.app/[filename]
        let canisterId = Principal.toText(Principal.fromActor(AssetCanister));
        "https://" # canisterId # ".raw.ic0.app/" # filename;
      };
    };
  };

  public query ({ caller }) func getAsset(filename : Text) : async Asset {
    // Require authenticated principal (including guests) for asset data access
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Debug.trap("Unauthorized: Only authenticated users can access asset data");
    };

    switch (textMap.get(assets, filename)) {
      case null {
        Debug.trap("Asset not found");
      };
      case (?asset) {
        asset;
      };
    };
  };

  public query ({ caller }) func listAssets() : async [Text] {
    // Require authenticated principal (including guests) for asset listing
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Debug.trap("Unauthorized: Only authenticated users can list assets");
    };

    var filenames : [Text] = [];
    for ((filename, _) in textMap.entries(assets)) {
      filenames := Array.append(filenames, [filename]);
    };
    filenames;
  };

  public query ({ caller }) func listGLBModels() : async [(Text, Text)] {
    // Require authenticated principal (including guests) for GLB model listing
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Debug.trap("Unauthorized: Only authenticated users can list GLB models");
    };

    var glbModels : [(Text, Text)] = [];
    let canisterId = Principal.toText(Principal.fromActor(AssetCanister));

    for ((filename, _) in textMap.entries(assets)) {
      if (Text.endsWith(filename, #text(".glb"))) {
        let url = "https://" # canisterId # ".raw.ic0.app/" # filename;
        glbModels := Array.append(glbModels, [(filename, url)]);
      };
    };
    glbModels;
  };

  public query ({ caller }) func assetExists(filename : Text) : async Bool {
    // Require authenticated principal (including guests) for asset existence check
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Debug.trap("Unauthorized: Only authenticated users can check asset existence");
    };

    switch (textMap.get(assets, filename)) {
      case null { false };
      case (?_) { true };
    };
  };

  // Administrative Query Functions - Require admin authentication

  public query ({ caller }) func adminGetAllAssets() : async [(Text, Asset)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view all asset details");
    };

    var allAssets : [(Text, Asset)] = [];
    for ((filename, asset) in textMap.entries(assets)) {
      allAssets := Array.append(allAssets, [(filename, asset)]);
    };
    allAssets;
  };

  public query ({ caller }) func adminGetAssetCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view asset count");
    };

    var count = 0;
    for ((_, _) in textMap.entries(assets)) {
      count += 1;
    };
    count;
  };

  public query ({ caller }) func isAuthorizedAdmin(principal : Principal) : async Bool {
    // Require authenticated principal (including guests) for admin status check
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Debug.trap("Unauthorized: Only authenticated users can check admin status");
    };

    principal == authorizedAdminPrincipal;
  };
};
