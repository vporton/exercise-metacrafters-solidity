import { ethers } from "hardhat";

const { parseEther } = ethers.utils;

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const token = await deployments.get('Token');
    await deploy('Crowdfund', {
      from: deployer,
      log: true,
      proxy: {
        init: {
          methodName: 'initialize',
          args: [token.address]
        },
      },
    });
  };
  module.exports.tags = ['Crowdfund'];
  module.exports.dependencies = ['Token'];
  