import { useState } from 'react';

function ViewingRecorder({ apiSecret, customerId, movie, onClose, onRecorded }) {
  const [completed, setCompleted] = useState(true);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const viewingData = {
        customerId,
        movieId: movie._id,
        viewedAt: new Date().toISOString(),
        completed,
        rating,
      };

      const response = await fetch(`/api/viewing?secret=${apiSecret}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(viewingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || response.statusText);
      }

      onRecorded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record Viewing</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="movie-info">
            {movie.poster && (
              <div className="modal-poster">
                <img src={movie.poster} alt={movie.title} />
              </div>
            )}
            <div className="movie-info-text">
              <h4>{movie.title}</h4>
              {movie.year && <span className="year">({movie.year})</span>}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                />
                <span>Watched to the end</span>
              </label>
            </div>

            <div className="form-group">
              <label>How did you feel about it?</label>
              <div className="rating-buttons">
                <button
                  type="button"
                  className={`rating-btn ${rating === -1 ? 'active dislike' : ''}`}
                  onClick={() => setRating(-1)}
                >
                  👎 Disliked
                </button>
                <button
                  type="button"
                  className={`rating-btn ${rating === 0 ? 'active neutral' : ''}`}
                  onClick={() => setRating(0)}
                >
                  😐 Neutral
                </button>
                <button
                  type="button"
                  className={`rating-btn ${rating === 1 ? 'active like' : ''}`}
                  onClick={() => setRating(1)}
                >
                  👍 Liked
                </button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Recording...' : 'Record Viewing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ViewingRecorder;
