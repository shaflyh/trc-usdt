const { TronWeb } = require("tronweb");
require("dotenv").config();

/**
 * A manager class for interacting with the USDT TRC-20 token contract.
 */
class TokenManager {
  constructor() {
    this.tronWeb = null;
    this.contract = null;
  }

  /**
   * Initializes the TronWeb instance and loads the contract.
   * Must be called before any other methods.
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

    const contractAbi = require("../build/contracts/USDT.json").abi;
    this.contract = await this.tronWeb.contract(contractAbi, CONTRACT_ADDRESS);

    console.log(`✅ Manager initialized for contract: ${CONTRACT_ADDRESS}`);
  }

  /**
   * Mints a specified amount of tokens to the owner's address.
   * @param {number|string} amount The human-readable amount of tokens to mint (e.g., 1000000).
   */
  async mint(amount) {
    if (!this.contract)
      throw new Error("Manager not initialized. Call initialize() first.");

    const ownerAddress = this.tronWeb.defaultAddress.base58;
    console.log(
      `\nAttempting to mint ${amount} tokens to owner: ${ownerAddress}`
    );

    const decimals = await this.contract.decimals().call();
    const mintAmount = BigInt(amount) * 10n ** BigInt(decimals);

    console.log(
      `Calculated amount with ${decimals} decimals: ${mintAmount.toString()}`
    );
    console.log("...Sending transaction...");

    const txId = await this.contract.issue(mintAmount.toString()).send({
      feeLimit: 100_000_000, // 100 TRX
    });

    console.log(`🎉 Transaction sent! Hash: ${txId}`);
    console.log(
      `🔗 View on TRONSCAN: https://nile.tronscan.org/#/transaction/${txId}`
    );

    return txId;
  }
}

/**
 * Main execution function.
 */
async function main() {
  // Get the amount to mint from the command-line arguments.
  // Example usage: node mint.js 1000000
  const amountToMint = process.argv[2];

  if (!amountToMint) {
    console.error(
      "❌ Error: Please provide the amount to mint as a command-line argument."
    );
    console.log("Usage: node mint.js <amount>");
    return; // Exit the script
  }

  try {
    const manager = new TokenManager();
    await manager.initialize();
    await manager.mint(amountToMint);
    console.log("\n✅ Script finished successfully.");
  } catch (error) {
    console.error("\n❌ Script failed:", error.message);
  }
}

// Run the main function
main();
