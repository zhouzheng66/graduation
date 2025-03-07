//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../../interface/IERC721Ext.sol";
import "../../interface/IERC6551Account.sol";
import "../../interface/IERC6551Registry.sol";
import "../../tokens/LLTToken.sol";
import "../../tokens/LLTComponent.sol";

contract LotLoot {
    event ParkCar(
        address indexed who,
        uint256 indexed carTokenId,
        uint256 indexed parkingTokenId
    );
    event UnParkCar(
        address indexed who,
        uint256 indexed carTokenId,
        uint256 indexed parkingTokenId
    );
    event FineCar(
        address indexed who,
        uint256 indexed carTokenId,
        uint256 indexed parkingTokenId
    );

    LLTToken lltToken;
    LLTComponent lltComponent;
    IERC721Ext carNFT;
    IERC721Ext parkingNFT;
    IERC6551Registry registry;
    IERC6551Account account;

    struct carInfo {
        uint startTime;
        uint parkTokenId;
    }
    struct parkInfo {
        uint startTime;
        uint carTokenId;
    }
    mapping(uint => carInfo) public cars;
    mapping(uint => parkInfo) public parks;


    /// @notice 初始化 LotLoot 合约
    /// @dev 设置相关合约地址并授予初始权限
    /// @param _lltToken LLTToken 合约地址
    /// @param _carNFT 汽车 NFT 合约地址
    /// @param _parkingNFT 停车位 NFT 合约地址
    /// @param _lltComponent LLTComponent 合约地址
    /// @param _registry ERC6551 注册表合约地址
    /// @param _accountAddress ERC6551 账户合约地址
    constructor(
        address _lltToken,
        address _carNFT,
        address _parkingNFT,
        address _lltComponent,
        address _registry,
        address payable _accountAddress
    ) {
        lltToken = LLTToken(_lltToken);
        lltComponent = LLTComponent(_lltComponent);
        carNFT = IERC721Ext(_carNFT);
        parkingNFT = IERC721Ext(_parkingNFT);
        registry = IERC6551Registry(_registry);
        account = IERC6551Account(_accountAddress);
    }

    /// @notice 停放汽车
    /// @dev 验证所有权和停车位状态
    /// @param _carTokenId 汽车的 tokenId
    /// @param _parkTokenId 停车位的 tokenId
    function parkCar(uint _carTokenId, uint _parkTokenId) public {
        require(
            carNFT.ownerOf(_carTokenId) == msg.sender,
            "You are not the owner of the car"
        );
        require(
            parkingNFT.ownerOf(_parkTokenId) != msg.sender,
            "You can not parking your park"
        );
        require(cars[_carTokenId].parkTokenId == 0, "Car is already parked");
        require(parks[_parkTokenId].carTokenId == 0, "Park is already full");
        cars[_carTokenId] = carInfo(block.timestamp, _parkTokenId);
        parks[_parkTokenId] = parkInfo(block.timestamp, _carTokenId);

        emit ParkCar(msg.sender, _carTokenId, _parkTokenId);
    }

    /// @notice 移除停放的汽车
    /// @dev 验证所有权和汽车状态
    /// @param _carTokenId 汽车的 tokenId
    function unParkCar(uint _carTokenId) public {
        require(carNFT.ownerOf(_carTokenId) == msg.sender, "Not owner of car");
        require(cars[_carTokenId].parkTokenId != 0, "Car is not parked");

        _handleUnparkCar(_carTokenId);
        uint parkingTokenId = cars[_carTokenId].parkTokenId;

        parks[cars[_carTokenId].parkTokenId].carTokenId = 0;
        cars[_carTokenId].parkTokenId = 0;
        emit UnParkCar(msg.sender, _carTokenId, parkingTokenId);
    }

    /// @notice 对违规停放的汽车进行罚款
    /// @dev 验证停车位状态和所有权
    /// @param _parkTokenId 停车位的 tokenId
    function fineCar(uint _parkTokenId) public {
        require(
            parks[_parkTokenId].carTokenId != 0,
            "There are no cars in this space"
        );
        require(
            parkingNFT.ownerOf(_parkTokenId) == msg.sender,
            "Not owner of park"
        );
        _handleFineCar(_parkTokenId);
        uint carTokenId = parks[_parkTokenId].carTokenId;
        address carOwner = carNFT.ownerOf(carTokenId);

        cars[parks[_parkTokenId].carTokenId].parkTokenId = 0;
        parks[_parkTokenId].carTokenId = 0;
        emit FineCar(carOwner, carTokenId, _parkTokenId);
    }

    /// @notice 查看汽车停放的停车位
    /// @param _carTokenId 汽车的 tokenId
    /// @return 停车位的 tokenId
    function viewCarOnPark(uint _carTokenId) public view returns (uint) {
        return cars[_carTokenId].parkTokenId;
    }

    /// @notice 查看停车位上的汽车
    /// @param _parkTokenId 停车位的 tokenId
    /// @return 汽车的 tokenId
    function viewParkOnCar(uint _parkTokenId) public view returns (uint) {
        return parks[_parkTokenId].carTokenId;
    }

    /// @notice 内部函数，处理罚款逻辑
    /// @param _parkTokenId 停车位的 tokenId
    function _handleFineCar(uint _parkTokenId) internal {
        address parkAddress = _account(address(parkingNFT), _parkTokenId);
        uint256 fineAmount = block.timestamp - parks[_parkTokenId].startTime;
        if (fineAmount > 1 days) {
            fineAmount = 1 days;
        }
        lltToken.mint(parkAddress, fineAmount);
    }

    /// @notice 内部函数，处理移除汽车逻辑
    /// @param _carTokenId 汽车的 tokenId
    function _handleUnparkCar(uint _carTokenId) internal {
        address carAddress = _account(address(carNFT), _carTokenId);
        uint256 mintAmount = block.timestamp - cars[_carTokenId].startTime;
        if (mintAmount > 1 days) {
            mintAmount = 1 days;
        }
        lltToken.mint(carAddress, mintAmount);
    }

    /// @notice 获取账户地址
    /// @param _tokenContract 代币合约地址
    /// @param _tokenId 代币的 tokenId
    /// @return 账户地址
    function _account(
        address _tokenContract,
        uint256 _tokenId
    ) internal view returns (address) {
        return
            registry.account(
                address(account),
                block.chainid,
                _tokenContract,
                _tokenId,
                _tokenId
            );
    }


    event ComponentLoaded(
        address indexed owner,
        uint256 indexed carTokenId,
        uint256 indexed componentTokenId
    );
    event ComponentUnloaded(
        address indexed owner,
        uint256 indexed carTokenId,
        uint256 indexed componentTokenId
    );
    /// @notice 装载组件到汽车
    /// @param _carTokenId 汽车的 tokenId
    /// @param _componentTokenId 组件的 tokenId
    function load(uint _carTokenId, uint _componentTokenId) public {
        require(lltComponent.ownerOf(_componentTokenId) == msg.sender, "Not owner of component");
        require(lltComponent.getApproved(_carTokenId) == address(this));
        address _carAddress = _account(address(carNFT), _carTokenId);
        lltComponent.safeTransferFrom(msg.sender, _carAddress, _componentTokenId);

        // 触发 ComponentLoaded 事件
        emit ComponentLoaded(msg.sender, _carTokenId, _componentTokenId);
    }

    function unload(uint _carTokenId, uint _componentTokenId) public {
        require(carNFT.ownerOf(_carTokenId) == msg.sender, "Not owner of car");
        require(lltComponent.getApproved(_componentTokenId) == address(this));
        address _carAddress = _account(address(carNFT), _carTokenId);
        lltComponent.safeTransferFrom(_carAddress, msg.sender, _componentTokenId);

        // 触发 ComponentUnloaded 事件
        emit ComponentUnloaded(msg.sender, _carTokenId, _componentTokenId);
    }
}
