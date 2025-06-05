/*
  # Political Debate Schema Setup

  1. New Tables
    - `topics` - Categories for debates
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)

    - `post_topics` - Junction table for posts and topics
      - `post_id` (uuid, foreign key)
      - `topic_id` (uuid, foreign key)

  2. Changes
    - Add `title` column to posts table
    - Add indexes for better query performance

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create topics table
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create post_topics junction table
CREATE TABLE IF NOT EXISTS post_topics (
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, topic_id)
);

-- Add title column to posts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'title'
  ) THEN
    ALTER TABLE posts ADD COLUMN title text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_topics_post_id ON post_topics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_topics_topic_id ON post_topics(topic_id);

-- Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Topics are viewable by everyone"
  ON topics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Post topics are viewable by everyone"
  ON post_topics FOR SELECT
  TO public
  USING (true);

-- Insert default topics
INSERT INTO topics (name, description)
VALUES 
  ('Economy', 'Economic policies, markets, and financial discussions'),
  ('Healthcare', 'Healthcare systems, policies, and reforms'),
  ('Education', 'Educational policies, reforms, and systems'),
  ('Environment', 'Environmental policies, climate change, and conservation'),
  ('Immigration', 'Immigration policies, reforms, and border security'),
  ('Foreign Policy', 'International relations, diplomacy, and trade'),
  ('Civil Rights', 'Civil liberties, equality, and social justice'),
  ('National Security', 'Defense, security policies, and military affairs')
ON CONFLICT (name) DO NOTHING;