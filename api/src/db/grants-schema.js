// VoidCat Grant Automation Platform - Grants Database Schema
// Stores aggregated federal grant data from multiple sources
// NO SIMULATIONS LAW: Real grant data only, sourced from live APIs

export const GRANTS_SCHEMA_SQL = `
-- Main grants table with comprehensive federal grant metadata
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT,
  
  -- Core grant information
  title TEXT NOT NULL,
  description TEXT,
  agency TEXT NOT NULL,
  agency_code TEXT,
  program TEXT,
  cfda_number TEXT,
  
  -- Opportunity details
  opportunity_number TEXT,
  opportunity_type TEXT,
  status TEXT DEFAULT 'active',
  
  -- Financial information
  award_floor INTEGER,
  award_ceiling INTEGER,
  estimated_funding INTEGER,
  
  -- Dates (ISO 8601 format)
  post_date TEXT,
  close_date TEXT,
  archive_date TEXT,
  
  -- Eligibility & requirements
  eligibility TEXT,
  applicant_types TEXT,
  funding_categories TEXT,
  
  -- Matching & analytics
  matching_score REAL DEFAULT 0.0,
  keywords TEXT,
  tags TEXT,
  
  -- Metadata
  data_freshness TEXT,
  last_verified TEXT,
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
  source TEXT NOT NULL,
  status TEXT NOT NULL,
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
`;

export default GRANTS_SCHEMA_SQL;
