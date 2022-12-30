import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import chai from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";

const { BigNumber: BN } = ethers;
const { expect } = chai;

chai.use(solidity);

describe("Crowdfund", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, beneficiar1, beneficiar2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("Test", "TEST", '1000000');
    const Crowdfund = await ethers.getContractFactory("Crowdfund");
    const crowdfund = await Crowdfund.deploy(token.address); // FIXME: upgradeable (check that the contract matches requirements)

    return { token, crowdfund, owner, beneficiar1, beneficiar2 };
  }

  describe("Deployment", function () {
    it("creating projects", async function () {
      const { token, crowdfund, owner, beneficiar1, beneficiar2 } = await loadFixture(deployFixture);
      const tx1 = await crowdfund.newProject(ethers.utils.parseEther("1000"), beneficiar1.address);
      const tx2 = await crowdfund.newProject(ethers.utils.parseEther("2000"), beneficiar2.address);
      const [res1, res2] = [await tx1.wait(), await tx2.wait()];
      const event1 = res1.events[0];
      const event2 = res2.events[0];
      expect(event1.event).to.equal('NewProject');
      expect(event2.event).to.equal('NewProject');
      expect(event1.args.projectId).to.equal(ethers.BigNumber.from('0'));
      expect(event2.args.projectId).to.equal(ethers.BigNumber.from('1'));
      expect(event1.args.fundingGoal).to.equal(ethers.utils.parseEther("1000"));
      expect(event1.args.beneficiar).to.equal(beneficiar1.address);
      expect(event1.args.creator).to.equal(owner.address);
    });

  //   it("Should set the right owner", async function () {
  //     const { lock, owner } = await loadFixture(deployOneYearLockFixture);

  //     expect(await lock.owner()).to.equal(owner.address);
  //   });

  //   it("Should receive and store the funds to lock", async function () {
  //     const { lock, lockedAmount } = await loadFixture(
  //       deployOneYearLockFixture
  //     );

  //     expect(await ethers.provider.getBalance(lock.address)).to.equal(
  //       lockedAmount
  //     );
  //   });

  //   it("Should fail if the unlockTime is not in the future", async function () {
  //     // We don't use the fixture here because we want a different deployment
  //     const latestTime = await time.latest();
  //     const Lock = await ethers.getContractFactory("Lock");
  //     await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
  //       "Unlock time should be in the future"
  //     );
  //   });
  // });

  // describe("Withdrawals", function () {
  //   describe("Validations", function () {
  //     it("Should revert with the right error if called too soon", async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture);

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         "You can't withdraw yet"
  //       );
  //     });

  //     it("Should revert with the right error if called from another account", async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         "You aren't the owner"
  //       );
  //     });

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).not.to.be.reverted;
  //     });
  //   });

  //   describe("Events", function () {
  //     it("Should emit an event on withdrawals", async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw())
  //         .to.emit(lock, "Withdrawal")
  //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
  //     });
  //   });

  //   describe("Transfers", function () {
  //     it("Should transfer the funds to the owner", async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount]
  //       );
  //     });
  //   });
  });
});
