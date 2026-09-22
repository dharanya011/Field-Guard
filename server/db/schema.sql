-- ====================================================================
-- WA-1 ENTERPRISE FIELD INSPECTION PLATFORM - POSTGRESQL SCHEMA (v2.0)
-- ====================================================================

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL REFERENCES roles(role_name) ON UPDATE CASCADE,
  title VARCHAR(255) NOT NULL,
  badge_number VARCHAR(100) UNIQUE NOT NULL,
  certification_level TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. EQUIPMENT TABLE
CREATE TABLE IF NOT EXISTS equipment (
  id VARCHAR(64) PRIMARY KEY,
  tag VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  facility VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
  last_inspection_date DATE,
  next_scheduled_date DATE,
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
  criticality VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS inspections (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  equipment_id VARCHAR(64) NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  facility VARCHAR(255) NOT NULL,
  zone VARCHAR(255) NOT NULL,
  assigned_technician_id VARCHAR(64) NOT NULL REFERENCES users(id),
  supervisor_id VARCHAR(64) REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
  sync_state VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
  risk_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  score INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  scheduled_date DATE NOT NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  offline_draft BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  general_notes TEXT,
  signatures JSONB,
  gps_location JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. INSPECTION ITEMS (CHECKLIST) TABLE
CREATE TABLE IF NOT EXISTS inspection_items (
  id VARCHAR(64) PRIMARY KEY,
  inspection_id VARCHAR(64) NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  requirement TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'NOT_CHECKED',
  measured_value VARCHAR(255),
  tolerance_range VARCHAR(255),
  notes TEXT,
  fail_reason TEXT,
  fail_notes TEXT,
  fail_severity VARCHAR(20),
  evidence_photo_url TEXT,
  evidence_description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. INSPECTION ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS inspection_assignments (
  id VARCHAR(64) PRIMARY KEY,
  inspection_id VARCHAR(64) NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  technician_id VARCHAR(64) NOT NULL REFERENCES users(id),
  assigned_by VARCHAR(64) NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- 7. SYNC OPERATIONS TABLE (AUDITABLE QUEUE)
CREATE TABLE IF NOT EXISTS sync_operations (
  id VARCHAR(64) PRIMARY KEY,
  operation_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'CONFIRMED',
  client_id VARCHAR(100),
  user_id VARCHAR(64) REFERENCES users(id)
);

-- 8. CONFLICTS TABLE (CRDT STATE DIVERGENCE)
CREATE TABLE IF NOT EXISTS conflicts (
  id VARCHAR(64) PRIMARY KEY,
  inspection_id VARCHAR(64) NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  inspection_code VARCHAR(100) NOT NULL,
  equipment_name VARCHAR(255) NOT NULL,
  field VARCHAR(255) NOT NULL,
  local_value TEXT NOT NULL,
  server_value TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  technician_name VARCHAR(255) NOT NULL,
  supervisor_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(64) REFERENCES users(id),
  resolution_policy VARCHAR(50),
  winning_value TEXT,
  notes TEXT
);

-- 9. AUDIT HISTORY TABLE
CREATE TABLE IF NOT EXISTS audit_history (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(64) REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(45),
  hash VARCHAR(64) NOT NULL
);

-- 10. MEDIA UPLOADS TABLE
CREATE TABLE IF NOT EXISTS media_uploads (
  id VARCHAR(64) PRIMARY KEY,
  upload_id VARCHAR(100) UNIQUE NOT NULL,
  inspection_id VARCHAR(64) REFERENCES inspections(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  total_chunks INTEGER NOT NULL,
  received_chunks INTEGER DEFAULT 0,
  storage_path TEXT,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. AI ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS ai_analysis (
  id VARCHAR(64) PRIMARY KEY,
  inspection_id VARCHAR(64) NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  summary TEXT NOT NULL,
  anomaly_score NUMERIC(5,2),
  recommended_action TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- INDEXES FOR HIGH-PERFORMANCE FIELD QUERIES & RELATIONAL LOOKUPS
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_inspections_assigned_tech ON inspections(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_inspections_equipment ON inspections(equipment_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection ON inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_inspection ON conflicts(inspection_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflicts(status);
CREATE INDEX IF NOT EXISTS idx_audit_history_target ON audit_history(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_sync_ops_user ON sync_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_upload_id ON media_uploads(upload_id);
