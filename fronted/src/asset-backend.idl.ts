import { IDL } from '@dfinity/candid';

export const idlFactory = ({ IDL }: { IDL: any }) => {
  const Asset = IDL.Record({
    filename: IDL.Text,
    data: IDL.Vec(IDL.Nat8),
    contentType: IDL.Text,
  });
  
  const UserProfile = IDL.Record({
    name: IDL.Text,
  });

  const UserRole = IDL.Variant({
    admin: IDL.Null,
    user: IDL.Null,
    guest: IDL.Null,
  });

  return IDL.Service({
    // Asset Management Functions
    uploadAsset: IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
    uploadLandModel: IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [IDL.Text], []),
    batchUploadAssets: IDL.Func([IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(IDL.Nat8)))], [], []),
    deleteAsset: IDL.Func([IDL.Text], [], []),
    
    // Asset Query Functions
    getAssetUrl: IDL.Func([IDL.Text], [IDL.Text], ['query']),
    getAsset: IDL.Func([IDL.Text], [Asset], ['query']),
    listAssets: IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    listGLBModels: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], ['query']),
    assetExists: IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    
    // Administrative Functions
    setGovernanceCanister: IDL.Func([IDL.Principal], [], []),
    adminGetAllAssets: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, Asset))], ['query']),
    adminGetAssetCount: IDL.Func([], [IDL.Nat], ['query']),
    isAuthorizedAdmin: IDL.Func([], [IDL.Bool], ['query']),
    
    // Access Control Functions
    initializeAccessControl: IDL.Func([], [], []),
    getCallerUserRole: IDL.Func([], [UserRole], ['query']),
    assignCallerUserRole: IDL.Func([IDL.Principal, UserRole], [], []),
    isCallerAdmin: IDL.Func([], [IDL.Bool], ['query']),
    
    // User Profile Functions
    getCallerUserProfile: IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    getUserProfile: IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    saveCallerUserProfile: IDL.Func([UserProfile], [], []),
  });
};

