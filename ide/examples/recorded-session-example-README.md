# Token Transfer Flow

## Overview

This script was recorded from the Stellar IDE on 3/27/2026, 12:00:00 PM.
It contains 3 contract interaction(s) for regression testing.

## Prerequisites

- Stellar CLI installed: https://developers.stellar.org/docs/tools/developer-tools
- Network: testnet
- Configured identity with sufficient balance

## Contracts

1. `CCTOKEN123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789`

## Usage

### Bash Script

```bash
chmod +x recorded-session-example.sh
./recorded-session-example.sh
```

### JSON Scenario

Use with your custom test runner or CI/CD pipeline.

## Interactions

### 1. initialize

- **Contract**: `CCTOKEN123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789`
- **Type**: Write Transaction
- **Signer**: `GOWNER123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789`
- **Arguments**: `["MyToken","MTK",18]`
- **Result**: ✓ Success

### 2. mint

- **Contract**: `CCTOKEN123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789`
- **Type**: Write Transaction
- **Signer**: `GOWNER123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789`
- **Arguments**: `["GUSER456ABCDEFGHIJKLMNOPQRSTUVWXYZ789012","1000000"]`
- **Result**: ✓ Success

### 3. transfer

- **Contract**: `CCTOKEN123ABCDEFGHIJKLMNOPQRSTUVWXYZ456789`
- **Type**: Write Transaction
- **Signer**: `GUSER456ABCDEFGHIJKLMNOPQRSTUVWXYZ789012`
- **Arguments**: `["GUSER456ABCDEFGHIJKLMNOPQRSTUVWXYZ789012","GUSER789ABCDEFGHIJKLMNOPQRSTUVWXYZ012345","500"]`
- **Result**: ✓ Success

## Notes

- Ensure all contracts are deployed before running the script
- Update contract IDs in the script if deploying to a different network
- Verify the signer account has sufficient balance for transaction fees
