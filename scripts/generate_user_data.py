import psycopg2
from faker import Faker
import random
import bcrypt
from dotenv import load_dotenv
import os
from psycopg2.extras import execute_values

load_dotenv()

db_config = {
    'dbname': os.getenv('RDS_DBNAME'),
    'user': os.getenv('RDS_USERNAME'),
    'password': os.getenv('RDS_PASSWORD'),
    'host': os.getenv('RDS_ENDPOINT'),
    'port': os.getenv('RDS_PORT', 5432)
}

faker = Faker()

connection = psycopg2.connect(**db_config)
cursor = connection.cursor()

cursor.execute("SELECT movieid FROM movies")
movie_ids = [row[0] for row in cursor.fetchall()]

def fetch_existing_usernames():
    try:
        connection = psycopg2.connect(**db_config)
        cursor = connection.cursor()
        cursor.execute("SELECT username FROM users")
        existing_usernames = {row[0] for row in cursor.fetchall()}
        cursor.close()
        connection.close()
        return existing_usernames
    except Exception as e:
        print(f"Error fetching existing usernames: {e}")
        return set()


def generate_random_users(batch_size, existing_usernames):
    users = []
    while len(users) < batch_size:
        username = faker.user_name()
        if username in existing_usernames:
            continue  # Skip duplicate usernames
        existing_usernames.add(username)

        password = bcrypt.hashpw(faker.password().encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        watchlist = random.sample(movie_ids, random.randint(0, 10))
        profile_img = faker.image_url(width=150, height=150)

        users.append({
            'username': username,
            'password': password,
            'watchlist': watchlist,
            'profile_img': profile_img
        })
    return users

def insert_users(users):
    try:
        connection = psycopg2.connect(**db_config)
        cursor = connection.cursor()

        user_data = [
            (
                user['username'],
                user['password'],
                '{' + ','.join(map(str, user['watchlist'])) + '}',  # Convert list to PostgreSQL array
                user['profile_img']
            )
            for user in users
        ]

        query = """
            INSERT INTO users (username, password, watchlist, profile_img)
            VALUES %s
        """
        execute_values(cursor, query, user_data)

        connection.commit()

    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        connection.close()

existing_usernames = fetch_existing_usernames()
total_users_to_insert = 10000
batch_size = 50
for _ in range(total_users_to_insert // batch_size):
  batch_users = generate_random_users(batch_size, existing_usernames)
  insert_users(batch_users)
  print(f"Inserted {len(batch_users)} users.")

print(f"Finished inserting {total_users_to_insert} users.")
