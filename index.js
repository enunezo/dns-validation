const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello World HTTPS!'));

const options = {
  key: fs.readFileSync('./certs/privkey.pem'),
  cert: fs.readFileSync('./certs/fullchain.pem'),
};

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS running on port 443');
});
