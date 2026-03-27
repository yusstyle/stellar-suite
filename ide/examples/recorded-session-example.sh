#!/bin/bash

# Recorded Interaction Session: Token Transfer Flow
# Generated: 2026-03-27T13:20:00.000Z
# Network: testnet
# Total Interactions: 3

set -e  # Exit on error

# Configuration
CONTRACT_1="CCTOKEN123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789"
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
  echo "Error: stellar CLI is not installed"
  echo "Install from: https://developers.stellar.org/docs/tools/developer-tools"
  exit 1
fi

# Recorded Interactions

# Interaction 1: initialize
# Timestamp: 2026-03-27T12:01:00.000Z
# Signer: GOWNER123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789
stellar \
  contract \
  invoke \
  --id $CONTRACT_1 \
  --network testnet \
  --source GOWNER123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789 \
  -- initialize \
  --arg "MyToken" \
  --arg "MTK" \
  --arg "18"

# Assert: Interaction 1 succeeded
if [ $? -ne 0 ]; then
  echo "Error: Interaction 1 (initialize) failed"
  exit 1
fi

# Interaction 2: mint
# Timestamp: 2026-03-27T12:02:00.000Z
# Signer: GOWNER123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789
stellar \
  contract \
  invoke \
  --id $CONTRACT_1 \
  --network testnet \
  --source GOWNER123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789 \
  -- mint \
  --arg "GUSER456ABCDEFGHIJKLMNOPQRSTUVWXYZ789012" \
  --arg "1000000"

# Assert: Interaction 2 succeeded
if [ $? -ne 0 ]; then
  echo "Error: Interaction 2 (mint) failed"
  exit 1
fi

# Interaction 3: transfer
# Timestamp: 2026-03-27T12:03:00.000Z
# Signer: GUSER456ABCDEFGHIJKLMNOPQRSTUVWXYZ789012
stellar \
  contract \
  invoke \
  --id $CONTRACT_1 \
  --network testnet \
  --source GUSER456ABCDEFGHIJKLMNOPQRSTUVWXYZ789012 \
  -- transfer \
  --arg "GUSER456ABCDEFGHIJKLMNOPQRSTUVWXYZ789012" \
  --arg "GUSER789ABCDEFGHIJKLMNOPQRSTUVWXYZ012345" \
  --arg "500"

# Assert: Interaction 3 succeeded
if [ $? -ne 0 ]; then
  echo "Error: Interaction 3 (transfer) failed"
  exit 1
fi

# All interactions completed successfully
echo "✓ All interactions completed"
