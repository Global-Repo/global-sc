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

// HEM DE FER IMPORT DE LA INTERFACE I DEL SC DEL VAULT!!!!!!!!!


// PER AFEGIR:
// REENTRANCYGUARD, afegir igual que panther!!!
// Emergency withdraw sha de cobrar withdraw fee within 4 days. No dona rewards, però no volem q surtin fent emergency withdraw sense pagar el withdraw fee. Performance fee no cal perque el emergency withdraw no pagarà rewards.
// MIRAR BÉ COM FUNCIONA updatePool!!!
//     function deposit(uint256 _pid, uint256 _amount, address _referrer) public nonReentrant!!!!!!!!!!!!!!!!!!!!!!!!!!! mirar això de no reentrant, A LA CLASSE MASTERCHEF TAMBÉ!!!
// enterStaking i leavestkaing és la 3a part: depositem GLOBALS, i aquí sha de mirar què es paga + ellockup + penalty +
// La funció de withdraw, enlloc danar a la teva wallet, ha danar a la pool de GLOBALS VESTED. Podriem posar que la pool de pid = 0 és la vested de forma automàtica (pasarla pel constructor) i així ja la creem i sempre és la mateixa.
// també podem crear la pool pid = 1 que seria locked X temps i rebràs global+fees i després la dstaking normal. el constructor hauria de fer les tres primeres pools per defecte.
// S'HAURÀ DE REPASSAR TOT EL CODI DE PANTHER I VEURE QUE NO ENS DEIXEM RES!!!!!!!!!
// Panther té un antiwhale al masterchef PERÒ i si tens molts rewards per cobrar, què? No lo veo...
// podem fer un stop all rewards per deixar morir al masterchef if needed i reemplaçarlo per un altre. Hem de fer que totes les fees siguin 0 si fem STOP.
// poder fer whitelist i blacklist d'una direcicó per si apareix hacker. devpower per evitar timelock, q llavors no serveix per res. també hem de posar un activar-desactivar whitelist-blacklist.
// És a dir, fem un activar la funcionalitat i després posem white or black lists.
// quadratic yield eanrings?? https://twitter.com/AdamantVault/status/1413855609196322827
// happy hour pel amm!! les fees allà: baixem els % de tot durant X to Y hores i fem boost del burn oper pujar otken?
// transaction frontrun pay miners??? sushiswap
// Hauriem de fer getters i setters més individuals per les vars de les pools o ens podem mirar fent updates
// fer un getter de tot lo del add+set de les pools per revisar punt a punt.
// S'ha de fer un setter de withDrawalFeeOfLpsBurn+withDrawalFeeOfLpsTeam i un altre de performanceFeesOfNativeTokensBurn+performanceFeesOfNativeTokensToLockedVault que siguin devowner.
// Falta poder fer update dels routers i tot això...
// fees emergency lockdown = all 0 so people cna exit!!
// és possible fer lockdown i transferir el ownership de pools i vaults individualment, o ja fem servir el migrator per aixop??
// LINK!!!
// UPDATE PROTOCOL LIKE SUSHI!!!
// LIMIT ORDERS!!! roadmap
//  nativeToken.transfer(_to, nativeTokenBal); --> why not safetransfer??
// afegir que el payoiut de les pools sigui amb un alrt token...te sentit???

/* // En principi no es fa servir... Revisar al final...
function updateMultiplier(uint256 multiplierNumber) public onlyOwner {
    BONUS_MULTIPLIER = multiplierNumber;
}*/

