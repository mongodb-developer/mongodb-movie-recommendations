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