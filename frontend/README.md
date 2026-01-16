# Movie Recommendations Frontend

A React single-page application for searching movies and getting personalized recommendations using MongoDB and VoyageAI.

## Features

- **Search Movies by Plot**: Enter a plot description and find matching movies using AI-powered vector search
- **Get Personalized Recommendations**: Receive movie recommendations based on your viewing history
- **Record Viewings**: Track which movies you've watched, whether you completed them, and your rating

## Prerequisites

- Node.js (v16 or higher)
- The backend server running on `http://localhost:3000`

## Installation

```bash
cd frontend
npm install
```

## Configuration

Create a `.env` file in the `frontend` directory with your API secret:

```bash
VITE_SECRET=secret123
```

Replace `secret123` with the same secret you configured in your backend.

**Note**: The secret defaults to `secret123` if not set, but it's recommended to use environment variables for production.

## Running the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

### Search Movies by Plot

1. Click the "Search by Plot" tab
2. Enter a description of the movie plot you're looking for
3. Click "Search"
4. Browse the results and click "Record Viewing" to track a movie

### Get Recommendations

1. Enter your customer ID in the header (default: `customer1`)
2. Click the "Get Recommendation" tab
3. Click "Get Recommendation" button
4. View your personalized recommendation based on your viewing history

### Record a Viewing

1. After finding a movie (via search or recommendation), click "Record Viewing"
2. Check "Watched to the end" if you completed the movie
3. Select your rating: Liked (👍), Neutral (😐), or Disliked (👎)
4. Click "Record Viewing" to save

## API Endpoints Used

- `POST /find-by-plot` - Search movies by plot description
- `GET /recommendation` - Get personalized recommendations
- `POST /viewing` - Record a movie viewing

## Technology Stack

- React 18
- Vite
- CSS3 with modern gradients and animations

## Development

The app uses Vite's proxy feature to forward API requests to the backend:

```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

All API calls use the `/api` prefix which gets proxied to `http://localhost:3000`.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```
