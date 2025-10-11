-- NordicMedTek CMS Database Schema
-- Based on CSV data structure analysis

-- Users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product collections table
CREATE TABLE IF NOT EXISTS product_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products table - main table based on CSV structure
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Basic product information
    title VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    item_number VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    
    -- Descriptions
    technical_data TEXT,
    rich_text_description TEXT,
    rich_text TEXT,
    detailed_description TEXT,
    
    -- Media
    image_url TEXT,
    pdf_url TEXT,
    datasheet_url TEXT,
    
    -- Organization
    category_id INTEGER,
    collection_id INTEGER,
    sorting INTEGER DEFAULT 0,
    manual_sort VARCHAR(50),
    
    -- Status and publishing
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
    is_featured BOOLEAN DEFAULT 0,
    publish_date DATETIME,
    unpublish_date DATETIME,
    
    -- Metadata
    external_id VARCHAR(100), -- Original ID from CSV
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (collection_id) REFERENCES product_collections(id) ON DELETE SET NULL
);

-- Media files table for uploaded files
CREATE TABLE IF NOT EXISTS media_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(20), -- image, document, video
    alt_text VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product media relationship table
CREATE TABLE IF NOT EXISTS product_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    media_id INTEGER NOT NULL,
    media_type VARCHAR(20) DEFAULT 'image', -- image, document, video
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_files(id) ON DELETE CASCADE
);

-- Settings table for CMS configuration
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (will be created by ensureAdminUser function with proper environment variables)
-- This is just a fallback - the actual admin user is created in init.js with proper password hashing

-- Insert default categories based on CSV analysis
INSERT OR IGNORE INTO categories (name, slug, description, icon, color, sort_order) VALUES
('Trygghet og fallsikring', 'trygghet-og-fallsikring', 'Various sensor products for monitoring and safety', 'sensor', '#10b981', 1),
('Alarm knapp og varsling', 'alarm-knapp-og-varsling', 'Core infrastructure and server components', 'server', '#f59e0b', 2),
('Medisinsk oppfølging', 'medisinsk-oppfolging', 'Medical monitoring and measurement devices', 'heart', '#ef4444', 3),
('Cameras', 'cameras', 'Surveillance and monitoring cameras', 'camera', '#3b82f6', 4),
('Communication', 'communication', 'Communication and alert systems', 'phone', '#8b5cf6', 5);

-- Insert default product collection
INSERT OR IGNORE INTO product_collections (name, slug, description) 
VALUES ('Main Collection', 'main-collection', 'Primary product collection');

-- Insert default settings
INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_type, description) VALUES
('site_title', 'NordicMedTek CMS', 'string', 'Site title for the CMS'),
('items_per_page', '20', 'number', 'Number of items per page in admin'),
('max_file_size', '10485760', 'number', 'Maximum file upload size in bytes (10MB)'),
('allowed_file_types', '["image/jpeg", "image/png", "image/gif", "application/pdf", "application/msword"]', 'json', 'Allowed file types for uploads');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_sorting ON products(sorting);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_item_number ON products(item_number);
