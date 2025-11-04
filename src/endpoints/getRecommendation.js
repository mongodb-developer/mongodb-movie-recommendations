const { ObjectId } = require('mongodb');
const { getDB } = require('../helpers/db');
const config = require('../config');

async function getRecommendation(req, res) {
  // If customerId is provided, then the recommendation is based on their
  // viewing history. If not, and if plotDescription is provided then that will
  // be used to generate a recommendation.

  const secret = req.query.secret;
  const customerId = req.query.customerId;
  const plotDescription = req.query.plotDescription;
  if (!secret || config.secret !== secret) {
    console.error(`Forbidden: incorrect or missing secret: received '${secret}'`);
    return res.status(403).json({ message: 'Forbidden. Must include correct secret.' });
  } else {
    if (customerId) {
      try {
        const db = await getDB();
        const customerCollection = db.collection(config.customerCollection);

        // Single aggregation on customers to return both viewed movieIds and favourite movie info
        const pipeline = [
          { $match: { _id: customerId } },
          { $project: { viewedMovies: 1 } },
          {
            $facet: {
              viewedIds: [
                { $unwind: '$viewedMovies' },
                { $replaceRoot: { newRoot: '$viewedMovies' } },
                { $project: { movieId: 1 } },
                { $group: { _id: null, ids: { $addToSet: '$movieId' } } },
                { $project: { _id: 0, ids: 1 } }
              ],
              favourite: [
                { $unwind: '$viewedMovies' },
                {
                  $addFields: {
                    score: {
                      $add: [
                        '$viewedMovies.rating',
                        { $cond: ['$viewedMovies.completed', 0.5, 0] }
                      ]
                    }
                  }
                },
                { $sort: { score: -1, 'viewedMovies._id': 1 } },
                { $limit: 1 },
                { $replaceRoot: { newRoot: '$viewedMovies' } },
                {
                  $lookup: {
                    from: config.moviesCollection,
                    localField: 'movieId',
                    foreignField: '_id',
                    as: 'movie'
                  }
                },
                { $set: { movie: { $first: '$movie' } } },
                { $replaceRoot: { newRoot: '$movie' } },
                { $project: { _id: 1, title: 1, fullplot_embedding: 1 } }
              ]
            }
          },
          {
            $project: {
              viewedMovieIds: { $ifNull: [ { $arrayElemAt: ['$viewedIds.ids', 0] }, [] ] },
              favouriteMovie: { $arrayElemAt: ['$favourite', 0] }
            }
          }
        ];

        const [aggResult] = await customerCollection.aggregate(pipeline).toArray();

        if (!aggResult) {
          console.error(`Customer with ID ${customerId} not found or has no view history.`);
          return res.status(404).json({ message: 'Customer not found or no viewed movies' });
        }

        const { viewedMovieIds = [], favouriteMovie = null } = aggResult;
        console.log('Viewed movie IDs:', viewedMovieIds);
        console.log('Favourite movie aggregation result:', favouriteMovie);
        res.status(200).json({ viewedMovieIds, favouriteMovie });
        // res.status(200).json({billy: 'fish'});
      } catch (error) {
        console.error('Error fetching recommendation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
      }
    } else {
      res.status(200).json(plotDescription ? `${plotDescription}` : `${{Error: 'No customerId or plotDescription provided'}}`);
    }
  }
};

module.exports = getRecommendation;