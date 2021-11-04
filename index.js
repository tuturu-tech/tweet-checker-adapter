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
  tweetIds: false,
  endpoint: false,
  userId: false,
  endTime: false,
  startTime: false,
  tweetHash: false,
};

const hashCheck = (checkUsers, userid, initialHash, tweetArray) => {
  // Map through a list of tweets, returning keccak256 hashed versions
  let hashesArray;

  // Figure out how to use this version for hashing
  //ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [message]));

  if (!checkUsers) {
    hashesArray = tweetArray.map((item) => {
      const userAndText = userid.concat(item.text);
      //return keccak256(userAndText).toString("hex");
      return ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string"], [userAndText])
      );
    });
  } else {
    hashesArray = tweetArray.map((item) => {
      const userAndText = item.id + item.text; //item.user_id.concat(item.text);
      //return keccak256(userAndText).toString("hex");
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

  let params;
  let endpointURL;
  let hashUserId;
  const tweetIds = validator.validated.data.tweetIds;
  const endpoint = validator.validated.data.endpoint;
  const userId = validator.validated.data.userId;
  const endTime = validator.validated.data.endTime || "2021-10-30T00:00:01Z";
  const startTime =
    validator.validated.data.startTime || "2021-10-25T00:00:01Z";
  const tweetHash = validator.validated.data.tweetHash;

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
      return obj.text;
    });

    const hashCheckPassed = hashCheck(hashUserId, userId, tweetHash, tweetArr);
    console.log("Initial tweet Hash:", tweetHash);

    res.body.data.result = {
      tweets: tweetArr,
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
