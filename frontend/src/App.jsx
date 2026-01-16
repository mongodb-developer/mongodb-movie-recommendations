import { useState } from 'react';
import MovieSearch from './components/MovieSearch';
import Recommendation from './components/Recommendation';
import ViewingRecorder from './components/ViewingRecorder';
import './App.css';

const API_SECRET = import.meta.env.VITE_SECRET || 'secret123';

function App() {
  const [customerId, setCustomerId] = useState('customer1');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [activeTab, setActiveTab] = useState('search');

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
  };

  const handleViewingRecorded = () => {
    setSelectedMovie(null);
    // Optionally show a success message
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 Movie Recommendations</h1>
        <div className="customer-selector">
          <label>
            Customer ID:
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter customer ID"
            />
          </label>
        </div>
      </header>

      <div className="tabs">
        <button
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          Search by Plot
        </button>
        <button
          className={activeTab === 'recommendations' ? 'active' : ''}
          onClick={() => setActiveTab('recommendations')}
        >
          Get Recommendation
        </button>
      </div>

      <main className="app-main">
        {activeTab === 'search' && (
          <MovieSearch
            apiSecret={API_SECRET}
            onMovieSelect={handleMovieSelect}
          />
        )}

        {activeTab === 'recommendations' && (
          <Recommendation
            apiSecret={API_SECRET}
            customerId={customerId}
            onMovieSelect={handleMovieSelect}
          />
        )}

        {selectedMovie && (
          <ViewingRecorder
            apiSecret={API_SECRET}
            customerId={customerId}
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
            onRecorded={handleViewingRecorded}
          />
        )}
      </main>
    </div>
  );
}

export default App;
