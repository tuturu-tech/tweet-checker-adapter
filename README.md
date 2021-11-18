## Creating your own adapter from this

Clone this repo and change "Tweet-EA" below to the name of your project

```bash
git clone https://github.com/tuturu-tech/tweet-checker-adapter Tweet-EA
```

Enter into the newly-created directory

```bash
cd Tweet-EA
```

You can remove the existing git history by running:

```bash
rm -rf .git
```

See [Install Locally](#install-locally) for a quickstart

## Input Params

- `endpoint`: The endpoint you want to use. Supported enpoints below.

1. User Timeline endpoint: `user_timeline.json`

- `userid`: The id of the Twitter user
- `tweetHash`: The Keccak256 hash of the tweet text
- `count`: (optional) The amount of tweets to fetch from the user timeline, starting with the latest one.
  _Default is 1._

2. Tweet lookup endpoint: `lookup.json`

- `tweetHash`: The Keccak256 hash of the tweet user id + tweet text
- `tweetids`: An array of tweet ids

## Output

```json
{
  "jobRunID": "9ec03b54-437b-4b69-abe0-a80dcf466b7b",
  "result": { "hashCheck": true, "tweetArray": [] },
  "statusCode": 200
}
```

## Use external adapter

1. Using the user timeline Job. Must provide userId and tweetHash

- oracle address: 0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b
- jobId: e5ce0aaf603d4aa2be36b62bb296ce96
- fee = 0.1 \* 10 \*\*18

2. Using the tweet Lookup Job. Must provide tweetids and tweetHash

- oracle address: 0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b
- jobId: 438fb98017e94736ba2329964c164a6c
- fee = 0.1 \* 10 \*\*18

[Contract_Example](APIConsumer_example.md)
[Job_definitions](JobSpec.md)

## Install Locally

Install dependencies:

```bash
yarn
```

### Test

Run the local tests:

```bash
yarn test
```

Natively run the application (defaults to port 8080):

### Run

```bash
yarn start
```

## Call the external adapter/API server locally

Takes in a userid and a hash and looks up the users' latest tweet, hashes the text and compares it with the inputed hash.

Task creation for testing purposes:
"1","0xB498e4A7E01ADbBfd5Ce0Ea5bC67eB208cd5f1dC","1395461422121984004","0x62a2BA2cf2DeAabA6CdBF4E49765575d13Fc6083","1000000000000000000","1634218319","1638392085","1","0x83da950bf0a928aed2c5167ac121d7d59ac9e0a0efa3f4e54ff94218ca6a6a8f"

Takes in a tweet id and fetches the tweet text and author username, hashes it and compares with inputed hash.

curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"endpoint": "Discord" } }'

SUCCESS

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"taskId": "0", "timeWindowStart": "1634218319", "timeWindowEnd": "1638392085", "taskData": { "promoterId": "1395461422121984004","taskHash": "0x83da950bf0a928aed2c5167ac121d7d59ac9e0a0efa3f4e54ff94218ca6a6a8f", "platform": "Twitter", "metric": "like_count", "endpoint": "UserTimeline" } } }'
```

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"taskId": "0", "timeWindowStart": "1634218319", "timeWindowEnd": "1638392085", "taskData": {"taskHash": "0x83da950bf0a928aed2c5167ac121d7d59ac9e0a0efa3f4e54ff94218ca6a6a8f", "platform": "Twitter", "metric": "like_count", "endpoint": "Public" }, "userAddress": "0xB498e4A7E01ADbBfd5Ce0Ea5bC67eB208cd5f1dC", "user_id": "1395461422121984004"  } }'
```

FAIL

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"taskId": "0", "promoterId": "1395461422121984004", "timeWindowStart": "1637218319", "timeWindowEnd": "1638392085", "taskHash": "0xbe611fa9e3a341d1f59df049685fb42c9d7d2dadc0765019c5490335f21f9818", "endpoint": "UserTimeline" } }'
```

NO START TIME

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"taskId": "0", "promoterId": "1395461422121984004", "timeWindowEnd": "1638392085", "taskHash": "0xbe611fa9e3a341d1f59df049685fb42c9d7d2dadc0765019c5490335f21f9818", "endpoint": "UserTimeline" } }'
```

