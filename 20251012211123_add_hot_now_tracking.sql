/*
  # Add Hot Right Now Tracking

  1. Changes
    - Add `hot_now` boolean column to pubs table (if not exists)
    - Add `popularity_score` integer column for tracking real-time popularity
    - Add `last_popularity_check` timestamp for caching
    - Add index for efficient hot pub queries

  2. Purpose
    - Track which pubs are busy right now
    - Cache popularity data to avoid excessive API calls
    - Enable real-time filtering of popular pubs
*/

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pubs' AND column_name = 'hot_now'
  ) THEN
    ALTER TABLE pubs ADD COLUMN hot_now boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pubs' AND column_name = 'popularity_score'
  ) THEN
    ALTER TABLE pubs ADD COLUMN popularity_score integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pubs' AND column_name = 'last_popularity_check'
  ) THEN
    ALTER TABLE pubs ADD COLUMN last_popularity_check timestamptz;
  END IF;
END $$;

-- Create index for hot pubs queries
CREATE INDEX IF NOT EXISTS pubs_hot_now_idx ON pubs(hot_now) WHERE hot_now = true;
CREATE INDEX IF NOT EXISTS pubs_popularity_score_idx ON pubs(popularity_score DESC);
