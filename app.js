const createRequest = require("./index").createRequest;

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const port = process.env.EA_PORT || 8080;

app.use(bodyParser.json());
app.use(cors());

app.post("/", (req, res) => {
  console.log("POST Data: ", req.body);
  createRequest(req.body, (status, result) => {
    console.log("Result: ", result);
    res.status(status).json(result.data);
  });
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
