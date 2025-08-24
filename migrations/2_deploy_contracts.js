const USDT = artifacts.require("USDT");

module.exports = function (deployer, network, accounts) {
  console.log("Deploying USDT to network:", network);
  console.log("Deployer account:", accounts[0]);

  const name = "Tether USD";
  const symbol = "USDT";
  const decimals = 6;

  deployer.deploy(USDT, name, symbol, decimals).then(() => {
    console.log("USDT deployed successfully!");
    console.log("Contract address:", USDT.address);
    console.log("Token name:", name);
    console.log("Token symbol:", symbol);
    console.log("Decimals:", decimals);
  });
};
