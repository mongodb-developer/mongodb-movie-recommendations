# MongoDB Movie Recommendation Engine
The purpose of the code in this repo is to demonstrate how to build a recommendation engine using Voyage AI and MongoDB Atlas.

## Endpoints
The application provides these 3 endpoints (no front-end code is included, but there's a Postman collection that can be used for testing):
- `GET movie`. Provide query parameters for `id` (`_id` of the document in the `movies` collection) and for `secret` (must match the value set in the backend). Returns the movie details.
- `POST viewing`. Provide query parameter for `secret` (must match the value set in the backend). Body contains details of the viewing being added:

```json
{
  "customerId": "customer1",
  "movieId": "573a13c6f29313caabd73051",
  "viewedAt": "2025-11-04T13:45:26.768Z",
  "completed": true, // Did the customer watch the movie to the end?
  "rating": -1 // -1 == dislike, 0 == neutral, 1 == like
}
```

- `GET recommendation`. Provide query parameters for `customerId` (matches `_id` in the `customers` collection) and `secret` (must match the value set in the backend). Returns the details a movie that's similar to one the customer watched recently and enjoyed.

## Prerequistes
- A MongoDB Atlas cluster [you can spin up a free MongoDB Atlas cluster following these instructions](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)
- A [(free) Voyage API key](https://www.voyageai.com/)

## Preparing your database
The application works from the data in the [`movies` collection of the `sample_mflix` database that you automatically create in MongoDB Atlas](https://www.mongodb.com/docs/atlas/sample-data/sample-mflix/).

The `movies` collection contains the embedding data for the `plot` field for each collection, this application works instead with the `fullplot` data, and so we need to generate those embeddings and store them in the movie documents.

The application automates the maintenance and creation on a new field in the `movies` collection named `fullplot_embedding` using an [Atlas Trigger](https://www.mongodb.com/docs/atlas/atlas-ui/triggers/). Whenever a document is inserted/replaced, or the `fullplot` fields is updated, the trigger calls the Voyage AI API to generate a new vector/embedding from the new string, and stores in in the `fullplot_embedding` field.

### Setting up the MongoDB Atlas trigger
Start configuring the [MongoDB Atlas trigger](https://www.mongodb.com/docs/atlas/atlas-ui/triggers/) as shown here:

![Atlas UI, where the "Enable" toggle is off. Trigger type is Database. Watch against is Collection, Cluster Name is Cluster0, Database name is sample_mflix, Collection Name is movies, Operation type == Insert Document + Update Document + Replace Document](public/images/configure_trigger_1.png)

Note that the `Enable` toggle should be turned off at this point, as the trigger will fail until the Atlas Secret has been configured.

Continue configuring the trigger:

![Atlas UI showing Auto-Resume toggle turned on, Event Ordering to on, and Skip Events On Re-Enable to off](public/images/configure_trigger_2.png)

Note that `Event Ordering` is enabled, this ensures that we don't exceed the Voyage AI free-tier rate limit when making a bulk change to `movies` collection.

Set the `Event Type` to `Function` and paste in the code from [Atlas/plotChangeTrigger.js](Atlas/plotChangeTrigger.js):

![Atlas UI showing Event Type set to function and javascript code in the Function code box](public/images/configure_trigger_3.png)

Set a Match Expression ([Atlas/triggerMatchExpression.json](Atlas/triggerMatchExpression.json)) so that the resources aren't wasted running if the movie document is updated, but the `fullplot` field hasn't been changed:

![Atlas UI showing a Match Expression being added](public/images/configure_trigger_4.png)

Optionally, name the trigger, and then `Save` it.

#### Define the `VOYAGE-API-KEY` Atlas secret

Return to the Triggers overiew and select the "Linked App Service" link:

![Atlas UI with a link to the "triggers" app](public/images/configure_trigger_5.png)

Select `Values` from the App Services menu and then click on "Create New Value". 

Select `SECRET`, set the name to `VOYAGE-API-KEY`, and the value to the key that you got from the [(Voyage AI site](https://www.voyageai.com/) as part of the prerequistes:

![Atlas UI configuring a secret named VOYAGE-API-KEY](public/images/configure_trigger_6.png)

To access the secret from the trigger code, it needs to be wrapped in a value (again named `VOYAGE-API-KEY`):

![Atlas UI configuring a value linked to the VOYAGE-API-KEY secret](public/images/configure_trigger_7.png)

Return to the trigger definition and enable the trigger:

![Atlas UI setting the Enable toggle to on for the trigger](public/images/configure_trigger_8.png)

### Adding the embeddings

The trigger is now active, and so we can update `fullplot` in all of the `movies` documents, and then the trigger will aysnchronously request the embedding from Voyage AI, and store it in the movie document as a new field named `fullplot_embedding`:

```js
use sample_mflix
db.movies.updateMany(
  { fullplot: { $type: "string" } },
  [
    { $set: { fullplot: { $concat: ["$fullplot", " "] } } } // Add a space to 
                                            // the end of the fullplot string
  ]
);
```

This update will complete quickly, but the triggers run sequentially and so it will take some time for `fullplot_embedding` to be set in all of the movie documents.

### Create the MongoDB Atlas vector search index

**TBD**

## Running the application endpoints
### Environent variables
The application expects three environment variables to be set:
- `MONGODB_URI`. The connection string for your MongoDB Atlas cluster (including the database username and password). The IP address of the server where the endpoints will be running need to be included in the cluster's [IP Access List](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
- `VOYAGE_API_KEY`. This can be the same as used for the MongoDB Atlas trigger.
- `SECRET`. This can be any value, it will be used by any application using the endpoints.

### Configuring the application
[src/config.js](src/config.js) contains all of the settings that can be customised before starting the app (database and collection names, port numbers, development mode, etc.)

### Starting the Express server
```bash
npm install
npm start
```

## Testing the endpoints
[Postman/Movies-local.postman_collection.json](Postman/Movies-local.postman_collection.json) contains a [Postman](https://www.postman.com/) collection that can be imported into Postman to test each of the endpoints.

## Key pieces of code
### Connecting the endpoints to MongoDB
Resources are consumed whenever opening a new connection to MongoDB, and so it's wasteful to do so on every invocation of an endpoint. Instead, the application does so once when the application starts (and again if/when the connection is lost). This is performed by the `getDB` function in [src/helpers/db.js](src/helpers/db.js). 

`getDB` connects to MongoDB if there isn't already a connection, but returns the existing database connection if it exists.

`getDB` is invoked when the application starts, and then whenever an endpoint is called.

### Connecting to Voyage AI
The `getVoyageClient` funtion implemented in [src/helpers/voyageai.js](src/helpers/voyageai.js) returns a client connection to the Voyage AI API.

### `POST viewing` endpoint
This is implemented in [src/endpoints/postViewing.js](src/endpoints/postViewing.js) and should be used whenever a customer watches a new movie.

The endpoint adds a new object to the customer's document `viewedMovies` array representing the moview viewing. The object contains the `_id` of the new movie, together with a flag to indicate if the customer watched the movie to the end, when they watched it, and a rating (-1 === disliked, 1 === liked, 0 === didn't express a view).

```js
{
  _id: 'customer1',
  name: { first: 'John', last: 'Doe' },
  email: 'john.doe@example.com',
  viewedMovies: [
    {
      movieId: ObjectId('573a139af29313caabcef29d'),
      viewedAt: 2025-12-02T14:25:20.580Z,
      completed: true,
      rating: -1
    },
    {
      movieId: ObjectId('573a139af29313caabcf0324'),
      viewedAt: 2025-12-02T14:25:20.580Z,
      completed: true,
      rating: 1
    },
    {
      movieId: ObjectId('573a13e3f29313caabdbfc11'),
      viewedAt: 2025-12-02T14:25:20.580Z,
      completed: true,
      rating: -1
    },
    {
      movieId: ObjectId('573a13a0f29313caabd05069'),
      viewedAt: 2025-12-02T14:25:20.580Z,
      completed: true,
      rating: 0
    },
    {
      movieId: ObjectId('573a13b8f29313caabd4cdc1'),
      viewedAt: 2025-12-02T14:25:20.580Z,
      completed: false,
      rating: 1
    },
    ...
}
```

We only want to maintain the most recent fifty movies for each customer. This is acheived using this code:

```js
await customerCollection.updateOne(
  { _id: body.customerId },
  { 
    // Add the new viewing to the start of the array, keeping only the most recent 50
    $push: { viewedMovies: { $each: [viewingRecord], $position: 0, $slice: 50 } }
  }
);
```

This single call to MongoDB atomically:
- Finds the customer document for the provided `customerId`
- Adds the new viewing as the first element in the `viewedMovies` array in that document
- Removes any elements in the array after the fiftieth element (counted *after* the new element has been added)