//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract LLTComponent is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    mapping(uint256 => uint256) public componentIdToTokenId;
    uint256 private _totalSupply;
    // 每个代币的属性
    mapping(uint256 => ComponentAttributes) public componentAttributes;

    struct ComponentAttributes {
        uint256 id; // 组件名称
        uint256 speedUp; // 速度加成
        uint256 defense; // 防御加成
    }
    constructor(
        address defaultAdmin,
        address minter
    ) ERC721("LLTCom", "LLTCOM") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter);
    }
    function _baseURI() internal pure override returns (string memory) {
        return "www.test.com/tokenid=?";
    }

    function safeMint(
        address to,
        uint256 tokenId,
        uint256 id,
        uint256 speedUp,
        uint256 defense
    ) public onlyRole(MINTER_ROLE) {
        componentAttributes[tokenId] = ComponentAttributes(
            id,
            speedUp,
            defense
        ); // 记录组件属性
        _safeMint(to, tokenId);
        componentIdToTokenId[id] = tokenId;
        _totalSupply+=1;
    }
    function getAttributes(
        uint256 tokenId
    ) public view returns (ComponentAttributes memory) {
        return componentAttributes[tokenId];
    }
    function getComponentTokenId(
        uint256 id
    ) public view returns (uint256) {
        return componentIdToTokenId[id];
    }
    /// @notice 获取当前已铸造的代币总量
    /// @return 代币总供应量
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }
    // The following functions are overrides required by Solidity.

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
