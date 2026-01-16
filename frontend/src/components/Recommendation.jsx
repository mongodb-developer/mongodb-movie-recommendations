import { useState } from 'react';

function Recommendation({ apiSecret, customerId, onMovieSelect }) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(null);

  const handleGetRecommendation = async () => {
    if (!customerId) {
      setError('Please enter a customer ID');
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const response = await fetch(
        `/api/recommendation?customerId=${encodeURIComponent(customerId)}&secret=${apiSecret}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }

      const data = await response.json();
      setRecommendation(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recommendation">
      <h2>Get Personalized Recommendation</h2>
      <p className="description">
        Get a movie recommendation based on your viewing history and preferences.
      </p>

      <button
        onClick={handleGetRecommendation}
        disabled={loading || !customerId}
        className="get-recommendation-btn"
      >
        {loading ? 'Loading...' : 'Get Recommendation'}
      </button>

      {error && <div className="error">Error: {error}</div>}

      {recommendation && (
        <div className="recommendation-results">
          <div className="favorite-section">
            <h3>Based on your favorite: {recommendation.favourite.title}</h3>
          </div>

          <div className="recommended-movie">
            <h3>We Recommend:</h3>
            <div className="movie-card top-match">
              <div className="movie-header">
                <h4>{recommendation.recommendation.title}</h4>
                {recommendation.recommendation.year && (
                  <span className="year">({recommendation.recommendation.year})</span>
                )}
              </div>

              {recommendation.recommendation.genres && (
                <div className="genres">
                  {recommendation.recommendation.genres.map((genre, i) => (
                    <span key={i} className="genre-tag">{genre}</span>
                  ))}
                </div>
              )}

              {recommendation.recommendation.poster && (
                <div className="movie-poster">
                  <img src={recommendation.recommendation.poster} alt={recommendation.recommendation.title} />
                </div>
              )}

              {recommendation.recommendation.fullplot && (
                <div className="genres">
                  {recommendation.recommendation.genres.map((genre, i) => (
                    <span key={i} className="genre-tag">{genre}</span>
                  ))}
                </div>
              )}

              {recommendation.recommendation.fullplot && (
                <p className="plot">{recommendation.recommendation.fullplot}</p>
              )}

              {recommendation.recommendation.directors && (
                <div className="movie-meta">
                  <span className="directors">
                    Director: {recommendation.recommendation.directors.join(', ')}
                  </span>
                </div>
              )}

              <button
                className="record-viewing-btn"
                onClick={() => onMovieSelect(recommendation.recommendation)}
              >
                Record Viewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recommendation;
