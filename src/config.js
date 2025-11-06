let config = {
  localDev: true,
  keyfileLocation: '/home/ec2-user/certs/privkey.pem',
  certfileLocation: '/home/ec2-user/certs/fullchain.pem',
  productionClientURL: 'https://mongodb-developer.github.io',
  database: 'movie_recommendations',
  moviesCollection: 'movies',
  customerCollection: 'customers',
  viewingsCollection: 'viewings',
  moviesVectorIndex: 'movie-recommendation',
  productionIP: '0.0.0.0',
  devIP: '127.0.0.1',
  productionPort: 443,
  devPort: 3000
}

module.exports = config;