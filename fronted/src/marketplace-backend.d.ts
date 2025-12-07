import type { Principal } from "@icp-sdk/core/principal";

export enum ItemType {
  Land = "Land",
  Modifier = "Modifier"
}

export interface Listing {
  listingId: bigint;
  itemId: bigint;
  itemType: ItemType;
  seller: Principal;
  price: bigint;
  isActive: boolean;
}

export type BuyResult = 
  | { __kind__: "success"; success: { buyer: Principal; seller: Principal; price: bigint } }
  | { __kind__: "listingNotFound"; listingNotFound: null }
  | { __kind__: "listingNotActive"; listingNotActive: null }
  | { __kind__: "insufficientFunds"; insufficientFunds: { required: bigint; available: bigint } }
  | { __kind__: "transferFailed"; transferFailed: string }
  | { __kind__: "cannotBuyOwnListing"; cannotBuyOwnListing: null };

export interface marketplaceBackendInterface {
  initializeAccessControl(): Promise<void>;
  list_item(item_id: bigint, item_type: ItemType, price: bigint): Promise<bigint>;
  buy_item(listing_id: bigint): Promise<BuyResult>;
  cancelListing(listingId: bigint): Promise<void>;
  getActiveListing(listingId: bigint): Promise<Listing | null>;
  getAllActiveListings(): Promise<Array<Listing>>;
  getUserListings(user: Principal): Promise<Array<Listing>>;
}
