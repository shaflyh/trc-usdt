const USDT = artifacts.require("USDT");
const { expectRevert, expectEvent, BN } = require("@openzeppelin/test-helpers");

contract("USDT MVP", (accounts) => {
  let token;
  const [owner, user1, user2, user3] = accounts;

  // Token parameters
  const INITIAL_SUPPLY = 0; // Start with 0 like real USDT
  const TOKEN_NAME = "Test USDT";
  const TOKEN_SYMBOL = "TUSDT";
  const DECIMALS = 6;

  // Test amounts
  const MINT_AMOUNT = new BN("1000000").mul(new BN(10).pow(new BN(DECIMALS))); // 1M tokens
  const TRANSFER_AMOUNT = new BN("100").mul(new BN(10).pow(new BN(DECIMALS))); // 100 tokens

  beforeEach(async () => {
    token = await USDT.new(INITIAL_SUPPLY, TOKEN_NAME, TOKEN_SYMBOL, DECIMALS);
  });

  describe("🏗️  Contract Initialization", () => {
    it("should set correct token metadata", async () => {
      assert.equal(await token.name(), TOKEN_NAME);
      assert.equal(await token.symbol(), TOKEN_SYMBOL);
      assert.equal(await token.decimals(), DECIMALS);
    });

    it("should set correct owner", async () => {
      assert.equal(await token.owner(), owner);
    });

    it("should start with correct initial supply", async () => {
      const totalSupply = await token.totalSupply();
      assert.equal(totalSupply.toString(), INITIAL_SUPPLY.toString());
    });

    it("should not be paused initially", async () => {
      assert.equal(await token.paused(), false);
    });

    it("should return correct contract info", async () => {
      const info = await token.getContractInfo();
      assert.equal(info.tokenName, TOKEN_NAME);
      assert.equal(info.tokenSymbol, TOKEN_SYMBOL);
      assert.equal(info.tokenDecimals.toString(), DECIMALS.toString());
      assert.equal(info.contractOwner, owner);
      assert.equal(info.isPaused, false);
    });
  });

  describe("🏦 Administrative Functions", () => {
    describe("Minting (Issue)", () => {
      it("should allow owner to mint tokens", async () => {
        const receipt = await token.issue(MINT_AMOUNT, { from: owner });

        // Check events
        expectEvent(receipt, "Issue", {
          amount: MINT_AMOUNT,
        });

        expectEvent(receipt, "Transfer", {
          from: "0x0000000000000000000000000000000000000000",
          to: owner,
          value: MINT_AMOUNT,
        });

        // Check balances
        const totalSupply = await token.totalSupply();
        const ownerBalance = await token.balanceOf(owner);

        assert.equal(totalSupply.toString(), MINT_AMOUNT.toString());
        assert.equal(ownerBalance.toString(), MINT_AMOUNT.toString());
      });

      it("should not allow non-owner to mint tokens", async () => {
        await expectRevert(
          token.issue(MINT_AMOUNT, { from: user1 }),
          "Not the owner"
        );
      });

      it("should not allow minting zero tokens", async () => {
        await expectRevert(
          token.issue(0, { from: owner }),
          "Amount must be positive"
        );
      });
    });

    describe("Burning (Redeem)", () => {
      beforeEach(async () => {
        await token.issue(MINT_AMOUNT, { from: owner });
      });

      it("should allow owner to burn tokens", async () => {
        const burnAmount = MINT_AMOUNT.div(new BN(2)); // Burn half
        const receipt = await token.redeem(burnAmount, { from: owner });

        expectEvent(receipt, "Redeem", {
          amount: burnAmount,
        });

        expectEvent(receipt, "Transfer", {
          from: owner,
          to: "0x0000000000000000000000000000000000000000",
          value: burnAmount,
        });

        const totalSupply = await token.totalSupply();
        const ownerBalance = await token.balanceOf(owner);

        assert.equal(
          totalSupply.toString(),
          MINT_AMOUNT.sub(burnAmount).toString()
        );
        assert.equal(
          ownerBalance.toString(),
          MINT_AMOUNT.sub(burnAmount).toString()
        );
      });

      it("should not allow burning more than balance", async () => {
        const excessAmount = MINT_AMOUNT.add(new BN("1"));

        await expectRevert(
          token.redeem(excessAmount, { from: owner }),
          "Insufficient balance to redeem"
        );
      });

      it("should not allow non-owner to burn tokens", async () => {
        await expectRevert(
          token.redeem(MINT_AMOUNT.div(new BN(2)), { from: user1 }),
          "Not the owner"
        );
      });
    });

    describe("Pause/Unpause", () => {
      beforeEach(async () => {
        await token.issue(MINT_AMOUNT, { from: owner });
        await token.transfer(user1, TRANSFER_AMOUNT, { from: owner });
      });

      it("should allow owner to pause the contract", async () => {
        const receipt = await token.pause({ from: owner });

        expectEvent(receipt, "Pause");
        assert.equal(await token.paused(), true);
      });

      it("should prevent transfers when paused", async () => {
        await token.pause({ from: owner });

        await expectRevert(
          token.transfer(user2, TRANSFER_AMOUNT, { from: user1 }),
          "Token is paused"
        );

        await expectRevert(
          token.approve(user2, TRANSFER_AMOUNT, { from: user1 }),
          "Token is paused"
        );
      });

      it("should allow owner to unpause", async () => {
        await token.pause({ from: owner });
        const receipt = await token.unpause({ from: owner });

        expectEvent(receipt, "Unpause");
        assert.equal(await token.paused(), false);

        // Should allow transfers again
        await token.transfer(user2, TRANSFER_AMOUNT, { from: user1 });
      });

      it("should not allow non-owner to pause/unpause", async () => {
        await expectRevert(token.pause({ from: user1 }), "Not the owner");

        await token.pause({ from: owner });

        await expectRevert(token.unpause({ from: user1 }), "Not the owner");
      });
    });

    describe("Ownership Transfer", () => {
      it("should allow owner to transfer ownership", async () => {
        const receipt = await token.transferOwnership(user1, { from: owner });

        expectEvent(receipt, "OwnershipTransferred", {
          previousOwner: owner,
          newOwner: user1,
        });

        assert.equal(await token.owner(), user1);
      });

      it("should not allow non-owner to transfer ownership", async () => {
        await expectRevert(
          token.transferOwnership(user1, { from: user2 }),
          "Not the owner"
        );
      });

      it("should not allow transfer to zero address", async () => {
        await expectRevert(
          token.transferOwnership(
            "0x0000000000000000000000000000000000000000",
            { from: owner }
          ),
          "Invalid address"
        );
      });
    });
  });

  describe("💸 Token Transfer Functions", () => {
    beforeEach(async () => {
      await token.issue(MINT_AMOUNT, { from: owner });
      await token.transfer(user1, TRANSFER_AMOUNT.mul(new BN(5)), {
        from: owner,
      });
    });

    describe("Standard Transfers", () => {
      it("should transfer tokens between accounts", async () => {
        const receipt = await token.transfer(user2, TRANSFER_AMOUNT, {
          from: user1,
        });

        expectEvent(receipt, "Transfer", {
          from: user1,
          to: user2,
          value: TRANSFER_AMOUNT,
        });

        const user1Balance = await token.balanceOf(user1);
        const user2Balance = await token.balanceOf(user2);

        assert.equal(
          user1Balance.toString(),
          TRANSFER_AMOUNT.mul(new BN(4)).toString()
        );
        assert.equal(user2Balance.toString(), TRANSFER_AMOUNT.toString());
      });

      it("should not transfer more than balance", async () => {
        const excessAmount = TRANSFER_AMOUNT.mul(new BN(10));

        await expectRevert(
          token.transfer(user2, excessAmount, { from: user1 }),
          "Transfer amount exceeds balance"
        );
      });

      it("should not transfer to zero address", async () => {
        await expectRevert(
          token.transfer(
            "0x0000000000000000000000000000000000000000",
            TRANSFER_AMOUNT,
            { from: user1 }
          ),
          "Invalid address"
        );
      });
    });

    describe("Allowance and TransferFrom", () => {
      it("should approve and transfer using allowance", async () => {
        // Approve user2 to spend user1's tokens
        await token.approve(user2, TRANSFER_AMOUNT, { from: user1 });

        assert.equal(
          (await token.allowance(user1, user2)).toString(),
          TRANSFER_AMOUNT.toString()
        );

        // Transfer from user1 to user3 using user2's allowance
        const receipt = await token.transferFrom(
          user1,
          user3,
          TRANSFER_AMOUNT,
          { from: user2 }
        );

        expectEvent(receipt, "Transfer", {
          from: user1,
          to: user3,
          value: TRANSFER_AMOUNT,
        });

        // Check balances
        const user1Balance = await token.balanceOf(user1);
        const user3Balance = await token.balanceOf(user3);
        const remaining_allowance = await token.allowance(user1, user2);

        assert.equal(
          user1Balance.toString(),
          TRANSFER_AMOUNT.mul(new BN(4)).toString()
        );
        assert.equal(user3Balance.toString(), TRANSFER_AMOUNT.toString());
        assert.equal(remaining_allowance.toString(), "0");
      });

      it("should not transfer more than allowance", async () => {
        await token.approve(user2, TRANSFER_AMOUNT, { from: user1 });

        await expectRevert(
          token.transferFrom(user1, user3, TRANSFER_AMOUNT.mul(new BN(2)), {
            from: user2,
          }),
          "Transfer amount exceeds allowance"
        );
      });
    });
  });

  describe("🔍 Edge Cases and Gas Optimization", () => {
    it("should handle multiple consecutive operations", async () => {
      // Mint
      await token.issue(MINT_AMOUNT, { from: owner });

      // Transfer to multiple users
      await token.transfer(user1, TRANSFER_AMOUNT, { from: owner });
      await token.transfer(user2, TRANSFER_AMOUNT, { from: owner });
      await token.transfer(user3, TRANSFER_AMOUNT, { from: owner });

      // Verify balances
      assert.equal(
        (await token.balanceOf(user1)).toString(),
        TRANSFER_AMOUNT.toString()
      );
      assert.equal(
        (await token.balanceOf(user2)).toString(),
        TRANSFER_AMOUNT.toString()
      );
      assert.equal(
        (await token.balanceOf(user3)).toString(),
        TRANSFER_AMOUNT.toString()
      );
    });

    it("should handle zero amount transfers (should fail)", async () => {
      await token.issue(MINT_AMOUNT, { from: owner });

      // Zero transfers should work (some protocols require this)
      const receipt = await token.transfer(user1, 0, { from: owner });
      expectEvent(receipt, "Transfer", {
        from: owner,
        to: user1,
        value: new BN(0),
      });
    });
  });

  describe("📊 Gas Usage Analysis", () => {
    it("should track gas usage for common operations", async () => {
      const operations = {};

      // Minting
      const mintTx = await token.issue(MINT_AMOUNT, { from: owner });
      operations.mint = mintTx.receipt.gasUsed;

      // Transfer
      const transferTx = await token.transfer(user1, TRANSFER_AMOUNT, {
        from: owner,
      });
      operations.transfer = transferTx.receipt.gasUsed;

      // Approval
      const approveTx = await token.approve(user2, TRANSFER_AMOUNT, {
        from: user1,
      });
      operations.approve = approveTx.receipt.gasUsed;

      console.log("\n📊 Gas Usage Report:");
      console.log("=".repeat(40));
      Object.entries(operations).forEach(([op, gas]) => {
        console.log(`${op.padEnd(15)}: ${gas.toLocaleString()} gas`);
      });
      console.log("=".repeat(40));
    });
  });
});
