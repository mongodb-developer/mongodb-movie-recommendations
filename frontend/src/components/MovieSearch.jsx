import { useState } from 'react';

function MovieSearch({ apiSecret, onMovieSelect }) {
  const [plot, setPlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!plot.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`/api/find-by-plot?secret=${apiSecret}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plot }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="movie-search">
      <h2>Search Movies by Plot</h2>
      <form onSubmit={handleSearch}>
        <textarea
          value={plot}
          onChange={(e) => setPlot(e.target.value)}
          placeholder="Describe the movie plot you're looking for..."
          rows="4"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !plot.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">Error: {error}</div>}

      {results && (
        <div className="search-results">
          <h3>Top Match</h3>
          <MovieCard
            movie={results.topMatch}
            onSelect={onMovieSelect}
            isTopMatch
          />

          {results.allMatches.length > 1 && (
            <>
              <h3>Other Matches</h3>
              <div className="other-matches">
                {results.allMatches.slice(1).map((movie) => (
                  <MovieCard
                    key={movie._id}
                    movie={movie}
                    onSelect={onMovieSelect}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MovieCard({ movie, onSelect, isTopMatch }) {
  return (
    <div className={`movie-card ${isTopMatch ? 'top-match' : ''}`}>
      <div className="movie-header">
        <h4>{movie.title}</h4>
        {movie.year && <span className="year">({movie.year})</span>}
      </div>
      
      {movie.genres && (
        <div className="genres">
          {movie.genres.map((genre, i) => (
            <span key={i} className="genre-tag">{genre}</span>
          ))}
        </div>
      )}

      {movie.poster && (
        <div className="movie-poster">
          <img src={movie.poster} alt={movie.title} />
        </div>
      )}

      {movie.fullplot && (
        <div className="genres">
          {movie.genres.map((genre, i) => (
            <span key={i} className="genre-tag">{genre}</span>
          ))}
        </div>
      )}

      {movie.fullplot && (
        <p className="plot">{movie.fullplot}</p>
      )}

      <div className="movie-meta">
        {movie.rerankScore && (
          <span className="score">
            Match Score: {(movie.rerankScore * 100).toFixed(1)}%
          </span>
        )}
        {movie.directors && (
          <span className="directors">
            Director: {movie.directors.join(', ')}
          </span>
        )}
      </div>

      <button
        className="record-viewing-btn"
        onClick={() => onSelect(movie)}
      >
        Record Viewing
      </button>
    </div>
  );
}

export default MovieSearch;
