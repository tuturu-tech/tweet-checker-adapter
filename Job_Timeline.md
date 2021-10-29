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
      bytes32 private jobId;
      uint256 private fee;
      string private hash;
      string private userId;

      constructor() {
          setPublicChainlinkToken();
          oracle = 0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b;
          jobId = "9ec03b54437b4b69abe0a80dcf466b7b";
          fee = 0.1 * 10 ** 18; // (Varies by network and job)
          // Using these default values will return true for the hash check
          userId = "1395461422121984004";
          hash = "c439ccb2d3302c60a935b45df72da04593a7da00dfaa772584c2e5966dc8b1b4";
      }

      function setTwitterHash(string memory _hash) public {
          hash = _hash;
      }

      function setUserId(string memory _userId) public {
          userId = _userId
      }

      function requestTwitterData() public returns (bytes32 requestId)
      {
          Chainlink.Request memory request = buildChainlinkRequest(jobId, address(this), this.fulfill.selector);


          request.add("userid", "1395461422121984004");
          request.add("tweetHash", hash);

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
