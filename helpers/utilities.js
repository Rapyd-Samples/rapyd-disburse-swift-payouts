/*
* Environment Variables
*/
const https = require('https');
const crypto = require('crypto');
const dotEnv = require('dotenv');
const log = false;

dotEnv.config();

const secretKey = process.env.SECRET_KEY; // Your API Access key
const accessKey = process.env.ACCESS_KEY; // You API secret key

/*
* Make a Request to Rapyd API
*/
async function makeRequest(method, urlPath, body = null) {
  try {
    // API Request parameters
    httpMethod = method;
    httpBaseURL = "sandboxapi.rapyd.net";
    httpURLPath = urlPath; // The request path
    salt = generateRandomString(8); // Randomly created for each request
    idempotency = new Date().getTime().toString(); // Used for payment creation requests
    timestamp = Math.round(new Date().getTime() / 1000); 
    signature = generateSignature(httpMethod, httpURLPath, salt, timestamp, body) // Request Signature
    const options = {
      hostname: httpBaseURL,
      port: 443,
      path: httpURLPath,
      method: httpMethod,
      headers: {
        'Content-Type': 'application/json',
        salt: salt,
        timestamp: timestamp,
        signature: signature,
        access_key: accessKey,
        idempotency: idempotency
      }
    }

    return await httpRequest(options, body, log);
  }
  catch (error) {
    console.error("Error generating request options");
    throw error;
  }
}

/*
* Generate Request Signature
*/
function generateSignature(method, urlPath, salt, timestamp, body) {

  try {
    let bodyString = "";
    if (body) {
      bodyString = JSON.stringify(body);
      bodyString = bodyString == "{}" ? "" : bodyString;
    }

    let toSign = method.toLowerCase() + urlPath + salt + timestamp + accessKey + secretKey + bodyString;
    log && console.log(`toSign: ${toSign}`);

    let hash = crypto.createHmac('sha256', secretKey);
    hash.update(toSign);
    const signature = Buffer.from(hash.digest("hex")).toString("base64")
    log && console.log(`signature: ${signature}`);

    return signature;
  }
  catch (error) {
    console.error("Error generating signature");
    throw error;
  }
}

/*
* Generate a Random Salt String
*/
function generateRandomString(size) {
  try {
    return crypto.randomBytes(size).toString('hex');
  }
  catch (error) {
    console.error("Error generating salt");
    throw error;
  }
}

/*
* Create an HTTP Request
*/
async function httpRequest(options, body) {

  return new Promise((resolve, reject) => {

    try {

      let bodyString = "";
      if (body) {
        bodyString = JSON.stringify(body);
        bodyString = bodyString == "{}" ? "" : bodyString;
      }

      log && console.log(`httpRequest options: ${JSON.stringify(options)}`);
      const req = https.request(options, (res) => {
        let response = {
          statusCode: res.statusCode,
          headers: res.headers,
          body: ''
        };

        res.on('data', (data) => {
          response.body += data;
        });

        res.on('end', () => {

          response.body = response.body ? JSON.parse(response.body) : {}
          log && console.log(`httpRequest response: ${JSON.stringify(response)}`);

          if (response.statusCode !== 200) {
            return reject(response);
          }

          return resolve(response);
        });
      })

      req.on('error', (error) => {
        return reject(error);
      })

      req.write(bodyString)
      req.end();
    }
    catch(err) {
      return reject(err);
    }
  })

}


exports.makeRequest = makeRequest;