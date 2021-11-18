const ethers = require("ethers");

// Needs to work with array of values!!
const durationCheck = (duration, createdAt) => {
  const date = new Date(createdAt);
  const unixCreatedAt = Math.floor(date / 1000);
  const timeNow = Math.floor(Date.now() / 1000);
  if (timeNow - unixCreatedAt >= duration) {
    return true;
  } else false;
};

const durationValue = (duration, createdAt) => {
  const date = new Date(createdAt);
  const unixCreatedAt = Math.floor(date / 1000);
  const timeNow = Math.floor(Date.now() / 1000);
  return timeNow - unixCreatedAt;
};

const hashCheck = (
  checkUsers,
  userid,
  initialHash,
  tweetArray,
  duration,
  metricData,
  taskId
) => {
  let matchingItemFound = false;
  let durationReached = false;

  if (!checkUsers) {
    for (let i = 0; i < tweetArray.length; i++) {
      let item = tweetArray[i];
      const userAndText = userid + item.text;
      const hashed = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string"], [userAndText])
      );
      if (initialHash == hashed) {
        console.log("Item:", item.created_at);
        const createdAt = item.created_at;
        matchingItemFound = true;
        if (durationCheck(duration, createdAt)) {
          durationReached = true;
          if (metricData == "Time") {
            metricData = durationValue(duration, createdAt);
          }
        }
        break;
      }
    }
  } else {
    for (let i = 0; i < tweetArray.length; i++) {
      let item = tweetArray[i];
      const userAndText = item.id + item.text;
      const hashed = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string"], [userAndText])
      );
      if (initialHash == hashed) {
        const createdAt = item.created_at;
        matchingItemFound = true;
        if (durationCheck(duration, createdAt)) {
          durationReached = true;
          if (metricData == "Time") {
            metricData = durationValue(duration, createdAt);
          }
        }
        break;
      }
    }
  }

  return {
    taskId: taskId,
    responseStatus: matchingItemFound ? 1 : 0,
    score: durationReached ? metricData : 0,
  };
};

module.exports = hashCheck;
