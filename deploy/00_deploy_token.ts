import { ethers } from "hardhat";

const { parseEther } = ethers.utils;

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    await deploy('Token', {
      from: deployer,
      args: ['Test', 'TST', parseEther('1000000')],
      log: true,
    });
  };
  module.exports.tags = ['Token'];