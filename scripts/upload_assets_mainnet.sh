#!/bin/bash

# Mainnet Asset Upload Script for CyberGenesis Land Mint DApp
# This script uploads all 3D model assets (.glb files) to the AssetCanister on ICP Mainnet

set -e

echo "=========================================="
echo "CyberGenesis Asset Upload - ICP Mainnet"
echo "=========================================="
echo ""

# Configuration
ASSET_CANISTER_NAME="asset_canister"
ASSETS_DIR="./assets/models"
NETWORK="ic"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "Error: dfx is not installed. Please install dfx first."
    exit 1
fi

# Check if assets directory exists
if [ ! -d "$ASSETS_DIR" ]; then
    echo "Error: Assets directory '$ASSETS_DIR' not found."
    echo "Please create the directory and add your .glb model files."
    exit 1
fi

# Get canister ID
echo "Getting AssetCanister ID..."
CANISTER_ID=$(dfx canister --network $NETWORK id $ASSET_CANISTER_NAME 2>/dev/null)

if [ -z "$CANISTER_ID" ]; then
    echo "Error: Could not get canister ID for $ASSET_CANISTER_NAME"
    echo "Please ensure the canister is deployed on mainnet."
    exit 1
fi

echo "AssetCanister ID: $CANISTER_ID"
echo "Stable URL format: https://$CANISTER_ID.raw.ic0.app/[filename].glb"
echo ""

# Count total files
TOTAL_FILES=$(find "$ASSETS_DIR" -name "*.glb" | wc -l)
echo "Found $TOTAL_FILES .glb files to upload"
echo ""

if [ $TOTAL_FILES -eq 0 ]; then
    echo "Warning: No .glb files found in $ASSETS_DIR"
    exit 0
fi

# Upload each file
CURRENT=0
FAILED=0

for file in "$ASSETS_DIR"/*.glb; do
    if [ -f "$file" ]; then
        CURRENT=$((CURRENT + 1))
        FILENAME=$(basename "$file")
        
        echo "[$CURRENT/$TOTAL_FILES] Uploading: $FILENAME"
        
        # Convert file to base64 for Candid blob format
        BASE64_DATA=$(base64 -w 0 "$file" 2>/dev/null || base64 "$file")
        
        # Upload with rate limiting (wait 2 seconds between uploads for mainnet)
        if dfx canister --network $NETWORK call $ASSET_CANISTER_NAME uploadAsset "(\"$FILENAME\", blob \"$BASE64_DATA\")" > /dev/null 2>&1; then
            echo "  ✓ Success: https://$CANISTER_ID.raw.ic0.app/$FILENAME"
        else
            echo "  ✗ Failed to upload $FILENAME"
            FAILED=$((FAILED + 1))
        fi
        
        # Rate limiting for mainnet
        if [ $CURRENT -lt $TOTAL_FILES ]; then
            echo "  Waiting 2 seconds (mainnet rate limiting)..."
            sleep 2
        fi
        
        echo ""
    fi
done

echo "=========================================="
echo "Upload Summary"
echo "=========================================="
echo "Total files: $TOTAL_FILES"
echo "Successful: $((TOTAL_FILES - FAILED))"
echo "Failed: $FAILED"
echo ""

# Verify uploads
echo "Verifying uploaded assets..."
UPLOADED_ASSETS=$(dfx canister --network $NETWORK call $ASSET_CANISTER_NAME listAssets 2>/dev/null)

if [ -n "$UPLOADED_ASSETS" ]; then
    echo "✓ Asset list retrieved successfully"
    echo ""
    echo "Uploaded assets:"
    echo "$UPLOADED_ASSETS"
else
    echo "✗ Could not retrieve asset list"
fi

echo ""
echo "=========================================="
echo "Deployment Complete"
echo "=========================================="
echo ""
echo "AssetCanister URL: https://$CANISTER_ID.raw.ic0.app"
echo ""
echo "To use these assets in your frontend:"
echo "1. Update model URLs in LandCanister to use format:"
echo "   https://$CANISTER_ID.raw.ic0.app/[filename].glb"
echo "2. Ensure CORS headers are properly configured"
echo "3. Test asset loading in production environment"
echo ""

exit 0
