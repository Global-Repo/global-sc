// SPDX-License-Identifier: Unlicensed
pragma solidity 0.6.12;

import './BEP20.sol';
import './Context.sol';
import './Ownable.sol';
import './Address.sol';
import './SafeBEP20.sol';
import './SafeMath.sol';
import './IBEP20.sol';
import './IMigratorChef.sol';
import './NativeToken.sol';
import './QuoteToken.sol';

// MasterChef is the master of our Native token. He can make Native tokens and he is a fair guy.
// Note that it's ownable and the owner wields tremendous power.
// Have fun reading it. Hopefully it's bug-free. God bless.
contract MasterChef is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of Native tokens
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accNativeTokenPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accNativeTokenPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        IBEP20 lpToken;           // Address of LP token contract.
        uint256 allocPoint;       // How many allocation points assigned to this pool. Native tokens to distribute per block.
        uint256 lastRewardBlock;  // Last block number that native tokens distribution occurs.
        uint256 accNativeTokenPerShare; // Accumulated Native tokens per share, times 1e12. See below.
    }

    // Our token {~Cake}
    NativeToken public nativeToken;

	// Quote Token {~SyrupBar}
    QuoteToken public quoteToken;

    // Dev address.
    address public devaddr;
    // Native tokens created per block.
    uint256 public nativeTokenPerBlock;
    // Bonus muliplier for early native tokens makers.
    uint256 public BONUS_MULTIPLIER = 1;
    // The migrator contract. It has a lot of power. Can only be set through governance (owner).
    IMigratorChef public migrator;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when Native tokens mining starts.
    uint256 public startBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        NativeToken _nativeToken,
        QuoteToken _quoteToken,
        address _devaddr,
        uint256 _nativeTokenPerBlock,
        uint256 _startBlock
    ) public {
        nativeToken = _nativeToken;
        quoteToken = _quoteToken;
        devaddr = _devaddr;
        nativeTokenPerBlock = _nativeTokenPerBlock;
        startBlock = _startBlock;

        // staking pool
        poolInfo.push(PoolInfo({
            lpToken: _nativeToken,
            allocPoint: 1000,
            lastRewardBlock: startBlock,
            accNativeTokenPerShare: 0
        }));

        totalAllocPoint = 1000;
    }
}