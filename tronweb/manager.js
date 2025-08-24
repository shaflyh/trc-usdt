const { TronWeb } = require("tronweb");
require("dotenv").config();

/**
 * A manager class for interacting with the USDT TRC-20 token contract.
 */
class TokenManager {
  constructor() {
    this.tronWeb = null;
    this.contract = null;
    this.ownerAddress = null;
  }

  /**
   * Initializes the TronWeb instance and loads the contract.
   */
  async initialize() {
    const { PRIVATE_KEY_NILE, CONTRACT_ADDRESS } = process.env;
    if (!PRIVATE_KEY_NILE || !CONTRACT_ADDRESS) {
      throw new Error(
        "Missing PRIVATE_KEY_NILE or CONTRACT_ADDRESS in .env file"
      );
    }

    this.tronWeb = new TronWeb({
      fullHost: "https://nile.trongrid.io",
      privateKey: PRIVATE_KEY_NILE,
    });

    this.ownerAddress = this.tronWeb.defaultAddress.base58;
    const contractAbi = require("../build/contracts/USDT.json").abi;
    this.contract = await this.tronWeb.contract(contractAbi, CONTRACT_ADDRESS);

    console.log(`✅ Manager initialized for contract: ${CONTRACT_ADDRESS}`);
    console.log(`✅ Using owner account: ${this.ownerAddress}`);
  }

  /**
   * Logs a transaction hash and provides a link to the explorer.
   * @param {string} txId The transaction hash.
   */
  _logTransaction(txId) {
    console.log(`🎉 Transaction sent! Hash: ${txId}`);
    console.log(
      `🔗 View on TRONSCAN: https://nile.tronscan.org/#/transaction/${txId}`
    );
  }

  /**
   * Mints new tokens.
   * @param {string} amount The human-readable amount to mint.
   */
  async mint(amount) {
    if (!amount || isNaN(amount))
      throw new Error("A valid amount must be provided for minting.");

    const decimals = await this.contract.decimals().call();
    const mintAmount = BigInt(amount) * 10n ** BigInt(decimals);

    console.log(`\nAttempting to mint ${amount} tokens...`);
    const txId = await this.contract
      .issue(mintAmount.toString())
      .send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);
  }

  /**
   * Burns (redeems) tokens from the owner's balance.
   * @param {string} amount The human-readable amount to burn.
   */
  async redeem(amount) {
    if (!amount || isNaN(amount))
      throw new Error("A valid amount must be provided for redeeming.");

    const decimals = await this.contract.decimals().call();
    const redeemAmount = BigInt(amount) * 10n ** BigInt(decimals);

    console.log(`\nAttempting to redeem ${amount} tokens...`);
    const txId = await this.contract
      .redeem(redeemAmount.toString())
      .send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);
  }

  /**
   * Pauses the contract.
   */
  async pause() {
    console.log("\nAttempting to pause the contract...");
    const txId = await this.contract.pause().send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);
  }

  /**
   * Unpauses the contract.
   */
  async unpause() {
    console.log("\nAttempting to unpause the contract...");
    const txId = await this.contract.unpause().send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);
  }

  /**
   * Transfers contract ownership to a new address.
   * @param {string} newOwner The base58 address of the new owner.
   */
  async transferOwnership(newOwner) {
    if (!newOwner || !this.tronWeb.isAddress(newOwner)) {
      throw new Error("A valid new owner address must be provided.");
    }
    console.log(`\nAttempting to transfer ownership to ${newOwner}...`);
    const txId = await this.contract
      .transferOwnership(newOwner)
      .send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);
  }

  /**
   * Checks and displays the current on-chain status of the contract.
   */
  async checkStatus() {
    console.log("\n--- Checking Contract Status ---");
    const [name, symbol, totalSupply, isPaused, owner] = await Promise.all([
      this.contract.name().call(),
      this.contract.symbol().call(),
      this.contract.totalSupply().call(),
      this.contract.paused().call(),
      this.contract.owner().call(),
    ]);

    console.log(`Token Name:      ${name}`);
    console.log(`Token Symbol:    ${symbol}`);
    console.log(`Total Supply:    ${totalSupply.toString()}`);
    console.log(`Current Owner:   ${this.tronWeb.address.fromHex(owner)}`);
    console.log(`Contract Paused:   ${isPaused}`);
    console.log("----------------------------");
  }
}

/**
 * Main execution function to route commands.
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!command) {
    console.error("❌ Error: No command provided.");
    console.log("Usage: node manager.js <command> [arguments]");
    console.log("\nAvailable Commands:");
    console.log(
      "  status                            - Checks the current status of the contract."
    );
    console.log(
      "  mint <amount>                     - Mints new tokens to the owner."
    );
    console.log(
      "  redeem <amount>                   - Burns tokens from the owner's balance."
    );
    console.log(
      "  pause                             - Pauses all token transfers."
    );
    console.log("  unpause                           - Unpauses the contract.");
    console.log(
      "  transfer-ownership <newOwnerAddress> - Transfers contract ownership."
    );
    return;
  }

  try {
    const manager = new TokenManager();
    await manager.initialize();

    switch (command) {
      case "status":
        await manager.checkStatus();
        break;
      case "mint":
        await manager.mint(args[0]);
        break;
      case "redeem":
        await manager.redeem(args[0]);
        break;
      case "pause":
        await manager.pause();
        break;
      case "unpause":
        await manager.unpause();
        break;
      case "transfer-ownership":
        await manager.transferOwnership(args[0]);
        break;
      default:
        console.error(`❌ Error: Unknown command "${command}"`);
    }
    console.log("\n✅ Script finished successfully.");
  } catch (error) {
    console.error("\n❌ Script failed:", error.message);
  }
}

main();
