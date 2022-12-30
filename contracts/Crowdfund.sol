// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import { Token } from './Token.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

contract Crowdfund {
    using SafeERC20 for Token;

    struct Project {
        uint256 fundingGoal;
        uint64 fundingDeadline; // seconds since epoch
        uint256 raised;
        address beneficiar;
    }

    Token public token;

    uint64 internal currentProjectId = 0;

    mapping (uint64 => Project) public projects; // projectId => Project

    mapping (uint64 => mapping (address => uint256)) public userDonated; // projectId => (user => amount)

    modifier saneProjectId(uint64 _projectId) {
        require(_projectId < currentProjectId, "no such project");
        _;
    }

    function beforeDeadline(Project storage _project) internal view {
        require(block.timestamp <= _project.fundingDeadline, "must be before deadline");
    }

    function afterDeadline(Project storage _project) internal view {
        require(block.timestamp > _project.fundingDeadline, "must be after deadline");
    }

    function newProject(uint256 _fundingGoal, uint64 _fundingDeadline, address _beneficiar) public {
        Project memory _project = Project({fundingGoal: _fundingGoal, fundingDeadline: _fundingDeadline, raised: 0, beneficiar: _beneficiar});
        projects[currentProjectId++] = _project;
    }

    // need to set allowance before calling this function
    function donate(uint64 _projectId, uint256 _amount) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        beforeDeadline(_project);
        unchecked { // overflowing token is not our responsibility
            _project.raised += _amount;
            userDonated[_projectId][msg.sender] += _amount;
        }
        // Goes last to avoid reentrancy vulnerability:
        token.safeTransfer(address(this), _amount);
    }

    function withdraw(uint64 _projectId) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        afterDeadline(_project);
        require(_project.raised >= _project.fundingGoal, "not reached funding goal");
        require(msg.sender == _project.beneficiar, "not you are the beneficiar");
        // Goes last to avoid reentrancy vulnerability:
        token.safeTransfer(msg.sender, _project.raised);
    }

    function refundPledged(uint64 _projectId) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        afterDeadline(_project);
        require(_project.raised < _project.fundingGoal, "can't refund");
        uint256 _amount = userDonated[_projectId][msg.sender];
        userDonated[_projectId][msg.sender] = 0;
        // Goes last to avoid reentrancy vulnerability:
        token.safeTransfer(msg.sender, _amount);
    }
}
