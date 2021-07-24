// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.6.12;

import "../ICakeMasterChef.sol";
import "../BEP20.sol";
import "../SafeMath.sol";
import "../SafeBEP20.sol";

contract CakeMasterChefMock is ICakeMasterChef {
    using SafeMath for uint256;
    using SafeBEP20 for BEP20;

    BEP20 private cakeToken;

    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    mapping(address => UserInfo) private userInfoInternal;

    uint private defaultReward = 1000000000000000000;

    constructor(address _cake) public {
        cakeToken = BEP20(_cake);
    }

    function userInfo(uint _pid, address _user) view external override returns (uint amount, uint rewardDebt) {
        return (userInfoInternal[_user].amount, userInfoInternal[_user].rewardDebt);
    }

    // Always 1 token of reward when stacking
    function enterStaking(uint256 _amount) public override {
        UserInfo storage user = userInfoInternal[msg.sender];

        cakeToken.safeTransferFrom(address(msg.sender), address(this), _amount);

        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.rewardDebt.add(defaultReward);
    }

    function leaveStaking(uint256 _amount) public override {
        UserInfo storage user = userInfoInternal[msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        cakeToken.mint(user.rewardDebt);
        cakeToken.safeTransfer(address(msg.sender), _amount.add(user.rewardDebt));

        user.rewardDebt = 0;
        user.amount = user.amount.sub(_amount);
    }
}