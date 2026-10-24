// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @dev Minimal ERC-20 mock for unit tests.
///      Supports mint, approve, transferFrom, transfer, balanceOf, decimals.
///      transferFrom returns false when the `fail` flag is set (simulates failed transfer).
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;

    bool public fail; // if true, transferFrom / transfer return false

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function totalSupply() external view returns (uint256 total) {
        // not needed for tests — kept for IERC20 completeness
        total = 0;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (fail) return false;
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        if (fail) return false;
        require(balanceOf[from] >= amount, "insufficient");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    /// @dev Flip the fail flag so next transferFrom returns false.
    function setFail(bool _fail) external {
        fail = _fail;
    }
}
