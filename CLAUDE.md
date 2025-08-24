# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TRC-20 USDT-like token implementation for the TRON blockchain using TronBox. The project includes a complete smart contract with administrative controls (mint, burn, pause) and deployment/interaction scripts.

## Key Commands

### Contract Development
```bash
# Compile contracts
tronbox compile

# Deploy to Nile testnet (working command)
tronbox migrate --network nile --reset

# Deploy to other networks
tronbox migrate --network shasta --reset
tronbox migrate --network development --reset
```

### Token Interaction
```bash
# Mint tokens (from tronweb directory - working command)
cd tronweb && node mint.js 1000000
```

### Testing
**Note: Testing is currently not working according to README**
```bash
# Intended test command
npm test
# Runs: tronbox migrate --network development --reset && tronbox exec test/USDT.exec.js --network development

# Direct test execution
tronbox test --network <shasta|nile|development>
```

## Architecture

### Smart Contract (`contracts/USDT.sol`)
- **TRC-20 Implementation**: Full compliance with standard transfer, approve, allowance functions
- **Administrative Functions**:
  - `issue(amount)` - Mint tokens (owner only)
  - `redeem(amount)` - Burn tokens (owner only)  
  - `pause()/unpause()` - Emergency stop functionality
  - `transferOwnership()` - Change contract owner
- **Security Features**: Address validation, pause modifiers, owner-only restrictions
- **Token Config**: 6 decimals (like real USDT), configurable name/symbol

### Network Configuration (`tronbox.js`)
- **Nile Testnet**: `https://nile.trongrid.io` (primary testing network)
- **Shasta Testnet**: `https://api.shasta.trongrid.io`
- **Development**: `http://127.0.0.1:9090` (TronBox/TRE Docker)
- **Mainnet**: `https://api.trongrid.io`
- Uses environment variables for private keys

### Testing Architecture (`test/USDT.js`)
- Uses OpenZeppelin test helpers for assertions and BN operations
- **TronWeb-specific handling**: Custom `assertAddress()` function for address conversion
- **Test Structure**: Deployment verification, administrative functions, TRC-20 compliance
- **Key Pattern**: Deploy with `USDT.new()`, then get stable instance with `USDT.at(address)`

### Token Management (`tronweb/mint.js`)
- **TokenManager Class**: Encapsulates TronWeb initialization and contract interaction
- **Environment Setup**: Requires `PRIVATE_KEY_NILE` and `CONTRACT_ADDRESS` in `.env`
- **Mint Process**: Handles decimal conversion (6 decimals) and transaction submission
- **Network**: Configured for Nile testnet by default

## Environment Setup

**Root `.env`:**
```
PRIVATE_KEY_NILE=your_nile_private_key
PRIVATE_KEY_SHASTA=your_shasta_private_key
PRIVATE_KEY_MAINNET=your_mainnet_private_key
```

**`tronweb/.env`:**
```
PRIVATE_KEY_NILE=your_nile_private_key
CONTRACT_ADDRESS=deployed_contract_address
```

## Development Workflow

1. **Deploy Contract**: Use `tronbox migrate --network nile --reset`
2. **Update Environment**: Add contract address to `tronweb/.env`
3. **Test Token Functions**: Use `node mint.js <amount>` from `tronweb/` directory
4. **Contract Verification**: Check deployment on TRONSCAN (Nile testnet)

## Known Issues

- Testing suite is currently not working (marked in README)
- Main development/testing flow uses manual deployment + mint script rather than automated tests