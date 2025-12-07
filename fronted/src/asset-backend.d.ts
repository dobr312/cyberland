import type { Principal } from "@icp-sdk/core/principal";

export interface Asset {
  filename: string;
  data: Uint8Array;
  contentType: string;
}

export interface UserProfile {
  name: string;
}

export enum UserRole {
  admin = "admin",
  user = "user",
  guest = "guest"
}

export interface assetBackendInterface {
  adminGetAllAssets(): Promise<Array<[string, Asset]>>;
  adminGetAssetCount(): Promise<bigint>;
  assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
  assetExists(filename: string): Promise<boolean>;
  batchUploadAssets(assetList: Array<[string, Uint8Array]>): Promise<void>;
  deleteAsset(filename: string): Promise<void>;
  getAsset(filename: string): Promise<Asset>;
  getAssetUrl(filename: string): Promise<string>;
  getCallerUserProfile(): Promise<UserProfile | null>;
  getCallerUserRole(): Promise<UserRole>;
  getUserProfile(user: Principal): Promise<UserProfile | null>;
  initializeAccessControl(): Promise<void>;
  isAuthorizedAdmin(principal: Principal): Promise<boolean>;
  isCallerAdmin(): Promise<boolean>;
  listAssets(): Promise<Array<string>>;
  listGLBModels(): Promise<Array<[string, string]>>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;
  setGovernanceCanister(governance: Principal): Promise<void>;
  uploadAsset(filename: string, data: Uint8Array): Promise<void>;
  uploadLandModel(landTypeName: string, modelData: Uint8Array): Promise<string>;
}
