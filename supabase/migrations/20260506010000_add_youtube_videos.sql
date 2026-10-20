-- Migration to add youtube_videos to firms table
ALTER TABLE public.firms
ADD COLUMN IF NOT EXISTS youtube_videos JSONB DEFAULT '[]'::jsonb;

-- Comment for the new column
COMMENT ON COLUMN public.firms.youtube_videos IS 'Array of YouTube video objects: {url: string, title: string}';
