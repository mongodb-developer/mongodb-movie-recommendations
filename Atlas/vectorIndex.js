use sample_mflix

db.movies.createSearchIndex(
  'movie-recommendation', // Name of the index
  'vectorSearch',         // It's a vector search index
  {
    "fields": [
      {
        "type": "vector",
        "path": "fullplot_embedding",  // Name of field containing the embedding
        "numDimensions": 1024,  // Number of elements in the vector (dictated
                                // by the embedding model used)
        "similarity": "cosine", // Algorithm to use to determine closeness of
                                // vectors
        "quantization": "scalar"  // Reduce the size of the vector index by converting
                                  // the floating point vector dimensions into
                                  // integers
      },
      {
        "type": "filter",   // Enable pre-filtering on the _id field
        "path": "_id"
      },
      {
        "type": "filter",  // Enable pre-filtering on the type field
        "path": "type"
      }
    ]
  }
)