[
  {
    $match: {
      _id: "customer1"
    }
  },
  {
    $project: {
      viewedMovies: 1
    }
  },
  {
    $unwind: "$viewedMovies"
  },
  {
    $addFields: {
      score: {
        $add: [
          "$viewedMovies.rating",
          {
            $cond: [
              "$viewedMovies.completed",
              0.5,
              0
            ]
          }
        ]
      }
    }
  },
  {
    $sort: {
      score: -1,
      "viewedMovies._id": 1
    }
  },
  {
    $limit: 1
  },
  {
    $replaceRoot: {
      newRoot: "$viewedMovies"
    }
  },
  {
    $lookup:
      /**
       * from: The target collection.
       * localField: The local join field.
       * foreignField: The target join field.
       * as: The name for the results.
       * pipeline: Optional pipeline to run on the foreign collection.
       * let: Optional variables to use in the pipeline field stages.
       */
      {
        from: "movies",
        localField: "movieId",
        foreignField: "_id",
        as: "embedding",
        pipeline: [
          {
            $project: {
              _id: 0
            }
          }
        ]
      }
  }
]