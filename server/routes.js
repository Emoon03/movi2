const express = require('express');
const { Pool, types } = require('pg');
require('dotenv').config({ path: '../.env'});
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const router = express.Router();
const redisClient = require('./redis');

// Override the default parsing for BIGINT (PostgreSQL type ID 20)
types.setTypeParser(20, (val) => parseInt(val, 10));

// Create PostgreSQL connection using database credentials provided in db.js
const connection = new Pool({
  host: process.env.RDS_ENDPOINT,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  port: process.env.PORT || 5432,
  database: process.env.RDS_DBNAME,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to the database.');
  }
});

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });

    req.user = user; // Add the decoded user info to the request object
    next();
  });
};

/******************
 * ROUTE HANDLERS *
 ******************/

// User registration: Hashes password and stores user details
const userRegistration = async function (req, res) {
  const { username, password, profile_img } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, password, profile_img)
      VALUES ($1, $2, $3)
      RETURNING id, username;
    `;
    const values = [username, hashedPassword, profile_img || null];

    const { rows } = await connection.query(query, values);
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registering user.' });
  }
};

// User login: Verifies credentials and generates a JWT token
const userLogin = async function (req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const query = 'SELECT * FROM users WHERE username = $1';
    const { rows } = await connection.query(query, [username]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate a JWT
    const payload = { id: user.id, username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

    // Respond with the token and user details
    res.status(200).json({
      token,
      user: { id: user.id, username: user.username, profile_img: user.profile_img },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error logging in.' });
  }
};

// Top Rated: fetches top rated movies by genre
const topRated = async function (req, res) {
  const genre = req.params.genre;

  connection.query(`
      SELECT *
      FROM movies m
      JOIN ratings r ON m.movieid = r.movieid
      WHERE m.genre = '${genre}'
      ORDER BY r.rating DESC
      LIMIT 10
      `, (err, data) => {
    if (err) {
      console.log(err);
      res.json({});
    } else {
      res.json(data.rows);
    }
  });
}

//Fetch User Reviews: Retrieves all reviews posted by a specific user.
const getUserReviews = async (req, res) => {
  const { username } = req.params;

  const query = `
      SELECT
        m.title,
        r.rating,
        r.timestamp
      FROM
        users u
      JOIN
        ratings r ON u.id = r.userId
      JOIN
        movies m ON r.movieId = m.movieId
      WHERE
        u.username = $1;
    `;

  try {
    const { rows } = await connection.query(query, [username]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `No reviews found for user: ${username}` });
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching user reviews." });
  }
};

// Fetch Average Ratings for All Movies: Retrieves the average rating for each movie from the `ratings` table.
const getAverageRatings = async (req, res) => {
  const query = `
    SELECT
      movieid,
      ROUND(CAST(AVG(rating) AS NUMERIC), 2) AS average_rating
    FROM
      ratings
    GROUP BY
      movieid;
  `;

  try {
    const { rows } = await connection.query(query);
    if (rows.length === 0) {
      return res.status(404).json({ error: "No movie ratings found." });
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching average ratings." });
  }
};

// User Preferences: Fetch movies based on user-specified actors or directors from query parameters.
const userPreferences = async function (req, res) {
  const actors = req.query.actors ? req.query.actors.split(',') : [];
  const directors = req.query.directors ? req.query.directors.split(',') : [];

  let conditions = [];
  let queryParams = [];

  if (directors.length > 0) {
    conditions.push(`$${queryParams.length + 1} = ANY(c.directors)`);
    queryParams.push(...directors); // Flatten directors array
  }
  if (actors.length > 0) {
    conditions.push(`$${queryParams.length + 1} = ANY(a.actors)`);
    queryParams.push(...actors); // Flatten actors array
  }
  if (conditions.length === 0) {
    return res.status(400).json({ error: 'You must specify at least one actor or director.' });
  }

  const whereClause = conditions.join(' OR ');

  const query = `
    SELECT
        m.title,
        m.releaseyear,
        m.genre,
        r.rating,
        c.directors,
        a.actors
    FROM
        movies m
    JOIN
        ratings r ON m.movieid = r.movieid
    JOIN
        crew c ON m.movieid = c.movieid
    JOIN
        actors a ON m.movieid = a.movieid
    WHERE
        ${whereClause}
    ORDER BY
        m.releaseyear DESC;
  `;

  try {
    const { rows } = await connection.query(query, queryParams);
    if (rows.length === 0) {
      res.status(404).json({ error: 'No movies found for the given actors or directors.' });
    } else {
      res.json(rows);
    }
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

// User's Favorite Genre Movies: Retrieve the user's top-rated genre and recent popular movies within that genre.
const getUserFavoriteGenreMovies = async (req, res) => {
  const { userid } = req.params;
  const cacheKey = `favorite_genre_movies:${userid}`;

  try {
    const query = `
      WITH favorite_genre AS (
          SELECT UNNEST(m.genre) AS genre, ROUND(AVG(r.rating)::NUMERIC, 2) AS avg_rating
          FROM movies m
          JOIN ratings r ON m.movieid = r.movieid
          WHERE r.userid = $1
          GROUP BY genre
          ORDER BY avg_rating DESC
          LIMIT 1
        ),
        recent_reviews AS (
          SELECT
              movieId,
              COUNT(*) AS review_count
          FROM
              ratings
          WHERE
              CAST(timestamp AS BIGINT) >= EXTRACT(EPOCH FROM NOW()) - (30 * 24 * 60 * 60)
          GROUP BY
              movieId
        )
      SELECT
        m.movieId,
        m.title as movie_title,
        m.genre,
        m.duration,
        m.releaseyear,
        m.poster_url,
        ROUND(CAST(AVG(r.rating) AS NUMERIC), 2) AS avg_rating,
        rr.review_count
      FROM
        movies m
      JOIN
        favorite_genre fg ON FG.GENRE = ANY(m.genre)
      JOIN
        recent_reviews rr ON m.movieId = rr.movieId
      JOIN
        ratings r ON m.movieId = r.movieId
      GROUP BY
        m.movieId, m.title, m.genre, m.duration, m.releaseyear, m.poster_url, rr.review_count
      ORDER BY
        rr.review_count DESC, avg_rating DESC;
    `;
    const { rows } = await connection.query(query, [userid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `No movies found for user: ${userid}` });
    }
    // Cache the results for 1 hour
    try {
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(rows));
    } catch (redisError) {
      console.error('Redis caching error:', redisError);
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching movies based on favorite genre and recent reviews." });
  }
};

// Recommended Movies: Recommend highly-rated recent movies matching the user's favorite genres.
const recommendMovies = async (req, res) => {
  const { userid } = req.params;

  const query = `
      SELECT DISTINCT m.movieid, m.title, m.genre, m.duration, m.releaseyear, r.rating, m.director, m.actor
      FROM movies m
      JOIN ratings r ON m.movieid = r.movieid
      WHERE
          r.userid = $1
          AND r.movielens_rating >= 7
          AND m.genre = r.genres
          AND m.releaseyear >= EXTRACT(YEAR FROM NOW()) - 5
          AND m.releaseyear <= EXTRACT(YEAR FROM NOW())
      ORDER BY m.rating DESC
      LIMIT 10;
    `;

  try {
    const { rows } = await connection.query(query, [userid]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No movie recommendations found for the specified preferences.' });
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
};

// New Releases: Retrieve the 10 most recent movie releases sorted by release year.
const getNewReleases = async function (req, res) {
  const query = `
        SELECT title, genre, releaseYear, duration
        FROM Movies
        ORDER BY releaseYear DESC
        LIMIT 10;
    `;

  try {
    const { rows } = await connection.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching new releases." });
  }
};

// Top Rated Movies by Genre: Fetch the top 10 highest-rated movies for a specified genre, leveraging caching for efficiency.
const getTopRatedMoviesByGenre = async function (req, res) {
  const { genre } = req.params;
  const cacheKey = `top_rated_genre:${genre}`;
  console.log(genre);

  const query = `
  WITH GenreFilteredMovies AS (
    SELECT
        m.movieid,
        m.title,
        m.genre,
        m.poster_url,
        c.directors
    FROM
        movies m
    JOIN
        crew c ON m.movieid = c.movieid
    WHERE
        $1 = ANY(m.genre)
  ),
  MoviesWithRatings AS (
    SELECT
        r.movieid,
        ROUND(CAST(AVG(r.rating) AS NUMERIC), 2) AS avg_rating
    FROM
        ratings r
    WHERE
        r.movieid IN (SELECT movieid FROM GenreFilteredMovies) -- Only consider genre-filtered movies
    GROUP BY
        r.movieid
  ),
  FinalResult AS (
    SELECT
        gfm.movieid,
        gfm.title AS movie_title,
        gfm.genre AS movie_genre,
        gfm.poster_url,
        gfm.directors AS movie_director,
        mwr.avg_rating
    FROM
        GenreFilteredMovies gfm
    JOIN
        MoviesWithRatings mwr ON gfm.movieid = mwr.movieid
  )
  SELECT
    fr.movieid,
    fr.movie_title,
    fr.movie_genre,
    fr.poster_url,
    fr.movie_director,
    fr.avg_rating
  FROM
    FinalResult fr
  ORDER BY
    fr.avg_rating DESC
  LIMIT 10;
  `;

  try {
    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log('Serving top rated genre movies from cache');
      return res.status(200).json(JSON.parse(cachedData));
    }
    const { rows } = await connection.query(query, [genre]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "No movies found for the specified genre." });
    }

    // Cache the results for 6 hours since top rated movies don't change frequently
    try {
      await redisClient.setEx(cacheKey, 21600, JSON.stringify(rows));
    } catch (redisError) {
      console.error('Redis caching error:', redisError);
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while fetching top-rated movies by genre." });
  }
};

// Hidden Gems: Retrieve a random highly-rated, low-review-count movie ("hidden gem") from the database.
const getTopHiddenGems = async function (req, res) {
  try {
    const query = `
      WITH AllMoviesWithRatings AS (
          SELECT
              M.movieid,
              M.title,
              M.genre,
              M.releaseyear,
              ROUND(CAST(AVG(R.rating) AS NUMERIC), 2) AS avg_rating,
              COUNT(R.ratingid) AS review_count
          FROM
              movies M
          JOIN
              ratings R ON M.movieid = R.movieid
          GROUP BY
              M.movieid, M.genre, M.title, M.releaseyear
      ),
      FilteredHiddenGems AS (
          SELECT
              AM.movieid,
              AM.title,
              AM.genre,
              AM.releaseyear,
              AM.avg_rating,
              AM.review_count
          FROM
              AllMoviesWithRatings AM
          WHERE
              AM.avg_rating >= 8
              AND AM.review_count BETWEEN 1 AND 300
      ),
      FinalResult AS (
          SELECT
              FR.movieid,
              FR.title,
              FR.genre,
              FR.releaseyear,
              FR.avg_rating,
              FR.review_count
          FROM
              FilteredHiddenGems FR
          ORDER BY
              FR.avg_rating DESC,
              FR.review_count ASC
      )
      SELECT
          *
      FROM
          FinalResult;
    `;

    const { rows } = await connection.query(query);
    if (rows.length === 0) {
      return res.status(404).json({ error: "No hidden gems found." });
    }
    const randomMovie = rows[Math.floor(Math.random() * rows.length)];
    res.status(200).json(randomMovie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while processing your request." });
  }
};

// ShortHighRated: Fetch highly-rated movies with a duration under 120 minutes.
const getShortHighlyRatedMovies = async (req, res) => {
  const query = `
    SELECT
      m.movieId,
      m.title,
      m.genre,
      m.duration,
      ROUND(CAST(AVG(r.rating) AS NUMERIC), 2) AS average_rating
    FROM
      movies m
    JOIN
      ratings r ON m.movieId = r.movieId
    WHERE
      CAST(m.duration AS INTEGER) < 120
    GROUP BY
      m.movieId, m.title, m.genre, m.duration
    HAVING
      AVG(r.rating) > 7;
  `;

  try {
    const { rows } = await connection.query(query);
    if (rows.length === 0) {
      return res.status(404).json({ error: "No movies found with the specified criteria." });
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred while fetching movies." });
  }
};

// Fetches movie poster URL from the database or OMDB API and updates the database if missing.
const getOrFetchPosterURL = async (movieId) => {
  try {
    const query = `
      SELECT m.poster_url, l.imdbId
      FROM movies m
      JOIN links l ON m.movieId = l.movieId
      WHERE m.movieId = $1;
    `;
    const { rows } = await connection.query(query, [movieId]);

    if (rows.length === 0) {
      throw new Error(`Movie with ID ${movieId} not found`);
    }

    const { poster_url, imdbid } = rows[0];

    // Return existing poster_url if it exists
    if (poster_url) {
      return poster_url;
    }

    // Fetch the poster URL from OMDB API
    const omdbApiKey = process.env.OMDB_API_KEY;
    console.log('OMDB API Key:', process.env.OMDB_API_KEY);
    const response = await fetch(`https://www.omdbapi.com/?i=tt${imdbid}&apikey=${omdbApiKey}`);
    const data = await response.json();

    if (data.Response === 'False') {
      throw new Error(`OMDB API Error: ${data.Error}`);
    }

    const newPosterUrl = data.Poster;

    // Update the `movies` table with the new `poster_url`
    const updateQuery = `
      UPDATE movies
      SET poster_url = $1
      WHERE movieId = $2;
    `;
    await connection.query(updateQuery, [newPosterUrl, movieId]);

    return newPosterUrl;
  } catch (err) {
    console.error('Error fetching poster URL:', err);
    throw err; // Let the calling function handle the error
  }
};

