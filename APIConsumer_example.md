```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

/\*\*

- Request testnet LINK and ETH here: https://faucets.chain.link/
- Find information on LINK Token Contracts and get the latest ETH and LINK faucets here: https://docs.chain.link/docs/link-token-contracts/
  \*/

/\*\*

- THIS IS AN EXAMPLE CONTRACT WHICH USES HARDCODED VALUES FOR CLARITY.
- PLEASE DO NOT USE THIS CODE IN PRODUCTION.
  \*/
  contract APIConsumer is ChainlinkClient {
  using Chainlink for Chainlink.Request;

      bool public twitter;

      address private oracle;
      mapping(string => bytes32) jobIds;
      uint256 private fee;
      string private hash;
      //string[] private multipleHashes;
      string private userId;
      string private tweetId;
      string[] private tweetIds;

      function parseTweetIds(string[] memory _tweetIds) pure internal returns (string memory) {
          string memory result = "";
          for (uint256 i=0; i < _tweetIds.length; i++) {
              result = string(abi.encodePacked(result,",", _tweetIds[i]));
          }
          return result;
      }

      /**
       * Network: Kovan
       * Oracle: 0xc57B33452b4F7BB189bB5AfaE9cc4aBa1f7a4FD8 (Chainlink Devrel
       * Node)
       * Job ID: d5270d1c311941d0b08bead21fea7747
       * Fee: 0.1 LINK
       */
      constructor() {
          setPublicChainlinkToken();
          oracle = 0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b;
          jobIds["Timeline"] = "e5ce0aaf603d4aa2be36b62bb296ce96";
          jobIds["Lookup"] = "438fb98017e94736ba2329964c164a6c";
          fee = 0.1 * 10 ** 18; // (Varies by network and job)
          userId = "1395461422121984004";
          hash = "be3225661372643f19e655841509bb6aaa85c5ae6a3240b5ee0a9f5f3e36b55d";
          tweetId = "1447545650925682696";
      }

      function setTwitterHash(string memory _hash) public {
          hash = _hash;
      }

      function setUserId(string memory _userId) public {
          userId = _userId;
      }

      function setSingleTweetId(string memory _tweetId) public {
          tweetId = _tweetId;
      }

      function setTweetIds(string[] memory _tweetIds) public {
          tweetIds = _tweetIds;
          string memory result = parseTweetIds(tweetIds);
          tweetId = result;
      }

      /**
       * Create a Chainlink request to retrieve API response, find the target
       * data, then multiply by 1000000000000000000 (to remove decimal places from data).
       */
      function requestTwitterTimelineData() public returns (bytes32 requestId)
      {
          Chainlink.Request memory request = buildChainlinkRequest(jobIds["Timeline"], address(this), this.fulfill.selector);


          request.add("userid", "1395461422121984004");
          request.add("tweetHash", hash);
          request.add("endpoint", "user_timeline.json");

          // Sends the request
          return sendChainlinkRequestTo(oracle, request, fee);
      }

      function requestTwitterLookupData() public returns (bytes32 requestId)
      {
          Chainlink.Request memory request = buildChainlinkRequest(jobIds["Lookup"], address(this), this.fulfill.selector);


          request.add("tweetids", tweetId);
          request.add("tweetHash", hash);
          request.add("endpoint", "lookup.json");

          // Sends the request
          return sendChainlinkRequestTo(oracle, request, fee);
      }

      /**
       * Receive the response in the form of uint256
       */
      function fulfill(bytes32 _requestId, bool _twitter) public recordChainlinkFulfillment(_requestId)
      {
          twitter = _twitter;
      }

      // function withdrawLink() external {} - Implement a withdraw function to avoid locking your LINK in the contract

  }
```
