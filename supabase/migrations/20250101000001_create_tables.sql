-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";        -- For geolocation features
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- For text search

-- ============================================================================
-- PROJECTS TABLE
-- Groups inspections under specific contracts or projects
-- ============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  client_name TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TPI AGENCIES TABLE
-- Third-party inspection agencies that provide inspectors
-- ============================================================================
CREATE TABLE tpi_agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_code TEXT UNIQUE,
  manager_name TEXT,
  manager_email TEXT,
  manager_phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  certification_info JSONB,  -- Store certifications, accreditations
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSPECTORS TABLE
-- Individual inspector profiles and credentials
-- ============================================================================
CREATE TABLE inspectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Link to auth user
  tpi_agency_id UUID REFERENCES tpi_agencies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  specialization TEXT[],  -- Array of specializations (e.g., welding, NDT)
  certifications JSONB,   -- Certification details, expiry dates
  experience_years INTEGER,
  cv_url TEXT,            -- URL to uploaded CV in storage
  photo_url TEXT,         -- Profile photo URL
  status inspector_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSPECTIONS TABLE
-- Core inspection entity with complex nested data
-- ============================================================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Information
  po_number TEXT NOT NULL,
  notification_number TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_address TEXT,
  
  -- Project & Assignment
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  tpi_agency_id UUID REFERENCES tpi_agencies(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id),  -- QC Manager who assigned
  
  -- Dates
  notification_date DATE,
  start_date DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,
  
  -- Location (PostGIS for geospatial queries)
  location_name TEXT,
  location_address TEXT,
  location_coordinates GEOGRAPHY(POINT, 4326),  -- lat/long
  
  -- Status
  status inspection_status DEFAULT 'received',
  
  -- Complex nested data stored as JSONB
  items_being_offered JSONB,  -- Array of items to inspect
  /*
    Example structure:
    [
      {
        "item_no": "1",
        "description": "Carbon Steel Pipe",
        "quantity": 100,
        "unit": "meters",
        "po_line": "10"
      }
    ]
  */
  
  inspection_reports JSONB,  -- Array of uploaded reports with findings
  /*
    Example structure:
    [
      {
        "id": "uuid",
        "type": "flash",  -- flash, interim, final
        "upload_date": "2025-01-15T10:30:00Z",
        "report_url": "https://...",
        "uploaded_by": "inspector_id",
        "findings": [
          {
            "id": "uuid",
            "type": "non_conformance",
            "description": "Weld defect found",
            "severity": "critical",
            "photo_urls": ["https://..."]
          }
        ],
        "approval_status": "pending",
        "approved_by": "engineer_id",
        "approval_date": "2025-01-16T14:20:00Z",
        "rejection_reason": null
      }
    ]
  */
  
  inspection_activities JSONB,  -- Timeline of activities
  /*
    Example structure:
    [
      {
        "date": "2025-01-10T09:00:00Z",
        "activity": "Inspection started",
        "performed_by": "inspector_id",
        "notes": "Initial visual inspection"
      }
    ]
  */
  
  release_note_url TEXT,  -- IRC (Inspection Release Certificate)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on coordinates for geospatial queries
CREATE INDEX idx_inspections_location ON inspections USING GIST(location_coordinates);

-- ============================================================================
-- INSPECTION REVIEWS TABLE
-- Performance scoring for inspectors on specific inspections
-- ============================================================================
CREATE TABLE inspection_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES inspectors(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id),  -- Inspection Engineer
  
  -- Review scores (0-100)
  report_quality_score INTEGER CHECK (report_quality_score >= 0 AND report_quality_score <= 100),
  timeliness_score INTEGER CHECK (timeliness_score >= 0 AND timeliness_score <= 100),
  communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  
  -- Performance metrics
  missed_ncr_count INTEGER DEFAULT 0,  -- Non-conformances missed
  false_ncr_count INTEGER DEFAULT 0,   -- False positives
  
  -- Comments
  strengths TEXT,
  areas_for_improvement TEXT,
  additional_comments TEXT,
  
  review_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSPECTION ATTENDANCE TABLE
-- Track inspector check-in/check-out with geo-verification
-- ============================================================================
CREATE TABLE inspection_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES inspectors(id) ON DELETE CASCADE,
  
  -- Check-in/out timestamps
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  
  -- Geo-location verification
  check_in_coordinates GEOGRAPHY(POINT, 4326),
  check_out_coordinates GEOGRAPHY(POINT, 4326),
  
  -- Verification status
  location_verified BOOLEAN DEFAULT FALSE,
  distance_from_site_meters NUMERIC,  -- Distance from inspection site
  
  -- Notes
  check_in_notes TEXT,
  check_out_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_attendance_inspection ON inspection_attendance(inspection_id);
CREATE INDEX idx_attendance_inspector ON inspection_attendance(inspector_id);
CREATE INDEX idx_reviews_inspection ON inspection_reviews(inspection_id);
CREATE INDEX idx_reviews_inspector ON inspection_reviews(inspector_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_project ON inspections(project_id);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX idx_inspectors_agency ON inspectors(tpi_agency_id);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tpi_agencies_updated_at BEFORE UPDATE ON tpi_agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspectors_updated_at BEFORE UPDATE ON inspectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
