let config = {
  localDev: true, // true → development on local machine, false → production deployment
  keyfileLocation: '/home/ec2-user/certs/privkey.pem', // Ignored in localDev mode
  certfileLocation: '/home/ec2-user/certs/fullchain.pem', // Ignored in localDev mode
  productionClientURL: 'https://myproductionclient.com', // Ignored in localDev mode
  database: 'sample_mflix',
  moviesCollection: 'movies',
  customerCollection: 'customers',
  viewingsCollection: 'viewings',
  moviesVectorIndex: 'movie-recommendation',
  recommendationTimeoutDays: 1, // Time in days to cache recommendations based
                                // previous vector search to find most similar movie
  recommendationThreshold: 0.8, // Minimum similarity score for recommendations,
                                // any lower score will be ignored. Avoids poor recommendations.
  productionIP: '0.0.0.0', // Ignored in localDev mode
  devIP: '127.0.0.1',
  productionPort: 443, // Ignored in localDev mode
  devPort: 3000
}

export default config;