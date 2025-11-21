import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import https from 'https';
import fs from 'fs';

import config from './config.js';
import { getDB } from './helpers/db.js';
import getVoyageClient from './helpers/voyageai.js';
import getMovie from './endpoints/getMovie.js';
import postViewing from './endpoints/postViewing.js';
import getRecommendation from './endpoints/getRecommendation.js';

const app = express();
const ip = config.localDev ? config.devIP : config.productionIP;
const port = config.localDev ? config.devPort : config.productionPort;

const mongoDBURI = process.env.MONGODB_URI;
const secret = process.env.SECRET;
const voyageAPIKey = process.env.VOYAGE_API_KEY;

if (mongoDBURI) {
  config.mongoDBURI = mongoDBURI;
} else {
  console.error('MONGODB_URI environment variable not set');
  process.exit(1);
}

if (secret) {
  config.secret = secret;
} else {
  console.error('SECRET environment variable not set');
  process.exit(1);
}

if (voyageAPIKey) {
  config.voyageAPIKey = voyageAPIKey;
} else {
  console.error('VOYAGE_API_KEY environment variable not set');
  process.exit(1);
}

const uriWithoutPassword = config.mongoDBURI.replace(/\/\/(.*):(.*)@/, '//****:****@');
console.log(`Using MongoDB URI: ${uriWithoutPassword} to connect to database: ${config.database}`);

try {
  await Promise.all([
    getDB(),
    Promise.resolve(getVoyageClient())
  ]);
} catch (err) {
  console.error('Failed to initialize services:', err);
  process.exit(1);
}

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

  https.createServer(sslOptions, app).listen(port, ip, () => {
    console.log(`App listening at https://${ip}:${port}`);
  });
}
