import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { Token } from "@uniswap/sdk";

import IUniswapV2Factory from "@uniswap/v2-core/build/IUniswapV2Factory.json";
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  try {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;
    const chainId = (await ethers.provider.getNetwork()).chainId;

    await deploy("TestEth", {
      from: deployer,
      // Contract constructor arguments
      args: ["Test Eth", "tEth"],
      log: true,
      // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
      // automatically mining the contract deployment transaction. There is no effect on live networks.
      autoMine: true,
    });

    await deploy("LToken", {
      from: deployer,
      // Contract constructor arguments
      args: ["Light Token", "lToken"],
      log: true,
      // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
      // automatically mining the contract deployment transaction. There is no effect on live networks.
      autoMine: true,
    });

    // Get the deployed contract
    const teth = await hre.ethers.getContract("TestEth", deployer);
    const ltoken = await hre.ethers.getContract("LToken", deployer);

    const tethBalance = ethers.utils.parseUnits("5000", 18);
    await teth.transfer(deployer, tethBalance);

    const ltokenBalance = ethers.utils.parseUnits("5000", 18);
    await ltoken.transfer(deployer, ltokenBalance);

    console.log("transfer successful");

    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || "";
    const wallet = new ethers.Wallet(privateKey, ethers.provider);

    // Add liquidity pool for the two tokens

    const tokenIn = new Token(chainId, teth.address, 18, "tEth");
    const tokenOut = new Token(chainId, ltoken.address, 18, "lToken");

    const factory = new ethers.Contract("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", IUniswapV2Factory.abi, wallet);

    // Create the pair using the factory contract
    const tx = await factory.createPair(tokenIn.address, tokenOut.address);
    await tx.wait();

    const uniswapRouter = new ethers.Contract(
      "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008",
      IUniswapV2Router02.abi,
      wallet,
    );

    await teth.approve(uniswapRouter.address, ethers.constants.MaxUint256);

    await ltoken.approve(uniswapRouter.address, ethers.constants.MaxUint256);

    const addLiquidityTx = await uniswapRouter.addLiquidity(
      teth.address,
      ltoken.address,
      ethers.utils.parseUnits("1000", 18),
      ethers.utils.parseUnits("1000", 18),
      0,
      0,
      deployer,
      Math.floor(Date.now() / 1000) + 1000, // Set a deadline for the transaction
    );

    await addLiquidityTx.wait();

    console.log("Liquidity pool added successfully!");
  } catch (error) {
    console.log(error);
  }
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["TestEth", "LToken"];
