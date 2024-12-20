# Movi
Movi simplifies the task of choosing a movie by tailoring suggestions to individual tastes, such as favorite genres, directors, actors, and viewing history. By combining data from MovieLens, IMDB, and data by users of Movi, Movi refines suggestions that reduce browsing time and encourage the discovery of lesser-known titles that align with user preferences. It also allows users to rate movies they've watched to create their own ultimate movie ranking. Our goal is to enhance the movie-watching experience with quick, customized recommendations that closely match individual interests.

## Core Features
1. **Search Bar**: Quickly find movies by title or keyword.
2. **Add Preferences**: Customize search by setting genre, actor, or director preferences.
3. **Add Reviews**: Users can review movies and share their thoughts.
4. **"Feeling Lucky" Feature**: Get a hidden gem movie recommendation.
5. **Top Movies of All Time**: See a list of highly-rated movies across all users.
6. **Watchlist**: Users can save movies they plan to watch.
7. **User Accounts**: Log in using Google OAuth for personalized experiences.
8. **Analysis of Movie Tastes**: Get recommendations and insights based on user data, such as favorite genre or top-rated movies.
9. **User Accounts and Authentication**: Users can register and create accounts with session management using JWT.

## Stretch Features (Time Permitting)
1. **Social Features**: Share movie recommendations with friends and track who you’ve watched movies with.
2. **Global Ranking**: Explore global rankings based on user ratings within the app.

## Application Pages
1. **Homepage/Dashboard**: The main page with a search bar and explore section, displaying recommended/popular movies for the user.
2. **Search Results Page**: Displays search results with clickable links for more movie information.
3. **Watchlist**: Shows a list of saved movies, each with basic details and options to rate or remove from the watchlist.
4. **Movie Information Page**: Detailed information about a specific movie, with options to add it to the watchlist or rate it.
5. **Registration/Login Page**: Facilitates user account creation and login.

## Running the Application
Backend
```
cd server
npm start
```

```
cd server
redis-server
```

Frontend
```
cd movifrontend
npm run dev
```

## Screenshot Demo
1. Homepage
<img width="1624" alt="Screenshot 2024-12-15 at 6 38 19 PM" src="https://github.com/user-attachments/assets/b53635fa-ec64-4559-a2ce-0800da060d70" />
<img width="1624" alt="Screenshot 2024-12-15 at 6 40 08 PM" src="https://github.com/user-attachments/assets/aac1f84d-c9f0-432f-b79e-5af77f236400" />
<img width="1624" alt="Screenshot 2024-12-15 at 6 39 58 PM" src="https://github.com/user-attachments/assets/444c948b-8c7c-4e3f-9467-ff590de396e5" />
<img width="1624" alt="Screenshot 2024-12-15 at 6 40 02 PM" src="https://github.com/user-attachments/assets/692d4301-2b65-495e-a36e-8e7789f57688" />

2. Profile
<img width="1624" alt="Screenshot 2024-12-15 at 6 38 34 PM" src="https://github.com/user-attachments/assets/07ed0a9f-f137-4049-b2d3-7f852a5e965d" />
<img width="1624" alt="Screenshot 2024-12-15 at 6 38 29 PM" src="https://github.com/user-attachments/assets/13bd9dcd-d1fc-4b65-968b-99766f9cee6d" />

3. Search
<img width="1624" alt="Screenshot 2024-12-15 at 6 41 00 PM" src="https://github.com/user-attachments/assets/b2745df5-d22d-4cc4-a7cd-2ffd846a5625" />
<img width="1624" alt="Screenshot 2024-12-15 at 6 40 42 PM" src="https://github.com/user-attachments/assets/fb8b36a3-3c05-465e-8c68-bdc9de3e94e3" />

4. Movie Page
<img width="1624" alt="Screenshot 2024-12-15 at 6 39 27 PM" src="https://github.com/user-attachments/assets/a40be99e-1499-40c0-bb7d-7d49ec0165fa" />
<img width="1624" alt="Screenshot 2024-12-15 at 6 39 23 PM" src="https://github.com/user-attachments/assets/d28d2cd6-9360-4c69-aaf1-150165e5c231" />

5. Login/Registration
<img width="1624" alt="Screenshot 2024-12-15 at 6 43 51 PM" src="https://github.com/user-attachments/assets/e77e2a8a-7518-43c4-a065-3558a3b8d7a6" />
<img width="1624" alt="Screenshot 2024-12-15 at 6 43 49 PM" src="https://github.com/user-attachments/assets/e95bac2e-2484-400b-80af-4265aa7616b1" />
