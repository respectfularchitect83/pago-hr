-- 005_add_photo_url_to_users.sql

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS photo_url TEXT;
