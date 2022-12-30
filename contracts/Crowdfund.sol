// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import { Token } from './Token.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

contract Crowdfund is Initializable {
    struct Project {
        uint256 fundingGoal;
        uint256 raised;
        address beneficiar;
        bool withdrawn;
    }

    /// The token used for crowdfunding.
    ///
    /// It would be better to use a separate token for each project, but that requires to change task formulation.
    Token public token;

    uint64 internal currentProjectId; // initializes to 0 (not explicit initialization to make contract upgradeable)

    /// projectId => Project
    mapping (uint64 => Project) public projects;

    /// projectId => (user => donated amount)
    mapping (uint64 => mapping (address => uint256)) public userDonated;

    /// The project with this `_projectId` was created.
    modifier saneProjectId(uint64 _projectId) {
        require(_projectId < currentProjectId, "no such project");
        _;
    }

    /// Run once on contract creation.
    function initialize(Token _token) public initializer {
        token = _token;
    }

    /// Generates new crowdfunding project, returns its ID in `NewProject` event.
    ///
    /// `_fundingGoal` - funding goal
    /// `_beneficiar` - who can receive the funds after funding goal is reached (can be different than invoker)
    function newProject(uint256 _fundingGoal, address _beneficiar) public {
        Project memory _project = Project({fundingGoal: _fundingGoal, raised: 0, beneficiar: _beneficiar, withdrawn: false});
        projects[currentProjectId] = _project;
        emit NewProject(currentProjectId, _fundingGoal, _beneficiar, msg.sender);
        ++currentProjectId;
    }

    /// Donate to the project `_projectId` amount `_amount`.
    ///
    /// Need to set allowance to the contract before calling this function.
    function donate(uint64 _projectId, uint256 _amount) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        unchecked { // overflowing token is not our responsibility
            _project.raised += _amount;
            userDonated[_projectId][msg.sender] += _amount;
        }
        emit Donate(_projectId, msg.sender, _amount);
        // Goes last to avoid reentrancy vulnerability:
        token.transferFrom(msg.sender, address(this), _amount);
    }

    /// Withdraw all funds from `_projectId` to its beneficiar.
    function withdraw(uint64 _projectId) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        require(_project.raised >= _project.fundingGoal, "not reached funding goal");
        require(msg.sender == _project.beneficiar, "not you are the beneficiar");
        require(!_project.withdrawn, "already withdrawn");
        emit Withdraw(_projectId, msg.sender, _project.raised);
        uint256 _raised = _project.raised;
        _project.withdrawn = true; // prevent repeated withdrawal
        // Goes last to avoid reentrancy vulnerability:
        token.transfer(msg.sender, _raised);
    }

    /// Refund the caller's donations for `_projectId`.
    function refund(uint64 _projectId) public saneProjectId(_projectId) {
        Project storage _project = projects[_projectId];
        require(_project.raised < _project.fundingGoal, "can't refund");
        require(!_project.withdrawn, "already withdrawn");
        uint256 _amount = userDonated[_projectId][msg.sender];
        unchecked { // overflowing token is not our responsibility
            _project.raised -= _amount;
        }
        userDonated[_projectId][msg.sender] = 0; // prevent repeated refund
        emit Refund(_projectId, msg.sender, _amount);
        // Goes last to avoid reentrancy vulnerability:
        token.transfer(msg.sender, _amount);
    }

    event NewProject(uint64 projectId, uint256 fundingGoal, address beneficiar, address creator);
    event Donate(uint64 projectId, address donor, uint256 amount);
    event Withdraw(uint64 projectId, address beneficiar, uint256 amount);
    event Refund(uint64 projectId, address donor, uint256 amount);
}
