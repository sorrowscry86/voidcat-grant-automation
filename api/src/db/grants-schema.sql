-- VoidCat Grant Automation Platform - Grants Database Schema
-- Stores aggregated federal grant data from multiple sources
-- NO SIMULATIONS LAW: Real grant data only, sourced from live APIs

-- Main grants table with comprehensive federal grant metadata
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,                      -- Source-specific ID (e.g., "GRANTS-123456", "NSF-2154321", "SBIR-25-001")
  source TEXT NOT NULL,                     -- Data source: "grants.gov", "sbir.gov", "nsf.gov"
  external_id TEXT,                         -- Original ID from source system
  
  -- Core grant information
  title TEXT NOT NULL,
  description TEXT,
  agency TEXT NOT NULL,                     -- Funding agency name
  agency_code TEXT,                         -- Standard agency code (DOD, NSF, NASA, etc.)
  program TEXT,                             -- Program name
  cfda_number TEXT,                         -- Catalog of Federal Domestic Assistance number
  
  -- Opportunity details
  opportunity_number TEXT,                  -- Official opportunity number
  opportunity_type TEXT,                    -- Grant, Cooperative Agreement, SBIR, STTR, etc.
  status TEXT DEFAULT 'active',             -- active, closed, archived
  
  -- Financial information
  award_floor INTEGER,                      -- Minimum award amount (in cents)
  award_ceiling INTEGER,                    -- Maximum award amount (in cents)
  estimated_funding INTEGER,                -- Total estimated funding (in cents)
  
  -- Dates (ISO 8601 format)
  post_date TEXT,                           -- Date grant was posted
  close_date TEXT,                          -- Application deadline
  archive_date TEXT,                        -- Archive date
  
  -- Eligibility & requirements
  eligibility TEXT,                         -- Eligibility requirements
  applicant_types TEXT,                     -- JSON array of applicant types
  funding_categories TEXT,                  -- JSON array of funding categories
  
  -- Matching & analytics
  matching_score REAL DEFAULT 0.0,          -- Semantic matching score (0.0-1.0)
  keywords TEXT,                            -- JSON array of extracted keywords
  tags TEXT,                                -- JSON array of categorization tags
  
  -- Metadata
  data_freshness TEXT,                      -- Timestamp of last data refresh from source
  last_verified TEXT,                       -- Last verification against source API
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Full-text search virtual table for advanced grant searching
CREATE VIRTUAL TABLE IF NOT EXISTS grants_fts USING fts5(
  title,
  description,
  agency,
  program,
  keywords,
  content='grants',
  content_rowid='rowid'
);

-- Triggers to keep FTS index synchronized
CREATE TRIGGER IF NOT EXISTS grants_fts_insert AFTER INSERT ON grants BEGIN
  INSERT INTO grants_fts(rowid, title, description, agency, program, keywords)
  VALUES (new.rowid, new.title, new.description, new.agency, new.program, new.keywords);
END;

CREATE TRIGGER IF NOT EXISTS grants_fts_update AFTER UPDATE ON grants BEGIN
  UPDATE grants_fts SET
    title = new.title,
    description = new.description,
    agency = new.agency,
    program = new.program,
    keywords = new.keywords
  WHERE rowid = new.rowid;
END;

CREATE TRIGGER IF NOT EXISTS grants_fts_delete AFTER DELETE ON grants BEGIN
  DELETE FROM grants_fts WHERE rowid = old.rowid;
END;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_grants_source ON grants(source);
CREATE INDEX IF NOT EXISTS idx_grants_agency ON grants(agency);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_close_date ON grants(close_date);
CREATE INDEX IF NOT EXISTS idx_grants_matching_score ON grants(matching_score DESC);
CREATE INDEX IF NOT EXISTS idx_grants_data_freshness ON grants(data_freshness);
CREATE INDEX IF NOT EXISTS idx_grants_agency_code ON grants(agency_code);
CREATE INDEX IF NOT EXISTS idx_grants_opportunity_number ON grants(opportunity_number);

-- Grant data ingestion audit log
CREATE TABLE IF NOT EXISTS grant_ingestion_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,                     -- Data source identifier
  status TEXT NOT NULL,                     -- success, partial, failed
  grants_fetched INTEGER DEFAULT 0,
  grants_inserted INTEGER DEFAULT 0,
  grants_updated INTEGER DEFAULT 0,
  grants_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingestion_log_source ON grant_ingestion_log(source);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_started_at ON grant_ingestion_log(started_at DESC);
