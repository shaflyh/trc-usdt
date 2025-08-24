const USDT = artifacts.require("./USDT.sol");
const { expectRevert, BN } = require("@openzeppelin/test-helpers");

// Wrapper to handle Tron address conversion for assertions
const assertAddress = (actual, expected) => {
  assert.equal(
    actual.toLowerCase(),
    tronWeb.address.toHex(expected).toLowerCase()
  );
};

contract("USDT Token", (accounts) => {
  let token;
  const [owner, user1, user2, other] = accounts;

  // Token constants
  const TOKEN_NAME = "Test USDT";
  const TOKEN_SYMBOL = "TUSDT";
  const DECIMALS = 6;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Helper to create BN from token amount
  const toBN = (amount) => new BN(amount).mul(new BN(10).pow(new BN(DECIMALS)));

  const MINT_AMOUNT = toBN("1000000"); // 1,000,000 tokens
  const TRANSFER_AMOUNT = toBN("100"); // 100 tokens
  const APPROVE_AMOUNT = toBN("50"); // 50 tokens

  // Deploy a fresh contract instance before each test
  beforeEach(async () => {
    // THE FIX: Deploy first, then get a stable instance using .at()
    const deployedToken = await USDT.new(TOKEN_NAME, TOKEN_SYMBOL, DECIMALS, {
      from: owner,
    });
    token = await USDT.at(deployedToken.address);
  });

  // --- I. DEPLOYMENT AND INITIAL STATE ---
  describe("Deployment", () => {
    it("should deploy with correct initial parameters", async () => {
      // Use direct calls, which should now work on the stable instance
      assert.equal(await token.name(), TOKEN_NAME, "Name should match");
      assert.equal(await token.symbol(), TOKEN_SYMBOL, "Symbol should match");
      assert.equal(
        (await token.decimals()).toString(),
        DECIMALS.toString(),
        "Decimals should match"
      );
      assertAddress(await token.owner(), owner);
      assert.equal(
        await token.paused(),
        false,
        "Contract should not be paused initially"
      );
      assert.equal(
        (await token.totalSupply()).toString(),
        "0",
        "Initial total supply should be zero"
      );
    });
  });

  // --- II. ADMINISTRATIVE FUNCTIONS ---
  describe("Administrative Functions", () => {
    context("Minting (Issue)", () => {
      it("should allow the owner to mint tokens", async () => {
        // Use .toString() for all BN arguments
        await token.issue(MINT_AMOUNT.toString(), { from: owner });

        const ownerBalance = await token.balanceOf(owner);
        const totalSupply = await token.totalSupply();

        assert.equal(
          ownerBalance.toString(),
          MINT_AMOUNT.toString(),
          "Owner balance should be the minted amount"
        );
        assert.equal(
          totalSupply.toString(),
          MINT_AMOUNT.toString(),
          "Total supply should be the minted amount"
        );
      });

      it("should reject minting from a non-owner account", async () => {
        await expectRevert(
          token.issue(MINT_AMOUNT.toString(), { from: user1 }),
          "USDT: caller is not the owner"
        );
      });

      it("should reject minting a zero amount", async () => {
        await expectRevert(
          token.issue("0", { from: owner }),
          "USDT: cannot issue zero amount"
        );
      });
    });

    // (The rest of the tests remain the same, as the calling conventions are now correct)

    context("Burning (Redeem)", () => {
      beforeEach(async () => {
        await token.issue(MINT_AMOUNT.toString(), { from: owner });
      });

      it("should allow the owner to burn their tokens", async () => {
        const burnAmount = toBN("1000");
        await token.redeem(burnAmount.toString(), { from: owner });

        const expectedAmount = MINT_AMOUNT.sub(burnAmount);
        const ownerBalance = await token.balanceOf(owner);
        const totalSupply = await token.totalSupply();

        assert.equal(ownerBalance.toString(), expectedAmount.toString());
        assert.equal(totalSupply.toString(), expectedAmount.toString());
      });
    });
  });
});
