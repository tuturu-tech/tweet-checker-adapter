const { Requester, Validator } = require("@chainlink/external-adapter");
require("dotenv").config();
const keccak256 = require("keccak256");
const ethers = require("ethers");
const needle = require("needle");

const token = process.env.TWITTER_BEARER_TOKEN;

//const endpointURL = "https://api.twitter.com/2/tweets?ids=";

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === "Error") return true;
  return false;
};

const customParams = {
  taskId: false,
  promoterId: false,
  timeWindowStart: false,
  timeWindowEnd: false,
  duration: false,
  taskHash: false,
  tweetIds: false,
  endpoint: false,
};

/*const decodeData = (data) => {
  console.log("This is the data received:", data);
  const decodedData = ethers.utils.defaultAbiCoder.decode(
    [
      "uint256 taskId",
      "tuple(uint8 status, uint8 platform, address sponsor, address promoter, uint256 promoterUserId, address erc20Token, uint256 depositAmount, uint256 timeWindowStart, uint256 timeWindowEnd, uint256 persistanceDuration, bytes32 taskHash)",
    ],
    data
  );

  return decodedData;
};*/

const unixToISO = (date) => {
  let unixDate = date;
  let newDate = new Date(unixDate * 1000);
  return newDate.toISOString().split(".")[0] + "Z";
};

/*let testData =
  "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000aac1d92e356144c6b3032297df02897f273c898c000000000000000000000000b498e4a7e01adbbfd5ce0ea5bc67eb208cd5f1dc000000000000000000000000000000000000000000000000135dacc51b57a0040000000000000000000000005df53ca9fa3cd2ddd76261fde51f5578286189ab0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000006186b5cf0000000000000000000000000000000000000000000000000000000061895c95000000000000000000000000000000000000000000000000000000000000000183da950bf0a928aed2c5167ac121d7d59ac9e0a0efa3f4e54ff94218ca6a6a8f";
console.log(decodeData(testData));*/

const hashCheck = (checkUsers, userid, initialHash, tweetArray) => {
  // Map through a list of tweets, returning keccak256 hashed versions
  let hashesArray;

  // Figure out how to use this version for hashing
  //ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [message]));

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

  //const data = validator.validated.data.data;
  //console.log("data: ", data);
  //console.log("CBOR Decode ", cbor.decodeAll(data));
  //const decodedData = decodeData(data);

  let params, endpointURL, hashUserId, unixStartDate, unixEndDate;
  const tweetIds = validator.validated.data.tweetIds;
  const endpoint = validator.validated.data.endpoint;
  const taskId = validator.validated.data.taskId; //decodedData[0].toString();
  const userId = validator.validated.data.promoterId; //decodedData[1].promoterUserId.toString();
  unixEndDate = validator.validated.data.timeWindowEnd; //decodedData[1].timeWindowEnd.toNumber();
  unixStartDate = validator.validated.data.timeWindowStart; //decodedData[1].timeWindowStart.toNumber();
  const tweetHash = validator.validated.data.taskHash; //decodedData[1].taskHash;

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
    console.log("Resbody", res.body);
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
