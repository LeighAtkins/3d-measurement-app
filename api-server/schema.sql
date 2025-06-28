
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies Table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    model_url VARCHAR(255),
    furniture_type VARCHAR(50),
    furniture_subcategory VARCHAR(50),
    generation_status VARCHAR(50) DEFAULT 'pending',
    generation_attempts INTEGER DEFAULT 0,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    assigned_client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurements Table
CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    value FLOAT NOT NULL,
    unit VARCHAR(20) NOT NULL,
    start_point JSONB,
    end_point JSONB,
    notes TEXT,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo Storage Table
CREATE TABLE order_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generation Attempts Table
CREATE TABLE generation_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    seed_value INTEGER,
    background_removal_confidence DECIMAL(3,2),
    model_quality_score DECIMAL(3,2),
    processing_time_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    glb_url VARCHAR(500),
    selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurement Templates Table
CREATE TABLE measurement_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    furniture_type VARCHAR(50) NOT NULL,
    measurement_name VARCHAR(100) NOT NULL,
    typical_min_cm INTEGER,
    typical_max_cm INTEGER,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GPU Usage Tracking Table
CREATE TABLE gpu_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_seconds_used INTEGER DEFAULT 0,
    generation_count INTEGER DEFAULT 0,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Policies for orders
CREATE POLICY select_orders ON orders FOR SELECT USING (company_id = current_setting('request.jwt.claims', true)::jsonb->>'company_id');
CREATE POLICY insert_orders ON orders FOR INSERT WITH CHECK (company_id = current_setting('request.jwt.claims', true)::jsonb->>'company_id');
CREATE POLICY update_orders ON orders FOR UPDATE USING (company_id = current_setting('request.jwt.claims', true)::jsonb->>'company_id');
CREATE POLICY delete_orders ON orders FOR DELETE USING (company_id = current_setting('request.jwt.claims', true)::jsonb->>'company_id');

-- Policies for measurements
CREATE POLICY select_measurements ON measurements FOR SELECT USING (order_id IN (SELECT id FROM orders));
CREATE POLICY insert_measurements ON measurements FOR INSERT WITH CHECK (order_id IN (SELECT id FROM orders));
CREATE POLICY update_measurements ON measurements FOR UPDATE USING (order_id IN (SELECT id FROM orders));
CREATE POLICY delete_measurements ON measurements FOR DELETE USING (order_id IN (SELECT id FROM orders));

-- Insert measurement templates for furniture types
INSERT INTO measurement_templates (furniture_type, measurement_name, typical_min_cm, typical_max_cm, display_order, is_required) VALUES
-- Sofa measurements
('sofa', 'Overall Length', 150, 300, 1, true),
('sofa', 'Seat Depth', 50, 80, 2, true),
('sofa', 'Back Height', 70, 100, 3, true),
('sofa', 'Arm Height', 50, 70, 4, true),
('sofa', 'Seat Height', 40, 50, 5, true),
('sofa', 'Overall Depth', 80, 120, 6, true),

-- Armchair measurements
('armchair', 'Width', 60, 100, 1, true),
('armchair', 'Depth', 70, 90, 2, true),
('armchair', 'Back Height', 70, 110, 3, true),
('armchair', 'Seat Height', 40, 50, 4, true),
('armchair', 'Arm Height', 55, 75, 5, true),

-- Cushion measurements
('cushion', 'Width', 40, 60, 1, true),
('cushion', 'Height', 40, 60, 2, true),
('cushion', 'Thickness', 10, 20, 3, true),

-- Ottoman measurements
('ottoman', 'Width', 40, 80, 1, true),
('ottoman', 'Depth', 40, 80, 2, true),
('ottoman', 'Height', 35, 50, 3, true),

-- Coffee table measurements
('coffee-table', 'Length', 80, 150, 1, true),
('coffee-table', 'Width', 40, 80, 2, true),
('coffee-table', 'Height', 35, 50, 3, true);
