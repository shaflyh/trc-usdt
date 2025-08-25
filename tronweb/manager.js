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
   * @returns {Promise<string>} Returns 'success', 'failed', or 'timeout'.
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
            console.log("✅ Transaction confirmed successfully!");
            return "success";
          } else {
            console.error("❌ Transaction reverted on-chain!");
            return "failed";
          }
        }
      } catch (e) {
        /* Ignore errors while polling */
      }
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    }
    console.log(
      "Transaction confirmation timed out. Please check the transaction on the blockchain."
    );
    return "timeout";
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

    const result = await this._confirmTransaction(txId);
    if (result === "failed") {
      throw new Error("Redeem transaction failed on-chain.");
    }
  }

  async pause() {
    console.log("\nAttempting to pause the contract...");
    const txId = await this.contract.pause().send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);

    const result = await this._confirmTransaction(txId);
    if (result === "failed") {
      throw new Error("Pause transaction failed on-chain.");
    }
  }

  async unpause() {
    console.log("\nAttempting to unpause the contract...");
    const txId = await this.contract.unpause().send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);

    const result = await this._confirmTransaction(txId);
    if (result === "failed") {
      throw new Error("Unpause transaction failed on-chain.");
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

    const result = await this._confirmTransaction(txId);
    if (result === "failed") {
      throw new Error("Transfer ownership transaction failed on-chain.");
    }
  }

  async addBlacklist(address) {
    if (!address || !this.tronWeb.isAddress(address)) {
      throw new Error("A valid address must be provided for blacklisting.");
    }
    console.log(`\nAttempting to add ${address} to blacklist...`);
    const txId = await this.contract
      .addBlacklist(address)
      .send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);

    const result = await this._confirmTransaction(txId);
    if (result === "failed") {
      throw new Error("Add blacklist transaction failed on-chain.");
    }
  }

  async removeBlacklist(address) {
    if (!address || !this.tronWeb.isAddress(address)) {
      throw new Error(
        "A valid address must be provided for removing from blacklist."
      );
    }
    console.log(`\nAttempting to remove ${address} from blacklist...`);
    const txId = await this.contract
      .removeBlacklist(address)
      .send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);

    const result = await this._confirmTransaction(txId);
    if (result === "failed") {
      throw new Error("Remove blacklist transaction failed on-chain.");
    }
  }

  async getBlacklistStatus(address) {
    if (!address || !this.tronWeb.isAddress(address)) {
      throw new Error(
        "A valid address must be provided to check blacklist status."
      );
    }
    console.log(`\nChecking blacklist status for ${address}...`);
    const isBlacklisted = await this.contract
      .getBlacklistStatus(address)
      .call();
    console.log(
      `Address ${address} is ${
        isBlacklisted ? "BLACKLISTED" : "NOT BLACKLISTED"
      }`
    );
    return isBlacklisted;
  }

  async destroyBlackFunds(address) {
    if (!address || !this.tronWeb.isAddress(address)) {
      throw new Error("A valid blacklisted address must be provided.");
    }
    console.log(`\nAttempting to destroy black funds for ${address}...`);
    const txId = await this.contract
      .destroyBlackFunds(address)
      .send({ feeLimit: 100_000_000 });
    this._logTransaction(txId);

    const result = await this._confirmTransaction(txId);
    if (result === "failed") {
      throw new Error("Destroy black funds transaction failed on-chain.");
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
    console.log(
      "  add-blacklist <address>           - Adds an address to the blacklist."
    );
    console.log(
      "  remove-blacklist <address>        - Removes an address from the blacklist."
    );
    console.log(
      "  check-blacklist <address>         - Checks if an address is blacklisted."
    );
    console.log(
      "  destroy-black-funds <address>     - Destroys all funds of a blacklisted address."
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
      case "add-blacklist":
        await manager.addBlacklist(args[0]);
        break;
      case "remove-blacklist":
        await manager.removeBlacklist(args[0]);
        break;
      case "check-blacklist":
        await manager.getBlacklistStatus(args[0]);
        break;
      case "destroy-black-funds":
        await manager.destroyBlackFunds(args[0]);
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
