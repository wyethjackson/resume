CREATE TABLE IF NOT EXISTS migrations (
  migration_id INT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  user_uuid TEXT UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(128) UNIQUE NOT NULL,
  admin TIMESTAMP,
  password_hash TEXT,
  created TIMESTAMP DEFAULT NOW(),
  modified TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  message_id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  user_id INT NOT NULL REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS posts (
  post_id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id INT NOT NULL REFERENCES users(user_id)
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
