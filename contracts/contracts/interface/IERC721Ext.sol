//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IERC721Ext is IERC721 {
    function safeMint(address to, uint256 tokenId) external;
}
