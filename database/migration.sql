-- Migration to add missing columns to products table
-- Run this script to update existing database

-- Add datasheet_url column (if not exists)
-- ALTER TABLE products ADD COLUMN datasheet_url TEXT;

-- Add rich_text column (if not exists)
ALTER TABLE products ADD COLUMN rich_text TEXT;
