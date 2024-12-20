'use client';

import { useEffect, useState, Suspense } from 'react';
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'
import SearchBar from './components/SearchBar'

export default function Home() {
  const [watchlist, setWatchlist] = useState<{ id: number; title: string; image: string }[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [trendingMovies, setTrendingMovies] = useState<{ id: number; title: string; image: string }[]>([]);
  const [popularMovies, setPopularMovies] = useState<{ id: number; title: string; image: string }[]>([]);
  const [recommendedMovies, setRecommendedMovies] = useState<{ id: number; title: string; image: string }[]>([]);
  const [favoriteGenreMovies, setFavoriteGenreMovies] = useState<{ id: number; title: string; image: string }[]>([]);
  const [favoriteGenre, setFavoriteGenre] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    const fetchTrendingMovies = async () => {
      try {
        const response = await fetch('/api/movies/trending');
        if (response.ok) {
          const data = await response.json();
          setTrendingMovies(
            data.map((movie: { movieid: number; title: string; poster_url: string }) => ({
              id: movie.movieid,
              title: movie.title,
              image: movie.poster_url || '/placeholder.svg',
            }))
          );
        } else {
          console.error('Failed to fetch trending movies');
        }
      } catch (error) {
        console.error('Error fetching trending movies:', error);
      }
    };

    fetchTrendingMovies();

    const fetchPopularMovies = async () => {
      try {
        const response = await fetch('/api/movies/popular');
        if (response.ok) {
          const data = await response.json();
          setPopularMovies(
            data.map((movie: { movieid: number; title: string; poster_url: string }) => ({
              id: movie.movieid,
              title: movie.title,
              image: movie.poster_url || '/placeholder.svg',
            }))
          );
        } else {
          console.error('Failed to fetch trending movies');
        }
      } catch (error) {
        console.error('Error fetching trending movies:', error);
      }
    };

    fetchPopularMovies();

    if (token) {
      const fetchWatchlist = async () => {
        try {
          const response = await fetch('/api/users/watchlist', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            console.error('Failed to fetch watchlist');
            return;
          }
          const watchlistIds: number[] = await response.json();

          const movieDetailsPromises = watchlistIds.map((id) =>
            fetch(`/api/movies/${id}`).then((res) => res.json())
          );
          const movies = await Promise.all(movieDetailsPromises);

          setWatchlist(
            movies.map((movie) => ({
              id: movie.movieid,
              title: movie.title,
              image: movie.poster_url || '/placeholder.svg',
            }))
          );
        } catch (error) {
          console.error('Error fetching watchlist:', error);
        }
      };

      fetchWatchlist();

      const fetchRecommendedMovies = async () => {
        try {
          const response = await fetch('/api/movies/recommendations', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setRecommendedMovies(
              data.map((movie: { movieid: number; title: string; poster_url: string }) => ({
                id: movie.movieid,
                title: movie.title,
                image: movie.poster_url || '/placeholder.svg',
              }))
            );
          } else {
            console.error('Failed to fetch trending movies');
          }
        } catch (error) {
          console.error('Error fetching trending movies:', error);
        }
      };

      fetchRecommendedMovies();

      const fetchFavoriteGenreMovies = async () => {
        try {
          const userData = localStorage.getItem('user');
          if (!userData) return;
          
          const { id, username } = JSON.parse(userData);
          
          const profileResponse = await fetch(`/api/users/${username}/profile`);
          if (!profileResponse.ok) {
            console.error('Failed to fetch user profile');
            return;
          }
          
          const profileData = await profileResponse.json();
          const highestRatedGenre = profileData.stats.highestRatedGenre;
          setFavoriteGenre(highestRatedGenre);

          if (highestRatedGenre) {
            const moviesResponse = await fetch(`/api/movies/favorite-genre-movies/${id}`);
            if (!moviesResponse.ok) {
              console.error('Failed to fetch genre movies');
              return;
            }
            
            const moviesData = await moviesResponse.json();
            setFavoriteGenreMovies(
              moviesData.map((movie: { movie_title: string; movieid?: number; poster_url: string }) => ({
                id: movie.movieid || 0,
                title: movie.movie_title,
                image: movie.poster_url || '/placeholder.svg',
              }))
            );
          }
        } catch (error) {
          console.error('Error fetching favorite genre movies:', error);
        }
      };

      fetchFavoriteGenreMovies();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero section with search */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Discover Your Next Favorite Movie
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Search through thousands of movies by title, actors, directors, and more
            </p>
            <Suspense fallback={<div>Loading search results...</div>}>
              <SearchBar />
            </Suspense>
          </div>
        </div>
      </div>

      <main className="container mx-auto p-4">
      <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Trending 🔥</h2>
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
           {trendingMovies.length > 0 ? (
              trendingMovies.map((movie) => (
                <div key={movie.id} className="flex-none">
                  <MovieCard movie={movie} />
                </div>
              ))
            ) : (
              <p>No trending movies available.</p>
            )}
          </div>
        </section>

        {isLoggedIn && watchlist.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Watchlist</h2>
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
              {watchlist.map((movie) => (
                <div key={movie.id} className="flex-none">
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Popular Movies</h2>
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
            {popularMovies.map((movie) => (
              <div key={movie.id} className="flex-none">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </section>

        {isLoggedIn && recommendedMovies.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
            {recommendedMovies.map((movie) => (
              <div key={movie.id} className="flex-none">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </section>
        )}

        {isLoggedIn && favoriteGenreMovies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Top Rated {favoriteGenre} Movies 
            </h2>
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
              {favoriteGenreMovies.map((movie) => (
                <div key={movie.id} className="flex-none">
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function MovieCard({ movie }: { movie: { id: number; title: string; image: string } }) {
  return (
    <Link href={`/movie/${movie.id}`}>
      <Card className="w-[180px] h-[320px] flex flex-col relative bg-white overflow-hidden transition-transform hover:scale-105 cursor-pointer">
        <CardHeader className="p-3 flex-none">
          <CardTitle className="text-sm truncate">{movie.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <div className="relative w-full h-full">
            <Image 
              src={movie.image} 
              alt={movie.title} 
              fill
              className="object-cover"
              style={{ objectFit: 'cover' }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

