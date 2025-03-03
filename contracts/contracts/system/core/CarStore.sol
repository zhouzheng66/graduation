//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../../utils/Counters.sol";
import "../../interface/IERC721Ext.sol";
import "../../interface/IERC6551Account.sol";
import "../../interface/IERC6551Registry.sol";

contract CarStore is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    event carMint(address indexed to, uint256 indexed tokenId, address account);

    IERC721Ext _carERC721;
    IERC6551Account _erc6551Account;
    IERC6551Registry _erc6551Registry;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 internal _initialTokenId;

    /// @notice 初始化 CarStore 合约
    /// @dev 设置 ERC721 合约和 ERC6551 注册表及账户合约地址，并授予初始权限
    /// @param carERC721_ ERC721 合约地址
    /// @param erc6551Registry_ ERC6551 注册表合约地址
    /// @param erc6551Account_ ERC6551 账户合约地址
    constructor(
        address carERC721_,
        address erc6551Registry_,
        address payable erc6551Account_
    ) {
        _carERC721 = IERC721Ext(carERC721_);
        _erc6551Registry = IERC6551Registry(erc6551Registry_);
        _erc6551Account = IERC6551Account(erc6551Account_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);

        _initialTokenId = 1000;
    }

    /// @notice 获取当前的 tokenId
    /// @dev 返回当前计数器值加上初始 tokenId
    /// @return 当前的 tokenId
    function currentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current() + _initialTokenId;
    }

    /// @notice 内部函数，用于铸造汽车 NFT
    /// @dev 只能在合约内部调用
    /// @param _address 接收者地址
    /// @param _tokenId 要铸造的 tokenId
    function _mintcar(address _address, uint256 _tokenId) internal {
        _carERC721.safeMint(_address, _tokenId);
    }

    /// @notice 铸造新的汽车 NFT 并创建关联账户
    /// @dev 包含重入保护，调用者必须具有 MINTER_ROLE
    /// @return 新铸造的 tokenId
    function mint() public nonReentrant returns (uint256) {
        uint256 _tokenId = currentTokenId();
        _tokenIdCounter.increment();
        address _to = _msgSender();

        _mintcar(_to, _tokenId);

        address account = _erc6551Registry.createAccount(
            address(_erc6551Account),
            block.chainid,
            address(_carERC721),
            _tokenId,
            _tokenId,
            new bytes(0)
        );

        emit carMint(_to, _tokenId, account);

        return _tokenId;
    }
}
