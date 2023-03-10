import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import chai from "chai";
import { ethers, upgrades } from "hardhat";
import { solidity } from "ethereum-waffle";

const { BigNumber: BN } = ethers;
const { parseEther } = ethers.utils;
const { expect } = chai;

chai.use(solidity);

const UINT256_MAX = BN.from(2).pow(BN.from(256)).sub(BN.from(1));

describe("Crowdfund", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, beneficiar1, beneficiar2, donor1, donor2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("Test", "TEST", parseEther('1000000'));
    const Crowdfund = await ethers.getContractFactory("Crowdfund");
    // const crowdfund = await Crowdfund.deploy(token.address); // FIXME: upgradeable (check that the contract matches requirements)
    const crowdfund = await upgrades.deployProxy(Crowdfund, [token.address]);

    return { token, crowdfund, owner, beneficiar1, beneficiar2, donor1, donor2 };
  }

  describe("Deployment", function () {
    it("creating projects", async function () {
      const { token, crowdfund, owner, beneficiar1, beneficiar2 } = await loadFixture(deployFixture);
      const tx1 = await crowdfund.newProject(parseEther("1000"), beneficiar1.address);
      const tx2 = await crowdfund.newProject(parseEther("2000"), beneficiar2.address);
      const [res1, res2] = [await tx1.wait(), await tx2.wait()];
      const event1 = res1.events[0];
      const event2 = res2.events[0];
      expect(event1.event).to.equal('NewProject');
      expect(event2.event).to.equal('NewProject');
      expect(event1.args.projectId).to.equal(BN.from('0'));
      expect(event2.args.projectId).to.equal(BN.from('1'));
      expect(event1.args.fundingGoal).to.equal(parseEther("1000"));
      expect(event1.args.beneficiar).to.equal(beneficiar1.address);
      expect(event1.args.creator).to.equal(owner.address);
    });

    it("withdrawal by the beneficiar", async function () {
      const { token, crowdfund, owner, beneficiar1, beneficiar2, donor1, donor2 } = await loadFixture(deployFixture);
      const projectTx = await crowdfund.newProject(parseEther("1000"), beneficiar1.address);
      const projectId = BN.from(0);
      const donorRichness = parseEther('10000');
      const fundTx1 = await token.transfer(donor1.address, donorRichness);
      const fundTx2 = await token.transfer(donor2.address, donorRichness);
      const allowTx1 = await token.connect(donor1).approve(crowdfund.address, UINT256_MAX);
      const allowTx2 = await token.connect(donor2).approve(crowdfund.address, UINT256_MAX);
      await projectTx.wait(), await fundTx1.wait(), await fundTx2.wait(), await allowTx1.wait(), await allowTx2.wait();
      const donateTx1 = await crowdfund.connect(donor1).donate(projectId, parseEther('700'));
      const donateTx2 = await crowdfund.connect(donor1).donate(projectId, parseEther('50'));
      const donateTx3 = await crowdfund.connect(donor2).donate(projectId, parseEther('800'));
      await donateTx1.wait(), await donateTx2.wait(), await donateTx3.wait();

      // Refund should fail, as we reached the goal:
      async function refund() {
        await crowdfund.connect(beneficiar1).refund(projectId);
      }
      await expect(refund()).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'can't refund'");

      // Withdrawal not by the donor:
      async function hackerWithdraw() {
        await crowdfund.connect(owner).withdraw(projectId);
      }
      await expect(hackerWithdraw()).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'not you are the beneficiar'");

      expect(await token.balanceOf(donor1.address)).to.equal(donorRichness.sub(BN.from(parseEther('750'))));
      const withdrawTx = await crowdfund.connect(beneficiar1).withdraw(projectId);
      await withdrawTx.wait();
      expect(await token.balanceOf(beneficiar1.address)).to.equal(parseEther('1550'));

      // No repeated withdrawal, even if other donor donated something:
      async function withdraw2() {
        await crowdfund.connect(beneficiar1).withdraw(projectId);
      }
      await expect(withdraw2()).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'already withdrawn'");
    });

    it("refund by a donor", async function () {
      const { token, crowdfund, owner, beneficiar1, beneficiar2, donor1, donor2 } = await loadFixture(deployFixture);
      const projectTx = await crowdfund.newProject(parseEther("1000"), beneficiar1.address);
      const projectId = BN.from(0);
      const donorRichness = parseEther('10000');
      const fundTx1 = await token.transfer(donor1.address, donorRichness);
      const fundTx2 = await token.transfer(donor2.address, donorRichness);
      const allowTx1 = await token.connect(donor1).approve(crowdfund.address, UINT256_MAX);
      const allowTx2 = await token.connect(donor2).approve(crowdfund.address, UINT256_MAX);
      await projectTx.wait(), await fundTx1.wait(), await fundTx2.wait(), await allowTx1.wait(), await allowTx2.wait();
      const donateTx1 = await crowdfund.connect(donor1).donate(projectId, parseEther('70'));
      const donateTx2 = await crowdfund.connect(donor1).donate(projectId, parseEther('30'));
      const donateTx3 = await crowdfund.connect(donor2).donate(projectId, parseEther('200'));
      await donateTx1.wait(), await donateTx2.wait(), await donateTx3.wait();

      expect(await token.balanceOf(donor1.address)).to.equal(donorRichness.sub(BN.from(parseEther('100'))));
      const withdrawTx = await crowdfund.connect(donor1).refund(projectId);
      await withdrawTx.wait();
      expect(await token.balanceOf(donor1.address)).to.equal(donorRichness); // richness returned to the previous state
      expect((await crowdfund.projects(projectId)).raised).to.equal(parseEther('200')); // only donor2 donations remained.
      expect((await crowdfund.userDonated(projectId, donor1.address))).to.equal(0); // donor1 refunded

      // Second refund refunds zero, even if other donor donated something:
      const withdrawTx2 = await crowdfund.connect(donor1).refund(projectId);
      await withdrawTx2.wait();
      expect(await token.balanceOf(donor1.address)).to.equal(donorRichness); // second refund withdraws zero
    });

    // Withdrawal after refund (and yet a user donated) is possible, not testing it.

    it("impossible refund after withdrawal", async function () {
      const { token, crowdfund, owner, beneficiar1, beneficiar2, donor1, donor2 } = await loadFixture(deployFixture);
      const projectTx = await crowdfund.newProject(parseEther("20"), beneficiar1.address);
      const projectTx2 = await crowdfund.newProject(parseEther("20"), beneficiar1.address);
      const projectId = BN.from(0);
      const projectId2 = BN.from(1);
      const donorRichness = parseEther('10000');
      const fundTx1 = await token.transfer(donor1.address, donorRichness);
      const fundTx2 = await token.transfer(donor2.address, donorRichness);
      const allowTx1 = await token.connect(donor1).approve(crowdfund.address, UINT256_MAX);
      const allowTx2 = await token.connect(donor2).approve(crowdfund.address, UINT256_MAX);
      await projectTx.wait(), await projectTx2.wait(), await fundTx1.wait(), await fundTx2.wait(), await allowTx1.wait(), await allowTx2.wait();
      const donateTx1 = await crowdfund.connect(donor1).donate(projectId, parseEther('30'));
      await donateTx1.wait();
      const withdrawTx = await crowdfund.connect(beneficiar1).withdraw(projectId);
      await withdrawTx.wait();
      const donateTx3 = await crowdfund.connect(donor1).donate(projectId2, parseEther('200'));
      await donateTx3.wait();

      // impossible refund
      async function refund() {
        await crowdfund.connect(donor1).refund(projectId);
      }
      await expect(refund()).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'can't refund'");
    });
  });
});

