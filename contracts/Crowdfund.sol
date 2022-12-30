// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import { Token } from './Token.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

contract Crowdfund {
    using SafeERC20 for Token;

    struct Project {
        uint256 fundingGoal;
        uint256 raised;
        address beneficiar;
    }

    // It would be better to use a separate token for each project, but that requires to change task formulation.
    Token public token;

    uint64 internal currentProjectId = 0;

    mapping (uint64 => Project) public projects; // projectId => Project

    mapping (uint64 => mapping (address => uint256)) public userDonated; // projectId => (user => amount)

    modifier saneProjectId(uint64 _projectId) {
        require(_projectId < currentProjectId, "no such project");
        _;
    }

    constructor(Token _token) {
        token = _token;
    }

    function newProject(uint256 _fundingGoal, address _beneficiar) public {
        Project memory _project = Project({fundingGoal: _fundingGoal, raised: 0, beneficiar: _beneficiar});
        projects[currentProjectId] = _project;
        emit NewProject(currentProjectId, _fundingGoal, _beneficiar, msg.sender);
        ++currentProjectId;
    }

    // need to set allowance before calling this function
    function donate(uint64 _projectId, uint256 _amount) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        unchecked { // overflowing token is not our responsibility
            _project.raised += _amount;
            userDonated[_projectId][msg.sender] += _amount;
        }
        emit Donate(_projectId, msg.sender, _amount);
        // Goes last to avoid reentrancy vulnerability:
        token.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function withdraw(uint64 _projectId) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        require(_project.raised >= _project.fundingGoal, "not reached funding goal");
        require(msg.sender == _project.beneficiar, "not you are the beneficiar");
        emit Withdraw(_projectId, msg.sender, _project.raised);
        // Goes last to avoid reentrancy vulnerability:
        token.safeTransfer(msg.sender, _project.raised); // FIXME
    }

    function refund(uint64 _projectId) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        require(_project.raised < _project.fundingGoal, "can't refund");
        uint256 _amount = userDonated[_projectId][msg.sender];
        userDonated[_projectId][msg.sender] = 0;
        emit Refund(_projectId, msg.sender, _amount);
        // Goes last to avoid reentrancy vulnerability:
        token.safeTransfer(msg.sender, _amount);
    }

    event NewProject(uint64 projectId, uint256 fundingGoal, address beneficiar, address creator);
    event Donate(uint64 projectId, address donor, uint256 amount);
    event Withdraw(uint64 projectId, address beneficiar, uint256 amount);
    event Refund(uint64 projectId, address donor, uint256 amount);
}
