import { IDL } from '@dfinity/candid';

export const idlFactory = ({ IDL }: any) => {
  const ItemType = IDL.Variant({
    Land: IDL.Null,
    Modifier: IDL.Null,
  });

  const Listing = IDL.Record({
    listingId: IDL.Nat,
    itemId: IDL.Nat,
    itemType: ItemType,
    seller: IDL.Principal,
    price: IDL.Nat,
    isActive: IDL.Bool,
  });

  const BuyResult = IDL.Variant({
    success: IDL.Record({
      buyer: IDL.Principal,
      seller: IDL.Principal,
      price: IDL.Nat,
    }),
    listingNotFound: IDL.Null,
    listingNotActive: IDL.Null,
    insufficientFunds: IDL.Record({
      required: IDL.Nat,
      available: IDL.Nat,
    }),
    transferFailed: IDL.Text,
    cannotBuyOwnListing: IDL.Null,
  });

  return IDL.Service({
    initializeAccessControl: IDL.Func([], [], []),
    list_item: IDL.Func([IDL.Nat, ItemType, IDL.Nat], [IDL.Nat], []),
    buy_item: IDL.Func([IDL.Nat], [BuyResult], []),
    cancelListing: IDL.Func([IDL.Nat], [], []),
    getActiveListing: IDL.Func([IDL.Nat], [IDL.Opt(Listing)], ['query']),
    getAllActiveListings: IDL.Func([], [IDL.Vec(Listing)], ['query']),
    getUserListings: IDL.Func([IDL.Principal], [IDL.Vec(Listing)], ['query']),
  });
};
