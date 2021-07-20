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
import './DevPower.sol';
import './IPair.sol';
import './IRouterV2.sol';
import './ReentrancyGuard.sol';

// PER AFEGIR:
// La funció de withdraw, enlloc danar a la teva wallet, ha danar a la pool de GLOBALS VESTED. Podriem posar que la pool de pid = 0 és la vested de forma automàtica (pasarla pel constructor) i així ja la creem i sempre és la mateixa.
// S'HAURÀ DE REPASSAR TOT EL CODI DE PANTHER I VEURE QUE NO ENS DEIXEM RES!!!!!!!!! i els modificadors public-private etc

// podem fer un stop all rewards per deixar morir al masterchef if needed i reemplaçarlo per un altre. Hem de fer que totes les fees siguin 0 si fem STOP.
// poder fer whitelist i blacklist d'una direcicó per si apareix hacker. devpower per evitar timelock, q llavors no serveix per res. també hem de posar un activar-desactivar whitelist-blacklist.
// És a dir, fem un activar la funcionalitat i després posem white or black lists.
// happy hour pel amm!! les fees allà: baixem els % de tot durant X to Y hores i fem boost del burn oper pujar otken?
// transaction frontrun pay miners??? sushiswap
// Falta poder fer update dels routers i tot això...
// és possible fer lockdown i transferir el ownership de pools i vaults individualment, o ja fem servir el migrator per aixop??
// LINK!!! com oraculo!!!
// idea: mesura antiwhale en una pool. si un vault té més de 1m$ de toksn, no es pot fer un dipòsit de més del 20% del vault.
//aixi evitem els flash loans attacks també, perque ningú es pot quedar amb el 99% del vault degut a flash loans
// Per revisar: que no ens deixem cap funció de pancake/panther, private-public-internal-external, transfer i safetransfer, onlydevpower i onlyowner.
// Lockswap
// ASSEGURARNOS QUEPODEM DEIXAR DE DONAR REWARDS ALS VAULTS.
// UPDATE PROTOCOL LIKE SUSHI!!!
// comprovar els loans si estàn actius
// S'ha de fer un pause ALL MINT FUNCTIONS i retornar FALSE perque facin rollback si les funcions fallen!!! vs un atac, PARME ELS MINS AMB DEVPOWER.
// SHA DE FER UN PAUSE ALL DEPOSITS!!!!! I ROLLBACK!!!
// I no fer el càlcul manual, q sino la liariem pardíssima
// Lock the swap


