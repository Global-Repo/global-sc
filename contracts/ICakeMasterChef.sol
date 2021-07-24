// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

interface ICakeMasterChef {
    function userInfo(uint _pid, address _account) view external returns(uint amount, uint rewardDebt);
    function enterStaking(uint256 _amount) external;
    function leaveStaking(uint256 _amount) external;
}