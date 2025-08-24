# Test USDT Tron Token

A TRC-20 token implementation similar to USDT with administrative controls for the TRON blockchain.

## Features

- **TRC-20 Standard**: Full compliance with TRC-20 token standard
- **Administrative Controls**: Owner can mint, burn, and pause transfers
- **Multi-network Support**: Deploy to mainnet, Shasta, Nile testnets, or local development

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment**
   Create a `.env` file with your private keys:
   ```
   PRIVATE_KEY_NILE=your_nile_testnet_private_key
   PRIVATE_KEY_SHASTA=your_shasta_testnet_private_key
   PRIVATE_KEY_MAINNET=your_mainnet_private_key
   ```

3. **Deploy to Nile Testnet**
   ```bash
   tronbox migrate --network nile --reset
   ```

4. **Interact with Token**
   ```bash
   cd tronweb
   node manager.js status
   node manager.js mint 1000000
   ```

## Configuration

Your configuration file is `tronbox.js` and contains network settings for different TRON networks.

## Compiling

To compile your contracts, use the following command:

```shell
tronbox compile
```

## Migration

The project comes pre-configured with four separate networks:

- Mainnet (https://api.trongrid.io)
- Shasta Testnet (https://api.shasta.trongrid.io)
- Nile Testnet (https://nile.trongrid.io).
- Localnet (http://127.0.0.1:9090)

### Mainnet

To deploy your contracts to Mainnet, you can run the following:

```shell
tronbox migrate --network mainnet
```

### Shasta Testnet

Obtain test coin at https://shasta.tronex.io/

To deploy your contracts to Shasta Testnet, you can run the following:

```shell
tronbox migrate --network shasta
```

### Nile Testnet

Obtain test coin at https://nileex.io/join/getJoinPage

To deploy your contracts to Nile Testnet, you can run the following:

```shell
tronbox migrate --network nile
```

### Localnet

The TronBox Runtime Environment provides a complete development framework for Tron, including a private network for testing.

Get tronbox/tre docker image at https://hub.docker.com/r/tronbox/tre

To deploy your contracts to Localnet, you can run the following:

```shell
tronbox migrate
```

## Testing (Not working yet)

Run the test suite:

```shell
npm test
```

Or test on a specific network:

```shell
tronbox test --network <shasta|nile|development>
```

## Token Management

After deployment, you can interact with your token:

### Token Management Commands
```bash
cd tronweb

# Check contract status and balances
node manager.js status

# Mint tokens
node manager.js mint <amount>

# Transfer ownership
node manager.js transfer-ownership <new_owner_address>

# Pause/unpause contract
node manager.js pause
node manager.js unpause
```

### Contract Functions
The USDT contract includes:
- `issue(amount)` - Mint tokens (owner only)
- `redeem(amount)` - Burn tokens (owner only)  
- `pause()` / `unpause()` - Emergency stop functionality (owner only)
- `transferOwnership(newOwner)` - Transfer contract ownership

## Additional Resources

- [TronBox Documentation](https://tronbox.io)
- [TRON Developer Hub](https://developers.tron.network)
