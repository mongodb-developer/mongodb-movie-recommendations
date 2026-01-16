import getVoyageClient from '../helpers/voyageai.js';
import { getDB } from '../helpers/db.js';
import config from '../config.js';

async function findMovieByPlot(req, res) {
  const secret = req.query.secret;
  const plot = req.body?.plot || req.query.plot;
  
  if (!secret || config.secret !== secret) {
    console.error(`Forbidden: incorrect or missing secret: received '${secret}'`);
    return res.status(403).json({ message: 'Forbidden. Must include correct secret.' });
  }
  
  if (!plot || plot.trim().length === 0) {
    return res.status(400).json({ message: 'Plot text is required' });
  }

  try {
    console.log(`Finding movie by plot: "${plot.substring(0, 50)}..."`);
    
    // Get embedding for the provided plot
    const voyageClient = getVoyageClient();
    const embeddingResponse = await voyageClient.embed({
      input: [plot],
      model: 'voyage-3-large',
      inputType: 'document'
    });
    
    const plotEmbedding = embeddingResponse.data[0].embedding;
    console.log(`Generated embedding with ${plotEmbedding.length} dimensions`);

    // Perform vector search to find closest matching movie
    const db = await getDB();
    const moviesCollection = db.collection(config.moviesCollection);
    
    const vectorSearchPipeline = [
      {
        $vectorSearch: {
          filter: { type: 'movie' },
          index: config.moviesVectorIndex,
          limit: 10,
          numCandidates: 100,
          path: 'fullplot_embedding',
          queryVector: plotEmbedding
        }
      },
      {
        $project: {
          score: { $meta: 'vectorSearchScore' },
          title: 1,
          fullplot: 1,
          year: 1,
          cast: 1,
          directors: 1,
          genres: 1,
          rated: 1,
          poster: 1
        }
      }
    ];

    const searchResults = await moviesCollection.aggregate(vectorSearchPipeline).toArray();
    
    if (searchResults.length === 0) {
      console.log('No matching movies found.');
      return res.status(404).json({ message: 'No matching movies found' });
    }

    console.log(`Found ${searchResults.length} matching movies before reranking.`);

    // Rerank the results using Voyage AI's reranking model for better relevance
    const rerankResponse = await voyageClient.rerank({
      model: 'rerank-2',
      query: plot,
      documents: searchResults.map(doc => doc.fullplot)
    });

    console.log('Rerank results:', rerankResponse);

    // Reorder search results based on rerank scores
    const rerankedResults = rerankResponse.data.map((item, position) => ({
      ...searchResults[item.index],
      rerankScore: item.relevanceScore,
      rerankPosition: position + 1
    }));

    console.log(`Top match after reranking: "${rerankedResults[0].title}" (rerank score: ${rerankedResults[0].rerankScore})`);

    res.status(200).json({
      query: plot,
      topMatch: rerankedResults[0],
      allMatches: rerankedResults
    });
  } catch (error) {
    console.error('Error finding movie by plot:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}

export default findMovieByPlot;
