import { HardhatUserConfig } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  // FIXME: Remove.
  // networks: {
  //   hardhat: {
  //     accounts: [
  //       {
  //         privateKey: "2366a48160bcc5f0cef8bbace95928130d3aabe972475cea2c1b978ebcad4212", // 0xe9243658aFAD5CEAd2e6ca3C0E44087EcA1D11A3
  //         balance: String(10**18),
  //       },
  //       {
  //         privateKey: "a2b5cb0d7b997d05fe8ff16954b3ba3df83aec81ccc24ff0cb41033b8330f010", // 0x12aE7fb493767382783a2056CceF1e03B549EE86
  //         balance: String(10**18),
  //       },
  //       {
  //         privateKey: "faa700a6c527989ac18d7b93470b75296547ad7ba9065f7ae1f0fbf495a46a92", // 0x2DB4da763b2267C6C68511d659D9ebA8b6e5039c
  //         balance: String(10**18),
  //       },
  //       {
  //         privateKey: "0dffcc18827769452ba8714059f1f8af507d6577099abc86f32826e77be6b14d", // 0xAbdfAaA77104e8F2dC2Be965EC7412dbCb18Ce63
  //         balance: String(10**18),
  //       },
  //       {
  //         privateKey: "01bc4e70bd5bd7461c5db8bcd5bc84c4986df3c373e2c5cbae08860a49ebd194", // 0xC1E9D63fB4B49Fb9c4bD733E82A159DAd8A6caC6
  //         balance: String(10**18),
  //       },
  //     ],
  //   },
  // },
};

export default config;
