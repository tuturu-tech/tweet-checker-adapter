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
  timeWindowStart: false,
  timeWindowEnd: false,
  duration: false,
  data: false,
  endpoint: false,
};

const unixToISO = (date) => {
  let unixDate = date;
  let newDate = new Date(unixDate * 1000);
  return newDate.toISOString().split(".")[0] + "Z";
};

const hashCheck = (checkUsers, userid, initialHash, tweetArray) => {
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

  // Check if any of the array items matches the initialHash and returns bool
  return uniqueHashes.includes(initialHash);
};

const createRequest = async (input, callback) => {
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;

  const minStartTime = 1636489239;
  const maxEndTime = 1920486039;
  let params, endpointURL, hashUserId, unixStartDate, unixEndDate;

  const taskId = validator.validated.data.taskId;
  unixStartDate = validator.validated.data.timeWindowStart || maxEndTime;
  unixEndDate = validator.validated.data.timeWindowEnd || minStartTime;
  const startTime = unixToISO(unixStartDate);
  const endTime = unixToISO(unixEndDate);
  const endpoint = validator.validated.data.endpoint;
  const dataObject = validator.validated.data.data;

  const userId = dataObject.promoterId;
  const tweetHash = dataObject.taskHash;
  //const tweetIds = dataObject.tweetIds;

  const failedResult = {
    status: 500,
    data: {
      result: {
        taskId: taskId,
        hashCheckPassed: false,
        callSuccess: false,
        message: "",
        likes: "",
        retweets: "",
        replies: "",
      },
    },
  };

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
      exclude: "retweets,replies",
      start_time: startTime,
      end_time: endTime,
      "tweet.fields": "public_metrics",
    };
  } else {
    failedResult.data.result.message = "Wrong endpoint used";
    callback(200, Requester.success(jobRunID, failedResult));
    return failedResult;
  }

  // this is the HTTP header that adds bearer token authentication
  const res = await needle("get", endpointURL, params, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (res.body) {
    console.log("Resbody", res.body.data);
    if (!res.body.data) {
      res.body = {
        status: 200,
        data: {
          result: {
            taskId: taskId,
            hashCheckPassed: false,
            callSuccess: true,
            message: "No tweets found",
            likes: "",
            retweets: "",
            replies: "",
          },
        },
      };

      callback(200, Requester.success(jobRunID, res.body));
      return res.body;
    }

    const tweetArr = res.body.data.map((obj) => {
      return obj;
    });

    const hashCheckPassed = hashCheck(hashUserId, userId, tweetHash, tweetArr);

    res.body.data.result = {
      taskId: taskId,
      hashCheckPassed: hashCheckPassed,
      callSuccess: true,
      message: "",
      likes: res.body.data[0].public_metrics.like_count,
      retweets: res.body.data[0].public_metrics.retweet_count,
      replies: res.body.data[0].public_metrics.reply_count,
    };

    res.body.status = 200;
    callback(200, Requester.success(jobRunID, res.body));
    return res.body;
  } else {
    callback(500, Requester.errored(jobRunID, error));
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
