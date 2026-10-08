-- ====================================================================
-- QuickKart Complete Supabase PostgreSQL Schema & Seed Script
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- Enable PostGIS extension for geospatial radius calculations
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'shopkeeper', 'admin')),
    phone VARCHAR(50),
    profile_image TEXT,
    address JSONB DEFAULT '{"street": "", "city": "New Delhi", "pincode": "110001"}'::jsonb,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    icon VARCHAR(100) DEFAULT 'Tag',
    description TEXT,
    popular_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SHOPS TABLE (With PostGIS Coordinates)
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255),
    description TEXT,
    category VARCHAR(100) NOT NULL,
    address JSONB NOT NULL DEFAULT '{"street": "", "area": "", "city": "New Delhi", "pincode": "110001"}'::jsonb,
    location_lat DOUBLE PRECISION NOT NULL DEFAULT 28.6517,
    location_lng DOUBLE PRECISION NOT NULL DEFAULT 77.1906,
    geom GEOMETRY(Point, 4326),
    contact_phone VARCHAR(50),
    banner_image TEXT,
    rating DOUBLE PRECISION DEFAULT 4.5,
    num_reviews INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    verification_status VARCHAR(50) DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    live_serving_count INT DEFAULT 2,
    est_wait_time_minutes INT DEFAULT 5,
    prompt_response_rate INT DEFAULT 95,
    opening_hours JSONB DEFAULT '{"open": "09:00 AM", "close": "09:00 PM"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update geom column on insert/update
CREATE OR REPLACE FUNCTION update_shop_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_shop_geom ON shops;
CREATE TRIGGER trigger_update_shop_geom
BEFORE INSERT OR UPDATE ON shops
FOR EACH ROW EXECUTE FUNCTION update_shop_geom();

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    mrp DOUBLE PRECISION,
    unit VARCHAR(50) DEFAULT 'piece',
    quantity_in_stock INT DEFAULT 10,
    low_stock_threshold INT DEFAULT 3,
    is_available BOOLEAN DEFAULT true,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REQUESTS TABLE (1-to-Many Broadcast Requests)
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'piece',
    expected_budget DOUBLE PRECISION,
    urgency VARCHAR(50) DEFAULT 'today' CHECK (urgency IN ('immediate', 'today', 'flexible')),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REQUEST RESPONSES TABLE (Shopkeeper Quotations)
CREATE TABLE IF NOT EXISTS request_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    response_type VARCHAR(50) DEFAULT 'in_stock' CHECK (response_type IN ('in_stock', 'alternative', 'out_of_stock')),
    offered_price DOUBLE PRECISION,
    offered_product_name VARCHAR(255),
    prep_eta_minutes INT DEFAULT 10,
    notes TEXT,
    is_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RESERVATIONS TABLE (In-Store Hold Tickets)
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'piece',
    agreed_price DOUBLE PRECISION NOT NULL,
    total_amount DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
    hold_duration_minutes INT DEFAULT 60,
    expires_at TIMESTAMPTZ NOT NULL,
    customer_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CONVERSATIONS TABLE (Customer-Shopkeeper Chat)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_context JSONB DEFAULT '{}'::jsonb,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    unread_count_customer INT DEFAULT 0,
    unread_count_shop INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, shop_id, product_id)
);

-- 10. MESSAGES TABLE (Chat Messages with Image Support)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('customer', 'shopkeeper')),
    text TEXT,
    image_url TEXT,
    image_thumbnail_url TEXT,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    read_by_customer BOOLEAN DEFAULT false,
    read_by_shop BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_shop ON conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ====================================================================
