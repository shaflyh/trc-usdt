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

  async mint(amount) {
    if (!amount || isNaN(amount))
      throw new Error("A valid amount must be provided for minting.");

    const decimals = await this.contract.decimals().call();
    const mintAmount = BigInt(amount) * 10n ** BigInt(decimals);

    console.log(`\nAttempting to mint ${amount} tokens...`);
    console.log(`...Sending transaction...`);

    const txId = await this.contract
      .issue(mintAmount.toString())
      .send({ feeLimit: 100_000_000 });
    console.log(`🎉 Transaction sent! Hash: ${txId}`);
    console.log(
      `🔗 View on TRONSCAN: https://nile.tronscan.org/#/transaction/${txId}`
    );
  }

  async pause() {
    console.log("\nAttempting to pause the contract...");
    console.log("...Sending transaction...");

    const txId = await this.contract.pause().send({ feeLimit: 100_000_000 });
    console.log(`🎉 Transaction sent! Hash: ${txId}`);
    console.log(
      `🔗 View on TRONSCAN: https://nile.tronscan.org/#/transaction/${txId}`
    );
  }

  async unpause() {
    console.log("\nAttempting to unpause the contract...");
    console.log("...Sending transaction...");

    const txId = await this.contract.unpause().send({ feeLimit: 100_000_000 });
    console.log(`🎉 Transaction sent! Hash: ${txId}`);
    console.log(
      `🔗 View on TRONSCAN: https://nile.tronscan.org/#/transaction/${txId}`
    );
  }

  async checkStatus() {
    console.log("\n--- Checking Contract Status ---");
    const name = await this.contract.name().call();
    const symbol = await this.contract.symbol().call();
    const totalSupply = await this.contract.totalSupply().call();
    const isPaused = await this.contract.paused().call();

    console.log(`Token Name:    ${name}`);
    console.log(`Token Symbol:  ${symbol}`);
    console.log(`Total Supply:  ${totalSupply.toString()}`);
    console.log(`Contract Paused: ${isPaused}`);
    console.log("----------------------------");
  }
}

/**
 * Main execution function to route commands.
 */
async function main() {
  console.log(process.argv);
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!command) {
    console.error("❌ Error: No command provided.");
    console.log("Usage: node manager.js <command> [arguments]");
    console.log("\nAvailable Commands:");
    console.log(
      "  status                - Checks the current status of the contract."
    );
    console.log("  mint <amount>         - Mints new tokens to the owner.");
    console.log("  pause                 - Pauses all token transfers.");
    console.log("  unpause               - Unpauses the contract.");
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
      case "pause":
        await manager.pause();
        break;
      case "unpause":
        await manager.unpause();
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
