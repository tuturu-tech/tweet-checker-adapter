const { Requester, Validator } = require("@chainlink/external-adapter");
require("dotenv").config();
const keccak256 = require("keccak256");

// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === "Error") return true;
  return false;
};

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  userid: ["userid"],
  tweetHash: ["tweetHash"],
  endpoint: false,
};

const checkHash = (initialHash, tweetArray) => {
  // Map through a list of tweets, returning keccak256 hashed versions
  const hashesArray = tweetArray.map((item) => {
    return keccak256(item).toString("hex");
  });

  // Check if any of the array items matches the initialHash and return bool
  return hashesArray.includes(initialHash);
};

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;
  const url = `https://api.twitter.com/1.1/statuses/user_timeline.json`;
  const userid = validator.validated.data.userid;
  const tweetHash = validator.validated.data.tweetHash || "placeholder";

  const params = {
    user_id: userid,
    count: "2",
    exclude_replies: true,
    include_rts: false,
    stringify_ids: true,
  };

  const headers = {
    Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
  };

  // This is where you would add method and headers
  // you can add method like GET or POST and add it to the config
  // The default is GET requests
  // method = 'get'
  // headers = 'headers.....'
  const config = {
    url,
    params,
    headers,
  };

  Requester.request(config, customError)
    .then((response) => {
      const tweetArray = response.data.map((obj) => {
        return obj.text;
      });
      const hashCheck = checkHash(tweetHash, tweetArray);
      const result = {
        hashCheck: hashCheck,
        tweetArray: tweetArray,
      };
      response.data.result = result;
      callback(response.status, Requester.success(jobRunID, response));
    })
    .catch((error) => {
      callback(500, Requester.errored(jobRunID, error));
    });
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
