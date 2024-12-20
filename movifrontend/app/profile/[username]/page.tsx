"use client"

import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatTimestamp } from '../../dateUtils.js';

interface Movie {
  movieid: number
  title: string
  poster_url: string
  average_rating: number
}

interface Review {
  movieid: number
  title: string
  rating: number
  review: string
  timestamp: string
  poster_url: string
}

interface UserProfile {
  user: {
    username: string
  }
  watchlist: Movie[]
  reviews: Review[]
}

export default function ProfilePage({ params }: { params: { username: string } }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lovedMovie, setLovedMovie] = useState<Review | null>(null);
  const [hatedMovie, setHatedMovie] = useState<Review | null>(null);
  const [mostReviewedGenre, setMostReviewedGenre] = useState<string | null>(null);
  const [highestRatedGenre, setHighestRatedGenre] = useState<string | null>(null);
  const [longestMovie, setLongestMovie] = useState<{ title: string; duration: number; poster_url: string; rating: number } | null>(null);
  const [mostReviewedActor, setMostReviewedActor] = useState<string | null>(null);
  const [favoriteDecade, setFavoriteDecade] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/${params.username}/profile`);
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        const data = await response.json();
        setProfile(data);

        // Extract new metrics
        setMostReviewedGenre(data.stats.mostReviewedGenre);
        setHighestRatedGenre(data.stats.highestRatedGenre);
        setLongestMovie(data.stats.longestMovie);
        setMostReviewedActor(data.stats.mostReviewedActor);
        setFavoriteDecade(data.stats.favoriteDecade);

        // Existing calculations
        if (data.reviews.length > 0) {
          const loved: Review = data.reviews.reduce((prev: Review, curr: Review) => (curr.rating > prev.rating ? curr : prev));
          setLovedMovie(loved);
    
          const hated: Review = data.reviews.reduce((prev: Review, curr: Review) => (curr.rating < prev.rating ? curr : prev));
          setHatedMovie(hated);
        }
      } catch (err) {
        setError("Failed to load profile");
        console.error(err);
      }
    };

    fetchProfile();
  }, [params.username]);

  const getLongestMovieText = (movie: { title: string; duration: number; rating: number }) => {
    const hours = Math.floor(movie.duration / 60);
    const minutes = movie.duration % 60;
    const timeString = `${hours}h ${minutes}m`;

    return movie.rating >= 7
      ? `I spent ${timeString} watching ${movie.title} and it was worth every second!`
      : `I wasted ${timeString} watching ${movie.title}... I'll never get that time back.`;
  };

  function getDecadeText(decade: number): string {
    if (decade >= 1980 && decade < 1990) {
      return `I love movies from the 80s... I guess I have an old soul and it has some unforgettable classics.`;
    } else if (decade >= 1990 && decade < 2000) {
      return `The 90s are where it’s at! Blockbuster hits, iconic soundtracks.`;
    } else if (decade >= 2000 && decade < 2010) {
      return `Ah, the 2000s—where CGI ruled and trilogies reigned supreme.`;
    } else if (decade >= 2010 && decade < 2020) {
      return `The 2010s? Two words: Peak Cinema. Superheroes, indies, and so much more.`;
    } else if (decade >= 1970 && decade < 1980) {
      return `I will always argue that the 70s brought us bold storytelling and timeless classics.`;
    } else {
      return `Movies from the ${decade}s have my heart! Timeless gems truly.`;
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <main className="container mx-auto p-4">
          <div className="text-center text-red-500">{error}</div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-opacity-50"></div>
          <p className="text-gray-700 mt-4 text-lg font-medium">Loading profile details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto p-4">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-4xl font-semibold text-white">
                {profile.user.username[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profile.user.username}</h1>
              <p className="text-gray-600">
                {profile.reviews.length} reviews · {profile.watchlist.length} in watchlist
              </p>
            </div>
          </div>
        </div>

        {(lovedMovie || hatedMovie) && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Get to Know Me</h2>
            <section className="mb-8">
              {/* "I Love..." Column */}
              <div>
                <h3 className="text-xl font-semibold mb-2">🎥 My Favorites</h3>
                <ul className="list-disc pl-5 text-gray-700">
                  {mostReviewedGenre && highestRatedGenre && (
                    <li
                      dangerouslySetInnerHTML={{
                        __html:
                          mostReviewedGenre === highestRatedGenre
                            ? `🎞️ I love exploring and always enjoy watching <strong>${mostReviewedGenre}</strong> movies.`
                            : `🎞️ I love exploring <strong>${mostReviewedGenre}</strong> movies, but I always love <strong>${highestRatedGenre}</strong> movies.`
                      }}
                    />
                  )}
                  {longestMovie && <li>🕒 {getLongestMovieText(longestMovie)}</li>}
                  {mostReviewedActor && <li>🎭 I keep seeing <strong>{mostReviewedActor}</strong> in like everything...</li>}
                  {favoriteDecade && (
                    <li>🎬 {getDecadeText(favoriteDecade)}</li>
                  )}
                </ul>
              </div>
            </section>
            <div className="grid grid-cols-2 gap-4">

              {/* "I Love..." Column */}
              {lovedMovie && (
                <div>
                  <h3 className="text-xl font-semibold mb-2">😍 I loved...</h3>
                  <Card className="flex">
                    <div className="w-1/4 p-4">
                      <Image
                        src={lovedMovie.poster_url || '/placeholder.svg'}
                        alt={lovedMovie.title}
                        width={150}
                        height={225}
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="w-3/4 p-4">
                      <CardHeader>
                        <CardTitle>{lovedMovie.title}</CardTitle>
                        <CardDescription>
                          Rating: {lovedMovie.rating}/10 · {formatTimestamp(lovedMovie.timestamp)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700">{lovedMovie.review}</p>
                      </CardContent>
                      <CardFooter>
                        <Link href={`/movie/${lovedMovie.movieid}`}>
                          <Button variant="outline">View Movie</Button>
                        </Link>
                      </CardFooter>
                    </div>
                  </Card>
                </div>
              )}

              {/* "I Hate..." Column */}
              {hatedMovie && (
                <div>
                  <h3 className="text-xl font-semibold mb-2">😾 I hated...</h3>
                  <Card className="flex">
                    <div className="w-1/4 p-4">
                      <Image
                        src={hatedMovie.poster_url || '/placeholder.svg'}
                        alt={hatedMovie.title}
                        width={150}
                        height={225}
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="w-3/4 p-4">
                      <CardHeader>
                        <CardTitle>{hatedMovie.title}</CardTitle>
                        <CardDescription>
                          Rating: {hatedMovie.rating}/10 · {formatTimestamp(hatedMovie.timestamp)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700">{hatedMovie.review}</p>
                      </CardContent>
                      <CardFooter>
                        <Link href={`/movie/${hatedMovie.movieid}`}>
                          <Button variant="outline">View Movie</Button>
                        </Link>
                      </CardFooter>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Watchlist Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Watchlist</h2>
          <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
            {profile.watchlist.map((movie) => (
              <div key={movie.movieid} className="flex-none">
                <Card className="w-[180px] h-[320px] flex flex-col relative bg-white overflow-hidden">
                  <CardHeader className="p-3 flex-none">
                    <CardTitle className="text-sm truncate">{movie.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-grow">
                    <div className="relative w-full h-full">
                      <Image
                        src={movie.poster_url || '/placeholder.svg'}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  </CardContent>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80">
                    <Link href={`/movie/${movie.movieid}`} className="w-full block">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-white hover:text-white hover:bg-black hover:bg-opacity-90"
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            ))}
            {profile.watchlist.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No movies in watchlist yet
              </p>
            )}
          </div>
        </section>

        {/* Reviews Section */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Reviews</h2>
          <div className="space-y-4">
            {profile.reviews.map((review) => (
              <Card key={`${review.movieid}-${review.timestamp}`}>
                <div className="flex">
                  <div className="w-1/4 p-4">
                    <Image
                      src={review.poster_url || '/placeholder.svg'}
                      alt={review.title}
                      width={150}
                      height={225}
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="w-3/4 p-4">
                    <CardHeader>
                      <CardTitle>{review.title}</CardTitle>
                      <CardDescription>
                        Rating: {review.rating}/10 · {formatTimestamp(review.timestamp)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">{review.review}</p>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/movie/${review.movieid}`}>
                        <Button variant="outline">View Movie</Button>
                      </Link>
                    </CardFooter>
                  </div>
                </div>
              </Card>
            ))}
            {profile.reviews.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No reviews yet
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
} 