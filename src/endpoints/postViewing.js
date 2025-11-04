const config = require('../config');
const { getDB } = require('../helpers/db');
const { ObjectId } = require('mongodb');

async function postViewing(req, res) {
  const body = req.body;
  if (req.query.secret !== config.secret) {
    return res.status(403).json({ message: 'Forbidden: Invalid secret' });
  }
  console.log('Received viewing data:', body);

  if (!body.customerId) {
    return res.status(400).json({ message: 'Bad Request: Missing customerId' });
  }

  try {
    const db = await getDB();
    const viewingsCollection = db.collection(config.viewingsCollection);
    const customerCollection = db.collection(config.customerCollection);

    // body can be JSON or EJSON
    const viewingRecord = {
      ...body,
      movieId: body.movieId?.$oid 
        ? ObjectId.createFromHexString(body.movieId.$oid) 
        : ObjectId.createFromHexString(body.movieId),
      viewedAt: body.viewedAt?.$date ? new Date(body.viewedAt.$date) : 
        new Date(body.viewedAt)
    };

    console.log('Inserting viewing record into viewings collection:', viewingRecord);

    let result = await viewingsCollection.insertOne(viewingRecord);
    if (!result.acknowledged) {
      throw new Error('Failed to insert viewing record');
    }

    // No point storing the customerId in the viewedMovies array, as that arrray
    // is part of the customer's record
    delete viewingRecord.customerId;
    delete viewingRecord._id; 
    console.log('Inserting viewing record into customer viewedMovies:', viewingRecord);

    await customerCollection.updateOne(
      { _id: body.customerId },
      { 
        $push: { viewedMovies: { $each: [viewingRecord], $position: 0, $slice: 50 } }
      }
    );
  } catch (error) {
    console.error('Error adding viewing:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }

  res.status(200).json(body);
};

module.exports = postViewing;