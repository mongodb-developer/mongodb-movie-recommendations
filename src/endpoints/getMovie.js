const { ObjectId } = require('mongodb');
const { getDB } = require('../helpers/db');
const config = require('../config');

async function getMovie(req, res) {
  const movieId = req.query.id;
  const secret = req.query.secret;
  if (!secret || config.secret !== secret) {
    console.error(`Forbidden: incorrect or missing secret: received '${secret}'`);
    return res.status(403).json({ message: 'Forbidden. Must include correct secret.' });
  } else {
    console.log(`getting movie: ${movieId}`);
    // Connect to MongoDB and fetch the movie details
    const _id = ObjectId.isValid(movieId) ? ObjectId.createFromHexString(movieId) : null;
    try {
      const db = await getDB();
      const moviesCollection = db.collection(config.moviesCollection);
      const movie = await moviesCollection.findOne({ _id: _id });
      if (movie) {
        res.status(200).json(movie);
      } else {
        res.status(404).json({ message: 'Movie not found' });
      }
    } catch (error) {
      console.error('Error fetching movie:', error);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
};

module.exports = getMovie;