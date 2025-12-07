import type { Principal } from "@icp-sdk/core/principal";
import type { Time } from "./backend";

export interface Proposal {
  id: bigint;
  title: string;
  description: string;
  proposer: Principal;
  createdAt: Time;
  votesYes: bigint;
  votesNo: bigint;
  isActive: boolean;
}

export interface Vote {
  voter: Principal;
  proposalId: bigint;
  choice: boolean;
  weight: bigint;
}

export type StakeResult = 
  | { __kind__: "success"; success: { newStake: bigint } }
  | { __kind__: "insufficientTokens"; insufficientTokens: { required: bigint; available: bigint } }
  | { __kind__: "transferFailed"; transferFailed: string };

export type VoteResult = 
  | { __kind__: "success"; success: { weight: bigint } }
  | { __kind__: "proposalNotFound"; proposalNotFound: null }
  | { __kind__: "proposalNotActive"; proposalNotActive: null }
  | { __kind__: "alreadyVoted"; alreadyVoted: null }
  | { __kind__: "notStaker"; notStaker: null };

export interface governanceBackendInterface {
  initializeAccessControl(): Promise<void>;
  stakeTokens(amount: bigint): Promise<StakeResult>;
  unstakeTokens(amount: bigint): Promise<void>;
  getStakedBalance(): Promise<bigint>;
  createProposal(title: string, description: string): Promise<bigint>;
  vote(proposalId: bigint, choice: boolean): Promise<VoteResult>;
  getProposal(proposalId: bigint): Promise<Proposal | null>;
  getAllActiveProposals(): Promise<Array<Proposal>>;
  getAllProposals(): Promise<Array<Proposal>>;
  getMyVotes(): Promise<Array<Vote>>;
}
