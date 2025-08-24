const { TronWeb } = require("tronweb");
require("dotenv").config();

const POLLING_INTERVAL = 3000; // Check every 3 seconds
const TIMEOUT = 60000; // Wait a maximum of 60 seconds

class TokenManager {
  constructor() {
    this.tronWeb = null;
    this.contract = null;
    this.ownerAddress = null;
  }

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

  _logTransaction(txId) {
    console.log(`🎉 Transaction sent! Hash: ${txId}`);
    console.log(
      `🔗 View on TRONSCAN: https://nile.tronscan.org/#/transaction/${txId}`
    );
  }

  /**
   * Waits for a transaction to be confirmed on the blockchain.
   * @param {string} txId The transaction hash to check.
   * @returns {Promise<boolean>} True if the transaction succeeded, false if it failed.
   */
  async _confirmTransaction(txId) {
    console.log("⏳ Waiting for transaction confirmation...");
    const startTime = Date.now();
    while (Date.now() - startTime < TIMEOUT) {
      try {
        const txInfo = await this.tronWeb.trx.getTransactionInfo(txId);
        if (txInfo && txInfo.receipt) {
          // Check if receipt exists
          if (txInfo.receipt.result === "SUCCESS") {
            console.log("...Transaction confirmed successfully!");
            return true;
          } else {
            console.error("...Transaction reverted on-chain!");
            return false;
          }
        }
      } catch (e) {
        /* Ignore errors while polling */
      }
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    }
    throw new Error("Transaction confirmation timed out.");
  }

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

    if (!(await this._confirmTransaction(txId))) {
      throw new Error("Minting transaction failed to confirm.");
    }
  }

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

    if (!(await this._confirmTransaction(txId))) {
      throw new Error("Redeem transaction failed to confirm.");
    }
  }

  async pause() {
    console.log("\nAttempting to pause the contract...");
    const txId = await this.contract.pause().send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);

    if (!(await this._confirmTransaction(txId))) {
      throw new Error("Pause transaction failed to confirm.");
    }
  }

  async unpause() {
    console.log("\nAttempting to unpause the contract...");
    const txId = await this.contract.unpause().send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);

    if (!(await this._confirmTransaction(txId))) {
      throw new Error("Unpause transaction failed to confirm.");
    }
  }

  async transferOwnership(newOwner) {
    if (!newOwner || !this.tronWeb.isAddress(newOwner)) {
      throw new Error("A valid new owner address must be provided.");
    }
    console.log(`\nAttempting to transfer ownership to ${newOwner}...`);
    const txId = await this.contract
      .transferOwnership(newOwner)
      .send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);

    if (!(await this._confirmTransaction(txId))) {
      throw new Error("Transfer ownership transaction failed to confirm.");
    }
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
