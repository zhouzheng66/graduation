const { ethers } = require("ethers");
/**
 * 通过合约实例生成 calldata（推荐）
 * @param {Contract} contract - ethers 合约实例
 * @param {string} functionName - 要调用的函数名称
 * @param {Array} args - 函数参数数组
 * @returns {string|{error: string}} 成功返回 calldata，失败返回错误对象
 */
function generateCalldataFromContract(contract, functionName, args) {
  try {
    // 获取函数片段（Fragment）
    const fragment = contract.interface.getFunction(functionName);
    if (!fragment) {
      return { error: `合约中未找到函数: ${functionName}` };
    }

    // 验证参数数量
    if (fragment.inputs.length !== args.length) {
      return {
        error: `参数数量不匹配，需要 ${fragment.inputs.length} 个参数，收到 ${args.length} 个`,
      };
    }

    // 生成 calldata
    return contract.interface.encodeFunctionData(fragment, args);
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * 通过 ABI 签名手动生成 calldata
 * @param {string} functionSignature - 函数签名（例如 "transfer(address,uint256)"）
 * @param {Array} params - 函数参数数组
 * @returns {string|{error: string}} 成功返回 calldata，失败返回错误对象
 */
function generateCalldataFromABI(functionSignature, params) {
  try {
    // v6 新方法获取选择器
    const selector = ethers.id(functionSignature).slice(0, 10); // 取前4字节（8个十六进制字符）

    const coder = ethers.AbiCoder.defaultAbiCoder();

    // 解析参数类型
    const paramTypes = functionSignature
      .split("(")[1]
      .replace(")", "")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    // 编码参数
    const encodedArgs = coder.encode(paramTypes, params);

    return selector + encodedArgs.slice(2);
  } catch (error) {
    return { error: error.message };
  }
}

// 使用示例 ----------------------------------------------------------------
/*
const { ethers } = require("hardhat");

async function exampleUsage() {
  // 示例1：通过合约实例生成
  const ERC20 = await ethers.getContractFactory("ERC20");
  const erc20 = await ERC20.deploy("MyToken", "MTK");
  
  const result1 = generateCalldataFromContract(
    erc20,
    "transfer",
    ["0x...", 100]
  );
  
  if (result1.error) {
    console.error("错误:", result1.error);
  } else {
    console.log("Calldata:", result1);
  }

  // 示例2：通过原始ABI生成
  const result2 = generateCalldataFromABI(
    "swap(uint256,address,bytes)",
    [100, "0x...", "0xabcd"]
  );
  
  if (result2.error) {
    console.error("错误:", result2.error);
  } else {
    console.log("Calldata:", result2);
  }
}
*/

module.exports = {
  generateCalldataFromContract,
  generateCalldataFromABI,
};
