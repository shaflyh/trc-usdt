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
# Token management commands (from tronweb directory - working commands)
cd tronweb

# Check contract status
node manager.js status

# Mint tokens 
node manager.js mint 1000000

# Transfer ownership
node manager.js transfer-ownership <new_owner_address>

# Pause/unpause contract
node manager.js pause
node manager.js unpause
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

### Token Management (`tronweb/manager.js`)
- **TokenManager Class**: Encapsulates TronWeb initialization and contract interaction
- **Commands Available**: 
  - `status` - Check contract state, total supply, owner, paused status
  - `mint <amount>` - Mint tokens with transaction confirmation
  - `transfer-ownership <address>` - Transfer contract ownership
  - `pause` - Pause all token transfers (owner only)
  - `unpause` - Resume token transfers (owner only)
- **Transaction Handling**: Includes confirmation polling and on-chain verification
- **Environment Setup**: Requires `PRIVATE_KEY_NILE` and `CONTRACT_ADDRESS` in `.env`
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
3. **Check Status**: Use `node manager.js status` to verify deployment
4. **Test Token Functions**: Use `node manager.js mint <amount>` from `tronweb/` directory
5. **Contract Verification**: Check deployment on TRONSCAN (Nile testnet)

## Important Notes from Testing

- Contract can be paused, which prevents minting/transfers
- Ownership transfer works correctly (as shown in the transaction logs)
- After ownership transfer, only the new owner can perform administrative functions
- Transaction confirmation includes on-chain verification to detect reverted transactions

## Known Issues

- Testing suite is currently not working (marked in README)
- Main development/testing flow uses manual deployment + mint script rather than automated tests