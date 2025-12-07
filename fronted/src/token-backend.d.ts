import type { Principal } from "@icp-sdk/core/principal";

export interface Account {
  owner: Principal;
  subaccount: Array<number>;
}

export interface TransferArgs {
  from: Account;
  to: Account;
  amount: bigint;
  fee: bigint | null;
  memo: Array<number> | null;
  created_at_time: bigint | null;
}

export type TransferError =
  | { __kind__: "BadFee"; BadFee: { expected_fee: bigint } }
  | { __kind__: "BadBurn"; BadBurn: { min_burn_amount: bigint } }
  | { __kind__: "InsufficientFunds"; InsufficientFunds: { balance: bigint } }
  | { __kind__: "TooOld"; TooOld: null }
  | { __kind__: "CreatedInFuture"; CreatedInFuture: { ledger_time: bigint } }
  | { __kind__: "Duplicate"; Duplicate: { duplicate_of: bigint } }
  | { __kind__: "TemporarilyUnavailable"; TemporarilyUnavailable: null }
  | { __kind__: "GenericError"; GenericError: { error_code: bigint; message: string } };

export type TransferResult =
  | { __kind__: "Ok"; Ok: bigint }
  | { __kind__: "Err"; Err: TransferError };

export type MetadataValue =
  | { __kind__: "Text"; Text: string }
  | { __kind__: "Nat"; Nat: bigint }
  | { __kind__: "Blob"; Blob: Array<number> };

export interface tokenBackendInterface {
  icrc1_balance_of(account: Account): Promise<bigint>;
  icrc1_transfer(args: TransferArgs): Promise<TransferResult>;
  icrc1_metadata(): Promise<Array<[string, MetadataValue]>>;
  icrc1_total_supply(): Promise<bigint>;
  getCanisterTokenBalance(): Promise<bigint>;
  addAuthorizedMinter(minter: Principal): Promise<void>;
  removeAuthorizedMinter(minter: Principal): Promise<void>;
  mint(to: Principal, amount: bigint): Promise<void>;
  adminGetAllBalances(): Promise<Array<[Principal, bigint]>>;
  getAuthorizedMinters(): Promise<Array<Principal>>;
  initializeAccessControl(): Promise<void>;
  getCallerUserRole(): Promise<string>;
  assignCallerUserRole(user: Principal, role: string): Promise<void>;
  isCallerAdmin(): Promise<boolean>;
}