// Fetches detailed movie information, including ratings, crew, and actors. Updates and includes poster URL if missing.
const getMovie = async (req, res) => {
  const { movieId } = req.params;

  try {
    // Fetch the movie details, average rating, and crew information
    const query = `
      SELECT
        m.*,
        ROUND(CAST(AVG(r.rating) AS NUMERIC), 2) AS average_rating,
        c.writers,
        c.directors,
        a.actors
      FROM
        movies m
      JOIN
        ratings r ON m.movieId = r.movieId
      LEFT JOIN
        crew c ON m.movieId = c.movieId
      LEFT JOIN
        actors a ON m.movieId = a.movieId
      WHERE
        m.movieId = $1
      GROUP BY
        m.movieId, m.title, m.genre, m.duration, m.releaseYear, m.poster_url, c.writers, c.directors, a.actors;
    `;
    const { rows } = await connection.query(query, [movieId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const movie = rows[0];

    // Get or fetch the poster URL
    try {
      if (movie.poster_url == null || movie.poster_url == undefined) {
        movie.poster_url = await getOrFetchPosterURL(movie.movieid);
      }
    } catch (posterError) {
      console.error('Error fetching poster URL:', posterError);
      return res.status(500).json({ error: 'Failed to fetch poster URL' });
    }

    // Return the movie data with actors and directors included
    res.status(200).json({
      ...movie,
      writers: movie.writers || [],
      directors: movie.directors || [],
      actors: movie.actors || [],
    });
  } catch (error) {
    console.error('Error fetching movie details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Retrieves all user ratings with comments for a specific movie, ordered by the most recent.
const getRatingsWithComments = async (req, res) => {
  const { movieId } = req.params;

  try {
    // Fetch all ratings with comments for a specific movie
    const query = `
      SELECT
        r.rating,
        r.review,
        u.username,
        r.timestamp
      FROM
        ratings r
      JOIN
        users u ON r.userId = u.id
      WHERE
        r.movieId = $1 AND r.review IS NOT NULL AND r.review <> ''
      ORDER BY
        r.timestamp DESC;
    `;

    const { rows } = await connection.query(query, [movieId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No comments found for this movie' });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching ratings with comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggles a movie in the user's watchlist by adding it if absent or removing it if present, and updates the database.
const postToggleToWatchlist = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { movieId } = req.body;
    const parsedMovieId = parseInt(movieId);

    const checkQuery = `
      SELECT watchlist
      FROM users
      WHERE id = $1;
    `;
    const { rows } = await connection.query(checkQuery, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const watchlist = rows[0].watchlist || [];
    const isInWatchlist = watchlist.includes(parsedMovieId);

    // Update the watchlist to add or remove the movieId
    const updatedWatchlist = isInWatchlist
      ? watchlist.filter((id) => id !== parsedMovieId) // Remove movieId
      : [...new Set([...watchlist, parsedMovieId])]; // Add movieId, ensuring no duplicates

    const updateQuery = `
      UPDATE users
      SET watchlist = $1
      WHERE id = $2
      RETURNING watchlist;
    `;
    const updateResult = await connection.query(updateQuery, [updatedWatchlist, userId]);

    res.status(200).json({
      watchlist: updateResult.rows[0].watchlist,
      message: isInWatchlist ? 'Movie removed from watchlist' : 'Movie added to watchlist',
    });
  } catch (error) {
    console.error('Error toggling watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Retrieves the authenticated user's watchlist from the database and returns it.
const getWatchlist = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const query = `
      SELECT watchlist
      FROM users
      WHERE id = $1;
    `;
    const { rows } = await connection.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const watchlist = rows[0].watchlist || [];
    res.status(200).json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Fetches user profile, including watchlist, reviews, and viewing statistics.
const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    // Get user info and their watchlist
    const userQuery = `
      SELECT id, username, profile_img
      FROM users
      WHERE username = $1;
    `;
    const { rows: userRows } = await connection.query(userQuery, [username]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];

    // Get user's watchlist movies with details
    const watchlistQuery = `
      SELECT
        m.movieid,
        m.title,
        m.genre,
        m.duration,
        m.releaseyear,
        m.poster_url,
        ROUND(CAST(AVG(r.rating) AS NUMERIC), 2) as average_rating
      FROM movies m
      JOIN ratings r ON m.movieid = r.movieid
      WHERE m.movieid = ANY(
        SELECT UNNEST(watchlist)
        FROM users
        WHERE id = $1
      )
      GROUP BY
        m.movieid,
        m.title,
        m.genre,
        m.duration,
        m.releaseyear,
        m.poster_url;
    `;
    const { rows: watchlistRows } = await connection.query(watchlistQuery, [user.id]);

    // Get user's reviews with movie details
    const reviewsQuery = `
      SELECT
        m.movieid,
        m.title,
        m.poster_url,
        r.rating,
        r.review,
        r.timestamp,
        m.genre,
        m.duration,
        m.releaseyear
      FROM ratings r
      JOIN movies m ON r.movieid = m.movieid
      WHERE r.userid = $1
      ORDER BY r.timestamp DESC;
    `;
    const { rows: reviewRows } = await connection.query(reviewsQuery, [user.id]);

    // Get most reviewed genre
    const mostReviewedGenreQuery = `
      SELECT UNNEST(m.genre) AS genre, COUNT(*) AS count
      FROM movies m
      JOIN ratings r ON m.movieid = r.movieid
      WHERE r.userid = $1
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 1;
    `;
    const { rows: mostReviewedGenreRows } = await connection.query(mostReviewedGenreQuery, [user.id]);
    const mostReviewedGenre = mostReviewedGenreRows[0]?.genre || null;

    // Get highest-rated genre
    const highestRatedGenreQuery = `
      SELECT UNNEST(m.genre) AS genre, ROUND(AVG(r.rating)::NUMERIC, 2) AS avg_rating
      FROM movies m
      JOIN ratings r ON m.movieid = r.movieid
      WHERE r.userid = $1
      GROUP BY genre
      ORDER BY avg_rating DESC
      LIMIT 1;
    `;
    const { rows: highestRatedGenreRows } = await connection.query(highestRatedGenreQuery, [user.id]);
    const highestRatedGenre = highestRatedGenreRows[0]?.genre || null;

    // Get longest movie watched
    const longestMovieQuery = `
      SELECT
        m.title,
        m.duration,
        m.poster_url,
        r.rating
      FROM movies m
      JOIN ratings r ON m.movieid = r.movieid
      WHERE r.userid = $1
      ORDER BY m.duration DESC
      LIMIT 1;
    `;
    const { rows: longestMovieRows } = await connection.query(longestMovieQuery, [user.id]);
    const longestMovie = longestMovieRows[0] || null;

    // Get most reviewed actor
    const mostReviewedActorQuery = `
      SELECT UNNEST(a.actors) AS actor, COUNT(*) AS count
      FROM actors a
      JOIN ratings r ON a.movieid = r.movieid
      WHERE r.userid = $1
      GROUP BY actor
      ORDER BY count DESC
      LIMIT 1;
    `;
    const { rows: mostReviewedActorRows } = await connection.query(mostReviewedActorQuery, [user.id]);
    const mostReviewedActor = mostReviewedActorRows[0]?.actor || null;

    // Get favorite decade
    const favoriteDecadeQuery = `
      SELECT (m.releaseyear / 10) * 10 AS decade, COUNT(*) AS count
      FROM movies m
      JOIN ratings r ON m.movieid = r.movieid
      WHERE r.userid = $1
      GROUP BY decade
      ORDER BY count DESC
      LIMIT 1;
    `;
    const { rows: favoriteDecadeRows } = await connection.query(favoriteDecadeQuery, [user.id]);
    const favoriteDecade = favoriteDecadeRows[0]?.decade || null;

    // Build the response
    res.status(200).json({
      user,
      watchlist: watchlistRows,
      reviews: reviewRows,
      stats: {
        mostReviewedGenre,
        highestRatedGenre,
        longestMovie,
        mostReviewedActor,
        favoriteDecade,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handles posting or updating a user review for a movie, ensuring valid ratings and timestamps.
const postReview = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const { movieId } = req.params;
    const { rating, review } = req.body;

    // Validate rating
    const numericRating = parseInt(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 10) {
      return res.status(400).json({ error: 'Rating must be between 1 and 10' });
    }

    // Check if user has already reviewed this movie
    const checkQuery = `
      SELECT movieid, userid
      FROM ratings
      WHERE userid = $1 AND movieid = $2;
    `;
    const { rows: existingReviews } = await connection.query(checkQuery, [userId, movieId]);

    if (existingReviews.length > 0) {
      // Update existing review
      const updateQuery = `
        UPDATE ratings
        SET rating = $1,
            review = $2,
            timestamp = EXTRACT(EPOCH FROM NOW())::integer
        WHERE userid = $3 AND movieid = $4
        RETURNING movieid, userid, rating, review, timestamp;
      `;
      const { rows } = await connection.query(updateQuery, [numericRating, review, userId, movieId]);
      res.status(200).json({ message: 'Review updated successfully', review: rows[0] });
    } else {
      // Create new review
      const insertQuery = `
        INSERT INTO ratings (userid, movieid, rating, review, timestamp)
        VALUES ($1, $2, $3, $4, EXTRACT(EPOCH FROM NOW())::integer)
        RETURNING movieid, userid, rating, review, timestamp;
      `;
      const { rows } = await connection.query(insertQuery, [userId, movieId, numericRating, review]);
      res.status(201).json({ message: 'Review posted successfully', review: rows[0] });
    }
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Retrieves highly-rated popular movies (rating > 9, min 50 reviews) with a limit.
const getPopularMovies = async (req, res) => {
  const limit = req.query.limit || 10; // Allow a limit parameter (default: 10)

  const query = `
    SELECT
      m.movieId,
      m.title,
      m.poster_url,
      ROUND(CAST(AVG(r.rating) AS NUMERIC), 2) AS avg_rating,
      COUNT(r.rating) AS rating_count
    FROM
      movies m
    JOIN
      ratings r ON m.movieId = r.movieId
    GROUP BY
      m.movieId, m.title, m.poster_url
    HAVING
      ROUND(CAST(AVG(r.rating) AS NUMERIC), 2) > 9.00 -- High rating
      AND COUNT(r.rating) >= 50                       -- At least 50 reviews
    ORDER BY
      rating_count DESC                               -- Sort by the number of reviews
    LIMIT $1;
  `;

  try {
    const { rows } = await connection.query(query, [limit]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "No popular movies found with the specified criteria." });
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching popular movies:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Fetches trending movies based on recent reviews within the last 30 days.
const getTrendingMovies = async (req, res) => {
  try {
    const query = `
      WITH recent_reviews AS (
        SELECT movieid, COUNT(*) AS review_count
        FROM ratings
        WHERE timestamp >= EXTRACT(EPOCH FROM NOW()) - (30 * 24 * 60 * 60) -- Convert NOW() to seconds
        GROUP BY movieid
      )
      SELECT
        m.movieid,
        m.title,
        m.poster_url,
        rr.review_count
      FROM recent_reviews rr
      JOIN movies m ON rr.movieid = m.movieid
      ORDER BY rr.review_count DESC
      LIMIT 10;
    `;

    const { rows } = await connection.query(query);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No trending movies found' });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Recommends movies based on user's favorite genres, excluding watched ones, with caching support.
const getRecommendedMovies = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = `user_recommendations:${userId}`;

    try {
      // Check cache
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log('Serving from cache');
        return res.status(200).json(JSON.parse(cachedData));
      }
    } catch (redisError) {
      console.error('Redis error:', redisError);
      // Continue with database query if Redis fails
    }

    // Run the query if no cache
    const query = `
      WITH user_favorites AS (
        SELECT
          UNNEST(m.genre) AS genre,
          COUNT(*) AS genre_count
        FROM
          ratings r
        JOIN movies m ON r.movieid = m.movieid
        WHERE
          r.userid = $1 AND r.rating >= 4
        GROUP BY genre
        ORDER BY genre_count DESC
        LIMIT 3
      ),
      recommended_movies AS (
        SELECT
          m.movieid,
          m.title,
          m.genre,
          m.duration,
          m.releaseyear,
          m.poster_url,
          ROUND(CAST(AVG(r.rating) AS NUMERIC), 2) AS average_rating
        FROM
          movies m
        LEFT JOIN ratings r ON m.movieid = r.movieid
        WHERE
          EXISTS (
            SELECT 1
            FROM user_favorites uf
            WHERE uf.genre = ANY(m.genre)
          )
          AND m.movieid NOT IN (
            SELECT movieid
            FROM ratings
            WHERE userid = $1
          )
        GROUP BY
          m.movieid, m.title, m.genre, m.duration,
          m.releaseyear, m.poster_url
        ORDER BY average_rating DESC
        LIMIT 10
      )
      SELECT * FROM recommended_movies;
    `;

    const { rows } = await connection.query(query, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No recommendations found' });
    }
    try {
      // Cache the recommendations with a 1-hour expiry
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(rows));
    } catch (redisError) {
      console.error('Redis caching error:', redisError);
      // Continue even if caching fails
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const searchMovies = async (req, res) => {
  try {
    const { title, actors, directors, writers, genre } = req.query;

    let conditions = [];
    let params = [];
    let paramCount = 1;

    // Build search conditions based on provided criteria
    if (title) {
      conditions.push(`m.title ILIKE $${paramCount}`);
      params.push(`%${title}%`);
      paramCount++;
    }

    if (actors) {
      conditions.push(`array_to_string(a.actors, ',') ILIKE $${paramCount}`);
      params.push(`%${actors}%`);
      paramCount++;
    }

    if (directors) {
      conditions.push(`array_to_string(c.directors, ',') ILIKE $${paramCount}`);
      params.push(`%${directors}%`);
      paramCount++;
    }

    if (writers) {
      conditions.push(`array_to_string(c.writers, ',') ILIKE $${paramCount}`);
      params.push(`%${writers}%`);
      paramCount++;
    }

    // Add genre condition
    if (genre) {
      conditions.push(`$${paramCount} = ANY(m.genre)`);
      params.push(genre);
      paramCount++;
    }

    // If no search criteria provided, return error
    if (conditions.length === 0) {
      return res.status(400).json({
        error: 'At least one search criterion (title, actors, directors, writers, or genre) is required'
      });
    }

    const query = `
      SELECT DISTINCT
        m.movieid,
        m.title,
        m.genre,
        m.duration,
        m.releaseyear,
        m.poster_url,
        a.actors,
        c.directors,
        c.writers,
        COALESCE(
          ROUND(CAST(AVG(CAST(r.rating AS DECIMAL)) AS NUMERIC), 2),
          0
        )::FLOAT as average_rating,
        COUNT(r.rating) as rating_count
      FROM movies m
      LEFT JOIN actors a ON m.movieid = a.movieid
      LEFT JOIN crew c ON m.movieid = c.movieid
      LEFT JOIN ratings r ON m.movieid = r.movieid
      WHERE ${conditions.join(' OR ')}
      GROUP BY
        m.movieid,
        m.title,
        m.genre,
        m.duration,
        m.releaseyear,
        m.poster_url,
        a.actors,
        c.directors,
        c.writers
      ORDER BY average_rating DESC NULLS LAST;
    `;

    const { rows } = await connection.query(query, params);

    // Process the rows to ensure average_rating is a number
    const processedRows = rows.map(row => ({
      ...row,
      average_rating: parseFloat(row.average_rating) || 0
    }));

    if (processedRows.length === 0) {
      return res.status(404).json({
        message: 'No movies found matching the search criteria'
      });
    }

    res.status(200).json(processedRows);
  } catch (error) {
    console.error('Error searching movies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/health/redis', async (req, res) => {
  try {
    await redisClient.ping();
    res.status(200).json({ status: 'Redis connection healthy' });
  } catch (error) {
    res.status(500).json({ status: 'Redis connection error', error: error.message });
  }
});

module.exports = router;


/****************
 * ROUTES SETUP *
 ****************/
router.get('/movies/search', searchMovies);
router.get('/movies/top-rated/:genre', topRated);
router.get('/movies/preferences', userPreferences);
router.get('/movies/recommendations', authenticateToken, getRecommendedMovies);
router.get('/movies/new-releases', getNewReleases);
router.get('/movies/hidden-gems', getTopHiddenGems);
router.get('/movies/short-highly-rated-movies', authenticateToken, getShortHighlyRatedMovies);
router.get('/movies/favorite-genre-movies/:userid', getUserFavoriteGenreMovies);
router.get('/movies/average-ratings', getAverageRatings);
router.get('/movies/reviews/:username', getUserReviews);
router.post('/auth/register', userRegistration);
router.post('/auth/login', userLogin);
router.get('/movies/top-rated-genre/:genre', getTopRatedMoviesByGenre);
router.get('/movies/:movieId/comments', getRatingsWithComments);
router.post('/movies/:movieId/reviews', authenticateToken, postReview);
router.post('/users/watchlist/toggle', authenticateToken, postToggleToWatchlist);
router.get('/users/watchlist', authenticateToken, getWatchlist);
router.get('/users/:username/profile', getUserProfile);
router.get('/movies/popular', getPopularMovies);
router.get('/movies/trending', getTrendingMovies);
router.get('/movies/:movieId', getMovie);


module.exports = router;