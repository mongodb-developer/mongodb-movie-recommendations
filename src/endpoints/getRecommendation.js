import getVoyageClient from '../helpers/voyageai.js';
import { getDB } from '../helpers/db.js';
import config from '../config.js';

async function getRecommendation(req, res) {
  const secret = req.query.secret;
  const customerId = req.query.customerId;
  if (!secret || config.secret !== secret) {
    console.error(`Forbidden: incorrect or missing secret: received '${secret}'`);
    return res.status(403).json({ message: 'Forbidden. Must include correct secret.' });
  } else {
    if (customerId) {
      try {
        const db = await getDB();
        const customerCollection = db.collection(config.customerCollection);

        // Single aggregation on customers to return both viewed movieIds and 
        // favourite movie info
        const favouritesPipeline = [
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
                { $project: { 
                  _id: 1,
                  title: 1,
                  mostSimilar: 1,
                  fullplot: 1,
                  fullplot_embedding: 1 } }
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

        const [aggResult] = await customerCollection.aggregate(favouritesPipeline).toArray();

        if (!aggResult) {
          console.error(`Customer with ID ${customerId} not found or has no view history.`);
          return res.status(404).json({ message: 'Customer not found or no viewed movies' });
        }

        const { viewedMovieIds = [], favouriteMovie = null } = aggResult;
        console.log('Viewed movie IDs:', viewedMovieIds);
        console.log('Favourite movie aggregation result:', favouriteMovie);

        if (viewedMovieIds.length === 0) {
          console.error(`Customer ID ${customerId} has no viewed movies.`);
          return res.status(404).json({ message: `No viewed movies for customer ${customerId}` });
        }

        if (!favouriteMovie || !favouriteMovie.fullplot_embedding) {
          console.error(`No favourite movie with embedding found for customer ID ${customerId}.`);
          return res.status(404).json({ message: 'No favourite movie with embedding found' });
        }

        const moviesCollection = db.collection(config.moviesCollection);

        // If we've already cached the most similar movie in the last X days,
        // then use that. This can reduce costs by reducing how often we need to do
        // a vector search.
        if (config.cacheSimilarMovies && favouriteMovie?.mostSimilar?.ids?.length > 0 && 
          favouriteMovie?.mostSimilar?.lastUpdated > 
            Date.now() - config.recommendationTimeoutDays * 24 * 60 * 60 * 1000
        ) {
          console.log('Using cached most similar movie for recommendation.');
          // Fetch the first cached most similar movie that the customer hasn't already viewed
          const mostSimilarUnviewedMovieId = favouriteMovie.mostSimilar.ids.find(
            id => !viewedMovieIds.includes(id)
          );
          if (!mostSimilarUnviewedMovieId) {
            console.log('All cached similar movies have already been viewed by the customer.');
            return res.status(404).json({ message: 'No recommendation found' });
          }

          const recommendedMovie = await moviesCollection.findOne(
            { _id: mostSimilarUnviewedMovieId },
            // Exclude embedding from returned document to reduce response size
            // (and it provides no value to the caller)
            { projection: { fullplot_embedding: 0 } });
          if (recommendedMovie) {
            console.log(`Returning cached most similar movie "${recommendedMovie.title}" as recommendation.`);
            return res.status(200).json({ 
              favourite: { ...favouriteMovie, 
                // Hide embedding in response, as it is large, and provides no value to the caller
                fullplot_embedding: undefined },  
              recommendation: recommendedMovie 
            });
          } else {
            console.log('Cached most similar movie not found in database, proceeding to vector search.');
          }
        }
        
        const filter = config.cacheSimilarMovies ? {
          // If the results are going to be used by other customers fort this
          // favourite movie, then we just need to exclude the favourite movie
          // itself
          _id: { $ne: favouriteMovie._id },
          type: 'movie'
        } : {
          // If the results aren't being used by other customers, then we can
          // exclude all previously viewed movies for this customer
          _id: { $nin: viewedMovieIds },
          type: 'movie'
        };

        const vectorSearchPipeline = [
          {
            $vectorSearch: {
              filter,
              index: config.moviesVectorIndex,
              limit: 10,
              numCandidates: 100,
              path: 'fullplot_embedding',
              queryVector: favouriteMovie.fullplot_embedding
            }
          },
          {
            $set: { score: { $meta: 'vectorSearchScore' } }
          },
          {
            $unset: ['fullplot_embedding']
          },
          // Filter out low-score results to avoid poor recommendations
          {
            $match: { score: { $gt: config.recommendationThreshold }}
          }
        ]

        let searchResults = await moviesCollection.aggregate(vectorSearchPipeline).toArray();
        // Remove favourite movie from results if present
        // searchResults = searchResults.filter(movie => movie._id.toString() !== favouriteMovie._id.toString());

        if (searchResults.length === 0) {
          console.log('No suitable recommendation found based on favourite movie.');
          return res.status(404).json({ message: 'No recommendation found' });
        }

        console.log('Search results:', searchResults);

        const voyageClient = getVoyageClient();

        // Rerank the results using Voyage AI's reranking model, which may provide better
        // relevance ordering than just vector similarity alone
        const rerankResponse = await voyageClient.rerank({
          model: 'rerank-2',
          query: favouriteMovie.fullplot,
          documents: searchResults.map(doc => doc.fullplot)
        });

        // rerankResponse ===
        // {
        //   object: 'list',
        //   data: [
        //     { relevanceScore: 0.5546875, index: 1 },
        //     { relevanceScore: 0.5078125, index: 3 },
        //     { relevanceScore: 0.453125, index: 0 },
        //     { relevanceScore: 0.453125, index: 2 },
        //     { relevanceScore: 0.3828125, index: 4 }
        //   ],
        //   model: 'rerank-2',
        //   usage: { totalTokens: 942 }
        // }

        console.log('Rerank results:', rerankResponse);

        const topRecommendations = rerankResponse.data.map(item => searchResults[item.index]);
        let topRecommendation = null;
        if (config.cacheSimilarMovies) {
          const similarMovieIds = topRecommendations.map(rec => rec._id);
          console.log('Top recommendation IDs to cache:', similarMovieIds);
          console.log('Caching most similar movie as per configuration.');
          topRecommendation = searchResults[rerankResponse.data[0].index];
          await moviesCollection.updateOne(
            { _id: favouriteMovie._id },
            { $set: { 
              mostSimilar: { 
                ids: similarMovieIds, 
                lastUpdated: new Date() 
              } 
            } }
          );
          console.log(`Updated favourite movie mostSimilar field in database for "${favouriteMovie.title}".`);

          // set topRecommendation to the firest element in the reranked list that
          // the customer hasn't already viewed
          for (const rec of topRecommendations) {
            if (!viewedMovieIds.includes(rec._id)) {
              topRecommendation = rec;
              break;
            }
          }
          if (!topRecommendation) {
            console.log('All top recommendations have already been viewed by the customer.');
            return res.status(404).json({ message: 'No recommendation found' });
          }
        } else {
          topRecommendation = searchResults[rerankResponse.data[0].index];
        }

        console.log('Top recommendation after reranking:', topRecommendation);

        res.status(200).json({ 
          favourite: { ...favouriteMovie, fullplot_embedding: undefined },
          recommendation: topRecommendation 
        });
      } catch (error) {
        console.error('Error fetching recommendation:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
      }
    } else {
      res.status(400).json({ Error: 'No customerId provided' });
    }
  }
};

export default getRecommendation;