const { Requester, Validator } = require("@chainlink/external-adapter");
require("dotenv").config();
const keccak256 = require("keccak256");
const ethers = require("ethers");
const needle = require("needle");
const cbor = require("cbor");

const token = process.env.TWITTER_BEARER_TOKEN;

//const endpointURL = "https://api.twitter.com/2/tweets?ids=";

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === "Error") return true;
  return false;
};

const customParams = {
  data: false,
  tweetIds: false,
  endpoint: false,
};

const decodeData = (data) => {
  const decodedData = ethers.utils.defaultAbiCoder.decode(
    [
      "uint256 taskId",
      "tuple(uint8 status, uint8 platform, address sponsor, address promoter, uint256 promoterUserId, address erc20Token, uint256 depositAmount, uint256 timeWindowStart, uint256 timeWindowEnd, uint256 persistanceDuration, bytes32 taskHash)",
    ],
    data
  );

  return decodedData;
};

const unixToISO = (date) => {
  let unixDate = date;
  let newDate = new Date(unixDate * 1000);
  return newDate.toISOString().split(".")[0] + "Z";
};
/*
let testData =
  "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000005b38da6a701c568545dcfcb03fcb875f56beddc40000000000000000000000005b38da6a701c568545dcfcb03fcb875f56beddc400000000000000000000000000000000000000000000000000000000000000010000000000000000000000005b38da6a701c568545dcfcb03fcb875f56beddc4000000000000000000000000000000000000000000000000016345785d8a00000000000000000000000000000000000000000000000000000000000061869ef4000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000016173640000000000000000000000000000000000000000000000000000000000";
console.log(decodeData(testData));*/

const hashCheck = (checkUsers, userid, initialHash, tweetArray) => {
  // Map through a list of tweets, returning keccak256 hashed versions
  let hashesArray;

  if (!checkUsers) {
    hashesArray = tweetArray.map((item) => {
      const userAndText = userid + item.text;
      console.log("ConcatText: ", userAndText);
      return ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string"], [userAndText])
      );
    });
  } else {
    hashesArray = tweetArray.map((item) => {
      const userAndText = item.id + item.text;
      return ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string"], [userAndText])
      );
    });
  }

  let uniqueHashes = [...new Set(hashesArray)];
  console.log("Hashes of tweets:", hashesArray);

  // Check if any of the array items matches the initialHash and returns bool
  return uniqueHashes.includes(initialHash);
};

const createRequest = async (input, callback) => {
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;

  const data = validator.validated.data.data;
  console.log("CBOR Decode ", cbor.decodeAll(data));
  const decodedData = decodeData(data);

  let params, endpointURL, hashUserId, unixStartDate, unixEndDate;
  const tweetIds = validator.validated.data.tweetIds;
  const endpoint = validator.validated.data.endpoint;
  const taskId = decodedData[0].toString();
  const userId = decodedData[1].promoterUserId.toString();
  unixEndDate = decodedData[1].timeWindowEnd.toNumber();
  unixStartDate = decodedData[1].timeWindowStart.toNumber();
  const tweetHash = decodedData[1].taskHash;

  const startTime = unixToISO(unixStartDate);
  const endTime = unixToISO(unixEndDate);
  console.log("userId: ", userId);
  console.log("startDate: ", startTime);
  console.log("endDate: ", endTime);
  console.log("tweetHash: ", tweetHash);
  console.log("taskId:", taskId);

  if (endpoint == "TweetLookup") {
    endpointURL = `https://api.twitter.com/2/tweets?ids=`;
    hashUserId = true;
    params = {
      ids: tweetIds, // Edit Tweet IDs to look up
      "tweet.fields": "author_id", // Edit optional query parameters here
      "user.fields": "created_at", // Edit optional query parameters here
    };
  } else if (endpoint == "UserTimeline") {
    endpointURL = `https://api.twitter.com/2/users/${userId}/tweets`;
    hashUserId = false;
    params = {
      max_results: 5,
      exclude: "retweets,replies",
      start_time: startTime,
      end_time: endTime,
    };
  } else {
    throw new Error("Unsuccessful request");
  }

  // this is the HTTP header that adds bearer token authentication
  const res = await needle("get", endpointURL, params, {
    headers: {
      //"User-Agent": "v2TweetLookupJS",
      authorization: `Bearer ${token}`,
    },
  });

  if (res.body) {
    const tweetArr = res.body.data.map((obj) => {
      return obj;
    });

    const hashCheckPassed = hashCheck(hashUserId, userId, tweetHash, tweetArr);
    console.log("Initial tweet Hash:", tweetHash);

    res.body.data.result = {
      taskId: taskId,
      hashCheckPassed: hashCheckPassed,
    };

    res.body.status = 200;
    callback(200, Requester.success(jobRunID, res.body));
    //console.log(res.body);
    return res.body;
  } else {
    callback(500, Requester.errored(jobRunID, error));
    //throw new Error("Unsuccessful request");
  }
};

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data);
  });
};

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data);
  });
};

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false,
    });
  });
};

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest;
