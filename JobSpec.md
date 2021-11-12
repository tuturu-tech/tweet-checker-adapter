## Job Spec examples

### Latest TOML

```
type = "directrequest"
schemaVersion = 1
name = "twitterV2-TimelineMulti3"
contractAddress = "0xDe2Fa809f8E0c702983C846Becd044c24B86C3EE"
maxTaskDuration = "0s"
observationSource = """
    decode_log   [type=ethabidecodelog
                  abi="OracleRequest(bytes32 indexed specId, address requester, bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, uint256 dataVersion, bytes data)"
                  data="$(jobRun.logData)"
                  topics="$(jobRun.logTopics)"]

    decode_cbor  [type=cborparse data="$(decode_log.data)"]
    fetch        [type=bridge name= "twitter-ea" method=GET requestData="{\\"id\\": $(jobSpec.externalJobID), \\"data\\": {\\"taskId\\": $(decode_cbor.taskId),\\"timeWindowStart\\": $(decode_cbor.timeWindowStart),\\"timeWindowEnd\\": $(decode_cbor.timeWindowEnd),\\"data\\": $(decode_cbor.data), \\"endpoint\\": \\"UserTimeline\\"}}"]
    parse        [type=jsonparse path="" data="$(fetch)"]
    encode_data  [type=ethabiencode abi="(bytes32 requestId, uint256 taskId, uint64 score, uint8 response)" data="{\\"requestId\\": $(decode_log.requestId), \\"taskId\\": $(parse.taskId), \\"score\\": $(parse.score) , \\"response\\": $(parse.responseStatus) }"]
    encode_tx    [type=ethabiencode
                  abi="fulfillOracleRequest2(bytes32 requestId, uint256 payment, address callbackAddress, bytes4 callbackFunctionId, uint256 expiration, bytes calldata data)"
                  data="{\\"requestId\\": $(decode_log.requestId), \\"payment\\": $(decode_log.payment), \\"callbackAddress\\": $(decode_log.callbackAddr), \\"callbackFunctionId\\": $(decode_log.callbackFunctionId), \\"expiration\\": $(decode_log.cancelExpiration), \\"data\\": $(encode_data)}"
                 ]
    submit_tx    [type=ethtx to="0xDe2Fa809f8E0c702983C846Becd044c24B86C3EE" data="$(encode_tx)"]

    decode_log -> decode_cbor -> fetch -> parse -> encode_data -> encode_tx -> submit_tx
"""
```

### Timeline job

```
type = "directrequest"
schemaVersion = 1
name = "twitterdata-Timeline"
contractAddress = "0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b"
maxTaskDuration = "0s"
observationSource = """
decode_log [type=ethabidecodelog
abi="OracleRequest(bytes32 indexed specId, address requester, bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, uint256 dataVersion, bytes data)"
data="$(jobRun.logData)"
topics="$(jobRun.logTopics)"]

    decode_cbor  [type=cborparse data="$(decode_log.data)"]
    fetch        [type=bridge name= "twitter-ea" method=GET requestData="{\\"id\\": $(jobSpec.externalJobID), \\"data\\": {\\"userid\\": $(decode_cbor.userid), \\"tweetHash\\": $(decode_cbor.tweetHash), \\"endpoint\\": $(decode_cbor.endpoint)}}"]
    parse        [type=jsonparse path="" data="$(fetch)"]
    encode_data  [type=ethabiencode abi="(bool value)" data="{ \\"value\\": $(parse.hashCheck) }"]
    encode_tx    [type=ethabiencode
                  abi="fulfillOracleRequest(bytes32 requestId, uint256 payment, address callbackAddress, bytes4 callbackFunctionId, uint256 expiration, bytes32 data)"
                  data="{\\"requestId\\": $(decode_log.requestId), \\"payment\\": $(decode_log.payment), \\"callbackAddress\\": $(decode_log.callbackAddr), \\"callbackFunctionId\\": $(decode_log.callbackFunctionId), \\"expiration\\": $(decode_log.cancelExpiration), \\"data\\": $(encode_data)}"
                 ]
    submit_tx    [type=ethtx to="0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b" data="$(encode_tx)"]

    decode_log -> decode_cbor -> fetch -> parse -> encode_data -> encode_tx -> submit_tx

"""
```

## Lookup job

```
type = "directrequest"
schemaVersion = 1
name = "twitterdata-lookup"
contractAddress = "0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b"
maxTaskDuration = "0s"
observationSource = """
decode_log [type=ethabidecodelog
abi="OracleRequest(bytes32 indexed specId, address requester, bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, uint256 dataVersion, bytes data)"
data="$(jobRun.logData)"
topics="$(jobRun.logTopics)"]

    decode_cbor  [type=cborparse data="$(decode_log.data)"]
    fetch        [type=bridge name= "twitter-ea" method=GET requestData="{\\"id\\": $(jobSpec.externalJobID), \\"data\\": {\\"tweetids\\": $(decode_cbor.tweetids), \\"tweetHash\\": $(decode_cbor.tweetHash), \\"endpoint\\": $(decode_cbor.endpoint)}}"]
    parse        [type=jsonparse path="" data="$(fetch)"]
    encode_data  [type=ethabiencode abi="(bool value)" data="{ \\"value\\": $(parse.hashCheck) }"]
    encode_tx    [type=ethabiencode
                  abi="fulfillOracleRequest(bytes32 requestId, uint256 payment, address callbackAddress, bytes4 callbackFunctionId, uint256 expiration, bytes32 data)"
                  data="{\\"requestId\\": $(decode_log.requestId), \\"payment\\": $(decode_log.payment), \\"callbackAddress\\": $(decode_log.callbackAddr), \\"callbackFunctionId\\": $(decode_log.callbackFunctionId), \\"expiration\\": $(decode_log.cancelExpiration), \\"data\\": $(encode_data)}"
                 ]
    submit_tx    [type=ethtx to="0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b" data="$(encode_tx)"]

    decode_log -> decode_cbor -> fetch -> parse -> encode_data -> encode_tx -> submit_tx

"""
```
