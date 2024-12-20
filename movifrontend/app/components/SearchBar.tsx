'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const GENRES = [
  "Action", "Adventure", "Animation", "Children", "Comedy",
  "Crime", "Documentary", "Drama", "Fantasy", "Film-Noir",
  "Horror", "IMAX", "Musical", "Mystery", "Romance",
  "Sci-Fi", "Thriller", "War", "Western"
];

const SearchBar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    title: '',
    actors: '',
    directors: '',
    writers: '',
    genre: ''
  });

  // Initialize filters from URL parameters
  useEffect(() => {
    const title = searchParams.get('title') || '';
    const actors = searchParams.get('actors') || '';
    const directors = searchParams.get('directors') || '';
    const writers = searchParams.get('writers') || '';
    const genre = searchParams.get('genre') || '';

    setFilters({
      title,
      actors,
      directors,
      writers,
      genre
    });

    // Show filters if any filter other than title is set
    if (actors || directors || writers || genre) {
      setShowFilters(true);
    }
  }, [searchParams]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // Build query string from non-empty filters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });

    // Navigate to search results page with filters
    router.push(`/search?${queryParams.toString()}`);
  };

  const handleGemClick = async () => {
    try {
      const response = await fetch('/api/movies/hidden-gems');

      if (!response.ok) {
        throw new Error('Failed to fetch a hidden gem.');
      }

      const gem = await response.json();

      if (gem?.movieid) {
        router.push(`/movie/${gem.movieid}`);
      } else {
        console.error('Invalid response format:', gem);
      }
    } catch (error) {
      console.error('Error fetching hidden gem:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            name="title"
            value={filters.title}
            onChange={handleInputChange}
            placeholder="Search movies..."
            className="flex-1 p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg transition-colors ${showFilters
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-200 hover:bg-gray-300'
              }`}
          >
            Filters {showFilters ? '▼' : '▶'}
          </button>
          <button
            type="button"
            onClick={handleGemClick}
            className="w-10 h-10 bg-gray-200 text-blue-600 rounded-md flex items-center justify-center hover:bg-blue-200 transition-colors shadow-md"
          >
            💎
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actors
              </label>
              <input
                type="text"
                name="actors"
                value={filters.actors}
                onChange={handleInputChange}
                placeholder="Enter actor names"
                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Directors
              </label>
              <input
                type="text"
                name="directors"
                value={filters.directors}
                onChange={handleInputChange}
                placeholder="Enter director names"
                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Writers
              </label>
              <input
                type="text"
                name="writers"
                value={filters.writers}
                onChange={handleInputChange}
                placeholder="Enter writer names"
                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genre
              </label>
              <select
                name="genre"
                value={filters.genre}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Genre</option>
                {GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar; 