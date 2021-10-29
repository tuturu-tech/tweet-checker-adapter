### Job Spec examples

type = "directrequest"
schemaVersion = 1
name = "twitterdata-ea2"
contractAddress = "0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b"
maxTaskDuration = "0s"
observationSource = """
decode_log [type=ethabidecodelog
abi="OracleRequest(bytes32 indexed specId, address requester, bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, uint256 dataVersion, bytes data)"
data="$(jobRun.logData)"
topics="$(jobRun.logTopics)"]

    decode_cbor  [type=cborparse data="$(decode_log.data)"]
    fetch        [type=bridge name= "twitter-ea" method=GET requestData="{\\"id\\": $(jobSpec.externalJobID), \\"data\\": {\\"userid\\": $(decode_cbor.userid), \\"tweetHash\\": $(decode_cbor.tweetHash)}}"]
    parse        [type=jsonparse path="" data="$(fetch)"]
    encode_data  [type=ethabiencode abi="(bool value)" data="{ \\"value\\": $(parse.hashCheck) }"]
    encode_tx    [type=ethabiencode
                  abi="fulfillOracleRequest(bytes32 requestId, uint256 payment, address callbackAddress, bytes4 callbackFunctionId, uint256 expiration, bytes32 data)"
                  data="{\\"requestId\\": $(decode_log.requestId), \\"payment\\": $(decode_log.payment), \\"callbackAddress\\": $(decode_log.callbackAddr), \\"callbackFunctionId\\": $(decode_log.callbackFunctionId), \\"expiration\\": $(decode_log.cancelExpiration), \\"data\\": $(encode_data)}"
                 ]
    submit_tx    [type=ethtx to="0x521E899DD6c47ea8DcA360Fc46cA41e5A904d28b" data="$(encode_tx)"]

    decode_log -> decode_cbor -> fetch -> parse -> encode_data -> encode_tx -> submit_tx

"""
