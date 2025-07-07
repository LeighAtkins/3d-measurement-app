-- Create missing photo_sets table first
CREATE TABLE IF NOT EXISTS photo_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    photo_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add photo_set_id column to order_photos if it doesn't exist
ALTER TABLE order_photos 
ADD COLUMN IF NOT EXISTS photo_set_id UUID REFERENCES photo_sets(id) ON DELETE SET NULL;

-- Add missing columns to generation_attempts table
ALTER TABLE generation_attempts 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS photo_set_id UUID REFERENCES photo_sets(id) ON DELETE SET NULL;

-- Create missing generation_queue table
CREATE TABLE IF NOT EXISTS generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    photo_ids UUID[] NOT NULL, -- Array of photo IDs to use for generation
    generation_options JSONB DEFAULT '{}', -- Seed, quality settings, etc.
    queue_position INTEGER NOT NULL,
    scheduled_date DATE NOT NULL, -- When this will be processed
    status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_photo_sets_order_id ON photo_sets(order_id);
CREATE INDEX IF NOT EXISTS idx_generation_attempts_order_id ON generation_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_generation_attempts_photo_set_id ON generation_attempts(photo_set_id);
CREATE INDEX IF NOT EXISTS idx_order_photos_photo_set_id ON order_photos(photo_set_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_order_id ON generation_queue(order_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status ON generation_queue(status);