// We hope code is bug-free. For everyone's life savings.
contract MasterChef is Ownable {
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
        uint256 withDrawalFeeOfLps;     					// % (10000 = 100%) Comissió aplicada als LPs si fas withdraw abans de que passi el temps definit a "maxWithdrawalInterval" desde l'últim dipòsit
        uint256 performanceFeesOfNativeTokens;  			// % (10000 = 100%) Comissió aplicada als rewards si fas withdraw després de que passi el temps definit a "maxWithdrawalInterval" desde l'últim dipòsit
        uint256 harvestInterval;  							// Freqüència amb la que podràs fer claim en aquesta pool.
        uint256 maxWithdrawalInterval;						// Punt d'inflexió per decidir si cobres withDrawalFeeOfLps o bé performanceFeesOfNativeTokens
        uint256 withDrawalFeeOfLpsBurn;						// % (10000 = 100%) dels LPs que es cobraran com a fees que serviran per fer buyback. Aquest i withDrawalFeeOfLpsTeam han de sumar 10.000.
        uint256 withDrawalFeeOfLpsTeam;						// % (10000 = 100%) dels LPs que es cobraran com a fees que serviran per operations/marketing. Aquest i withDrawalFeeOfLpsBurn han de sumar 10.000.
        uint256 performanceFeesOfNativeTokensBurn;			// % (10000 = 100%) dels rewards que es cobraran com a fees que serviran per fer buyback
        uint256 performanceFeesOfNativeTokensToLockedVault;	// % (10000 = 100%) dels rewards que es cobraran com a fees que serviran per fer boost dels native tokens locked
    }

    // Info of each Vault.
    struct VaultInfo {
        IBEP20 tokenOrLpToken;         			// Address of LP token contract.
        uint256 vaultWithdrawalFeeOfLps;    	// Comissió aplicada als LPs si fas withdraw abans de que passi el temps definit a "maxWithdrawalInterval" desde l'últim dipòsit.
        uint256 vaultIntervalFeeOnLps;    		// Temps en el que el vault t'aplica comissió.
        uint256 ourWithdrawalFeeOfLps;    		// Comissió aplicada als LPs per part nostre si fas withdraw abans de que passi el temps definit a "withdrawalIntervalFeeOnLps" desde l'últim dipòsit.
        uint256 withdrawalIntervalFeeOnLps;    	// Temps durant el que cobres comissió.
        uint256 rewardsInVaultTokens;    		// % (10000 = 100%) dels tokens optimitzats que es paguen.
        uint256 rewardsForOperations;    		// % (10000 = 100%) dels tokens optimitzats que es venen per $BUSD i s'envien a la dev address per 'operacions'.
        uint256 rewardsToBuyGlobal;	    		// % (10000 = 100%) dels tokens optimitzats que es venen per comprar $Global.
        uint256 rewardsToBuyBNB;	    		// % (10000 = 100%) dels tokens optimitzats que es venen per comprar $BNB.
        uint256 extraNativeTokenMinted;    		// % de tokens $Global que es mintejen sobre el total de tokens optimitzats. Exemple. extraNativeTokenMinted = 2000 (= 20%). 100 cake rewards -> 20 tokens $Global extres mintats.
        address router1;						// Router per convertir els LPs/staking a $BNB.
        address router2;						// Router per convertir $BNB a GLOBAL.
    }

    // Max rewards per farm... alguna constant de control aquí i un maxim dextra nativetokenminted...??? //////////////////////////////


    // Our token {~Cake}
    NativeToken public nativeToken;

    // Burn address podria ser 0x0 però mola més un 0x...dEaD;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    address public constant NATIVE_TOKEN_LOCKED_VAULT = 0x000000000000000000000000000000000000dEaD;

    // Direcció del nostre router del AMM, que al final no canvia mai
    address public routerGlobal;

    // Dev address.
    address public devAddr;

    // Native tokens created per block.
    // No es minteja a cada block. Els tokens es queden com a deute i es cobren quan s'interactua amb la blockchain, sabent quants haig de pagar per bloc amb això.
    uint256 public nativeTokenPerBlock;

    // Bonus muliplier for early native tokens makers.
    uint256 public BONUS_MULTIPLIER = 1;

    // Max interval: 7 days.
    // Seguretat per l'usuari per indicar-li que el bloqueig serà de 7 dies màxim en el pitjor dels casos.
    uint256 public constant MAX_INTERVAL = 7 days;

    // Seguretat per l'usuari per indicar-li que no cobrarem mai més d'un 5% de withdrawal performance fee
    uint256 public constant MAX_FEE_PERFORMANCE = 500;

    // Max withdrawal fee of the LPs deposited: 1%.
    uint256 public constant MAX_FEE_LPS = 100;

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

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    event EmissionRateUpdated(address indexed caller, uint256 previousAmount, uint256 newAmount);
    event RewardLockedUp(address indexed user, uint256 indexed pid, uint256 amountLockedUp);

    constructor(
        NativeToken _nativeToken,
        uint256 _nativeTokenPerBlock,
        uint256 _startBlock,
        address _routerGlobal
    ) public {
        nativeToken = _nativeToken;
        nativeTokenPerBlock = _nativeTokenPerBlock;
        startBlock = _startBlock;
        devAddr = msg.sender;
        routerGlobal = _routerGlobal;
        // Aquípodem inicialitzar totes les pools de Native Token ja. //////////////////////////////////////////////////////////////////////
        // com a mínim el vault de tokens locked per tal de poder enviar tokens allà!!! if (performanceFee){... safenativetokentransfer
    }

    // Quantes pools tenim en marxa?
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Mostra'm la direcció del router de global, la qual en teoria no hauria de canviar.
    function getRouterGlobal() external view returns(address){
        return routerGlobal;
    }

    // Si el router s'ha de canviar per optimizar alguna cosa, canvia'l
    function setRouterGlobal(address _newRouterGlobal) public onlyOwner(){
        routerGlobal = _newRouterGlobal;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add(
        uint256 _allocPoint,
        IBEP20 _lpToken,
        uint256 _harvestInterval,
        bool _withUpdate,
        uint16 _withDrawalFeeOfLps,
        uint16 _performanceFeesOfNativeTokens,
        uint256 _maxWithdrawalInterval,
        uint256 _withDrawalFeeOfLpsBurn,
        uint256 _withDrawalFeeOfLpsTeam,
        uint256 _performanceFeesOfNativeTokensBurn,
        uint256 _performanceFeesOfNativeTokensToLockedVault
    ) public onlyOwner {
        // Comprovem les 4 variables. Ho deixem separat per claretat.
        require(_harvestInterval <= MAX_INTERVAL, "[f] Add: invalid harvest interval");
        require(_withDrawalFeeOfLps <= MAX_FEE_LPS, "[f] Add: invalid withdrawal fees. Owner, you are trying to charge way too much! Check your numbers.");
        require(_performanceFeesOfNativeTokens <= MAX_FEE_PERFORMANCE, "[f] Add: invalid performance fees. Owner, you are trying to charge way too much! Check your numbers.");
        require(_maxWithdrawalInterval <= MAX_INTERVAL, "[f] Add: invalid withdrawal interval. Owner, there is a limit! Check your numbers.");
        require(_withDrawalFeeOfLpsTeam.add(_withDrawalFeeOfLpsBurn) == 10000, "[f] Add: invalid LP fee distribution. Numbers don't match.");
        require(_performanceFeesOfNativeTokensBurn.add(_performanceFeesOfNativeTokensToLockedVault) == 10000, "[f] Add: invalid reward fee distribution. Numbers don't match.");

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
            withDrawalFeeOfLps: _withDrawalFeeOfLps,
            performanceFeesOfNativeTokens: _performanceFeesOfNativeTokens,
            harvestInterval: _harvestInterval,
            maxWithdrawalInterval: _maxWithdrawalInterval,
            withDrawalFeeOfLpsBurn: _withDrawalFeeOfLpsBurn,
            withDrawalFeeOfLpsTeam: _withDrawalFeeOfLpsTeam,
            performanceFeesOfNativeTokensBurn: _performanceFeesOfNativeTokensBurn,
            performanceFeesOfNativeTokensToLockedVault: _performanceFeesOfNativeTokensToLockedVault
        }));
    }


    // Update the given pool's Native tokens allocation point, withdrawal fees, performance fees and harvest interval. Can only be called by the owner.
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        uint256 _harvestInterval,
        bool _withUpdate,
        uint16 _withDrawalFeeOfLps,
        uint16 _performanceFeesOfNativeTokens,
        uint256 _maxWithdrawalInterval,
        uint256 _withDrawalFeeOfLpsBurn,
        uint256 _withDrawalFeeOfLpsTeam,
        uint256 _performanceFeesOfNativeTokensBurn,
        uint256 _performanceFeesOfNativeTokensToLockedVault
    ) public onlyOwner {
        require(_harvestInterval <= MAX_INTERVAL, "[f] Add: invalid harvest interval");
        require(_maxWithdrawalInterval <= MAX_INTERVAL, "[f] Add: invalid withdrawal interval. Owner, there is a limit! Check your numbers.");
        require(_withDrawalFeeOfLps <= MAX_FEE_LPS, "[f] Add: invalid withdrawal fees. Owner, you are trying to charge way too much! Check your numbers.");
        require(_performanceFeesOfNativeTokens <= MAX_FEE_PERFORMANCE, "[f] Add: invalid performance fees. Owner, you are trying to charge way too much! Check your numbers.");
        require(_withDrawalFeeOfLpsTeam.add(_withDrawalFeeOfLpsBurn) == 10000, "[f] Add: invalid LP fee distribution. Numbers don't match.");
        require(_performanceFeesOfNativeTokensBurn.add(_performanceFeesOfNativeTokensToLockedVault) == 10000, "[f] Add: invalid reward fee distribution. Numbers don't match.");

        if (_withUpdate) {
            massUpdatePools();
        }

        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
        poolInfo[_pid].withDrawalFeeOfLps = _withDrawalFeeOfLps;
        poolInfo[_pid].performanceFeesOfNativeTokens = _performanceFeesOfNativeTokens;
        poolInfo[_pid].harvestInterval = _harvestInterval;
        poolInfo[_pid].maxWithdrawalInterval = _maxWithdrawalInterval;
        //withDrawalFeeOfLpsBurn = _withDrawalFeeOfLpsBurn;
        //withDrawalFeeOfLpsTeam = _withDrawalFeeOfLpsTeam;
        //performanceFeesOfNativeTokensBurn = _performanceFeesOfNativeTokensBurn;
        //performanceFeesOfNativeTokensToLockedVault = _performanceFeesOfNativeTokensToLockedVault;
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
        uint256 pending =   user.amount.mul(accNativeTokenPerShare).div(1e12).sub(user.rewardDebt);
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
    // Si fem un diposit o un harvest (= diposit de 0 tokens) o un withdraw tornem a afegir el temps de harvest (reiniciem el comptador basicament) i sempre es paguen els rewards pendents de rebre
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

                    // Tota la fee que li traiem al usuari
                    uint256 feeTaken = totalRewards.mul(pool.performanceFeesOfNativeTokens).div(10000);

                    // Rewards que finalment rebrà l'usuari
                    totalRewards = totalRewards.sub(feeTaken);

                    // Fees que cremarem i fees que enviarem per fer boost dels locked. Les acumulem a l'espera d'enviarles quan toquin
                    totalFeesToBurn = totalFeesToBurn.add(feeTaken.mul(pool.performanceFeesOfNativeTokensBurn).div(10000));
                    totalFeesToBoostLocked = totalFeesToBoostLocked.add(feeTaken.mul(pool.performanceFeesOfNativeTokensBurn).div(10000));

                    // Si ja hem fet més de 25 transaccions, ja hem acumulat suficient per tractar-les
                    if (counterForTransfers > 25){

                        // Reiniciem el comptador.
                        counterForTransfers = 0;

                        // Cremem els tokens. Dracarys.
                        SafeNativeTokenTransfer(BURN_ADDRESS, totalFeesToBurn);

                        // Enviem les fees acumulades cap al vault de Global locked per fer boost dels rewards allà
                        /* AQUÍ POSEM LA DIRECCIÓ DEL VAULT DE NATIVE TOKEN LOCKED!!! */
                        SafeNativeTokenTransfer(NATIVE_TOKEN_LOCKED_VAULT, totalFeesToBoostLocked);

                        // Reiniciem el comptador de fees. Ho podem fer així i no cal l'increment de k com al AMM perque tota la info està al contracte
                        totalFeesToBoostLocked = 0;
                        totalFeesToBurn = 0;
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

    // Deposit LP tokens to MasterChef for nativeToken allocation.
    // A tenir en compte que deposit de 0 tokens = HARVEST!!! Per tant, el harvest lockup es controla aquí!!
    function deposit(uint256 _pid, uint256 _amount) public {

        // Aquesta funció serveix per depositar LPs però no per fer staking
        // La nostre primera pool no té perquè ser el staking de native token perque no està setejat en el constructor
        // require (_pid != 0, 'deposit nativeToken by staking');

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        // Actualitzem quants rewards pagarem per cada LP
        updatePool(_pid);

        // Fem el pagament dels rewards pendents si podem (i sinó, queden pendents).
        payOrLockupPendingNativeToken(_pid);

        // En cas de ser = 0, seria un harvest/claim i ens saltariem aquesta part. En cas de ser > 0, fem el dipòsit al contracte
        if (_amount > 0) {

            // Transferim els LPs a aquest contracte
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);

            // Indiquem que l'usuari té X tokens LP depositats
            user.amount = user.amount.add(_amount);

            // Indiquem el moment en el que depositem per saber quines withdrawal fees cobrar
            user.withdrawalOrPerformanceFees = block.timestamp.add(pool.maxWithdrawalInterval);
        }

        // LPs que tenim multiplicat pels tokensrewards/LPs de la pool mitjos històrics -- Quan fas deposit, ho cobres tot (per això no falla aquesta funció). Si ho tenies en harvest lockup, van a pending rewards i ja t'ho cobraràs.
        user.rewardDebt = user.amount.mul(pool.accNativeTokenPerShare).div(1e12);

        // Emetem un event.
        emit Deposit(msg.sender, _pid, _amount);
    }
    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public {

        // Aquí hem de fer el require de les diferents pools dstkaing etc. el token natiu hauria de tenir pool = 0, 1 i 2 com a mínim. hauriem de mirar si posme altres, si hem de fer alguna cosa més també.
        // Ara mateix al constructor no en tenim cap pel que la primera que fem serà pool = 0 i aquest require petarà. El comentem, però més endavant hem de posar aquí els require de tots els stakings. Podriem fer que les farms
        // comencessin per un numero rollo 100k+ i així no tenir aquest problema?
        // _pid == 0 --> Pool
        require (_pid != 0, '[f] Withdraw: this is not the right function to unstake. Use "LeaveStaking" instead.');

        // Quantitat que se li retornarà al usuari, que pot modificar-se depenen de si li cobrem fees o no
        uint256 finalAmount = _amount;

        // Quantitat que LPs que se li cobraràn de fees si li toca pagar
        uint256 lPsTaken = 0;

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "[f] Withdraw: you are trying to withdraw more tokens than you have. Cheeky boy. Try again.");

        // Actualitzem # rewards per tokens LP i paguem rewards al contracte
        updatePool(_pid);

        // Paguem els rewards pendents o els deixem locked. Si feeTaken = true, no fem res, perque ja hem cobrat el fee dels rewards. En canvi, si és false, encara hem de cobrar fee sobre els LPs.
        bool performancefeeTaken = payOrLockupPendingNativeToken(_pid);


        if (_amount > 0) {

            // No hem cobrat performance fees, pel que ens hem de cobrar LP fees si fas un withdraw de LPs
            if (!performancefeeTaken){

                // Fee que li traiem al usuari
                lPsTaken = _amount.mul(pool.withDrawalFeeOfLps).div(10000);

                // L'usuari rebrà els seus LPs menys els que li he tret com a fees.
                finalAmount = _amount.sub(lPsTaken);

                // El withDrawalFeeOfLpsBurn (% sobre lPsTaken) dels LPs serviran per cremar global i fer burn
                // El withDrawalFeeOfLpsTeam (% sobre lPsTaken) dels LPs serviran per operacions

                /* Aquí tenim varies opcions:
                    1) Desfer els LPs i fer ja la operació de BURN o d'enviar al TEAM
                    2) Mantenir els LPs i quan arribem a X quantitat, fer la operació de burn o d'enviar al TEAM

                    QUAN ACABI AIXÒ, HAIG DE FER EL EMERGENCY WITHDRAW I BEN FET!!!!!!!!!!!!!!!!!!!!
                */
            }

            // Al usuari li diem que se li donaran tots els tokens que ha demanat treure de la pool [encara que després restem les fees]
            user.amount = user.amount.sub(_amount);

            // Al usuari li enviem els tokens LP demanats menys els LPs trets, si és el cas
            pool.lpToken.safeTransfer(address(msg.sender), finalAmount);
        }

        // Reards cobrats per l'usuari, considerant els seus LPs restants i el valor acumulat que es paga de rewards per cada LP.
        // OJO a això: com té menys LPs perque li hem cobrat fees, queda guardar com que ha cobrat menys. Pel que després cobrarà més. EXPLOIT A LA VISTA.
        // Hem de fer una nova variable que indiqui el user.rewardDebt ABANS de cobrar-li la fee. Crec que lo més fàcil seria que el user.rewardDebt = user.amount.add(user.amountTakenAsFees).
        user.rewardDebt = user.amount.mul(pool.accNativeTokenPerShare).div(1e12);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // View function to see what kind of fee will be charged
    // Retornem + si cobrarem performance. False si cobrarem dels LPs.
    function withdrawalOrPerformanceFee(uint256 _pid, address _user) public view returns (bool) {
        UserInfo storage user = userInfo[_pid][_user];
        return block.timestamp >= user.withdrawalOrPerformanceFees;
    }

    // falta emergency withdraw i altres!!! OJO BUGS EMERGENCYWITHDRAW!!


    // Update dev address by the previous dev.
    function setDevAddress(address _devAddress) public {
        require(msg.sender == _devAddress, "[f] Dev: You don't have permissions to change the dev address. DRACARYS.");
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

    ///////////////////////////// MODIFICAR I VEURE PERQUÈ SERVEIX!!!!!!!!!!!!!!!!!!!!
    // Pancake has to add hidden dummy pools in order to alter the emission, here we make it simple and transparent to all.
    /* function updateEmissionRate(uint256 _pantherPerBlock) public onlyOwner {
        massUpdatePools();
        emit EmissionRateUpdated(msg.sender, pantherPerBlock, _pantherPerBlock);
        pantherPerBlock = _pantherPerBlock;
    }*/
}

/* // y esot qué cojones?= pq ho fa així enlloc de posar directament la direcció???
    /**
     * @dev Update the swap router.
     * Can only be called by the current operator.

    function updatePantherSwapRouter(address _router) public onlyOperator {
        pantherSwapRouter = IUniswapV2Router02(_router);
        pantherSwapPair = IUniswapV2Factory(pantherSwapRouter.factory()).getPair(address(this), pantherSwapRouter.WETH());
        require(pantherSwapPair != address(0), "PANTHER::updatePantherSwapRouter: Invalid pair address.");
        emit PantherSwapRouterUpdated(msg.sender, address(pantherSwapRouter), pantherSwapPair);
    }


// lock theswap???
//
}*/