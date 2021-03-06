pragma solidity 0.4.23;

import './oraclizeAPI_05.sol';
import './Database.sol';
import './SafeMath.sol';

//------------------------------------------------------------------------------------------------------------------
// All calls to Oraclize can be done here. The results are stored in Databse and expire after x seconds.
// Can find price expiration time under keccak256("priceUpdateTimeline") in the Database
//------------------------------------------------------------------------------------------------------------------
contract OracleHub is usingOraclize{
  using SafeMath for *;

  Database public database;

  address OAR;

  //------------------------------------------------------------------------------------------------------------------
  // Constructor: Initialized database + Oraclize Address Resolver
  //------------------------------------------------------------------------------------------------------------------
  constructor(address _database)
  public {
    database = Database(_database);
    OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475); // only for localhost
  }

  //------------------------------------------------------------------------------------------------------------------
  // TODO: get price of call
  // Asks oraclize what the current price of Ether in USD is
  //------------------------------------------------------------------------------------------------------------------
  function ethUSDQuery()
  external
  payable
  requiresEther
  returns (bool) {
    bytes32 queryID = oraclize_query('URL', 'json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd');
    database.setBool(queryID, true);
    emit LogEthUSDQuery(msg.sender, queryID, now);
    return true;
  }

  //------------------------------------------------------------------------------------------------------------------
  // TODO: get price of call
  // Asks oraclzie what the current price of MyBit in USD is
  //------------------------------------------------------------------------------------------------------------------
  function mybUSDQuery()
  external
  payable
  requiresEther
  returns(bool){
    bytes32 queryID = oraclize_query('nested', '[WolframAlpha]  10 to the power of 3 multiplied by ${[URL] json(https://api.coinmarketcap.com/v1/ticker/mybit-token/).0.price_usd}');
    emit LogMybUSDQuery(msg.sender, queryID, now);
    return true;
  }

  //------------------------------------------------------------------------------------------------------------------
  // Oraclize will call this function when it gets requested information.
  // If ID == bool then the callback is for Ether/USD callback
  //------------------------------------------------------------------------------------------------------------------
  function __callback(bytes32 myid, string result)
  public
  isOraclize {
    if (database.boolStorage(myid)) {
      ethUSDCallback(myid, result);
    }
    else {
      mybUSDCallback(myid, result);
    }
  }

  //------------------------------------------------------------------------------------------------------------------
  // Callback for Ether/USD price requests. Stores current price and expiration time for this price
  //------------------------------------------------------------------------------------------------------------------
  function ethUSDCallback(bytes32 myid, string result)
  internal {
    uint priceTimeline = database.uintStorage(keccak256("priceUpdateTimeline"));
    database.setUint(keccak256("ethUSDPrice"), parseInt(result));
    database.setUint(keccak256("ethUSDPriceExpiration"), (priceTimeline + now));
    database.deleteBool(myid);
    emit LogEthUSDCallbackReceived(myid, parseInt(result), now);
  }

  //------------------------------------------------------------------------------------------------------------------
  // Callback for MyBit/USD price requests. Stores current price and expiration time for this price.
  //------------------------------------------------------------------------------------------------------------------
  function mybUSDCallback(bytes32 myid, string result)
  internal {
    uint priceTimeline = database.uintStorage(keccak256("priceUpdateTimeline"));
    uint oldPrice = parseInt(result);
    database.setUint(keccak256("mybUSDPrice"), oldPrice.div(36));
    database.setUint(keccak256("mybUSDPriceExpiration"), (priceTimeline + now));
    emit LogMYBUSDCallbackReceived(myid, parseInt(result), now);
  }


  //------------------------------------------------------------------------------------------------------------------
  //                                            Modifiers
  //------------------------------------------------------------------------------------------------------------------


  //------------------------------------------------------------------------------------------------------------------
  // Veriies that sender is Oraclize
  //------------------------------------------------------------------------------------------------------------------
  modifier isOraclize() {
   require(msg.sender == oraclize_cbAddress());
   _;
  }

  //------------------------------------------------------------------------------------------------------------------
  // Veriies that sender is Oraclize
  //------------------------------------------------------------------------------------------------------------------
  modifier requiresEther() {
    require(msg.value > 0);
    _;
  }

  //------------------------------------------------------------------------------------------------------------------
  //                                            Events
  //------------------------------------------------------------------------------------------------------------------

  event LogMybUSDQuery( address _from, bytes32 _queryID, uint _timestamp);
  event LogEthUSDQuery(address _funder, bytes32 _queryID, uint _timestamp);
  event LogMYBUSDCallbackReceived(bytes32 _queryID, uint _tokenPrice, uint _timestamp);
  event LogEthUSDCallbackReceived(bytes32 queryID, uint _result, uint _timestamp);
}
