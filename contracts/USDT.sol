// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/**
 * @title USDT-like TRC-20 Token MVP
 * @dev Minimal viable product implementation with core USDT features:
 * - Unlimited minting by owner
 * - Basic pause/unpause functionality
 * - Standard TRC-20 interface
 * - Owner controls for future expansion
 */

interface ITRC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract USDT is ITRC20 {
    // Token metadata
    string public name;
    string public symbol;
    uint8 public decimals;

    // Core token data
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Administrative controls
    address public owner;
    bool public paused = false;

    // Events for administrative actions
    event Issue(uint256 amount);
    event Redeem(uint256 amount);
    event Pause();
    event Unpause();
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Token is paused");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }

    /**
     * @dev Constructor sets the token parameters and initial supply
     * @param _initialSupply Initial token supply (in smallest units)
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _decimals Number of decimals
     */
    constructor(
        uint256 _initialSupply,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;

        _totalSupply = _initialSupply;
        _balances[owner] = _initialSupply;

        if (_initialSupply > 0) {
            emit Transfer(address(0), owner, _initialSupply);
        }
    }

    // ========== TRC-20 STANDARD FUNCTIONS ==========

    /**
     * @dev Returns the total token supply
     */
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns the balance of a specific address
     * @param account Address to query
     */
    function balanceOf(
        address account
    ) external view override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev Transfers tokens from sender to recipient
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(
        address to,
        uint256 amount
    ) external override whenNotPaused validAddress(to) returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Returns the remaining number of tokens that spender can spend on behalf of owner
     * @param tokenOwner Token owner address
     * @param spender Spender address
     */
    function allowance(
        address tokenOwner,
        address spender
    ) external view override returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    /**
     * @dev Approves spender to spend a specific amount on behalf of the caller
     * @param spender Address to approve
     * @param amount Amount to approve
     */
    function approve(
        address spender,
        uint256 amount
    ) external override whenNotPaused validAddress(spender) returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev Transfers tokens from one address to another using allowance
     * @param from Source address
     * @param to Destination address
     * @param amount Amount to transfer
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external override whenNotPaused validAddress(to) returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(
            currentAllowance >= amount,
            "Transfer amount exceeds allowance"
        );

        _transfer(from, to, amount);
        _approve(from, msg.sender, currentAllowance - amount);

        return true;
    }

    // ========== ADMINISTRATIVE FUNCTIONS ==========

    /**
     * @dev Mints new tokens to the owner address
     * @param amount Amount to mint
     */
    function issue(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be positive");

        _totalSupply += amount;
        _balances[owner] += amount;

        emit Issue(amount);
        emit Transfer(address(0), owner, amount);
    }

    /**
     * @dev Burns tokens from the owner address
     * @param amount Amount to burn/redeem
     */
    function redeem(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be positive");
        require(_balances[owner] >= amount, "Insufficient balance to redeem");

        _totalSupply -= amount;
        _balances[owner] -= amount;

        emit Redeem(amount);
        emit Transfer(owner, address(0), amount);
    }

    /**
     * @dev Pauses all token transfers
     */
    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit Pause();
    }

    /**
     * @dev Unpauses token transfers
     */
    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit Unpause();
    }

    /**
     * @dev Transfers ownership to a new address
     * @param newOwner New owner address
     */
    function transferOwnership(
        address newOwner
    ) external onlyOwner validAddress(newOwner) {
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // ========== INTERNAL FUNCTIONS ==========

    /**
     * @dev Internal transfer function
     * @param from Source address
     * @param to Destination address
     * @param amount Amount to transfer
     */
    function _transfer(address from, address to, uint256 amount) internal {
        require(_balances[from] >= amount, "Transfer amount exceeds balance");

        _balances[from] -= amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    /**
     * @dev Internal approve function
     * @param tokenOwner Token owner address
     * @param spender Spender address
     * @param amount Amount to approve
     */
    function _approve(
        address tokenOwner,
        address spender,
        uint256 amount
    ) internal {
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }

    // ========== VIEW FUNCTIONS FOR DEBUGGING ==========

    /**
     * @dev Returns current contract state for debugging
     */
    function getContractInfo()
        external
        view
        returns (
            string memory tokenName,
            string memory tokenSymbol,
            uint8 tokenDecimals,
            uint256 supply,
            address contractOwner,
            bool isPaused
        )
    {
        return (name, symbol, decimals, _totalSupply, owner, paused);
    }
}
