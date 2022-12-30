import { HardhatUserConfig } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import 'hardhat-deploy';
import '@openzeppelin/hardhat-upgrades';

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    }
  },
};

export default config;
