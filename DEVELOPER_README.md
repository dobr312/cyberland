# CyberGenesis Land Mint DApp - Developer Documentation

## Project Overview

CyberGenesis is a cyberpunk-themed decentralized application (DApp) built on the Internet Computer Protocol (ICP) that enables users to mint, manage, and trade virtual land plots as NFTs. The application features a comprehensive tokenomics system, marketplace functionality, decentralized governance, gamified progression mechanics, and 3D asset visualization with AssetCanister integration.

**Status**: ✅ Complete and ready for external audit review

---

## Architecture Overview

### Multi-Canister System

The application consists of five interconnected canisters deployed on the Internet Computer:

1. **LandCanister** (`backend/main.mo`) - Core application logic
2. **CyberTokenCanister** (`backend/cyber_token.mo`) - ICRC-1 compliant token
3. **MarketplaceCanister** (`backend/marketplace.mo`) - NFT trading platform
4. **GovernanceCanister** (`backend/governance.mo`) - DAO governance system
5. **AssetCanister** (`backend/asset.mo`) - 3D model and asset hosting

### Inter-Canister Communication

