-- PharmaIntel — PSP Opportunity Monitor
-- Persistent Database Schema (PostgreSQL / SQLite compatible)

CREATE TABLE IF NOT EXISTS pharmaceutical_companies (
  company_id TEXT PRIMARY KEY,
  sponsor_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drug_records (
  id TEXT PRIMARY KEY,
  application_number TEXT NOT NULL,
  application_type TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  submission_number TEXT NOT NULL,
  submission_status TEXT NOT NULL,
  approval_action_date TEXT NOT NULL,
  action_category TEXT NOT NULL,
  is_potential_new_launch INTEGER NOT NULL DEFAULT 0,
  drug_name TEXT NOT NULL,
  brand_name TEXT,
  active_ingredient TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  indication TEXT NOT NULL,
  indication_verified INTEGER NOT NULL DEFAULT 0,
  indication_source TEXT NOT NULL,
  treatment_category TEXT NOT NULL,
  dosage_form TEXT NOT NULL,
  route_of_administration TEXT NOT NULL,
  marketing_status TEXT NOT NULL,
  submission_class_code TEXT,
  submission_class_description TEXT,
  review_priority TEXT NOT NULL,
  boxed_warning_present INTEGER,
  rems_required INTEGER,
  last_synced_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  UNIQUE(application_number, submission_type, submission_number, approval_action_date)
);

CREATE TABLE IF NOT EXISTS fda_approval_actions (
  action_id TEXT PRIMARY KEY,
  drug_id TEXT NOT NULL,
  application_number TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  submission_number TEXT NOT NULL,
  submission_status TEXT NOT NULL,
  approval_action_date TEXT NOT NULL,
  review_priority TEXT,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (drug_id) REFERENCES drug_records(id)
);

CREATE TABLE IF NOT EXISTS psp_opportunity_assessments (
  assessment_id TEXT PRIMARY KEY,
  drug_id TEXT NOT NULL UNIQUE,
  total_score INTEGER NOT NULL,
  tier TEXT NOT NULL,
  confidence_level TEXT NOT NULL,
  preliminary_label TEXT NOT NULL,
  model_version TEXT NOT NULL,
  disease_burden_score INTEGER NOT NULL,
  access_complexity_score INTEGER NOT NULL,
  treatment_complexity_score INTEGER NOT NULL,
  affordability_complexity_score INTEGER NOT NULL,
  evidence_confidence_score INTEGER NOT NULL,
  assessment_json TEXT NOT NULL,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (drug_id) REFERENCES drug_records(id)
);

CREATE TABLE IF NOT EXISTS evidence_sources (
  source_id TEXT PRIMARY KEY,
  drug_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 1,
  citation_note TEXT,
  FOREIGN KEY (drug_id) REFERENCES drug_records(id)
);

CREATE TABLE IF NOT EXISTS opportunities (
  drug_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  saved_in_pipeline INTEGER NOT NULL DEFAULT 0,
  owner TEXT NOT NULL DEFAULT 'Unassigned',
  follow_up_date TEXT,
  last_action TEXT NOT NULL,
  last_updated_at TEXT NOT NULL,
  internal_approval_json TEXT,
  crm_record_id TEXT,
  crm_sync_status TEXT NOT NULL DEFAULT 'Not Connected',
  FOREIGN KEY (drug_id) REFERENCES drug_records(id)
);

CREATE TABLE IF NOT EXISTS opportunity_status_history (
  id TEXT PRIMARY KEY,
  drug_id TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (drug_id) REFERENCES drug_records(id)
);

CREATE TABLE IF NOT EXISTS internal_notes (
  id TEXT PRIMARY KEY,
  drug_id TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (drug_id) REFERENCES drug_records(id)
);

CREATE TABLE IF NOT EXISTS users_roles (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS crm_integration_settings (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'none',
  instance_url TEXT,
  sandbox_mode INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_outreach_history (
  id TEXT PRIMARY KEY,
  drug_id TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_verified INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  send_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (drug_id) REFERENCES drug_records(id)
);

CREATE TABLE IF NOT EXISTS refresh_history (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  status TEXT NOT NULL,
  records_fetched INTEGER NOT NULL,
  new_records_discovered INTEGER NOT NULL,
  updated_records INTEGER NOT NULL,
  source_endpoint TEXT NOT NULL,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  sources_json TEXT,
  created_at TEXT NOT NULL
);
