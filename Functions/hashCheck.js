const ethers = require("ethers");

const hashCheck = (checkUsers, userid, initialHash, tweetArray) => {
  let hashesArray;

  if (!checkUsers) {
    hashesArray = tweetArray.map((item) => {
      const userAndText = userid + item.text;
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
  console.log(uniqueHashes);

  // Check if any of the array items matches the initialHash and returns bool
  return uniqueHashes.includes(initialHash);
};

module.exports = hashCheck;
