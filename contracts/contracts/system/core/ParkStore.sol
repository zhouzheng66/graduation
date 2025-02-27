//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/utils/Counters.sol";
import "../../utils/Counters.sol";
import "../../interface/IERC721Ext.sol";
import "../../interface/IERC6551Account.sol";
import "../../interface/IERC6551Registry.sol";
contract ParkStore is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    event parkMint(
        address indexed to,
        uint256 indexed tokenId,
        address account
    );

    IERC721Ext _parkERC721;
    IERC6551Account _erc6551Account;
    IERC6551Registry _erc6551Registry;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 internal _initialTokenId;
    constructor(
        address parkERC721_,
        address erc6551Registry_,
        address payable erc6551Account_
    ) {
        _parkERC721 = IERC721Ext(parkERC721_);
        _erc6551Registry = IERC6551Registry(erc6551Registry_);
        _erc6551Account = IERC6551Account(erc6551Account_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);

        _initialTokenId = 1000;
    }

    function currentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current() + _initialTokenId;
    }
    function _mintpark(address _address, uint256 _tokenId) internal {
        _parkERC721.safeMint(_address, _tokenId);
    }
    function mint() public nonReentrant returns (uint256) {
        uint256 _tokenId = currentTokenId();
        _tokenIdCounter.increment();
        address _to = _msgSender();

        _mintpark(_to, _tokenId);

        address account = _erc6551Registry.createAccount(
            address(_erc6551Account),
            block.chainid,
            address(_parkERC721),
            _tokenId,
            _tokenId,
            new bytes(0)
        );

        emit parkMint(_to, _tokenId, account);

        return _tokenId;
    }
}
