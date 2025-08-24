// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/**
 * @title TRC-20 USDT-like Token
 * @dev A minimal viable product (MVP) of a TRC-20 token with features
 * similar to USDT, including administrative controls like minting, burning,
 * and pausing functionality.
 * This contract is intended for educational and demonstration purposes.
 */
interface ITRC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
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
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}.
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
     * @dev Moves `amount` tokens from `from` to `to` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     * Returns a boolean value indicating whether the operation succeeded.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

contract USDT is ITRC20 {
    // --- State Variables ---

    // Token metadata
    string public name;
    string public symbol;
    uint8 public decimals;

    // Core token data
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;

    // Administrative controls
    address public owner;
    bool public paused;

    // --- Events ---

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event Issue(uint256 amount);
    event Redeem(uint256 amount);
    event Pause();
    event Unpause();

    // --- Modifiers ---

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

    // --- Constructor ---

    /**
     * @dev Sets the token name, symbol, decimals, and initial owner.
     */
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), owner);
    }

    // --- TRC-20 Standard Functions ---

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(
        address account
    ) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(
        address to,
        uint256 amount
    ) external override whenNotPaused validAddress(to) returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(
        address tokenOwner,
        address spender
    ) external view override returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) external override whenNotPaused validAddress(spender) returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external override whenNotPaused validAddress(to) returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(
            currentAllowance >= amount,
            "USDT: transfer amount exceeds allowance"
        );

        _transfer(from, to, amount);
        _approve(from, msg.sender, currentAllowance - amount);

        return true;
    }

    // --- Administrative Functions ---

    /**
     * @dev Creates `amount` new tokens and assigns them to the owner.
     * Emits an {Issue} and a {Transfer} event.
     * Requirements:
     * - The caller must be the owner.
     */
    function issue(uint256 amount) external onlyOwner {
        require(amount > 0, "USDT: cannot issue zero amount");
        _totalSupply += amount;
        _balances[owner] += amount;
        emit Issue(amount);
        emit Transfer(address(0), owner, amount);
    }

    /**
     * @dev Destroys `amount` tokens from the owner's balance.
     * Emits a {Redeem} and a {Transfer} event.
     * Requirements:
     * - The caller must be the owner.
     * - The owner must have a balance of at least `amount`.
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
     * @dev Pauses all token transfers.
     * Emits a {Pause} event.
     * Requirements:
     * - The caller must be the owner.
     * - The contract must not be already paused.
     */
    function pause() external onlyOwner {
        require(!paused, "USDT: already paused");
        paused = true;
        emit Pause();
    }

    /**
     * @dev Resumes token transfers.
     * Emits an {Unpause} event.
     * Requirements:
     * - The caller must be the owner.
     * - The contract must be paused.
     */
    function unpause() external onlyOwner {
        require(paused, "USDT: not paused");
        paused = false;
        emit Unpause();
    }

    /**
     * @dev Transfers ownership of the contract to a new account.
     * Can only be called by the current owner.
     */
    function transferOwnership(
        address newOwner
    ) external onlyOwner validAddress(newOwner) {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // --- Internal Functions ---

    /**
     * @dev Internal function to move tokens between accounts.
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
     * @dev Internal function to set an allowance.
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
