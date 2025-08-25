// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/**
 * @title ITRC20 Interface
 * @dev Interface for the TRC-20 standard.
 */
interface ITRC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to another (`to`).
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by a call to {approve}.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    /**
     * @dev Returns the total supply of tokens.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` can spend on behalf of `owner`.
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the allowance mechanism.
     * `amount` is then deducted from the caller's allowance.
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

/**
 * @title TRC-20 USDT Token
 * @dev An implementation of the TRC-20 standard with administrative features
 *      inspired by Tether (USDT), including minting, redeeming, pausing, and a blacklist.
 */
contract USDT is ITRC20 {
    //================================================
    // State Variables
    //================================================

    // --- Token Metadata ---
    string public name;
    string public symbol;
    uint8 public decimals;

    // --- Core Token Data ---
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    // --- Administrative Controls ---
    address public owner;
    bool public paused;

    // --- Blacklist ---
    mapping(address => bool) public isBlacklisted;

    //================================================
    // Events
    //================================================

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event Issue(uint256 amount);
    event Redeem(uint256 amount);
    event Pause();
    event Unpause();
    event AddedBlacklist(address indexed user);
    event RemovedBlacklist(address indexed user);
    event DestroyedBlackFunds(address indexed blacklistedUser, uint256 balance);

    //================================================
    // Modifiers
    //================================================

    modifier onlyOwner() {
        require(msg.sender == owner, "USDT: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "USDT: token transfer is paused");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "USDT: invalid zero address");
        _;
    }

    modifier notBlacklisted(address addr) {
        require(!isBlacklisted[addr], "USDT: address is blacklisted");
        _;
    }

    //================================================
    // Constructor
    //================================================

    /**
     * @dev Sets the token name, symbol, decimals, and initial owner.
     * @param _name The name of the token.
     * @param _symbol The symbol of the token.
     * @param _decimals The number of decimal places for the token.
     */
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), owner);
    }

    //================================================
    // TRC-20 Standard Functions
    //================================================

    /**
     * @dev See {ITRC20-totalSupply}.
     */
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {ITRC20-balanceOf}.
     */
    function balanceOf(
        address account
    ) external view override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {ITRC20-transfer}.
     * Requirements:
     * - `to` cannot be the zero address.
     * - The caller must have a balance of at least `amount`.
     * - The contract must not be paused.
     * - The sender and recipient must not be blacklisted.
     */
    function transfer(
        address to,
        uint256 amount
    )
        external
        override
        whenNotPaused
        validAddress(to)
        notBlacklisted(msg.sender)
        notBlacklisted(to)
        returns (bool)
    {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev See {ITRC20-allowance}.
     */
    function allowance(
        address tokenOwner,
        address spender
    ) external view override returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    /**
     * @dev See {ITRC20-approve}.
     * Requirements:
     * - `spender` cannot be the zero address.
     * - The contract must not be paused.
     * - The caller and spender must not be blacklisted.
     */
    function approve(
        address spender,
        uint256 amount
    )
        external
        override
        whenNotPaused
        validAddress(spender)
        notBlacklisted(msg.sender)
        notBlacklisted(spender)
        returns (bool)
    {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev See {ITRC20-transferFrom}.
     * Requirements:
     * - `from` and `to` cannot be the zero address.
     * - `from` must have a balance of at least `amount`.
     * - The caller must have an allowance for `from`'s tokens of at least `amount`.
     * - The contract must not be paused.
     * - `from`, `to`, and the caller must not be blacklisted.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    )
        external
        override
        whenNotPaused
        validAddress(to)
        notBlacklisted(from)
        notBlacklisted(to)
        notBlacklisted(msg.sender)
        returns (bool)
    {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(
            currentAllowance >= amount,
            "USDT: transfer amount exceeds allowance"
        );
        _transfer(from, to, amount);
        _approve(from, msg.sender, currentAllowance - amount);
        return true;
    }

    //================================================
    // Optional Allowance Helpers
    //================================================

    /**
     * @dev Atomically increases the allowance granted to `spender`.
     * This is an alternative to {approve} that can be used to mitigate race conditions.
     * Emits an {Approval} event.
     * @param spender The address which will spend the funds.
     * @param addedValue The amount of tokens to increase the allowance by.
     * @return A boolean value indicating whether the operation succeeded.
     */
    function increaseAllowance(
        address spender,
        uint256 addedValue
    )
        external
        whenNotPaused
        validAddress(spender)
        notBlacklisted(msg.sender)
        notBlacklisted(spender)
        returns (bool)
    {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender] + addedValue
        );
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender`.
     * Reverts on subtraction overflow. Emits an {Approval} event.
     * @param spender The address which will spend the funds.
     * @param subtractedValue The amount of tokens to decrease the allowance by.
     * @return A boolean value indicating whether the operation succeeded.
     */
    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    )
        external
        whenNotPaused
        validAddress(spender)
        notBlacklisted(msg.sender)
        notBlacklisted(spender)
        returns (bool)
    {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(
            currentAllowance >= subtractedValue,
            "USDT: decreased allowance below zero"
        );
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

    //================================================
    // Administrative Functions
    //================================================

    /**
     * @dev Creates `amount` new tokens and assigns them to the owner.
     * Can only be called by the current owner. Emits {Issue} and {Transfer} events.
     * @param amount The amount of tokens to create.
     */
    function issue(uint256 amount) external onlyOwner {
        require(amount > 0, "USDT: cannot issue zero amount");
        _totalSupply += amount;
        _balances[owner] += amount;
        emit Issue(amount);
        emit Transfer(address(0), owner, amount);
    }

    /**
     * @dev Destroys `amount` tokens from the owner's balance (redemption).
     * Can only be called by the current owner. Emits {Redeem} and {Transfer} events.
     * @param amount The amount of tokens to destroy.
     */
    function redeem(uint256 amount) external onlyOwner {
        require(amount > 0, "USDT: cannot redeem zero amount");
        require(
            _balances[owner] >= amount,
            "USDT: insufficient balance to redeem"
        );
        _totalSupply -= amount;
        _balances[owner] -= amount;
        emit Redeem(amount);
        emit Transfer(owner, address(0), amount);
    }

    /**
     * @dev Pauses all token transfers. Can only be called by the owner.
     * Emits a {Pause} event.
     */
    function pause() external onlyOwner {
        require(!paused, "USDT: already paused");
        paused = true;
        emit Pause();
    }

    /**
     * @dev Resumes token transfers. Can only be called by the owner.
     * Emits an {Unpause} event.
     */
    function unpause() external onlyOwner {
        require(paused, "USDT: not paused");
        paused = false;
        emit Unpause();
    }

    /**
     * @dev Transfers ownership of the contract to a new account.
     * Can only be called by the current owner.
     * @param newOwner The address of the new owner.
     */
    function transferOwnership(
        address newOwner
    ) external onlyOwner validAddress(newOwner) {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    //================================================
    // Blacklist Functions
    //================================================

    /**
     * @dev Adds an address to the blacklist. Can only be called by the owner.
     * @param user The address to add to the blacklist.
     */
    function addBlacklist(address user) external onlyOwner validAddress(user) {
        require(!isBlacklisted[user], "USDT: address already blacklisted");
        isBlacklisted[user] = true;
        emit AddedBlacklist(user);
    }

    /**
     * @dev Removes an address from the blacklist. Can only be called by the owner.
     * @param user The address to remove from the blacklist.
     */
    function removeBlacklist(
        address user
    ) external onlyOwner validAddress(user) {
        require(isBlacklisted[user], "USDT: address not blacklisted");
        isBlacklisted[user] = false;
        emit RemovedBlacklist(user);
    }

    /**
     * @dev Public view function to check if an address is blacklisted.
     * @param user The address to check.
     * @return A boolean indicating the blacklist status.
     */
    function getBlacklistStatus(address user) external view returns (bool) {
        return isBlacklisted[user];
    }

    /**
     * @dev Destroys all tokens held by a blacklisted address.
     * Can only be called by the owner.
     * @param blacklistedUser The blacklisted address whose funds will be destroyed.
     */
    function destroyBlackFunds(address blacklistedUser) external onlyOwner {
        require(
            isBlacklisted[blacklistedUser],
            "USDT: address is not blacklisted"
        );
        uint256 dirtyFunds = _balances[blacklistedUser];
        require(dirtyFunds > 0, "USDT: no funds to destroy");

        _balances[blacklistedUser] = 0;
        _totalSupply -= dirtyFunds;

        emit DestroyedBlackFunds(blacklistedUser, dirtyFunds);
        emit Transfer(blacklistedUser, address(0), dirtyFunds);
    }

    //================================================
    // Internal Functions
    //================================================

    /**
     * @dev Internal function to move tokens between accounts.
     * @param from The address to transfer from.
     * @param to The address to transfer to.
     * @param amount The amount of tokens to transfer.
     */
    function _transfer(address from, address to, uint256 amount) internal {
        require(
            _balances[from] >= amount,
            "USDT: transfer amount exceeds balance"
        );
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    /**
     * @dev Internal function to set an allowance for a spender.
     * @param tokenOwner The address of the token owner.
     * @param spender The address of the spender.
     * @param amount The amount of the allowance.
     */
    function _approve(
        address tokenOwner,
        address spender,
        uint256 amount
    ) internal {
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }
}
