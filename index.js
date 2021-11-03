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
  //userid: false,
  //tweetHash: false,
  tweetids: false,
  //startTime: false,
  //endTime: false,
  //endpoint: false,
};

/*
const checkHash = (checkUsers, userid, initialHash, tweetArray) => {
  // Map through a list of tweets, returning keccak256 hashed versions
  let hashesArray;

  if (!checkUsers) {
    hashesArray = tweetArray.map((item) => {
      const userAndText = userid.concat(item.text);
      return keccak256(userAndText).toString("hex");
    });
  } else {
    hashesArray = tweetArray.map((item) => {
      const userAndText = item.user_id.concat(item.text);
      return keccak256(userAndText).toString("hex");
    });
  }

  let uniqueHashes = [...new Set(hashesArray)];
  console.log(uniqueHashes);

  // Check if any of the array items matches the initialHash and returns bool
  return uniqueHashes.includes(initialHash);
};
*/

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;

  //Endpoint user_timeline.json is for fetching user timelines
  //Endpoints are: tweets?ids= for Tweet ids
  //               users/${userId}/tweets for user timelines
  //const endpoint =
  //  validator.validated.data.endpoint || `users/${userid}/tweets`;
  //const url = `https://api.twitter.com/2/${endpoint}`;
  const url = `https://api.twitter.com/2/tweets?ids=`;

  //const userid = validator.validated.data.userid;
  //const tweetHash = validator.validated.data.tweetHash;
  const tweetids = validator.validated.data.tweetids;
  //const startTime = validator.validated.data.startTime;
  //const endTime = validator.validated.data.endTime;

  let params;

  params = {
    ids: tweetids,
    "tweet.fields": "author_id",
    "user.fields": "created_at",
  };

  const headers = {
    "User-Agent": "v2TweetLookupJS",
    authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
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
      /*const tweetArray = response.data.map((obj) => {
        return {
          user_id: obj.user.id_str,
          text: obj.full_text,
        };
      });
*/
      //let hashCheck;
      /*if (endpoint == "user_timeline.json") {
        //If we're using the timeline endpoint we don't check the
        hashCheck = checkHash(false, userid, tweetHash, tweetArray);
      } else {
        hashCheck = checkHash(true, tweetHash, tweetArray);
      }

      const result = {
        hashCheck: hashCheck,
        tweetArray: tweetArray,
      };*/
      console.log("Full response data:", response.data);
      response.data.result = "some result";
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
