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
- jobId: 9ec03b54437b4b69abe0a80dcf466b7b
- fee = 0.1 \* 10 \*\*18

[Contract_Example](Job_Timeline.md)
[Timeline_Job_Definition](JobSpec.md)

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

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": { "userid": "1395461422121984004", "tweetHash": "be3225661372643f19e655841509bb6aaa85c5ae6a3240b5ee0a9f5f3e36b55d", "endpoint": "user_timeline.json" } }'
```

Takes in a tweet id and fetches the tweet text and author username, hashes it and compares with inputed hash.

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": { "tweetids": "1447545650925682696", "tweetHash": "be3225661372643f19e655841509bb6aaa85c5ae6a3240b5ee0a9f5f3e36b55d", "endpoint": "lookup.json" } }'
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
