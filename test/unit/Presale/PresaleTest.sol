const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const TOKEN_SUPPLY = BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const MAX_ANTIWHALE = 15 * 100;

let deployedToken;
// npx hardhat test .\test\unit\MasterChef\MasterChefFees.test.js
beforeEach(async function () {
[owner, addr1, addr2, ...addrs] = await ethers.getSigners();
nativeToken = await ethers.getContractFactory("NativeToken");
deployedToken = await nativeToken.deploy();



presaleSC = await ethers.getContractFactory("Presale");
presaleSCDeployed = await presaleSC.deploy(deployedToken.address, ethers.provider.getBlockNumber(), );

});

describe("NativeToken: After deployment", function () {
it("Should to set the right owner", async function () {
expect(await deployedToken.owner()).to.equal(owner.address);
});

it("Should to assign the total supply of tokens to the owner", async function () {
const ownerBalance = await deployedToken.balanceOf(owner.address);
expect(await deployedToken.totalSupply()).to.equal(ownerBalance);
});

it("Should to have 0 tokens of supply", async function () {
expect(await deployedToken.totalSupply()).to.equal(0);
});

it("Should to exclude from antiwhale the owner, token, burn address and zero address", async function () {
expect(await deployedToken.GetIfExcludedFromAntiWhale(owner.address)).to.true;
expect(await deployedToken.GetIfExcludedFromAntiWhale(deployedToken.address)).to.true;
expect(await deployedToken.GetIfExcludedFromAntiWhale("0x000000000000000000000000000000000000dEaD")).to.true;
expect(await deployedToken.GetIfExcludedFromAntiWhale("0x0000000000000000000000000000000000000000")).to.true;
});

it('TestContract balance should starts with 0 ETH', async () => {

//let expectedBalance = web3.toBigNumber(web3.toWei(3, 'ether'));
//let actualBalance = await web3.eth.getBalance(addr1);
//let actualBalance2 = await ethers.get .getBalance(addr1);// web3.eth.getBalance(addr1);


// const ethers = require('ethers')
const network = 'rinkeby' // use rinkeby testnet
const provider = ethers.getDefaultProvider(network)

let balance = await ethers.provider.getBalance(addr1.address);
console.log("BALANCE: ", ethers.utils.formatEther(balance));

const transactionHash = await addr1.sendTransaction({
to: presaleSCDeployed.address,
value: ethers.utils.parseEther("2.0"),
});

balance = await ethers.provider.getBalance(addr1.address);
console.log("BALANCE: ", ethers.utils.formatEther(balance));
})
});