# Canister Reinstall and Re-initialization Guide

## Overview
This guide provides step-by-step instructions for performing a forced full reinstall of the Land Canister and Asset Canister on Internet Computer mainnet, followed by complete re-initialization.

## Prerequisites
- dfx CLI installed and configured
- Admin principal with deployment permissions
- Internet Identity principal: `whd5e-pbxhk-pp65k-hxqqx-edtrx-5b7xd-itunf-pz5f5-bzjut-dxkhy-4ae`
- All canister IDs documented:
  - Land Canister: `br5f7-7uaaa-aaaaa-qaaca-cai`
  - Asset Canister: `bd3sg-teaaa-aaaaa-qaaba-cai`
  - Token Canister: `w4q3i-7yaaa-aaaam-ab3oq-cai`
  - Marketplace Canister: `be2us-64aaa-aaaaa-qaabq-cai`
  - Governance Canister: `bkyz2-fmaaa-aaaaa-qaaaq-cai`

## Step 1: Backup Current State (CRITICAL)

Before reinstalling, backup all critical data:

