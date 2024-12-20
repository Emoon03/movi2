'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '../components/SearchBar';
import Link from 'next/link';
import { Header } from '@/components/header';

interface Movie {
  movieid: number;
  title: string;
  genre: string[];
  duration: number;
  releaseyear: number;
  poster_url: string;
  actors: string[];
  directors: string[];
  writers: string[];
  average_rating: number | null;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSearchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryString = searchParams.toString();
        if (!queryString) {
          setMovies([]);
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/movies/search?${queryString}`);
        if (!response.ok) {
          throw new Error('Failed to fetch search results');
        }

        const data = await response.json();
        const processedData = (data as Movie[]).map((movie: Movie) => ({
          ...movie,
          average_rating: typeof movie.average_rating === 'number' ? movie.average_rating : null
        }));
        setMovies(processedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchParams]);

  const formatRating = (rating: number | null): string => {
    if (rating === null || isNaN(rating)) return 'N/A';
    return rating.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto">
          <SearchBar />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 p-4">
            {error}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center text-gray-600 p-4">
            No movies found matching your search criteria
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <Link
                href={`/movie/${movie.movieid}`}
                key={movie.movieid}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="aspect-w-2 aspect-h-3 relative">
                  <img
                    src={movie.poster_url || '/placeholder-poster.jpg'}
                    alt={movie.title}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-md text-sm">
                    ★ {formatRating(movie.average_rating)}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{movie.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{movie.releaseyear}</p>
                  <div className="flex flex-wrap gap-1">
                    {movie.genre?.map((g, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto">
          <Suspense fallback={<div>Loading search results...</div>}>
            <SearchPageContent />
          </Suspense>
        </div>
      </div>
    </div>
  );

}