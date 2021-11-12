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
  duration: false,
  data: false,
  endpoint: false,
};

const unixToISO = (date) => {
  let unixDate = date;
  let newDate = new Date(unixDate * 1000);
  return newDate.toISOString().split(".")[0] + "Z";
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
    failedResult;
  const dataObject = validator.validated.data.data;
  const platform = dataObject.platform;
  const metric = dataObject.metric;

  // All tasks have these field in common
  const taskId = validator.validated.data.taskId;
  const minStartTime = 1636489239;
  const maxEndTime = 1920486039;
  unixStartDate = validator.validated.data.timeWindowStart || maxEndTime;
  unixEndDate = validator.validated.data.timeWindowEnd || minStartTime;
  const startTime = unixToISO(unixStartDate);
  const endTime = unixToISO(unixEndDate);
  const endpoint = validator.validated.data.endpoint;

  if (platform == "Twitter") {
    const tweetHash = dataObject.taskHash;
    let userId, tweetIds;

    failedResult = {
      status: 500,
      data: {
        result: {
          taskId: taskId,
          responseStatus: 2, // Error
          score: "",
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
      userId = dataObject.promoterId;
      endpointURL = `https://api.twitter.com/2/users/${userId}/tweets`;
      hashUserId = false;
      params = {
        exclude: "retweets,replies",
        start_time: startTime,
        end_time: endTime,
        "tweet.fields": "public_metrics",
      };
    } else {
      callback(200, Requester.success(jobRunID, failedResult));
      return failedResult;
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
        res.body = {
          status: 200,
          data: {
            result: {
              taskId: taskId,
              responseStatus: 0, // INVALID
              score: "",
            },
          },
        };

        callback(200, Requester.success(jobRunID, res.body));
        return res.body;
      }

      const tweetArr = res.body.data.map((obj) => {
        return obj;
      });

      const hashCheckPassed = hashCheck(
        hashUserId,
        userId,
        tweetHash,
        tweetArr
      );

      res.body.data.result = {
        taskId: taskId,
        responseStatus: hashCheckPassed ? 1 : 0,
        score: res.body.data[0].public_metrics[metric],
      };

      res.body.status = 200;
      callback(200, Requester.success(jobRunID, res.body));
      return res.body;
    } else {
      callback(500, Requester.errored(jobRunID, error));
    }
  } else if (platform == "Discord") {
    // This is hard coded to fetch all the guilds that the bot is in. Only used a proof of concept
    endpointURL = `${moralisServerUrl}/classes/Guild`;
    res = await needle("get", endpointURL, "", {
      headers: {
        "X-Parse-Application-Id": moralisAppId,
        "X-Parse-REST-API-Key": "undefined",
      },
    });

    console.log("Moralis result:", res.body);
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
