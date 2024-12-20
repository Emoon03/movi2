'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Rating } from '@/components/ui/rating';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';
import Link from 'next/link';
import { formatTimestamp } from '../../dateUtils.js';

interface Review {
  id?: number;
  username: string;
  rating: number;
  review: string;
  timestamp: string;
}

type Movie = {
  id: string;
  title: string;
  poster_url: string | null;
  year: number;
  average_rating: number;
  description: string | '';
  directors: string[];
  reviews: Review[];
  writers: string[],
  actors: string[];
};

export default function MovieDetails({ params }: { params: { id: string } }) {
  const movieId = params.id;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch movie and reviews on mount
  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const movieResponse = await fetch(`/api/movies/${movieId}`);
        if (!movieResponse.ok) throw new Error('Failed to fetch movie details');
        const movieData = await movieResponse.json();
        setMovie(movieData);

        const reviewsResponse = await fetch(`/api/movies/${movieId}/comments`);
        const reviewsData = reviewsResponse.ok ? await reviewsResponse.json() : [];
        setReviews(reviewsData);

        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);

        if (token) {
          const watchlistResponse = await fetch(`/api/users/watchlist`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const watchlist = await watchlistResponse.json();
          setIsInWatchlist(watchlist.includes(parseInt(movieId, 10)));
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchMovieDetails();
  }, [movieId]);

  const handleToggleWatchlist = async () => {
    const token = localStorage.getItem('token');
    if (!token) return alert('You must be logged in to modify your watchlist');

    try {
      const response = await fetch('/api/users/watchlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movieId }),
      });

      if (response.ok) {
        setIsInWatchlist((prev) => !prev);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to modify watchlist');
      }
    } catch (error) {
      console.error('Error modifying watchlist:', error);
      alert('An unexpected error occurred');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to submit a review');
      return;
    }

    if (!rating) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/movies/${movieId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, review }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        // Refresh reviews
        const reviewsResponse = await fetch(`/api/movies/${movieId}/comments`);
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData);
        // Clear form
        setRating(null);
        setReview('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50"></div>
          <p className="text-gray-700 mt-4 text-lg font-medium">Loading movie details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>{movie.title}</CardTitle>
            <CardDescription>{movie.year}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <Image
                src={movie.poster_url || '/placeholder.svg'}
                alt={movie.title}
                width={300}
                height={450}
                className="w-full md:w-1/3 h-auto"
              />
              <div className="flex-1">
                <p className="mb-2"><strong>Directors:</strong> {movie.directors.join(', ')}</p>
                <p className="mb-2"><strong>Actors:</strong> {movie.actors.join(', ')}</p>
                <p className="mb-2"><strong>Writers:</strong> {movie.writers.join(', ')}</p>
                <div className="mb-4">
                  <strong>Average Rating:</strong>
                  <Rating value={movie.average_rating} readonly className="mt-1" />
                </div>
                {isLoggedIn && (
                  <Button onClick={handleToggleWatchlist}>
                    {isInWatchlist ? (
                      <>
                        <Minus className="mr-2 h-4 w-4" /> Remove from Watchlist
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" /> Add to Watchlist
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Review Form */}
            {isLoggedIn && (
              <div className="mt-8 mb-8">
                <h3 className="text-2xl font-bold mb-4">Write a Review</h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Rating</label>
                    <Rating value={rating ?? 0} onChange={setRating} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Review</label>
                    <Textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder="Write your review here..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </form>
              </div>
            )}

            {/* Reviews Section */}
            <div className="mt-8">
              <h3 className="text-2xl font-bold mb-4">Reviews</h3>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <Card key={`${review.username}-${review.timestamp}`} className="mb-4">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Link href={`/profile/${review.username}`} className="hover:underline">
                          <CardTitle className="text-lg">{review.username}</CardTitle>
                        </Link>
                        <Rating value={review.rating} readonly />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p>{review.review}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {formatTimestamp(review.timestamp)}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p>No reviews available for this movie.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}