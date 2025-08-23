const USDT = artifacts.require("USDT");

module.exports = function (deployer, network, accounts) {
  console.log("Deploying USDT to network:", network);
  console.log("Deployer account:", accounts[0]);

  // Token configuration
  const initialSupply = 0; // Start with 0, mint later
  const name = "Testnet USDT";
  const symbol = "TUSDT";
  const decimals = 6;

  deployer.deploy(USDT, initialSupply, name, symbol, decimals).then(() => {
    console.log("USDT deployed successfully!");
    console.log("Contract address:", USDT.address);
    console.log("Token name:", name);
    console.log("Token symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("Initial supply:", initialSupply);
  });
};
