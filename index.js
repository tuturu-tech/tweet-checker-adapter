const { Requester, Validator } = require("@chainlink/external-adapter");
require("dotenv").config();
const needle = require("needle");

const hashCheck = require("./Functions/hashCheck");

const token = process.env.TWITTER_BEARER_TOKEN;
const moralisAppId = process.env.MORALIS_APP_ID;
const moralisServerUrl = process.env.MORALIS_SERVER_URL;

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
  cliff: false,
  taskData: false,
  userAddress: false,
  user_id: false,
};

const unixToISO = (date) => {
  let unixDate = date;
  let newDate = new Date(unixDate * 1000);
  return newDate.toISOString().split(".")[0] + "Z";
};

// Needs to work with array of values!!
const cliffCheck = (cliff, createdAt) => {
  const date = new Date(createdAt);
  console.log("date:", date);
  const unixCreatedAt = Math.floor(date / 1000);
  console.log("unix:", unixCreatedAt);
  const timeNow = Math.floor(Date.now() / 1000);
  console.log("cliff:", cliff);
  console.log("minus", timeNow - unixCreatedAt);
  if (timeNow - unixCreatedAt >= cliff) {
    return true;
  } else {
    return false;
  }
};

const createRequest = async (input, callback) => {
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;

  let params,
    endpointURL,
    hashUserId,
    unixStartDate,
    unixEndDate,
    res,
    failedResult,
    invalidResult;
  let calldone = false;
  const minAccountAge = 60 * 60 * 24 * 30;
  const dataString = validator.validated.data.taskData;
  //const dataObject = validator.validated.data.taskData; // For testing only
  const dataObject = JSON.parse(dataString);
  const platform = dataObject.platform; // The platform we are checking on
  const metric = dataObject.metric; // The type of metric we're checking (likes, retweets, etc.)
  const endpoint = dataObject.endpoint;

  console.log("Endpoint:", endpoint);
  console.log("dataObject:", dataObject);

  // All tasks have these field in common
  const taskId = validator.validated.data.taskId;
  const minStartTime = 1636489239;
  const maxEndTime = 1920486039;
  unixStartDate = validator.validated.data.timeWindowStart || maxEndTime;
  unixEndDate = validator.validated.data.timeWindowEnd || minStartTime;
  const startTime = unixToISO(unixStartDate);
  const endTime = unixToISO(unixEndDate);
  const cliff = validator.validated.data.cliff || 60 * 60 * 24;

  if (platform == "Twitter") {
    const tweetHash = dataObject.taskHash;
    let userId, tweetIds;

    failedResult = {
      status: 500,
      data: {
        result: {
          taskId: taskId,
          responseStatus: 2, // Error
          score: 0,
        },
      },
    };

    invalidResult = {
      status: 200,
      data: {
        result: {
          taskId: taskId,
          responseStatus: 1, // INVALID
          score: 0,
        },
      },
    };

    if (endpoint == "TweetLookup") {
      tweetIds = dataObject.tweetIds;
      endpointURL = `https://api.twitter.com/2/tweets?ids=`;
      hashUserId = true;
      params = {
        ids: tweetIds, // Edit Tweet IDs to look up
        "tweet.fields": "author_id", // Edit optional query parameters here
        "user.fields": "created_at", // Edit optional query parameters here
      };
    } else if (endpoint == "UserTimeline") {
      userId = BigInt(dataObject.promoterId);
      endpointURL = `https://api.twitter.com/2/users/${userId}/tweets`;
      hashUserId = false;
      params = {
        exclude: "retweets,replies",
        start_time: startTime,
        end_time: endTime,
        "tweet.fields": "public_metrics,created_at",
      };
    } else if (endpoint == "Public") {
      const userAddress = validator.validated.data.userAddress;
      userId = validator.validated.data.user_id;
      console.log("User Address:", userAddress, "User id:", userId);
      endpointURL = `https://api.twitter.com/2/users/${userId}`;
      params = {
        "user.fields": "created_at,public_metrics,description",
      };

      res = await needle("get", endpointURL, params, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const checkAccountAge = cliffCheck(
        minAccountAge,
        res.body.data.created_at
      );
      console.log(checkAccountAge);
      const bioArray = res.body.data.description.split(" ");
      const accountBool = bioArray.includes(userAddress);
      console.log("BIO", bioArray);
      console.log("My account?", accountBool);

      if (bioArray.includes(userAddress) && checkAccountAge) {
        endpointURL = `https://api.twitter.com/2/users/${userId}/tweets`;
        hashUserId = false;
        params = {
          exclude: "retweets,replies",
          start_time: startTime,
          end_time: endTime,
          "tweet.fields": "public_metrics,created_at",
        };
      } else {
        calldone = true;
        callback(200, Requester.success(jobRunID, failedResult));
        return failedResult;
      }
    } else {
      calldone = true;
      callback(200, Requester.success(jobRunID, failedResult));
      return failedResult;
    }

    if (calldone) {
      calldone = false;
      return;
    }

    // this is the HTTP header that adds bearer token authentication
    res = await needle("get", endpointURL, params, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    if (res.body) {
      console.log("Resbody", res.body.data);
      if (!res.body.data) {
        callback(200, Requester.success(jobRunID, invalidResult));
        return invalidResult;
      }

      const tweetArr = res.body.data.map((obj) => {
        return obj;
      });

      res.body.data.result = hashCheck(
        hashUserId,
        userId,
        tweetHash,
        tweetArr,
        cliff,
        metric != "Time" ? res.body.data[0].public_metrics[metric] : "Time",
        taskId
      );

      res.body.status = 200;
      callback(200, Requester.success(jobRunID, res.body));
      return res.body;
    } else {
      callback(500, Requester.errored(jobRunID, error));
    }
  } /* else if (platform == "Discord") {
    // This is hard coded to fetch all the guilds that the bot is in. Only used a proof of concept
    endpointURL = `${moralisServerUrl}/classes/Guild`;
    res = await needle("get", endpointURL, "", {
      headers: {
        "X-Parse-Application-Id": moralisAppId,
        "X-Parse-REST-API-Key": "undefined",
      },
    });

    console.log("Moralis result:", res.body);
  }*/
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
