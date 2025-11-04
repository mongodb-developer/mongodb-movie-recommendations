const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');

const config = require('./config');
const { getDB } = require('./helpers/db');
const getMovie = require('./endpoints/getMovie');
const postViewing = require('./endpoints/postViewing');
const getRecommendation = require('./endpoints/getRecommendation');
const { exit } = require('process');
const { get } = require('http');

const app = express();
const ip = config.localDev ? config.devIP : config.productionIP;
const port = config.localDev ? config.devPort : config.productionPort;
const mongoDBURI = process.env.MONGODB_URI;
const secret = process.env.SECRET;
const voyageAPIKey = process.env.VOYAGE_API_KEY;

if (mongoDBURI) {
  config.mongoDBURI = mongoDBURI;
} else {
  console.error('MONGODB_URI not set in environment variables');
  exit(1)
};

if (secret) {
  config.secret = secret;
} else {
  console.error('SECRET not set in environment variables');
  exit(1)
};

if (voyageAPIKey) {
  config.voyageAPIKey = voyageAPIKey;
} else {
  console.error('VOYAGE_API_KEY not set in environment variables');
  exit(1)
}

console.log(`Using MongoDB URI: ${config.mongoDBURI} to connect to database: ${config.database}`);

// start() replaces top-level await to stay in CommonJS world
async function start() {
  try {
    await getDB();

    // Middleware
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.url}`);
      next();
    });

    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).send('Something went wrong!');
    });

    app.use(bodyParser.json());

    const corsOptions = {
      origin: ['http://localhost', config.productionClientURL],
      methods: 'GET,POST,PUT,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization'
    };

    app.use(cors(corsOptions));

    // Routes
    app.get('/movie', getMovie);
    app.post('/viewing', postViewing);
    app.get('/recommendation', getRecommendation);

    app.get('/', (request, response) => {
      const status = {
        status: `Running on ${config.localDev ? "localhost" : "production"}`
      };
      response.send(status);
    });

    if (config.localDev) {
      app.listen(port, ip, () => {
        console.log(`App listening at http://${ip}:${port}`);
      });
    } else {
      const sslOptions = {
        key: fs.readFileSync(config.keyfileLocation),
        cert: fs.readFileSync(config.certfileLocation)
      };

      // Start HTTPS server
      https.createServer(sslOptions, app).listen(port, ip, () => {
        console.log(`App listening at https://${ip}:${port}`);
      });
    }
  } catch (err) {
    console.error('Failed to start app:', err);
    process.exit(1);
  }
}

start();
