'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface MovieCardProps {
  movie: {
    id: number;
    title: string;
    image: string;
    rating?: number;
    year?: number;
    genres?: string[];
  };
}

const MovieCard = ({ movie }: MovieCardProps) => {
  const formatRating = (rating: number | undefined): string => {
    if (rating === undefined || isNaN(rating)) return 'N/A';
    return rating.toFixed(1);
  };

  return (
    <div className="w-[180px] bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="aspect-[2/3] relative">
        <Image
          src={movie.image}
          alt={movie.title}
          fill
          className="object-cover"
        />
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-md text-sm">
          ★ {formatRating(movie.rating)}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-2">{movie.title}</h3>
        {movie.year && (
          <p className="text-gray-600 text-sm mb-2">{movie.year}</p>
        )}
        {movie.genres && movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {movie.genres.map((genre, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pb-4">
        <Link href={`/movie/${movie.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full hover:bg-blue-50"
          >
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default MovieCard; 