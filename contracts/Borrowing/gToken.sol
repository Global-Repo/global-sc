// For BeGlobal

pragma solidity 0.8.16;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

interface IGToken is IERC20Metadata {
    // actions
    function mint(uint256 amountUnderlying) external;
    function redeem(uint256 amount) external;
    function borrow(uint256 amount, bool isVar) external;
    function repayBorrow(uint256 amount, bool isVar) external;
    function liquidateBorrow(address borrower, uint repayAmount, bool isVar, IGToken gTokenCollateral) external;
    function seize(address liquidator, address borrower, uint seizeAmount) external;
    function swapRateMode(uint amount, bool toVa) external;
    function accrueInterest() external;
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

interface IController {
  function mintAllowed(address gToken) external view returns (bool);
  function redeemAllowed(address gToken, address redeemer, uint redeemAmount) external view returns (bool);
  function borrowAllowed(address gToken, address borrower, uint borrowAmount) external view returns (bool);
  function repayBorrowAllowed(address gToken) external view returns (bool);
  function transferAllowed(address gToken, address sender, uint amount) external view returns (bool);
  function seizeAllowed(address currentToken, address seizerToken) external view returns (bool);
  function liquidateBorrowAllowed(address currentToken, address gCollateral, address borrower, uint repayAmount) external view returns (bool);
  function flashLoanAllowed(address gtokenAddress) external view returns (bool);
  function debtStatusUpdate(address user, bool isAdd) external returns (bool);

  function getPrice(address gToken) external view returns (uint);
  function feeReduction(address user) external view returns (uint);
  function maxLiquidatableRepayForAToken(address borrower, address collateral, address repayGToken) external view returns (uint);
  function liquidateCalculateSeizeTokens(address currentToken, address gCollateral, uint repayAmount) external view returns (uint);
  function calculateValue(address gToken, uint amount) external view returns (uint);
  function toggleCollateral(address user) external returns (bool);
  function isCollateralized(address user, address gToken) external view returns (bool);
  function liquidationFee() external view returns (uint);
  function feeDivision() external view returns (uint);
  function treasury() external view returns (address);
  function reserveFactor() external view returns (uint);
  function flashloanFee() external view returns (uint);
}

interface IInterestRateModel {
    function getBorrowVarRate(uint cash, uint borrows, uint reserves) external view returns (uint);
    function getBorrowFixedRate(uint cash, uint borrows, uint reserves) external view returns (uint);
}

interface IFlashLoanReceiver {
  function executeOperation(
    address asset,
    uint amount,
    uint premium,
    address initiator,
    bytes calldata params
  ) external returns (bool);
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _setOwner(_msgSender());
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        _setOwner(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _setOwner(newOwner);
    }

    function _setOwner(address newOwner) private {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }
}

library Address {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCall(target, data, "Address: low-level call failed");
    }