// We hope code is bug-free. For everyone's life savings.
contract MasterChef is Ownable, DevPower, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of each user.
    struct UserInfo {
        uint256 amount;     		// How many LP tokens the user has provided.
        uint256 rewardDebt; 		// Rewards que se li deuen a un usuari particular. Reward debt. See explanation below.
        uint256 rewardLockedUp;  	// Rewards que se li deuen a un usuari particular i que no pot cobrar.
        uint256 nextHarvestUntil; 	// Moment en el que l'usuari ja té permís per fer harvest..
        uint256 withdrawalOrPerformanceFees; 		// Ens indica si ha passat més de X temps per saber si cobrem una fee o una altra.
        //
        // We do some fancy math here. Basically, any point in time, the amount of Native tokens
        // entitled to a user but is pending to be distributed is:
        //
        //   Aquesta explicació fot cagar. El total de rewards pendents, si traiem lo
        //	 que li hem de pagar a un usuari, és el següent:
        //   pending reward = (user.amount * pool.accNativeTokenPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accNativeTokenPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each farming pool.
    struct PoolInfo {
        IBEP20 lpToken;           							// Address of LP token contract.
        uint256 allocPoint;       							// Pes de la pool per indicar % de rewards que tindrà respecte el total. How many allocation points assigned to this pool. Weight of native tokens to distribute per block.
        uint256 lastRewardBlock;  							// Últim bloc que ha mintat native tokens.
        uint256 accNativeTokenPerShare; 					// Accumulated Native tokens per share, times 1e12.
        uint256 harvestInterval;  							// Freqüència amb la que podràs fer claim en aquesta pool.
        uint256 maxWithdrawalInterval;						// Punt d'inflexió per decidir si cobres withDrawalFeeOfLps o bé performanceFeesOfNativeTokens
        uint256 withDrawalFeeOfLpsBurn;						// % (10000 = 100%) dels LPs que es cobraran com a fees que serviran per fer buyback. Aquest i withDrawalFeeOfLpsTeam han de sumar 10.000.
        uint256 withDrawalFeeOfLpsTeam;						// % (10000 = 100%) dels LPs que es cobraran com a fees que serviran per operations/marketing. Aquest i withDrawalFeeOfLpsBurn han de sumar 10.000.
        uint256 performanceFeesOfNativeTokensBurn;			// % (10000 = 100%) dels rewards que es cobraran com a fees que serviran per fer buyback
        uint256 performanceFeesOfNativeTokensToLockedVault;	// % (10000 = 100%) dels rewards que es cobraran com a fees que serviran per fer boost dels native tokens locked
    }

    // Inicialitzem el nostre router Global
    IRouterV2 public routerGlobal;

    // Our token {~Cake}
    NativeToken public nativeToken;

    // Burn address podria ser 0x0 però mola més un 0x...dEaD;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // POSAR AQUÍ LA DIRECCIÓ WETH HARDCODED!!!!!!!!!!!!!!!!!!!!!!!!
    // SHA DE MODIFICAAAAAAAAAAAR!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    address public constant WETH = 0x000000000000000000000000000000000000dEaD;

    // En cas d'exploit, deixem sortir a la gent per l'emergency sense pagar LP fees. Not safu = no LPs fees in emergencywithdraw
    bool safu = true;

    // Vault where locked tokens are
    address public nativeTokenLockedVaultAddr;

    // Dev address.
    address public devAddr;

    // Native tokens creats per block.
    // No es minteja a cada block. Els tokens es queden com a deute i es cobren quan s'interactua amb la blockchain, sabent quants haig de pagar per bloc amb això.
    uint256 public nativeTokenPerBlock;

    // Bonus muliplier for early native tokens makers.
    uint256 public BONUS_MULTIPLIER = 1;

    // Max interval: 7 days.
    // Seguretat per l'usuari per indicar-li que el bloqueig serà de 7 dies màxim en el pitjor dels casos.
    uint256 public constant MAX_INTERVAL = 7 days;

    // Seguretat per l'usuari per indicar-li que no cobrarem mai més d'un 5% de withdrawal performance fee
    uint256 public constant MAX_FEE_PERFORMANCE = 500;

    // Max withdrawal fee of the LPs deposited: 1.5%.
    uint256 public constant MAX_FEE_LPS = 150;

    // Max extra minted tokens for strategy X in a vault
    uint256 public constant MAX_EXTRA_NATIVE_TOKENS_MINTED = 200;

    // The migrator contract. It has a lot of power. Can only be set through governance (owner).
    // Intentar evitar fer-lo servir.
    IMigratorChef public migrator;

    // Info of each pool.
    PoolInfo[] public poolInfo;

    // Total de fees pendents d'enviar a cremar
    uint256 totalFeesToBurn = 0;

    // Total de fees pendens d'enviar al vaul de native token locked.
    uint256 totalFeesToBoostLocked = 0;

    // Cada 25 iteracions fem els envios per posar una freqüència i no fer masses envios petits
    uint16 counterForTransfers = 0;

    // Info of each user that stakes LP tokens.
    // Info d'un usuari en una pool en concret.
    mapping (uint256 => mapping (address => UserInfo)) public userInfo;

    // Total allocation points. Must be the sum of all allocation points in all pools.
    // Comptador del total de pes de les pools.
    uint256 public totalAllocPoint = 0;

    // The block number when Native tokens mining starts.
    // Inici del farming.
    uint256 public startBlock;

    // Rewards locked de tots els usuaris.
    uint256 public totalLockedUpRewards;

    // Llistat de pools que poden demanar tokens natius
    mapping(address => bool) private _minters;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmissionRateUpdated(address indexed caller, uint256 previousAmount, uint256 newAmount);
    event RewardLockedUp(address indexed user, uint256 indexed pid, uint256 amountLockedUp);

    constructor(
        NativeToken _nativeToken,
        uint256 _nativeTokenPerBlock,
        uint256 _startBlock,
        address _nativeTokenLockedVaultAddr,
        address _routerGlobal
    ) public {
        nativeToken = _nativeToken;
        nativeTokenPerBlock = _nativeTokenPerBlock;
        startBlock = _startBlock;
        devAddr = msg.sender;
        nativeTokenLockedVaultAddr = _nativeTokenLockedVaultAddr;
        routerGlobal = IRouterV2(_routerGlobal);
        // Aquípodem inicialitzar totes les pools de Native Token ja. //////////////////////////////////////////////////////////////////////
        // tOT I QUE MOLaria més tenir vaults apart on enviem la pasta i que es gestionin de forma independent, així no liem el masterchef... lo únic q aquells contractes no podràn mintar dentrada perque no farem whitelist, només serveixen per repartir tokens

    }


    function setRouter(address _router) public onlyOwner {
        routerGlobal = IRouterV2(_router);
    }


    function setLockedVaultAddress(address _newLockedVault) external onlyDevPower{
        require(_newLockedVault != address(0), "(f) SetLockedVaultAddress: you can't set the locked vault address to 0.");
        nativeTokenLockedVaultAddr = _newLockedVault;
    }

    function getLockedVaultAddress() external view returns(address){
        return nativeTokenLockedVaultAddr;
    }

    function setSAFU(bool _safu) external onlyDevPower{
        safu = _safu;
    }

    function getIfSAFU() public returns(bool){
        return safu;
    }

    /// Funcions de l'autocompound

    // Cridarem a aquesta funció per afegir un vault, per indicar-li al masterchef que tindrà permís per mintejar native tokens
    function setMinter(address minter, bool canMint) external onlyOwner {
        if (canMint) {
            _minters[minter] = canMint;
        } else {
            delete _minters[minter];
        }
    }

    // Afegim modificador que només es podrà fer servir pels contractes afegits (whitelisted)
    modifier onlyMinter {
        require(isMinter(msg.sender) == true, "[f] OnlyMinter: caller is not the minter.");
        _;
    }

    // Comprovem si un contracte té permís per cridar el masterchef (aquest SC) i mintejar tokens
    function isMinter(address account) private view returns (bool) {
        // El masterchef ha de ser l'owner del token per poder-los mintar
        if (nativeToken.getOwner() != address(this)) {
            return false;
        }

        return _minters[account];
    }

    // La funció de mintfor al nostre MC només requerirà saber quants tokens MINTEJEM i li enviem al vualt, ja que les fees son independents de cada pool i es tractaran individualment.
    // Per lo tant, els càlculs de quants tokens volem, sempre es faràn al propi vault. La lògica queda delegada al vault.
    function mintNativeTokens(uint _quantityToMint) public onlyMinter returns (address){

        // Mintem un ~10% dels tokens a l'equip (10/110)
        nativeToken.mint(devAddr, _quantityToMint.div(10));

        // Mintem tokens al que ens ho ha demanat
        nativeToken.mint(msg.sender, _quantityToMint);

        return nativeTokenLockedVaultAddr;
    }

    // Quantes pools tenim en marxa?
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function addPool(
        uint256 _allocPoint,
        IBEP20 _lpToken,
        uint256 _harvestInterval,
        bool _withUpdate,
        uint256 _maxWithdrawalInterval,
        uint256 _withDrawalFeeOfLpsBurn,
        uint256 _withDrawalFeeOfLpsTeam,
        uint256 _performanceFeesOfNativeTokensBurn,
        uint256 _performanceFeesOfNativeTokensToLockedVault
    ) public onlyOwner {
        require(_harvestInterval <= MAX_INTERVAL, "[f] Add: invalid harvest interval");
        require(_maxWithdrawalInterval <= MAX_INTERVAL, "[f] Add: invalid withdrawal interval. Owner, there is a limit! Check your numbers.");
        require(_withDrawalFeeOfLpsTeam.add(_withDrawalFeeOfLpsBurn) <= MAX_FEE_LPS, "[f] Add: invalid withdrawal fees. Owner, you are trying to charge way too much! Check your numbers.");
        require(_performanceFeesOfNativeTokensBurn.add(_performanceFeesOfNativeTokensToLockedVault) <= MAX_FEE_PERFORMANCE, "[f] Add: invalid performance fees. Owner, you are trying to charge way too much! Check your numbers.");


        if (_withUpdate) {
            massUpdatePools();
        }

        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);

        poolInfo.push(PoolInfo({
        lpToken: _lpToken,
        allocPoint: _allocPoint,
        lastRewardBlock: lastRewardBlock,
        accNativeTokenPerShare: 0,
        harvestInterval: _harvestInterval,
        maxWithdrawalInterval: _maxWithdrawalInterval,
        withDrawalFeeOfLpsBurn: _withDrawalFeeOfLpsBurn,
        withDrawalFeeOfLpsTeam: _withDrawalFeeOfLpsTeam,
        performanceFeesOfNativeTokensBurn: _performanceFeesOfNativeTokensBurn,
        performanceFeesOfNativeTokensToLockedVault: _performanceFeesOfNativeTokensToLockedVault
        }));
    }

    // Update the given pool's Native tokens allocation point, withdrawal fees, performance fees and harvest interval. Can only be called by the owner.
    function setPool(
        uint256 _pid,
        uint256 _allocPoint,
        uint256 _harvestInterval,
        bool _withUpdate,
        uint256 _maxWithdrawalInterval,
        uint256 _withDrawalFeeOfLpsBurn,
        uint256 _withDrawalFeeOfLpsTeam,
        uint256 _performanceFeesOfNativeTokensBurn,
        uint256 _performanceFeesOfNativeTokensToLockedVault
    ) public onlyOwner {
        require(_harvestInterval <= MAX_INTERVAL, "[f] Add: invalid harvest interval");
        require(_maxWithdrawalInterval <= MAX_INTERVAL, "[f] Add: invalid withdrawal interval. Owner, there is a limit! Check your numbers.");
        require(_withDrawalFeeOfLpsTeam.add(_withDrawalFeeOfLpsBurn) <= MAX_FEE_LPS, "[f] Add: invalid withdrawal fees. Owner, you are trying to charge way too much! Check your numbers.");
        require(_performanceFeesOfNativeTokensBurn.add(_performanceFeesOfNativeTokensToLockedVault) <= MAX_FEE_PERFORMANCE, "[f] Add: invalid performance fees. Owner, you are trying to charge way too much! Check your numbers.");

        if (_withUpdate) {
            massUpdatePools();
        }

        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
        poolInfo[_pid].harvestInterval = _harvestInterval;
        poolInfo[_pid].maxWithdrawalInterval = _maxWithdrawalInterval;
        poolInfo[_pid].withDrawalFeeOfLpsBurn = _withDrawalFeeOfLpsBurn;
        poolInfo[_pid].withDrawalFeeOfLpsTeam = _withDrawalFeeOfLpsTeam;
        poolInfo[_pid].performanceFeesOfNativeTokensBurn = _performanceFeesOfNativeTokensBurn;
        poolInfo[_pid].performanceFeesOfNativeTokensToLockedVault = _performanceFeesOfNativeTokensToLockedVault;

    }
    // Set the migrator contract. Can only be called by the owner.
    function setMigrator(IMigratorChef _migrator) public onlyOwner {
        migrator = _migrator;
    }

    // Migrate lp token to another lp contract. Can be called by anyone. We trust that migrator contract is good.
    function migrate(uint256 _pid) public {
        require(address(migrator) != address(0), "[f] Migrate: no new LP contract defined. Do not be cheeky, my friend.");
        PoolInfo storage pool = poolInfo[_pid];
        IBEP20 lpToken = pool.lpToken;
        uint256 bal = lpToken.balanceOf(address(this));
        lpToken.safeApprove(address(migrator), bal);
        IBEP20 newLpToken = migrator.migrate(lpToken);
        require(bal == newLpToken.balanceOf(address(this)), "[f] Migrate: this is fucked up.");
        pool.lpToken = newLpToken;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        return _to.sub(_from).mul(BONUS_MULTIPLIER);
    }

    // View function to see pending native tokens on frontend.
    function pendingNativeToken(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accNativeTokenPerShare = pool.accNativeTokenPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));

        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 nativeTokenReward = multiplier.mul(nativeTokenPerBlock).mul(pool.allocPoint).div(totalAllocPoint);

            // Quants rewards acumulats pendents de cobrar té la pool + els que acabem de calcular
            accNativeTokenPerShare = accNativeTokenPerShare.add(nativeTokenReward.mul(1e12).div(lpSupply));
        }

        // Tokens pendientes de recibir
        uint256 pending = user.amount.mul(accNativeTokenPerShare).div(1e12).sub(user.rewardDebt);
        return pending.add(user.rewardLockedUp);
    }

    // View function to see if user can harvest.
    // Retornem + si el block.timestamp és superior al block límit de harvest.
    function canHarvest(uint256 _pid, address _user) public view returns (bool) {
        UserInfo storage user = userInfo[_pid][_user];
        return block.timestamp >= user.nextHarvestUntil;
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Actualitzem accNativeTokenPerShare i el número de tokens a mintar per cada bloc
    // Això, en principi només per LP, no per l'optimiser
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];

        // Si ja tenim la data actualitzada fins l'últim block, no cal fer res més
        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        // Total de LP tokens que tenim en aquesta pool.
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));

        // Si no tenim LPs, diem que està tot updated a aquest block i out. No hi ha info a tenir en compte
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        } // else...

        // Quants rewards (multiplicador) hem tingut entre l'últim block actualitzat i l'actual
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);

        // (Tokens per block X multiplicador entre últim rewards donats i ara)     X     (Alloc points de la pool)   /     (total Alloc points)   = Tokens que s'han de pagar entre últim block mirat i l'actual. Es paga a operacions i al contracte.
        uint256 nativeTokenReward = multiplier.mul(nativeTokenPerBlock).mul(pool.allocPoint).div(totalAllocPoint);

        // Mintem un ~10% dels tokens a l'equip (10/110)
        nativeToken.mint(devAddr, nativeTokenReward.div(10));

        // Mintem tokens a aquest contracte.
        nativeToken.mint(address(this), nativeTokenReward);

        // Al accNativeTokenPerShare de la pool li afegim [els rewards mintats ara dividit entre el total de LPs]. Bàsicament, actualitzem accNativeTokenPerShare per indicar els rewards a cobrar per cada LP.
        pool.accNativeTokenPerShare = pool.accNativeTokenPerShare.add(nativeTokenReward.mul(1e12).div(lpSupply));

        // Últim block amb rewards actualitzat és l'actual
        pool.lastRewardBlock = block.number;
    }

    // Paguem els rewards o no es poden pagar?
    // Si fem un diposit,un harvest (= diposit de 0 tokens) o un withdraw tornem a afegir el temps de harvest (reiniciem el comptador bàsicament) i sempre es paguen els rewards pendents de rebre
    function payOrLockupPendingNativeToken(uint256 _pid) internal returns (bool) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        //
        bool performanceFee = withdrawalOrPerformanceFee(_pid, msg.sender);

        // Si és el primer cop que entrem (AKA, fem dipòsit), el user.nextHarvestUntil serà 0, pel que li afegim al user el harvestr interval
        if (user.nextHarvestUntil == 0) {
            user.nextHarvestUntil = block.timestamp.add(pool.harvestInterval);
        } // Else...

        // Rewards pendents de pagar al usuari.  LPs   X    Rewards/LPs       -     Rewards ja cobrats
        uint256 pending = user.amount.mul(pool.accNativeTokenPerShare).div(1e12).sub(user.rewardDebt);

        // L'usuari pot fer harvest?
        if (canHarvest(_pid, msg.sender)) {

            // Si té rewards pendents de cobrar o ha acumulat per cobrar que estaven locked
            if (pending > 0 || user.rewardLockedUp > 0) {

                // Sumem el total de rewards a cobrar
                uint256 totalRewards = pending.add(user.rewardLockedUp);

                // reset lockup
                totalLockedUpRewards = totalLockedUpRewards.sub(user.rewardLockedUp);
                user.rewardLockedUp = 0;

                // Reiniciem harvest
                user.nextHarvestUntil = block.timestamp.add(pool.harvestInterval);

                // En cas de cobrar performance fees, li restem als rewards que li anavem a pagar
                if (performanceFee){

                    // Tocarà fer una transfer, augmentem el comptador
                    counterForTransfers++;

                    // Rewards que finalment rebrà l'usuari: total rewards - feesTaken
                    totalRewards = totalRewards.sub(totalRewards.mul(pool.performanceFeesOfNativeTokensBurn.add(pool.performanceFeesOfNativeTokensToLockedVault)).div(10000));

                    // Fees que cremarem i fees que enviarem per fer boost dels locked. Les acumulem a l'espera d'enviarles quan toquin
                    totalFeesToBurn = totalFeesToBurn.add(totalRewards.mul(pool.performanceFeesOfNativeTokensBurn.div(10000)));
                    totalFeesToBoostLocked = totalFeesToBoostLocked.add(totalRewards.mul(pool.performanceFeesOfNativeTokensToLockedVault.div(10000)));

                    // Si ja hem fet més de 25 transaccions, ja hem acumulat suficient per tractar-les
                    if (counterForTransfers > 25){

                        // Reiniciem el comptador.
                        counterForTransfers = 0;

                        // Cremem els tokens. Dracarys.
                        SafeNativeTokenTransfer(BURN_ADDRESS, totalFeesToBurn);
                        // Reiniciem el comptador de fees. Ho podem fer així i no cal l'increment de k com al AMM perque tota la info està al contracte
                        totalFeesToBurn = 0;

                        // Enviem les fees acumulades cap al vault de Global locked per fer boost dels rewards allà
                        SafeNativeTokenTransfer(nativeTokenLockedVaultAddr, totalFeesToBoostLocked);

                        // Reiniciem el comptador de fees. Ho podem fer així i no cal l'increment de k com al AMM perque tota la info està al contracte
                        totalFeesToBoostLocked = 0;
                    }
                }

                // Enviem els rewards pendents a l'usuari (es poden haver descomptat els performance fees)
                SafeNativeTokenTransfer(msg.sender, totalRewards);
            }

            // Si no pot fer harvest encara i se li deuen tokens...
        } else if (pending > 0) {

            // Guardem quants rewards s'ha de cobrar l'usuari encara
            user.rewardLockedUp = user.rewardLockedUp.add(pending);

            // Augmentem el total de rewards que estàn pendents de ser cobrats
            totalLockedUpRewards = totalLockedUpRewards.add(pending);

            // Mostrem avís
            emit RewardLockedUp(msg.sender, _pid, pending);
        }

        return performanceFee;
    }

    // Deposit 0 tokens = harvest. Deposit for LP pairs, not for staking.
    function deposit(uint256 _pid, uint256 _amount) public nonReentrant{

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        // Actualitzem quants rewards pagarem per cada LP
        updatePool(_pid);

        // Fem el pagament dels rewards pendents si en tenim i si no estàn locked (en cas que ho estiguin, quedaràn pendents)
        payOrLockupPendingNativeToken(_pid);

        // En cas de ser = 0, seria un harvest/claim i ens saltariem aquesta part. En cas de ser > 0, fem el dipòsit al contracte
        if (_amount > 0) {

            // Transferim els LPs a aquest contracte (MC)
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);

            // Indiquem que l'usuari té X tokens LP depositats
            user.amount = user.amount.add(_amount);

            // Indiquem el moment en el que depositem per saber quines withdrawal fees es cobraran
            user.withdrawalOrPerformanceFees = block.timestamp.add(pool.maxWithdrawalInterval);
        }

        // LPs que tenim multiplicat pels tokensrewards/LPs de la pool mitjos històrics -- Quan fas deposit, ho cobres tot (per això no falla aquesta funció). Si ho tenies en harvest lockup, van a pending rewards i ja t'ho cobraràs.
        user.rewardDebt = user.amount.mul(pool.accNativeTokenPerShare).div(1e12);

        // Emetem un event.
        emit Deposit(msg.sender, _pid, _amount);
    }

    function getLPFees(uint256 _pid, uint256 _amount, bool _lpFee) private{
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        if (_amount > 0) {

            // Quantitat que se li retornarà al usuari, que pot modificar-se depenen de si li cobrem fees o no
            uint256 finalAmount = _amount;

            // Arribem al cas que hem de cobrar LP fees
            if (_lpFee){

                // L'usuari rebrà els seus LPs menys els que li hem tret com a fees.
                finalAmount = _amount.sub(_amount.mul(pool.withDrawalFeeOfLpsBurn.add(pool.withDrawalFeeOfLpsTeam)).div(10000));

                // Fins aquí hem acabat la gestió de l'user. Ara gestionem la comissió. Tenim un LP. El volem desfer i enviar-lo a BURN i a OPERATIONS
                // Això s'ha de testejar bé perque és molt fàcil que hi hagin errors
                // Si el router no té permís perque address(this) es gasti els tokens, li donem permís
                if (IBEP20(pool.lpToken).allowance(address(this), address(routerGlobal)) == 0) {
                    IBEP20(pool.lpToken).safeApprove(address(routerGlobal), uint(- 1));
                }

                // Burns del LP perque farem removeliquidity
                if (IPair(address(pool.lpToken)).balanceOf(address(pool.lpToken)) > 0) {
                    IPair(address(pool.lpToken)).burn(address(routerGlobal));
                }

                // Fem remove liquidity del LP i rebrem els dos tokens
                (uint amountToken0, uint amountToken1) = routerGlobal.removeLiquidity(IPair(address(pool.lpToken)).token0(), IPair(address(pool.lpToken)).token1(), _amount.mul(pool.withDrawalFeeOfLpsBurn.add(pool.withDrawalFeeOfLpsTeam)).div(10000), 0, 0, address(this), block.timestamp);

                // Ens assegurem que podem gastar els dos tokens i així els passem a BNB/Global i fem burn/team
                if (IBEP20(IPair(address(pool.lpToken)).token0()).allowance(address(this), address(routerGlobal)) == 0) {
                    IBEP20(IPair(address(pool.lpToken)).token0()).safeApprove(address(routerGlobal), uint(- 1));
                }
                if (IBEP20(IPair(address(pool.lpToken)).token1()).allowance(address(this), address(routerGlobal)) == 0) {
                    IBEP20(IPair(address(pool.lpToken)).token1()).safeApprove(address(routerGlobal), uint(- 1));
                }

                // Agafem el que cremem i el que enviem al equip per cada token rebut després de cremar LPs
                uint256 lpsToBuyNativeTokenAndBurn0 = amountToken0.mul(pool.withDrawalFeeOfLpsBurn).div(10000);
                uint256 lpsToBuyNativeTokenAndBurn1 = amountToken1.mul(pool.withDrawalFeeOfLpsBurn).div(10000);
                uint256 lpsToBuyBNBAndTransferForOperations0 = amountToken0.mul(pool.withDrawalFeeOfLpsTeam).div(10000);
                uint256 lpsToBuyBNBAndTransferForOperations1 = amountToken1.mul(pool.withDrawalFeeOfLpsTeam).div(10000);

                // Cremem i enviem els tokens a l'equip
                manageTokens(IPair(address(pool.lpToken)).token0(), 0, lpsToBuyNativeTokenAndBurn0);
                manageTokens(IPair(address(pool.lpToken)).token1(), 0, lpsToBuyNativeTokenAndBurn1);
                manageTokens(IPair(address(pool.lpToken)).token0(), 1, lpsToBuyBNBAndTransferForOperations0);
                manageTokens(IPair(address(pool.lpToken)).token1(), 1, lpsToBuyBNBAndTransferForOperations1);

                // Possibles fallos que pot donar per aquí: usar IBEP20 enlloc de IPair o IPancakeERC20. swapAndLiquifyEnabled. Approves.
            }

            // L'usuari deixa de tenir els tokens que ha demanat treure, pel que s'actualitza els LPs que li queden. Quan li enviem els LPs, li enviarem ["_amount demanat" - les fees cobrades] (si n'hi han).
            user.amount = user.amount.sub(_amount);

            // Al usuari li enviem els tokens LP demanats menys els LPs trets de fees, si fos el cas
            pool.lpToken.safeTransfer(address(msg.sender), finalAmount);
        }
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public nonReentrant{

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "[f] Withdraw: you are trying to withdraw more tokens than you have. Cheeky boy. Try again.");

        // Actualitzem # rewards per tokens LP i paguem rewards al contracte
        updatePool(_pid);

        // Paguem els rewards pendents o els deixem locked. Si feeTaken = true, no fem res, perque ja hem cobrat el fee dels rewards. En canvi, si és false, encara hem de cobrar fee sobre els LPs.
        // Aquí s'actualitza el accNativeTokenPerShare
        bool performancefeeTaken = payOrLockupPendingNativeToken(_pid);

        // TESTEJAR AQUESTA FUNCIÓ MOLT PERÒ MOLT A FONS!!! ÉS NOVA I ÉS ON LA PODEM LIAR. Aquí s'actualitza el user.amount.
        getLPFees(_pid, _amount, !performancefeeTaken);

        // Revisar això a fons (és nou). En principi, guardem els LPs actuals i la quantitat que ha cobrat per ells (total). El que li haguem restat després perque ens ho hem cobrat per fees, no hauria d'afectar, ja que és a posteriori i no de cara al usuari.
        // User ha rebut menys tokens si s'0han cobrat fees però a la info del user li és igual, només li interessa saber el total que se li ha gestionat per cobrar. El que se li desviï després, no hauria d'afectar
        user.rewardDebt = user.amount.mul(pool.accNativeTokenPerShare).div(1e12);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    function manageTokens(address _token, uint16 _opt, uint256 _amount) private{

        // Tokens can be WETH, Native Tokens or a random token
        // Les funcions de burn i swap segur que s'han de corregir...!!!

        // We burn tokens
        if (_opt == 0){
            // Si tenim Nativetokens els cremem directament
            if(_token == WETH){
                //routerGlobal.swapETHForExactTokens(...)

            } else {
                if(_token != address(nativeToken)){
                    //routerGlobal.swapExactTokensForTokens(...)

                }

            }
            //XXXXXXXXTOKENSGLOBALS DE DALT.transfer(BURN_ADDRESS, _amount);
            return;
        }

        // Enviem tokens al equip
        if (_opt == 1){

            // Si tenim globals, els venem per passar a BNB i ens els enviem
            if(_token == address(nativeToken)){
                //routerGlobal.swapExactTokensForETH(...)

            } else
            // Si no tenim globals ni WETH, ho passem a WETH
                if(_token != WETH){
                    //routerGlobal.swapExactTokensForETH(...)

                }

            // XXXXXXXXXXXX tokens BNB que ens enviem a devaddress/nosaltres
            return;
        }
    }

    // Withdraw of all tokens. Rewards are lost.
    function emergencyWithdraw(uint256 _pid) public nonReentrant {
        UserInfo storage user = userInfo[_pid][msg.sender];
        if (user.amount == 0){
            return;
        }

        PoolInfo storage pool = poolInfo[_pid];

        // Si l'usuari vol sortir fent emergencyWithdraw és OK, però li hem de cobrar les fees si toca. En cas contrari, se les podria estalviar per la cara.
        if (safu && !withdrawalOrPerformanceFee(_pid, msg.sender)){
            getLPFees(_pid, user.amount, true);
        }

        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        user.rewardLockedUp = 0;
        user.nextHarvestUntil = 0;
        user.withdrawalOrPerformanceFees = 0;
        pool.lpToken.safeTransfer(address(msg.sender), amount);
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    // View function to see what kind of fee will be charged
    // Retornem + si cobrarem performance. False si cobrarem dels LPs.
    function withdrawalOrPerformanceFee(uint256 _pid, address _user) public view returns (bool) {
        UserInfo storage user = userInfo[_pid][_user];
        return block.timestamp >= user.withdrawalOrPerformanceFees;
    }

    // Update dev address by the previous dev.
    function setDevAddress(address _devAddress) public {
        require(msg.sender == devAddr, "[f] Dev: You don't have permissions to change the dev address. DRACARYS.");
        require(_devAddress != address(0), "[f] Dev: _devaddr can't be address(0).");
        devAddr = _devAddress;
    }

    // Safe native token transfer function, just in case if rounding error causes pool to not have enough native tokens.
    function SafeNativeTokenTransfer(address _to, uint256 _amount) internal {
        uint256 nativeTokenBal = nativeToken.balanceOf(address(this));
        if (_amount > nativeTokenBal) {
            nativeToken.transfer(_to, nativeTokenBal);
        } else {
            nativeToken.transfer(_to, _amount);
        }
    }

    function updateEmissionRate(uint256 _nativeTokenPerBlock) public onlyOwner {
        massUpdatePools();
        emit EmissionRateUpdated(msg.sender, nativeTokenPerBlock, _nativeTokenPerBlock);
        nativeTokenPerBlock = _nativeTokenPerBlock;
    }
}