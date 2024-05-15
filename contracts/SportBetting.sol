// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Interface for the ERC-20 token standard
interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// File: @openzeppelin/contracts/access/Ownable.sol


// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;


/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract MyOwnable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
contract SportBetting is MyOwnable {
    IERC20 public tokenContract;  // ERC-20 token to be sold
    address public admin;

    event Bought(address buyer, uint256 amount);

    struct distribution {
        address receiver;
        uint256 amount;
    }

    constructor(address _admin, IERC20 _tokenContract) MyOwnable(msg.sender) {
        admin = _admin;
        tokenContract = _tokenContract;
    }

    // Receive function to handle incoming Ether
    // receive() external payable {
    //     buyTokens();
    // }

    // Main function for users to buy tokens with Ether
    function buyTicket(uint256 amount) public returns (bool) {

        // Transfer the tokens to the buyer
        tokenContract.transferFrom(msg.sender, address(this), amount);

        emit Bought(msg.sender, amount);
        return true;
    }
    
    // Main function for users to buy tokens with Ether
    function distributeToken(distribution[] calldata distribute) public onlyOwner returns (bool) {

        require(distribute.length > 0, "Can not find distribute info");
        uint256 sum = 0;
        for (uint i = 0; i < distribute.length; i ++) {
            sum += distribute[i].amount;
        }
        require(tokenContract.balanceOf(address(this)) >= sum, "Not enough tokens in contract");
        for (uint i = 0; i < distribute.length; i ++) {
            tokenContract.transfer(distribute[i].receiver, distribute[i].amount);
        }
        return true;
    }

    // Function to check how many tokens the contract has
    function getRestTokenBalance() public view returns (uint256) {
        return tokenContract.balanceOf(address(this));
    }
    
    // Function to check how many tokens the contract has
    function getUserTokenBalance(address user) public view returns (uint256) {
        return tokenContract.balanceOf(user);
    }

    // Function to withdraw the token balance of the contract (admin only)
    function withdrawTokenAll() public onlyOwner {
        // Only the deployer of the contract should withdraw the token
        require(msg.sender == admin, "Only admin can withdraw");
        tokenContract.transfer(admin, tokenContract.balanceOf(address(this)));
    }
    
    // Function to withdraw the Token balance of the contract (admin only)
    function withdrawToken(uint256 amount) public onlyOwner {
        require(tokenContract.balanceOf(address(this)) >= amount, "Not enough tokens in contract");
        tokenContract.transfer(admin, amount);
        // payable(msg.sender).transfer(address(this).balance);
    }
    
}
