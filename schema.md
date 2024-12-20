# Database Schema

```sql
CREATE TABLE actors (
    movieid INTEGER NOT NULL,
    actors TEXT[] NOT NULL,
    PRIMARY KEY (movieid)
);

CREATE TABLE crew (
    movieid INTEGER NOT NULL,
    directors TEXT[] NOT NULL,
    writers TEXT[] NOT NULL,
    PRIMARY KEY (movieid)
);

CREATE TABLE links (
    movieid INTEGER NOT NULL,
    imdbid VARCHAR(10) NOT NULL,
    tmdbid INTEGER NOT NULL,
    PRIMARY KEY (movieid)
);

CREATE TABLE movies (
    movieid INTEGER PRIMARY KEY,
    title VARCHAR NOT NULL,
    genre TEXT[] NOT NULL,
    duration INTEGER NOT NULL,
    releaseyear INTEGER NOT NULL,
    poster_url TEXT,
    PRIMARY KEY (movieid)
);

CREATE TABLE ratings (
    movieid INTEGER NOT NULL,
    userid INTEGER NOT NULL,
    rating DOUBLE PRECISION NOT NULL,
    timestamp INTEGER NOT NULL,
    review TEXT,
    ratingid INTEGER DEFAULT nextval('ratings_ratingid_seq'),
    PRIMARY KEY (ratingid),
    CONSTRAINT fk_ratings_movieid FOREIGN KEY (movieid) REFERENCES movies (movieid),
    CONSTRAINT fk_ratings_userid FOREIGN KEY (userid) REFERENCES users (id)
);

CREATE TABLE users (
    id INTEGER DEFAULT nextval('users_id_seq'),
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    watchlist INTEGER[] NOT NULL,
    profile_img TEXT,
    PRIMARY KEY (id)
);
```
