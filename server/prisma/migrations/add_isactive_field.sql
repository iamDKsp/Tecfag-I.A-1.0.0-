-- Migration: Add isActive field and make catalogId optional
-- Generated at: 2026-01-06

-- Step 1: Add the isActive column with default true
ALTER TABLE Document ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT 1;

-- Step 2: Update existing documents to be active
UPDATE Document SET isActive = 1 WHERE isActive IS NULL;

-- Note: SQLite doesn't support making columns nullable directly via ALTER TABLE
-- The catalogId column is already in the schema, but we need to handle it in application code
-- by allowing NULL values when creating new documents

-- Update all existing documents to ensure they're active
UPDATE Document SET isActive = 1;
