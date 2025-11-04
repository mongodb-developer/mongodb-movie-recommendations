const database = 'movie_recommendations';

use(database);
const events = db.getCollection('events');
const customers = db.getCollection('customers');
const movies = db.getCollection('movies');

// movies.deleteMany({ fullplot: { $exists: false } });

// movies.updateMany(
//   { fullplot: { $type: "string" } },
//   [
//     { $set: { fullplot: { $concat: ["$fullplot", " "] } } }
//   ]
// );

// // Movies to bootstrap the viewedMovies array for customer1
// let movieIdList = movies.aggregate([
//   { $sample: { size: 50 } },
//   { $project: { _id: 1 } }
// ]).toArray();  

// // Other movies to use for new viewings
// let newMovieIds = movies.aggregate([
//   { $sample: { size: 500 } },
//   { $project: { _id: 1 } }
// ]).toArray();

// let movieViewingList = [];

// movieIdList.forEach(element => {
//   movieViewingList.push({
//     movieId: element._id,
//     viewedAt: new Date(),
//     completed: Math.random() < 0.7 ? true : false,
//     rating: Math.floor(Math.random() * 3) - 1 // hate | neutral | like
//   });
// });

// customer1 = {
//   _id: 'customer1',
//   name: { first: "John", last: "Doe" },
//   email: "john.doe@example.com",
//   viewedMovies: movieViewingList
// }

// customer2 = {
//   _id: 'customer2',
//   name: { first: "Jane", last: "Smith" },
//   email: "jane.smith@example.com"
// }

// // customers.insertMany([customer1, customer2]);

// // Use this to generate the JSON to test the API when adding a new viewing
// let viewing1 = {
//   customerId: 'customer2',
//   movieId: newMovieIds[Math.floor(Math.random() * newMovieIds.length)]._id,
//   viewedAt: new Date(),
//   completed: Math.random() < 0.7 ? true : false,
//   rating: Math.floor(Math.random() * 3) - 1 // hate | neutral | like
// }

// viewing1;