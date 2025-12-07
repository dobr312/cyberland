import { IDL } from '@dfinity/candid';

export const idlFactory = ({ IDL }: any) => {
  const Time = IDL.Int;

  const Proposal = IDL.Record({
    id: IDL.Nat,
    title: IDL.Text,
    description: IDL.Text,
    proposer: IDL.Principal,
    createdAt: Time,
    votesYes: IDL.Nat,
    votesNo: IDL.Nat,
    isActive: IDL.Bool,
  });

  const Vote = IDL.Record({
    voter: IDL.Principal,
    proposalId: IDL.Nat,
    choice: IDL.Bool,
    weight: IDL.Nat,
  });

  const StakeResult = IDL.Variant({
    success: IDL.Record({ newStake: IDL.Nat }),
    insufficientTokens: IDL.Record({
      required: IDL.Nat,
      available: IDL.Nat,
    }),
    transferFailed: IDL.Text,
  });

  const VoteResult = IDL.Variant({
    success: IDL.Record({ weight: IDL.Nat }),
    proposalNotFound: IDL.Null,
    proposalNotActive: IDL.Null,
    alreadyVoted: IDL.Null,
    notStaker: IDL.Null,
  });

  return IDL.Service({
    initializeAccessControl: IDL.Func([], [], []),
    stakeTokens: IDL.Func([IDL.Nat], [StakeResult], []),
    unstakeTokens: IDL.Func([IDL.Nat], [], []),
    getStakedBalance: IDL.Func([], [IDL.Nat], ['query']),
    createProposal: IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    vote: IDL.Func([IDL.Nat, IDL.Bool], [VoteResult], []),
    getProposal: IDL.Func([IDL.Nat], [IDL.Opt(Proposal)], ['query']),
    getAllActiveProposals: IDL.Func([], [IDL.Vec(Proposal)], ['query']),
    getAllProposals: IDL.Func([], [IDL.Vec(Proposal)], ['query']),
    getMyVotes: IDL.Func([], [IDL.Vec(Vote)], ['query']),
  });
};
