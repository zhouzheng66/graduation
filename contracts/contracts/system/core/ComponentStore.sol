// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../tokens/LLTComponent.sol";
import "../../utils/Counters.sol";

contract ComponentStore is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    LLTComponent public nftContract;
    IERC20  public lltToken;
    uint256 public mintPrice;

    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
    }

    // tokenId => Listing
    mapping(uint256 => Listing) public listings;

    // 市场费率 (1% = 100)
    uint256 public marketplaceFee = 250; // 2.5%
    // tokenId
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 internal _initialTokenId;

    event TokenListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event TokenSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event TokenDelisted(uint256 indexed tokenId, address indexed seller);
    event MintedAndListed(
        uint256 indexed tokenId,
        address indexed to,
        uint256 price
    );
    /// @notice 初始化组件商店合约
    /// @dev 设置 NFT 合约地址并授予管理员权限
    /// @param _nftContract LLTComponent 合约地址
    /// @param admin 管理员地址
    constructor(address _nftContract,address _lltToken, uint256 _mintPrice,address admin) {
        nftContract = LLTComponent(_nftContract);
        lltToken = IERC20(_lltToken);
        mintPrice = _mintPrice;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _initialTokenId = 1000;
    }

    /// @notice 铸造新的 NFT 并直接在市场上架
    /// @dev 调用者必须确保市场合约具有 MINTER_ROLE 权限
    /// @param id 组件 ID
    /// @param speedUp 速度加成属性
    /// @param defense 防御加成属性
    /// @param price 上架价格（以 wei 为单位）
    function mintAndList(
        uint256 id,
        uint256 speedUp,
        uint256 defense,
        uint256 price
    ) external {
        require(
            nftContract.hasRole(nftContract.MINTER_ROLE(), address(this)),
            "Marketplace: Not authorized to mint"
        );
        require(
            lltToken.transferFrom(msg.sender, address(this), mintPrice),
            "Token transfer failed"
        );
        uint256 _tokenId = currentTokenId();
        _tokenIdCounter.increment();

        // 铸造 NFT
        nftContract.safeMint(msg.sender, _tokenId, id, speedUp, defense);

        // 上架 NFT
        _listToken(_tokenId, price);

        emit MintedAndListed(_tokenId, msg.sender, price);
    }
    /// @notice 获取当前的 tokenId
    /// @dev 返回当前 tokenId 的值
    function currentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current() + _initialTokenId;
    }

    /// @notice 将已有的 NFT 上架到市场
    /// @dev 调用者必须是 NFT 的所有者，且必须已授权市场合约操作其 NFT
    /// @param tokenId 要上架的 NFT 的 tokenId
    /// @param price 上架价格（以 wei 为单位）
    function listToken(uint256 tokenId, uint256 price) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            nftContract.getApproved(tokenId) == address(this) ||
                nftContract.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        _listToken(tokenId, price);
    }
    /// @notice 内部函数，处理 NFT 上架逻辑
    /// @dev 只能被 listToken 和 mintAndList 调用
    /// @param tokenId NFT 的 tokenId
    /// @param price 上架价格（以 wei 为单位）
    function _listToken(uint256 tokenId, uint256 price) internal {
        require(price > 0, "Price must be greater than 0");

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isActive: true
        });

        emit TokenListed(tokenId, msg.sender, price);
    }

    /// @notice 购买已上架的 NFT
    /// @dev 包含重入保护，确保支付金额足够
    /// @param tokenId 要购买的 NFT 的 tokenId
    function buyToken(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "Token not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        // 计算费用
        uint256 fee = (listing.price * marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - fee;

        // 转移代币
        nftContract.transferFrom(listing.seller, msg.sender, tokenId);

        // 转移以太币
        payable(listing.seller).transfer(sellerAmount);

        // 删除上架信息
        delete listings[tokenId];

        emit TokenSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    /// @notice 将已上架的 NFT 下架
    /// @dev 只有上架者可以下架
    /// @param tokenId 要下架的 NFT 的 tokenId
    function delistToken(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not token seller");
        delete listings[tokenId];
        emit TokenDelisted(tokenId, msg.sender);
    }

    /// @notice 更新市场手续费率
    /// @dev 只有管理员可以调用，费率以基点表示（1% = 100）
    /// @param newFee 新的费率，不能超过 1000（10%）
    function updateMarketplaceFee(
        uint256 newFee
    ) external onlyRole(ADMIN_ROLE) {
        require(newFee <= 1000, "Fee too high"); // 最高 10%
        marketplaceFee = newFee;
    }

    /// @notice 提取市场累积的手续费
    /// @dev 只有管理员可以调用，将合约中的所有以太币转给调用者
    function withdrawFees() external onlyRole(ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
        /// @notice 获取指定 NFT 的上架信息
    /// @dev 如果 NFT 未上架，返回的 isActive 为 false
    /// @param tokenId NFT 的 tokenId
    /// @return seller 卖家地址
    /// @return price 价格
    /// @return isActive 是否处于上架状态
    function getListingInfo(uint256 tokenId) 
        external 
        view 
        returns (address seller, uint256 price, bool isActive) 
    {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price, listing.isActive);
    }

    /// @notice 获取指定卖家的所有上架 NFT
    /// @dev 返回该卖家上架的所有 tokenId
    /// @param seller 卖家地址
    /// @return activeListings 该卖家上架的所有 tokenId 数组
    function getSellerListings(address seller) 
        external 
        view 
        returns (uint256[] memory activeListings) 
    {
        uint256 count = 0;
        uint256 currentId = currentTokenId();
        
        // 从 _initialTokenId 开始遍历到当前 tokenId
        for (uint256 i = _initialTokenId; i < currentId; i++) {
            if (listings[i].seller == seller && listings[i].isActive) {
                count++;
            }
        }
        
        // 创建结果数组
        activeListings = new uint256[](count);
        uint256 index = 0;
        
        // 填充结果数组
        for (uint256 i = _initialTokenId; i < currentId; i++) {
            if (listings[i].seller == seller && listings[i].isActive) {
                activeListings[index] = i;
                index++;
            }
        }
        
        return activeListings;
    }

    /// @notice 获取所有当前上架的 NFT
    /// @dev 返回所有正在上架的 tokenId
    /// @return activeListings 所有上架中的 tokenId 数组
    function getAllActiveListings() 
        external 
        view 
        returns (uint256[] memory activeListings) 
    {
        uint256 count = 0;
        uint256 currentId = currentTokenId();
        
        // 计算所有上架的 NFT 数量
        for (uint256 i = _initialTokenId; i < currentId; i++) {
            if (listings[i].isActive) {
                count++;
            }
        }
        // 创建结果数组
        activeListings = new uint256[](count);
        uint256 index = 0;
        // 填充结果数组
        for (uint256 i = _initialTokenId; i < currentId; i++) {
            if (listings[i].isActive) {
                activeListings[index] = i;  // 使用 i 作为 tokenId
                index++;
            }
        }
        return activeListings;
    }
    event Minted(
        uint256 indexed tokenId,
        address indexed to
    );

    /// @notice 只铸造新的 NFT 而不上架
    /// @dev 调用者必须确保市场合约具有 MINTER_ROLE 权限
    /// @param id 组件 ID
    /// @param speedUp 速度加成属性
    /// @param defense 防御加成属性
    function mint(
        uint256 id,
        uint256 speedUp,
        uint256 defense
    ) external {
        require(
            nftContract.hasRole(nftContract.MINTER_ROLE(), address(this)),
            "Marketplace: Not authorized to mint"
        );
        require(
            lltToken.transferFrom(msg.sender, address(this), mintPrice),
            "Token transfer failed"
        );
        uint256 _tokenId = currentTokenId();
        _tokenIdCounter.increment();

        // 铸造 NFT
        nftContract.safeMint(msg.sender, _tokenId, id, speedUp, defense);

        // 触发 Minted 事件
        emit Minted(_tokenId, msg.sender);
    }
}
