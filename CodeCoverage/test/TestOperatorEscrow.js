/* Contracts  */
const ContractManager = artifacts.require("./ContractManager.sol");
const HashFunctions = artifacts.require("./HashFunctions.sol");
const InitialVariables = artifacts.require("./InitialVariables.sol");
const OracleHub = artifacts.require('./OracleHub.sol');
const Owned = artifacts.require("./Owned.sol");
const Database = artifacts.require("./Database.sol");
const OperatorEscrow = artifacts.require('./OperatorEscrow.sol');
const UserAccess = artifacts.require('./UserAccess.sol');
const MyBitToken = artifacts.require('./MyBitToken.sol');
const AssetCreation = artifacts.require('./AssetCreation.sol');
const Asset = artifacts.require('./Asset.sol');
const FundingHub = artifacts.require('./FundingHub.sol');
const StakingBank = artifacts.require('./StakingBank.sol');


contract('Deploying and storing all contracts + validation', async (accounts) => {
  const ownerAddr1 = web3.eth.accounts[0];
  const ownerAddr2 = web3.eth.accounts[1];
  const ownerAddr3 = web3.eth.accounts[2];

  const assetCreator = web3.eth.accounts[3];
  const funder1 = web3.eth.accounts[4];
  const funder2 = web3.eth.accounts[5];

  // addresses for validation
  const funderNotApproved = web3.eth.accounts[6];
  const notEscrowed = web3.eth.accounts[7];
  const contractMimik = web3.eth.accounts[10];

  const myBitPayoutAddress = web3.eth.accounts[8];
  const assetEscrowPayoutAddress = web3.eth.accounts[9];

  let contractManagerInstance;
  let hfInstance;
  let initialVariableInstance;
  let oracleHubInstance;
  let ownedInstance;
  let dbInstance;
  let operatorEscrowInstance;
  let userAccessInstance;
  let myBitTokenInstance;
  let assetCreationInstance;
  let assetInstance;
  let fundingHubInstance;
  let stakingBankInstance;


  var initialSupply;
  var transferAmount;
  var approvalAmount;

  let amountToBeRaised = 500; // USD
  let operatorPercentage = 5;   // 5%
  let assetID;
  let installerID;
  let assetType;

  let amountMyBRequired;

  it("Owners should be assigned", async () => {
     dbInstance = await Database.new(ownerAddr1, ownerAddr2, ownerAddr3);
     hfInstance = await HashFunctions.new();

     // Database Owners assigned properly
     assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('owner', ownerAddr1)), true, 'Owner 1 assigned properly');
     assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('owner', ownerAddr2)), true, 'Owner 2 assigned properly');
     assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('owner', ownerAddr3)), true, 'Owner 3 assigned properly');
   });

   it('Assign ContractManager', async () => {
      contractManagerInstance = await ContractManager.new(dbInstance.address);

      await dbInstance.setContractManager(contractManagerInstance.address);
      assert.equal(await dbInstance.addressStorage(await hfInstance.stringString("contract", "ContractManager")),contractManagerInstance.address, 'Contract manager address equal');
      assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress("contract", contractManagerInstance.address)), true, 'Contract manager stored true');
   });

   it('Add InitialVariables contract to database via contract manager', async () => {
    initialVariableInstance = await InitialVariables.new(dbInstance.address);
    // Check that initialvariables database address is correct compared to real database address
    assert.equal(await initialVariableInstance.database(), await dbInstance.address, 'Initial Variables database Address assigned properly');

    // Add initialvariables contract to database and validate all fields are updated with correct outcome
    await contractManagerInstance.addContract('InitialVariables', initialVariableInstance.address, ownerAddr2);
    assert.equal(await dbInstance.boolStorage(await hfInstance.getAuthorizeHash(contractManagerInstance.address, ownerAddr2, 'addContract', await hfInstance.addressHash(initialVariableInstance.address))), false, 'Contract manager to database === false');
    assert.equal(await dbInstance.addressStorage(await hfInstance.stringString('contract', 'InitialVariables')), initialVariableInstance.address, 'Initial variables address correctly stored');
    assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('contract', initialVariableInstance.address)), true, 'Initial variables address == true');
   });

   it('Initialize InitialVariables  variables via startDapp', async () => {
     await initialVariableInstance.startDapp(myBitPayoutAddress, assetEscrowPayoutAddress);
     //--------------------Asset Creation Variables-----------------
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringHash('myBitFoundationPercentage')), 1, 'myBitFoundationPercentage == 1');
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringHash('stakedTokenPercentage')), 2, 'myBitFoundationPercentage == 2');
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringHash('installerPercentage')), 97, 'installerPercentage == 97');
   });

    it('Owned deployment ', async () => {
      ownedInstance = await Owned.new(dbInstance.address);

      // Ensure all variables are set in constructor and passed
      assert.equal(await ownedInstance.database(), await dbInstance.address, 'Owned database Address assigned properly');

      await contractManagerInstance.addContract('Owned', ownedInstance.address, ownerAddr2);
      assert.equal(await dbInstance.boolStorage(await hfInstance.getAuthorizeHash(contractManagerInstance.address, ownerAddr2, 'addContract', await hfInstance.addressHash(ownedInstance.address))), false, 'Contract manager(Owned) to database === false');
      assert.equal(await dbInstance.addressStorage(await hfInstance.stringString('contract', 'Owned')), ownedInstance.address, 'Owned address correctly stored');
      assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('contract', ownedInstance.address)), true, 'Owned address == true');
    });

   it('oracleHubInstance contract deployment ', async () => {
     oracleHubInstance = await OracleHub.new(dbInstance.address);
     await contractManagerInstance.addContract('OracleHub', oracleHubInstance.address, ownerAddr2);
     assert.equal(await dbInstance.boolStorage(await hfInstance.getAuthorizeHash(contractManagerInstance.address, ownerAddr2, 'addContract', await hfInstance.addressHash(oracleHubInstance.address))), false, 'Contract manager(OracleHub) to database === false');
     assert.equal(await dbInstance.addressStorage(await hfInstance.stringString('contract', 'OracleHub')), oracleHubInstance.address, 'OracleHub address correctly stored');
     assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('contract', oracleHubInstance.address)), true, 'OracleHub address == true');
   });

   it('MyBitToken contract deployment ', async () => {
     initialSupply = 281207344012426;
     myBitTokenInstance = await MyBitToken.new(initialSupply, 'MyBit Token', 8, 'MyB',{from:ownerAddr1});

     assert.equal(await myBitTokenInstance.owner(), web3.eth.accounts[0], 'MyBitToken -  owner assigned');
     assert.equal(await myBitTokenInstance.balanceOf(web3.eth.accounts[0]), initialSupply, 'MyBitToken - Correct initial balance to owner');
     assert.equal(await myBitTokenInstance.totalSupply(), initialSupply, 'MyBitToken - Correct total supply');
     assert.equal(await myBitTokenInstance.name(), 'MyBit Token', 'MyBitToken - Correct token name');
     assert.equal(await myBitTokenInstance.symbol(), 'MyB', 'MyBitToken - Correct Token symbol');
     assert.equal(await myBitTokenInstance.decimals(), 8, 'MyBitToken - Correct decimals');
   });


   it('UserAccess deployment ', async () => {
     userAccessInstance = await UserAccess.new(dbInstance.address);
     assert.equal(await userAccessInstance.database(), await dbInstance.address, 'UserAccess database Address assigned properly');
     await contractManagerInstance.addContract('UserAccess', userAccessInstance.address, ownerAddr2);
     assert.equal(await dbInstance.boolStorage(await hfInstance.getAuthorizeHash(contractManagerInstance.address, ownerAddr2, 'addContract', await hfInstance.addressHash(userAccessInstance.address))), false, 'Contract manager(UserAccess) to database === false');
     assert.equal(await dbInstance.addressStorage(await hfInstance.stringString('contract', 'UserAccess')), userAccessInstance.address, 'UserAccess address correctly stored');
     assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('contract', userAccessInstance.address)), true, 'UserAccess address == true');
   });

   it('AssetCreation deployment', async () => {
     assetCreationInstance = await AssetCreation.new(dbInstance.address);
     await contractManagerInstance.addContract('AssetCreation', assetCreationInstance.address, ownerAddr2);
     // Funding Hub contract
     fundingHubInstance = await FundingHub.new(dbInstance.address);
     await contractManagerInstance.addContract('FundingHub', fundingHubInstance.address, ownerAddr2);
     // Asset Contract
     assetInstance = await Asset.new(dbInstance.address);
     await contractManagerInstance.addContract('Asset', assetInstance.address, ownerAddr2);
     // Staking Bank Contract
     stakingBankInstance = await StakingBank.new(dbInstance.address);
     await contractManagerInstance.addContract('StakingBank', stakingBankInstance.address, ownerAddr2);

    await contractManagerInstance.addContract('testContract', contractMimik, ownerAddr2);
    assert.equal(await dbInstance.addressStorage(await hfInstance.stringString('contract', 'testContract')), contractMimik, 'testContract set');

   });

   it('operatorEscrowInstance contract deployment ', async () => {
     operatorEscrowInstance = await OperatorEscrow.new(dbInstance.address, myBitTokenInstance.address);
     await contractManagerInstance.addContract('OperatorEscrow', operatorEscrowInstance.address, ownerAddr2);
     assert.equal(await dbInstance.boolStorage(await hfInstance.getAuthorizeHash(contractManagerInstance.address, ownerAddr2, 'addContract', await hfInstance.addressHash(operatorEscrowInstance.address))), false, 'Contract manager(OperatorEscrow) to database === false');
     assert.equal(await dbInstance.addressStorage(await hfInstance.stringString('contract', 'OperatorEscrow')), operatorEscrowInstance.address, 'OperatorEscrow address correctly stored');
     assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('contract', operatorEscrowInstance.address)), true, 'OperatorEscrow address == true');
   });

   it('Manually Approve user', async () => {
     await userAccessInstance.approveUser(notEscrowed, 2);
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringAddress('userAccess', notEscrowed)), 2, 'Access 2 granted');

     await userAccessInstance.approveUser(assetCreator, 2);
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringAddress('userAccess', assetCreator)), 2, 'Access 2 granted');

     await userAccessInstance.approveUser(funder1, 2);
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringAddress('userAccess', funder1)), 2, 'Access 2 granted');

     await userAccessInstance.approveUser(funder2, 2);
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringAddress('userAccess', funder2)), 2, 'Access 2 granted');
   });

   it('Transfer tokens to user', async () => {
     let balanceOfOwnerBefore = parseInt(await myBitTokenInstance.balanceOf(ownerAddr1));
     let balanceOfAccess1Before = parseInt(await myBitTokenInstance.balanceOf(assetCreator));
     assert.equal(balanceOfOwnerBefore, initialSupply, 'Owner has full initial supply');
     assert.equal(balanceOfAccess1Before, 0, 'assetCreator has 0 initial supply');

     transferAmount = 304954;
     await myBitTokenInstance.transfer(assetCreator, transferAmount,{from:ownerAddr1}); //transfer tokens for escrow

     let balanceOfOwnerAfterTransfer = parseInt(await myBitTokenInstance.balanceOf(ownerAddr1));
     let balanceOfAccess1AfterTransfer = parseInt(await myBitTokenInstance.balanceOf(assetCreator));
     assert.equal(balanceOfOwnerAfterTransfer, Number(initialSupply) - Number(transferAmount), 'Owner has been deducted transfer amount');
     assert.equal(balanceOfAccess1AfterTransfer, transferAmount, 'assetCreator has transfer tokens amount');
   });

   it('Approve escrow to transfer', async () => {
     approvalAmount = transferAmount - 1000;
     await myBitTokenInstance.approve(operatorEscrowInstance.address, approvalAmount,{from:assetCreator});
     let allowance = parseInt(await myBitTokenInstance.allowance(assetCreator, operatorEscrowInstance.address));
     assert.equal(allowance, approvalAmount, 'Approval granted');
   });

   it('Deposit Escrow', async () => {
     // Modifier Check
     let funderNotApprovedModifier = null;
     try {await operatorEscrowInstance.depositEscrow(500,{from:funderNotApproved});}
     catch (error) {funderNotApprovedModifier = error}
     assert.notEqual(funderNotApprovedModifier, null, 'modifier funderNotApproved');
     // Require check
     let depositEscrowRequire = null;
     try {await operatorEscrowInstance.depositEscrow(approvalAmount+5000,{from:assetCreator});}
     catch (error) {depositEscrowRequire = error}

     assert.notEqual(depositEscrowRequire,null, 'deposit require too many tokens');
     await operatorEscrowInstance.depositEscrow(approvalAmount,{from:assetCreator});
     let operatorAmountDeposited = await dbInstance.uintStorage(await hfInstance.stringAddress('operatorAmountDeposited', assetCreator));
     assert.equal(operatorAmountDeposited, approvalAmount, 'Account escrow value updated');
   });

   /*
      Setting this manually as oraclizehub has been tested and is fully functional,
      if we were not to set it manually the test would rely on events and results
      in unecessary work.  In this test we are testing the operator functionality,
      not that of OraclizeHub which can be seen in; TestOraclize.js .
   */
   it('Add dummy account as a contract', async () => {
     await contractManagerInstance.addContract('TestContractMimic', ownerAddr1, ownerAddr2);
     assert.equal(await dbInstance.addressStorage(await hfInstance.stringString('contract', 'TestContractMimic')), ownerAddr1, 'TestContractMimic correctly stored');
     assert.equal(await dbInstance.boolStorage(await hfInstance.stringAddress('contract', ownerAddr1)), true, 'ownerAddr1 address == true');
   });

   it('Manually add Eth & MyB USD value', async () => {
     await dbInstance.setUint(await hfInstance.stringHash('mybUSDPrice'), 3000);
     await dbInstance.setUint(await hfInstance.stringHash('ethUSDPrice'), 380);
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringHash('mybUSDPrice')), 3000, 'mybUSDPrice set correctly');
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringHash('ethUSDPrice')), 380, 'ethUSDPrice set correctly');

     await dbInstance.setUint(await hfInstance.stringHash('mybUSDPriceExpiration'), 1544015678); //1544015678 - 12 months ahead
     await dbInstance.setUint(await hfInstance.stringHash('ethUSDPriceExpiration'), 1544015678); //1544015678 - 12 months ahead
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringHash('mybUSDPriceExpiration')), 1544015678, 'mybUSDPrice set correctly');
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringHash('ethUSDPriceExpiration')), 1544015678, 'ethUSDPrice set correctly');
   });


   it('Create asset', async () => {
     assetType = await hfInstance.stringHash('BitcoinATM');
     installerID =  await hfInstance.stringHash('installerID');
     assetID = await hfInstance.stringHash('TestAsset');
     let mybUSDPrice = await dbInstance.uintStorage(await hfInstance.stringHash("mybUSDPrice"));
     await assetCreationInstance.newAsset(assetID, amountToBeRaised, operatorPercentage, installerID, assetType, {from:assetCreator});

     amountMyBRequired = await dbInstance.uintStorage(await hfInstance.stringBytes("assetEscrowRequirement", assetID));
     let myBPrice = await dbInstance.uintStorage(await hfInstance.stringHash('mybUSDPrice'));
     let addressAssigned = await dbInstance.addressStorage(await hfInstance.stringBytes("operatorEscrowed", assetID));
     let operatorEscrowedAmount = await dbInstance.uintStorage(await hfInstance.stringAddress('operatorAmountEscrowed', assetCreator));

     let requiredAmount = parseInt((amountToBeRaised*100)/myBPrice);

     assert.equal(parseInt(await dbInstance.uintStorage(await hfInstance.stringAddress('operatorAmountEscrowed', assetCreator))), amountMyBRequired, 'escrow deposited');
     assert.equal(parseInt(amountMyBRequired), requiredAmount, 'escrow correctly set');
     assert.equal(addressAssigned, assetCreator, 'asset creator assigned to asset');
     assert.equal(parseInt(operatorEscrowedAmount), requiredAmount, 'operatorEscrowedAmount updated');

     assert.equal(await dbInstance.uintStorage(await hfInstance.stringBytes("amountToBeRaised", assetID)), amountToBeRaised,'amountToBeRaised asset set');
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringBytes("operatorPercentage", assetID)), operatorPercentage, 'operatorPercentage asset set');
     assert.equal(await dbInstance.addressStorage(await hfInstance.stringBytes("assetOperator", assetID)), assetCreator, 'assetOperator asset set');
     assert.equal(await dbInstance.uintStorage(await hfInstance.stringBytes("fundingStage", assetID)), 1, 'fundingStage asset set');
   });

   it('Fund asset', async () => {
     let amountToBeRaised = await dbInstance.uintStorage(await hfInstance.stringBytes("amountToBeRaised", assetID));
     let ethUSDPrice = await dbInstance.uintStorage(await hfInstance.stringHash('ethUSDPrice'));

     let halfOfUSDValueInEth = ((amountToBeRaised / ethUSDPrice) / 2);

     await fundingHubInstance.fund(assetID, ethUSDPrice, {from:funder1, value:web3.toWei(halfOfUSDValueInEth,'ether')});
     await fundingHubInstance.fund(assetID, ethUSDPrice, {from:funder2, value:web3.toWei(halfOfUSDValueInEth,'ether')});
    });

    it('Asset transition to stage 4', async () => {
     assert.equal(parseInt(await dbInstance.uintStorage(await hfInstance.stringBytes('fundingStage', assetID))), 3, 'Funding stage == 3');
     await fundingHubInstance.payout(assetID);
     assert.equal(parseInt(await dbInstance.uintStorage(await hfInstance.stringBytes('fundingStage', assetID))), 4, 'Stage set to 4, ready for payments');
    });

   it('Asset recieves funding', async () => {
     let etherAmountToFund = 1;
     await assetInstance.receiveIncome(assetID, '', {value:web3.toWei(etherAmountToFund,'ether')});
   });

   it('Get Unlocked amount', async () => {
     let unlockedBalance = parseInt(await operatorEscrowInstance.getUnlockedBalance(assetCreator));
     assert.equal(unlockedBalance, Number(approvalAmount)-Number(amountMyBRequired), 'correct amount still escrowed');
    });

  it('withdrawToken ', async () => {
    // Modifier Check
    let funderNotApprovedModifier = null;
    try {await operatorEscrowInstance.withdrawToken(500,{from:funderNotApproved});}
    catch (error) {funderNotApprovedModifier = error}
    assert.notEqual(funderNotApprovedModifier, null, 'modifier funderNotApproved');

    let unlockedBalance = parseInt(await operatorEscrowInstance.getUnlockedBalance(assetCreator));
    let contractBalance = parseInt(await myBitTokenInstance.balanceOf(operatorEscrowInstance.address));

    // assert operator
    let unlockedBalanceTooLittle = null;
    try {await operatorEscrowInstance.withdrawToken(unlockedBalance+5000,{from:assetCreator});}
    catch (error) {unlockedBalanceTooMuch = error}
    assert.notEqual(unlockedBalanceTooMuch, null, 'amount too high for unlocked balance');

    let depositedBalanceTooLittle = null;
    try {await operatorEscrowInstance.withdrawToken(depositedAmount+5000,{from:assetCreator});}
    catch (error) {depositedBalanceTooLittle = error}
    assert.notEqual(depositedBalanceTooLittle, null, 'amount too high for deposited amount');

    await operatorEscrowInstance.withdrawToken(unlockedBalance,{from:assetCreator});
    let mybBalanceOperator = parseInt(await myBitTokenInstance.balanceOf(assetCreator));
    let escrowBalance = parseInt(await myBitTokenInstance.balanceOf(operatorEscrowInstance.address));

    let shouldBeBalance = transferAmount - amountMyBRequired;
    assert.equal(mybBalanceOperator, shouldBeBalance, 'tokens given back to oeprator after withdrawal');
    assert.equal(escrowBalance, amountMyBRequired, 'tokens removed from escrow');
   });

   it('Unlock escrow', async () => {
     // Modifier Check
     let funderNotApprovedModifier = null;
     try {await operatorEscrowInstance.unlockEscrow(assetID,{from:funderNotApproved});}
     catch (error) {funderNotApprovedModifier = error}
     assert.notEqual(funderNotApprovedModifier, null, 'modifier funderNotApproved');

     // require operator
     let operatorEscrowedRequire = null;
     try {await operatorEscrowInstance.unlockEscrow(assetID,{from:notEscrowed});}
     catch (error) {operatorEscrowedRequire = error}
     assert.notEqual(operatorEscrowedRequire, null, 'not escrowed');

     let fundingStageBeforeAssert = await dbInstance.uintStorage(await hfInstance.stringBytes("fundingStage", assetID));

     // funding stage assert
     let fundingStageAssert = null;
     try {
       await dbInstance.setUint(await hfInstance.stringBytes("fundingStage", assetID),1,{from:contractMimik});       // set contract funding to 1
       assert.equal(dbInstance.uintStorage(await hfInstance.stringBytes("fundingStage", assetID)), 1, 'changed to 1');
       await operatorEscrowInstance.unlockEscrow(assetID,{from:assetCreator});}
     catch (error) {fundingStageAssert = error}
     assert.notEqual(fundingStageAssert, null, 'funding stage assert');

     // update funding stage back to normal
     await dbInstance.setUint(await hfInstance.stringBytes("fundingStage", assetID),fundingStageBeforeAssert,{from:contractMimik});       // set contract funding to to normal

     await dbInstance.setUint(await hfInstance.stringBytes('fundingStage', assetID), 2);
     let fundingStage = await dbInstance.uintStorage(await hfInstance.stringBytes('fundingStage', assetID));
     assert.equal(fundingStage, 2, 'fundingStage updated to withdraw');
     await operatorEscrowInstance.unlockEscrow(assetID,{from:assetCreator});
     let operatorAmountEscrowed = parseInt(await dbInstance.uintStorage(await hfInstance.stringAddress("operatorAmountEscrowed", assetCreator)));
     let operatorAmountDeposited = parseInt(await dbInstance.uintStorage(await hfInstance.stringAddress("operatorAmountDeposited", assetCreator)));
     assert.equal(operatorAmountEscrowed, 0, 'unlocked funds');
     assert.equal(operatorAmountDeposited, parseInt(amountMyBRequired), 'funds back in deposit - can withdraw');
   });

   it('Withdraw funds unlocked', async () => {
     let unlockedBalance = parseInt(await operatorEscrowInstance.getUnlockedBalance(assetCreator));
     let balanceBefore = parseInt(await myBitTokenInstance.balanceOf(assetCreator));
     await operatorEscrowInstance.withdrawToken(unlockedBalance,{from:assetCreator});
     let mybBalanceOperator = parseInt(await myBitTokenInstance.balanceOf(assetCreator));
     let escrowBalance = parseInt(await myBitTokenInstance.balanceOf(operatorEscrowInstance.address));
     assert.equal(mybBalanceOperator, balanceBefore + unlockedBalance, 'tokens given back to oeprator after withdrawal');
     assert.equal(escrowBalance, 0, 'tokens removed from escrow');
   });


    it('Fallback function', async () => {
      let err = null
      try {
        await operatorEscrowInstance.sendTransaction({from:web3.eth.coinbase,value:web3.toWei(0.1,'ether')});
      } catch (error) {
        err = error
      }
      assert.ok(err instanceof Error)
    });

});
