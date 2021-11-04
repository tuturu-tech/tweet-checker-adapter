const { Requester, Validator } = require("@chainlink/external-adapter");
require("dotenv").config();
const keccak256 = require("keccak256");
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
};

const createRequest = async (input, callback) => {
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;

  let params;
  let endpointURL;
  const tweetIds = validator.validated.data.tweetIds;
  const endpoint = validator.validated.data.endpoint;
  const userId = validator.validated.data.userId;
  const endTime = validator.validated.data.endTime || "2021-10-30T00:00:01Z";
  const startTime =
    validator.validated.data.startTime || "2021-10-25T00:00:01Z";

  if (endpoint == "TweetLookup") {
    endpointURL = `https://api.twitter.com/2/tweets?ids=`;
    params = {
      ids: tweetIds, // Edit Tweet IDs to look up
      "tweet.fields": "author_id", // Edit optional query parameters here
      "user.fields": "created_at", // Edit optional query parameters here
    };
  } else if (endpoint == "UserTimeline") {
    endpointURL = `https://api.twitter.com/2/users/${userId}/tweets`;
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
    const arr = res.body.data.map((obj) => {
      return obj.text;
    });
    res.body.data.result = arr;
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