    function functionCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        require(isContract(target), "Address: call to non-contract");

        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    function functionStaticCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");

        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    function functionDelegateCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");

        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }

    function verifyCallResult(
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) internal pure returns (bytes memory) {
        if (success) {
            return returndata;
        } else {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly

                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

library SafeERC20 {
    using Address for address;

    function safeTransfer(
        IERC20 token,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(data, "SafeERC20: low-level call failed");
        if (returndata.length > 0) {
            // Return data is optional
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

contract GTokenTemplate is Context, IGToken, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18; // very important, all gToken has to be 18 decimals
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual {
        bool allowed = controller.transferAllowed(address(this), sender, amount);
        require(allowed, 'this amount is not allowed');
        _raw_transfer(sender, recipient, amount);
    }

    function _raw_transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[sender] = senderBalance - amount;
        }
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
        emit Mint(account, amount, exchangeRate());
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);
        emit Redeem(account, amount, exchangeRate());
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    // --------------------------------
    // CUSTOM:
    // --------------------------------

    struct borrowReceipt {
      uint amountVar;
      uint amountFixed;
      uint interestIndex; // for variable interest
      uint fixedRate; // Per block
      uint lastUpdate; // block
    }

    // custom variables
    IERC20 public supplyToken;
    IController public controller;
    IInterestRateModel public interestRateModel;
    mapping(address => borrowReceipt) public borrowed;
    uint256 public totalVarBorrows;
    uint256 public totalFixedBorrows;
    uint256 public avgFixedRatePerBlock;
    uint256 public reserve;
    uint256 public accrualBlockNumber;
    uint256 public borrowIndexVar;

    event Mint(address indexed to, uint256 value, uint256 rate);
    event Redeem(address indexed to, uint256 value, uint256 rate);
    event Borrow(address indexed to, uint256 value, bool isVar);
    event RepayBorrow(address indexed to, uint256 value);
    event LiquidateBorrow(address indexed liquidator, address indexed borrower, uint repayAmount, address collateral, uint seizeCollateralAmount);
    event AccrueInterest(uint totalVarBorrows, uint totalFixedBorrows, uint borrowIndexVar, uint avgFixedRate, uint reserve);
    event FlashLoan(address borrower, uint amount, uint expected);
    event ToggleCollateral(address user, bool to);
    event ChangeInterestRateModel(address newModel);

    constructor(string memory name_, string memory symbol_, address supplyToken_, address controller_, address interestRateModel_) {
        _name = name_;
        _symbol = symbol_;
        supplyToken = IERC20(supplyToken_);
        controller = IController(controller_);
        interestRateModel = IInterestRateModel(interestRateModel_);
        accrualBlockNumber = getBlockNumber();
        borrowIndexVar = 1e18;
    }

    // --------------------------------
    // FOLLOWING ALL CUSTOMIZED VIEW METHOD
    // --------------------------------

    function getBlockNumber() public view returns (uint) {
        return block.number;
    }

    // debts in underlying token
    function debts(address user) public view returns (uint) {
      return borrowed[user].amountVar + borrowed[user].amountFixed;
    }

    function totalBorrows() public view returns (uint) {
      return totalVarBorrows + totalFixedBorrows;
    }

    function borrowVarRatePerBlock() public view returns (uint) {
        return interestRateModel.getBorrowVarRate(getCashPrior(), totalBorrows(), reserve);
    }

    function borrowFixedRatePerBlock() public view returns (uint) {
        return interestRateModel.getBorrowFixedRate(getCashPrior(), totalBorrows(), reserve);
    }

    // need to consider the reserve rate
    function supplyRatePerBlock() public view returns (uint) {
      uint borrows = totalBorrows();
      if (borrows == 0 || totalSupply() == 0) {
        return 0;
      }
      uint borrowVarPercent = totalVarBorrows * 1e18 / borrows;
      uint borrowFixedPercent = totalFixedBorrows * 1e18 / borrows;
      uint totalRate = (borrowVarRatePerBlock() * borrowVarPercent + avgFixedRatePerBlock * borrowFixedPercent) / 1e18;
      uint totalRateAfter = totalRate * (1e18 - controller.reserveFactor()) / 1e18;
      return borrows * totalRateAfter / gTokenToAmount(totalSupply());
    }

    function getCashPrior() public view returns (uint) {
        return supplyToken.balanceOf(address(this));
    }

    function getCashMinusReserve() public view returns (uint) {
        return getCashPrior() - reserve;
    }

    // does not include the reserve
    function exchangeRate() public view returns (uint) {
      if (_totalSupply == 0) {
        return 1e18;
      } else {
        return (getCashMinusReserve() + totalBorrows()) * 1e18 / _totalSupply;
      }
    }

    function assetUSDValue(address user) public view returns (uint) {
      uint underlying = gTokenToAmount(balanceOf(user));
      return controller.calculateValue(address(this), underlying);
    }

    function debtsUSDValue(address user) external view returns (uint) {
      return controller.calculateValue(address(this), debts(user));
    }

    function gTokenToAmount(uint256 gTokenAmount) public view returns (uint256) {
      return gTokenAmount * exchangeRate() / 1e18;
    }

    function amountToGToken(uint256 amount) public view returns (uint256) {
      return amount * 1e18 / exchangeRate();
    }

    function addAvgFixedRate (uint added, uint addRate) public view returns (uint) {
      return rateAddImpact(totalFixedBorrows, added, avgFixedRatePerBlock, addRate);
    }

    function removeAvgFixedRate (uint removed, uint removedRate) public view returns (uint) {
      return rateRemoveImpact(totalFixedBorrows, removed, avgFixedRatePerBlock, removedRate);
    }

    // return r3
    function rateAddImpact(uint x1, uint x2, uint r1, uint r2) public pure returns (uint) {
      uint total = x1 + x2;
      return ((x1 * 1e18 / total) * r1 + (x2 * 1e18 / total) * r2) / 1e18;
    }

    // reverse rateAddImpact formula, remove x2
    function rateRemoveImpact(uint total, uint x2, uint r3, uint r2) public pure returns (uint) {
      uint x1 = total - x2;
      if (x1 == 0) {
        return 0;
      }
      return (r3 - (x2 * 1e18 / total) * r2 / 1e18) * 1e18 / (x1 * 1e18 / total);
    }

    // For off-chain tracking
    function userInfo(address user) external view returns (
      uint _gTokenBalance,
      uint _tokenBalance,
      uint _supplyRatePerBlock,
      uint _borrowFixedRatePerBlock,
      uint _borrowVarRatePerBlock,
      bool _isCollateralized,
      uint _assetUSDValue,
      uint _price,
      uint _borrowedFixed,
      uint _borrowedVariable,
      uint _myFixedRate,
      uint _exchangeRate,
      uint _liquidity
      ) {
      _gTokenBalance = balanceOf(user);
      _tokenBalance = supplyToken.balanceOf(user);
      _supplyRatePerBlock = supplyRatePerBlock();
      _borrowFixedRatePerBlock = borrowFixedRatePerBlock();
      _borrowVarRatePerBlock = borrowVarRatePerBlock();
      _isCollateralized = controller.isCollateralized(user, address(this));
      _assetUSDValue = assetUSDValue(user);
      _borrowedFixed = borrowed[user].amountFixed;
      _borrowedVariable = borrowed[user].amountVar;
      _price = controller.getPrice(address(this));
      _myFixedRate = borrowed[user].fixedRate;
      _exchangeRate = exchangeRate();
      _liquidity = getCashMinusReserve();
    }

    // --------------------------------
    // FOLLOWING ALL CUSTOMIZED ACTION METHODS
    // --------------------------------

    function mint(uint256 supplyAmount) external accrue nonReentrant {
      require(supplyAmount > 0, 'can not mint 0');
      bool allowed = controller.mintAllowed(address(this));
      require(allowed, 'mint not allowed');

      // order important here
      _mint(_msgSender(), amountToGToken(supplyAmount));
      supplyToken.safeTransferFrom(_msgSender(), address(this), supplyAmount);
    }

    function redeem(uint gTokenAmount) external accrue nonReentrant {
      require(gTokenAmount > 0, "can not redeem 0");
      bool allowed = controller.redeemAllowed(address(this), _msgSender(), gTokenToAmount(gTokenAmount));
      require(allowed, 'redeem not allowed');

      // order important here
      supplyToken.safeTransfer(_msgSender(), gTokenToAmount(gTokenAmount));
      _burn(_msgSender(), gTokenAmount);
    }

    function borrow(uint256 amount, bool isVar) external accrue nonReentrant {
      require(amount > 0, "can not borrow 0");
      bool allowed = controller.borrowAllowed(address(this), _msgSender(), amount);
      require(allowed, 'borrow not allowed');
      require(getCashMinusReserve() >= amount, "protocol has insufficient cash");
      address borrower = _msgSender();

      _borrowBalanceUpdate(borrower);
      if (isVar) {
        // _borrowBalanceUpdate had dealt with borrow index in variable loan
        borrowed[borrower].amountVar += amount;
        totalVarBorrows += amount;
      } else {
        borrowed[borrower].fixedRate = rateAddImpact(borrowed[borrower].amountFixed, amount, borrowed[borrower].fixedRate, borrowFixedRatePerBlock());
        avgFixedRatePerBlock = addAvgFixedRate(amount, borrowFixedRatePerBlock());
        borrowed[borrower].amountFixed += amount;
        totalFixedBorrows += amount;
      }

      controller.debtStatusUpdate(borrower, true);
      supplyToken.safeTransfer(borrower, amount);
      emit Borrow(borrower, amount, isVar);
    }

    // repay amount in supplyToken
    function repayBorrow(uint repayAmount, bool isVar) external accrue {
      _borrowBalanceUpdate(_msgSender());
      _repayBorrow(_msgSender(), _msgSender(), repayAmount, isVar);
    }

    function repayAllWithMode(bool isVar) external accrue {
      address borrower = _msgSender();
      _borrowBalanceUpdate(borrower);
      uint repayAmount;
      if (isVar) {
        repayAmount = borrowed[borrower].amountVar;
      } else {
        repayAmount = borrowed[borrower].amountFixed;
      }
      _repayBorrow(_msgSender(), _msgSender(), repayAmount, isVar);
    }

    function repayAll() external accrue {
      address borrower = _msgSender();
      require(debts(borrower) > 0, 'You have nothing to repay');
      _borrowBalanceUpdate(borrower);
      uint repayAmountVar = borrowed[borrower].amountVar;
      uint repayAmountFixed = borrowed[borrower].amountFixed;
      if (repayAmountVar > 0) {
        _repayBorrow(_msgSender(), _msgSender(), repayAmountVar, true);
      }
      if (repayAmountFixed > 0) {
        _repayBorrow(_msgSender(), _msgSender(), repayAmountFixed, false);
      }
    }

    // _borrowBalanceUpdate has to be called before calling this
    function _repayBorrow(address payer, address borrower, uint repayAmount, bool isVar) internal nonReentrant {
      require(repayAmount > 0, "can not repay 0");
      bool allowed = controller.repayBorrowAllowed(address(this));
      require(allowed, 'repay not allowed');

      supplyToken.safeTransferFrom(payer, address(this), repayAmount);

      if (isVar) {
        require(borrowed[borrower].amountVar >= repayAmount, "you pay more than you borrowed");
        borrowed[borrower].amountVar -= repayAmount;
        if (repayAmount > totalVarBorrows) { // solve the problem last withdrawer may encounter
          totalVarBorrows = 0;
        } else {
          totalVarBorrows -= repayAmount;
        }
      } else {
        require(borrowed[borrower].amountFixed >= repayAmount, "you pay more than you borrowed");
        borrowed[borrower].amountFixed -= repayAmount;
        avgFixedRatePerBlock = removeAvgFixedRate(repayAmount, borrowed[borrower].fixedRate);
        totalFixedBorrows -= repayAmount;
        if (borrowed[borrower].amountFixed == 0) {
          borrowed[borrower].fixedRate = 0;
        }
      }

      if (borrowed[borrower].amountVar == 0 && borrowed[borrower].amountFixed == 0) {
        controller.debtStatusUpdate(borrower, false);
      }
      emit RepayBorrow(borrower, repayAmount);
    }

    // it can not be called by a non-Gtoken contract
    function seize(address liquidator, address borrower, uint seizeAmount) external {
      _seize(_msgSender(), liquidator, borrower, seizeAmount);
    }
    // liquidator != borrower check elsewhere. SeizeAmount in gToken
    // seizerToken is the borrowed asset related gToken, not necessarily is the collateral gToken
    function _seize(address seizerToken, address liquidator, address borrower, uint seizeAmount) internal {
      bool allowed = controller.seizeAllowed(address(this), seizerToken);
      require(allowed, 'seize not allowed');

      uint protocolFeeRaw = seizeAmount * controller.liquidationFee() / controller.feeDivision();
      uint protocolFeeReduced = protocolFeeRaw * controller.feeReduction(borrower) / 1e18;
      uint liquidiatorAmount = seizeAmount - protocolFeeRaw;
      // seizing action does not require redeem checking
      _raw_transfer(borrower, liquidator, liquidiatorAmount);
      _raw_transfer(borrower, controller.treasury(), protocolFeeRaw - protocolFeeReduced);
    }

    function liquidateBorrowMax(address borrower, IGToken gTokenCollateral) external liquidateAccrue(borrower, gTokenCollateral) {
      // max repay possible in this token
      uint repayAmount = controller.maxLiquidatableRepayForAToken(borrower, address(gTokenCollateral), address(this));
      require(repayAmount > 0, "max liquidatable repay is 0");
      uint varDebts = borrowed[borrower].amountVar;
      uint fixedDebts = borrowed[borrower].amountFixed;
      require(varDebts > 0 || fixedDebts > 0, "no debts to liquidate");
      // check debt situation, repay start with variable debts
      if (varDebts >= repayAmount) {
        _liquidate(borrower, repayAmount, true, gTokenCollateral);
      } else {
        if (varDebts > 0) {
          _liquidate(borrower, varDebts, true, gTokenCollateral);
        }
        uint left = repayAmount - varDebts;
        if (fixedDebts >= left) {
          _liquidate(borrower, left, false, gTokenCollateral);
        } else {
          // note that liquidate debts in other tokens still possible
          if (fixedDebts > 0) {
            _liquidate(borrower, fixedDebts, false, gTokenCollateral);
          }
        }
      }
    }

    // highly manual liquidation endpoint
    function liquidateBorrow(address borrower, uint repayAmount, bool isVar, IGToken gTokenCollateral) external liquidateAccrue(borrower, gTokenCollateral) {
      // require(borrower != liquidator, 'liquidate yourself no allowed');
      _liquidate(borrower, repayAmount, isVar, gTokenCollateral);
    }

    function _liquidate(address borrower, uint repayAmount, bool isVar, IGToken gTokenCollateral) internal {
      require(repayAmount > 0, "can not repay 0");
      // controller check if the requested amount is liquidatable
      bool allowed = controller.liquidateBorrowAllowed(address(this), address(gTokenCollateral), borrower, repayAmount);
      require(allowed, 'liquidation not allowed');

      address liquidator = _msgSender();
      // liquidator pay the debt for borrower while borrower give liquidator gTokenCollateral
      _repayBorrow(liquidator, borrower, repayAmount, isVar);
      // controller connect price oracle
      uint seizeAmount = controller.liquidateCalculateSeizeTokens(address(this), address(gTokenCollateral), repayAmount);
      require(gTokenCollateral.balanceOf(borrower) >= seizeAmount, "insufficient balance to seize");

      if (address(gTokenCollateral) == address(this)) {
          _seize(address(this), liquidator, borrower, seizeAmount);
      } else {
          gTokenCollateral.seize(liquidator, borrower, seizeAmount);
      }

      emit LiquidateBorrow(liquidator, borrower, repayAmount, address(gTokenCollateral), seizeAmount);
    }

    function toggleCollateral() external nonReentrant {
      bool status = controller.toggleCollateral(_msgSender());
      require(status, "can not toggle collateral");
      emit ToggleCollateral(_msgSender(), controller.isCollateralized(_msgSender(), address(this)));
    }

    function swapAllTo(bool toVar) external accrue {
      address borrower = _msgSender();
      _borrowBalanceUpdate(borrower);
      if (toVar) {
        _swapRate(borrowed[borrower].amountFixed, toVar);
      } else {
        _swapRate(borrowed[borrower].amountVar, toVar);
      }
    }

    function swapRateMode(uint amount, bool toVar) external accrue {
      address borrower = _msgSender();
      _borrowBalanceUpdate(borrower);
      _swapRate(amount, toVar);
    }

    function _swapRate(uint amount, bool toVar) internal nonReentrant {
      address borrower = _msgSender();
      if (toVar) {
        // from fixed to var
        // remove does not give you better fixed rate
        avgFixedRatePerBlock = removeAvgFixedRate(amount, borrowed[borrower].fixedRate);

        borrowed[borrower].amountFixed -= amount;
        borrowed[borrower].amountVar += amount;
        totalVarBorrows += amount;
        totalFixedBorrows -= amount;
        if (borrowed[borrower].amountFixed == 0) {
          borrowed[borrower].fixedRate = 0;
        }
      } else {
        // from var to fixed
        borrowed[borrower].fixedRate = rateAddImpact(borrowed[borrower].amountFixed, amount, borrowed[borrower].fixedRate, borrowFixedRatePerBlock());
        avgFixedRatePerBlock = addAvgFixedRate(amount, borrowFixedRatePerBlock());

        borrowed[borrower].amountFixed += amount;
        borrowed[borrower].amountVar -= amount;
        totalVarBorrows -= amount;
        totalFixedBorrows += amount;
      }
    }

    function flashLoan(address receiverAddress, uint256 amount, bytes calldata params) external nonReentrant {
      require(amount > 0, 'can not loan 0');
      bool allowed = controller.flashLoanAllowed(address(this));
      require(allowed, 'flash loan not allowed');
      require(getCashMinusReserve() >= amount, "protocol has insufficient cash");
      uint fee = amount * controller.flashloanFee() / controller.feeDivision();
      uint expected = amount + fee;

      supplyToken.safeTransfer(receiverAddress, amount);
      require(
      IFlashLoanReceiver(receiverAddress).executeOperation(address(supplyToken), amount, expected, _msgSender(), params),
        "receiver return error"
      );

      supplyToken.safeTransferFrom(receiverAddress, address(this), expected);
      emit FlashLoan(_msgSender(), amount, expected);
    }

    // --------------------------------
    // Admin
    // --------------------------------

    function changeInterestRateModel(IInterestRateModel newModel) external onlyOwner {
      interestRateModel = newModel;
      emit ChangeInterestRateModel(address(newModel));
    }

    function withdrawReserve(uint amount) external onlyOwner {
      require(amount > 0, "can not withdraw 0");
      reserve -= amount;
      supplyToken.transfer(controller.treasury(), amount);
    }

    // individual balance update
    function _borrowBalanceUpdate(address borrower) internal {
      /* Calculate new borrow balance using the interest index:
      *  recentBorrowBalance = borrower.borrowBalance * market.borrowIndex / borrower.borrowIndex
      */
      if (borrowed[borrower].amountVar > 0) {
        borrowed[borrower].amountVar = borrowed[borrower].amountVar * borrowIndexVar / borrowed[borrower].interestIndex;
      }
      borrowed[borrower].interestIndex = borrowIndexVar;

      uint current = getBlockNumber();
      // update Fixed Rate
      if (borrowed[borrower].amountFixed > 0) {
        borrowed[borrower].amountFixed += borrowed[borrower].amountFixed * (borrowed[borrower].fixedRate * (current - borrowed[borrower].lastUpdate)) / 1e18;
      }
      borrowed[borrower].lastUpdate = current;
    }

    // --------------------------------
    // Routine update global index
    // reserve is taken from interests
    // --------------------------------
    function accrueInterest() public {
      uint currentBlockNumber = getBlockNumber();
      uint blockDelta = currentBlockNumber - accrualBlockNumber;
      /* Short-circuit accumulating 0 interest */
      if (blockDelta == 0) {
        return;
      }

      uint interestFactorVar = borrowVarRatePerBlock() * blockDelta;
      uint interestFactorFixed = avgFixedRatePerBlock * blockDelta;
      uint interestVar = interestFactorVar * totalVarBorrows / 1e18;
      uint interestFixed = interestFactorFixed * totalFixedBorrows / 1e18;
      uint total = interestVar + interestFixed;

      reserve += total * controller.reserveFactor() / 1e18;

      totalVarBorrows += interestVar;
      totalFixedBorrows += interestFixed;

      accrualBlockNumber = currentBlockNumber;
      borrowIndexVar += interestFactorVar * borrowIndexVar / 1e18;

      emit AccrueInterest(totalVarBorrows, totalFixedBorrows, borrowIndexVar, avgFixedRatePerBlock, reserve);
    }

    modifier accrue() {
      accrueInterest();
      _;
    }

    modifier liquidateAccrue(address borrower, IGToken gTokenCollateral) {
      accrueInterest();
      if (address(gTokenCollateral) != address(this)) {
        gTokenCollateral.accrueInterest();
      }
      _borrowBalanceUpdate(borrower);
      _;
    }
}

contract gToken is GTokenTemplate {
    constructor(string memory name, string memory symbol, address _supplyToken, address _controller, address _interestRateModel)
        GTokenTemplate(name, symbol, _supplyToken, _controller, _interestRateModel)
    {
    }
}