WRONG ENDPOINT

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"taskId": "0", "promoterId": "1395461422121984004", "timeWindowEnd": "1638392085", "taskHash": "0xbe611fa9e3a341d1f59df049685fb42c9d7d2dadc0765019c5490335f21f9818", "endpoint": "something" } }'
```

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": {"tweetIds": "1278747501642657792,1255542774432063488", "tweetHash": "0xbe611fa9e3a341d1f59df049685fb42c9d7d2dadc0765019c5490335f21f9818", "endpoint": "TweetLookup" } }'
```

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": { "tweetids": "1447545650925682696", "tweetHash": "536c3cb79ae5a519c525dca22f9f166e6067b253178557ea579aec649eb5fd0c", "endpoint": "tweets?ids=" } }'
```

Same as above but with multiple tweet ids

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": { "tweetids": "1447545650925682696,1440043399961219074", "tweetHash": "536c3cb79ae5a519c525dca22f9f166e6067b253178557ea579aec649eb5fd0c", "endpoint": "lookup.json" } }'
```

## Docker

If you wish to use Docker to run the adapter, you can build the image by running the following command:

```bash
docker build . -t external-adapter
```

Then run it with:

```bash
docker run -p 8080:8080 -it external-adapter:latest
```

## Serverless hosts

After [installing locally](#install-locally):

### Create the zip

```bash
zip -r external-adapter.zip .
```

### Install to AWS Lambda

- In Lambda Functions, create function
- On the Create function page:
  - Give the function a name
  - Use Node.js 12.x for the runtime
  - Choose an existing role or create a new one
  - Click Create Function
- Under Function code, select "Upload a .zip file" from the Code entry type drop-down
- Click Upload and select the `external-adapter.zip` file
- Handler:
  - index.handler for REST API Gateways
  - index.handlerv2 for HTTP API Gateways
- Add the environment variable (repeat for all environment variables):
  - Key: API_KEY
  - Value: Your_API_key
- Save

#### To Set Up an API Gateway (HTTP API)

If using a HTTP API Gateway, Lambda's built-in Test will fail, but you will be able to externally call the function successfully.

- Click Add Trigger
- Select API Gateway in Trigger configuration
- Under API, click Create an API
- Choose HTTP API
- Select the security for the API
- Click Add

#### To Set Up an API Gateway (REST API)

If using a REST API Gateway, you will need to disable the Lambda proxy integration for Lambda-based adapter to function.

- Click Add Trigger
- Select API Gateway in Trigger configuration
- Under API, click Create an API
- Choose REST API
- Select the security for the API
- Click Add
- Click the API Gateway trigger
- Click the name of the trigger (this is a link, a new window opens)
- Click Integration Request
- Uncheck Use Lamba Proxy integration
- Click OK on the two dialogs
- Return to your function
- Remove the API Gateway and Save
- Click Add Trigger and use the same API Gateway
- Select the deployment stage and security
- Click Add

### Install to GCP

- In Functions, create a new function, choose to ZIP upload
- Click Browse and select the `external-adapter.zip` file
- Select a Storage Bucket to keep the zip in
- Function to execute: gcpservice
- Click More, Add variable (repeat for all environment variables)
  - NAME: API_KEY
  - VALUE: Your_API_key

0x6b64617461456e636f646564590180000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000aac1d92e356144c6b3032297df02897f273c898c000000000000000000000000b498e4a7e01adbbfd5ce0ea5bc67eb208cd5f1dc000000000000000000000000000000000000000000000000135dacc51b57a004000000000000000000000000cb2c2e85c9e89860bb8d52d075af790e2fe4ae4e0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000006186b5cf0000000000000000000000000000000000000000000000000000000061895c95000000000000000000000000000000000000000000000000000000000000000183da950bf0a928aed2c5167ac121d7d59ac9e0a0efa3f4e54ff94218ca6a6a8f

0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000aac1d92e356144c6b3032297df02897f273c898c000000000000000000000000b498e4a7e01adbbfd5ce0ea5bc67eb208cd5f1dc000000000000000000000000000000000000000000000000135dacc51b57a004000000000000000000000000cb2c2e85c9e89860bb8d52d075af790e2fe4ae4e0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000006186b5cf0000000000000000000000000000000000000000000000000000000061895c95000000000000000000000000000000000000000000000000000000000000000183da950bf0a928aed2c5167ac121d7d59ac9e0a0efa3f4e54ff94218ca6a6a8f
