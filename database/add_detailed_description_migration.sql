-- Migration to add detailed_description field to products table
-- Run this migration to add the new field to existing databases

ALTER TABLE products ADD COLUMN detailed_description TEXT;
