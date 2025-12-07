#!/bin/bash

# AssetCanister 3D Model Batch Upload Script
# This script uploads all 45+ modifier 3D models to the AssetCanister

set -e

echo "🚀 Starting AssetCanister batch upload..."

# Get AssetCanister ID
ASSET_CANISTER=$(dfx canister id asset_canister)
echo "📦 AssetCanister ID: $ASSET_CANISTER"

# Check if assets directory exists
if [ ! -d "assets/models" ]; then
  echo "❌ Error: assets/models directory not found"
  echo "Please create the directory and add your 3D model files"
  exit 1
fi

# Function to upload a single asset
upload_asset() {
  local tier=$1
  local index=$2
  local filename="tier${tier}_mod_${index}.glb"
  local filepath="assets/models/tier${tier}/${filename}"
  
  if [ -f "$filepath" ]; then
    echo "⬆️  Uploading: $filename"
    # Convert file to base64 and upload
    dfx canister call $ASSET_CANISTER uploadAsset \
      "(\"$filename\", blob \"$(cat $filepath | base64)\")" \
      --quiet
    echo "✅ Uploaded: $filename"
  else
    echo "⚠️  Warning: File not found: $filepath"
  fi
}

# Upload Tier 1 models (Common - 12 models)
echo ""
echo "📁 Uploading Tier 1 (Common) models..."
for i in {1..12}; do
  upload_asset 1 $i
done

# Upload Tier 2 models (Rare - 12 models)
echo ""
echo "📁 Uploading Tier 2 (Rare) models..."
for i in {1..12}; do
  upload_asset 2 $i
done

# Upload Tier 3 models (Legendary - 12 models)
echo ""
echo "📁 Uploading Tier 3 (Legendary) models..."
for i in {1..12}; do
  upload_asset 3 $i
done

# Upload Tier 4 models (Mythic - 12 models)
echo ""
echo "📁 Uploading Tier 4 (Mythic) models..."
for i in {1..12}; do
  upload_asset 4 $i
done

# Verify uploads
echo ""
echo "🔍 Verifying uploaded assets..."
ASSET_LIST=$(dfx canister call $ASSET_CANISTER listAssets)
echo "$ASSET_LIST"

# Count uploaded assets
ASSET_COUNT=$(echo "$ASSET_LIST" | grep -o "tier.*\.glb" | wc -l)
echo ""
echo "✅ Upload complete! Total assets uploaded: $ASSET_COUNT"

# Display sample asset URLs
echo ""
echo "📋 Sample Asset URLs:"
echo "Tier 1: https://${ASSET_CANISTER}.raw.ic0.app/tier1_mod_1.glb"
echo "Tier 2: https://${ASSET_CANISTER}.raw.ic0.app/tier2_mod_1.glb"
echo "Tier 3: https://${ASSET_CANISTER}.raw.ic0.app/tier3_mod_1.glb"
echo "Tier 4: https://${ASSET_CANISTER}.raw.ic0.app/tier4_mod_1.glb"

echo ""
echo "🎉 AssetCanister batch upload completed successfully!"