-- DISABLE ROW LEVEL SECURITY (Allows backend API to read/write freely)
-- ====================================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- STORAGE BUCKET FOR CHAT IMAGES
-- Run this in Supabase Dashboard -> Storage -> New Bucket
-- Bucket name: chat-images
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/*
-- ====================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true) ON CONFLICT DO NOTHING;

-- ====================================================================
-- SEED INITIAL DATA (Test Accounts, Verified Stores & Products)
-- Passwords are all hashed for 'password123'
-- ====================================================================

-- Insert Sample Users
INSERT INTO users (id, name, email, password_hash, role, phone, address, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'customer@quickkart.com', '$2a$10$7Z25w6W83tE9j8gO1gYl0eaZ2H1O2uI7B4uJ3W9B9J1p1Q1R1S1Tu', 'customer', '+91 9811223344', '{"street": "Flat 402, Karol Bagh", "city": "New Delhi", "pincode": "110005"}'::jsonb, 'active'),
('a0000000-0000-0000-0000-000000000002', 'Ramesh Sharma', 'sharma@quickkart.com', '$2a$10$7Z25w6W83tE9j8gO1gYl0eaZ2H1O2uI7B4uJ3W9B9J1p1Q1R1S1Tu', 'shopkeeper', '+91 9876543210', '{"street": "Shop 14, Main Market, Karol Bagh", "city": "New Delhi", "pincode": "110005"}'::jsonb, 'active'),
('a0000000-0000-0000-0000-000000000003', 'Manoj Gupta', 'gupta@quickkart.com', '$2a$10$7Z25w6W83tE9j8gO1gYl0eaZ2H1O2uI7B4uJ3W9B9J1p1Q1R1S1Tu', 'shopkeeper', '+91 9876543211', '{"street": "Shop 8, Connaught Place Outer Circle", "city": "New Delhi", "pincode": "110001"}'::jsonb, 'active'),
('a0000000-0000-0000-0000-000000000004', 'QuickKart Admin', 'admin@quickkart.com', '$2a$10$7Z25w6W83tE9j8gO1gYl0eaZ2H1O2uI7B4uJ3W9B9J1p1Q1R1S1Tu', 'admin', '+91 9999988888', '{"street": "Tech HQ, Barakhamba Road", "city": "New Delhi", "pincode": "110001"}'::jsonb, 'active')
ON CONFLICT (email) DO NOTHING;

-- Insert Sample Shops
INSERT INTO shops (id, owner_id, shop_name, tagline, description, category, address, location_lat, location_lng, contact_phone, banner_image, rating, num_reviews, is_active, verification_status, live_serving_count, est_wait_time_minutes, prompt_response_rate) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Sharma Hardware & Sanitation Store', 'Authorized Finolex, Astral & Jaquar Dealer', 'Trusted neighborhood hardware and sanitation supplier serving Karol Bagh for 22+ years.', 'Hardware & Tools', '{"street": "Shop 14, Block 8, Ajmal Khan Road", "area": "Karol Bagh", "city": "New Delhi", "pincode": "110005"}'::jsonb, 28.6517, 77.1906, '+91 9876543210', 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=800&q=80', 4.9, 142, true, 'verified', 2, 4, 98),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Gupta Building Materials & Hardware', 'Complete Cement, Pipes & Sanitary Solutions', 'Wholesale and retail supplier of top plumbing, CPVC fittings, and building materials.', 'Hardware & Tools', '{"street": "Plot 22, Connaught Circus", "area": "Connaught Place", "city": "New Delhi", "pincode": "110001"}'::jsonb, 28.6304, 77.2177, '+91 9876543211', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80', 4.7, 98, true, 'verified', 4, 8, 92)
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Products
INSERT INTO products (shop_id, name, brand, description, category, price, mrp, unit, quantity_in_stock, is_available, images, tags) VALUES
('b0000000-0000-0000-0000-000000000001', 'Finolex 1-inch Heavy Duty PVC Pipe (10ft)', 'Finolex', 'High pressure heavy-duty PVC pipe for residential plumbing lines and drainage.', 'Plumbing & Sanitary', 290, 350, 'piece', 45, true, ARRAY['https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=600&q=80'], ARRAY['pipe', 'pvc', 'plumbing', 'finolex', 'sanitary']),
('b0000000-0000-0000-0000-000000000001', 'Astral CPVC Pro Pipe 1 inch (3 Meter)', 'Astral', 'Lead-free hot and cold potable water plumbing pipe certified to ASTM standards.', 'Plumbing & Sanitary', 390, 460, 'piece', 30, true, ARRAY['https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=600&q=80'], ARRAY['pipe', 'cpvc', 'astral', 'hot water']),
('b0000000-0000-0000-0000-000000000001', 'Bosch Professional 500W Impact Drill Kit', 'Bosch', 'Heavy duty multi-speed reversible impact drill machine with 10 drill bits and case.', 'Hardware & Tools', 2850, 3499, 'kit', 8, true, ARRAY['https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80'], ARRAY['drill', 'bosch', 'tools', 'hardware', 'power tools']),
('b0000000-0000-0000-0000-000000000002', 'Finolex 1-inch Heavy Duty PVC Pipe (10ft)', 'Finolex', 'Genuine Finolex heavy duty pipe with leak-proof jointing compatibility.', 'Plumbing & Sanitary', 295, 350, 'piece', 60, true, ARRAY['https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=600&q=80'], ARRAY['pipe', 'pvc', 'finolex']),
('b0000000-0000-0000-0000-000000000002', 'Jaquar Brass Angle Valve with Flange', 'Jaquar', 'Quarter turn high-durability chrome plated brass angle stop cock valve.', 'Plumbing & Sanitary', 480, 575, 'piece', 25, true, ARRAY['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'], ARRAY['valve', 'jaquar', 'bathroom', 'sanitary', 'angle valve']);

-- Insert Categories
INSERT INTO categories (name, slug, icon, description, popular_keywords) VALUES
('Hardware & Tools', 'hardware-tools', 'Hammer', 'Fasteners, power drills, screwdrivers, locks, hinges', ARRAY['drill', 'screw', 'hammer', 'tape', 'lock', 'tools']),
('Plumbing & Sanitary', 'plumbing-sanitary', 'Droplets', 'PVC pipes, valves, CPVC fittings, taps, epoxy sealants', ARRAY['pipe', 'pvc', 'cpvc', 'valve', 'tap', 'leak', 'sealant']),
('Electrical & Lighting', 'electrical-lighting', 'Zap', 'LED bulbs, copper cables, modular switches, MCBs', ARRAY['bulb', 'wire', 'switch', 'led', 'cable', 'mcb', 'extension']),
('Stationery & Office', 'stationery-office', 'BookOpen', 'Paper, notebooks, drafting pens, technical calculators', ARRAY['notebook', 'paper', 'calculator', 'pen', 'print', 'stationery'])
ON CONFLICT (slug) DO NOTHING;
