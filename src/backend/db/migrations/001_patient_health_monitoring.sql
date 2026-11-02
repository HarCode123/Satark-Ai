-- ============================================================================
-- SATARK AI / KATEB AI DATABASE MIGRATION SCRIPT
-- STEP 8A: Patient Health Monitoring, Adherence & Alerts Database Migration
-- File: src/backend/db/migrations/001_patient_health_monitoring.sql
-- ============================================================================
-- SUMMARY OF PURPOSE:
-- Establishes relational MySQL persistence for:
--   1. Patient Monitoring Plans (derived from physician prescriptions)
--   2. Monitoring Parameters (vitals, instructions, rule-based alert thresholds)
--   3. Patient Health Logs (session journals with symptoms and patient notes)
--   4. Patient Health Readings (time-series vitals: BP, HR, Temp, SpO2, Glucose, Weight, RR, custom)
--   5. Medication Adherence Records (Taken / Skipped / Not Recorded tracking)
--   6. Safe enhancement of existing patient_notifications for monitoring alerts/reminders
--
-- SAFETY & COMPLIANCE:
-- - Uses CREATE TABLE IF NOT EXISTS (zero data loss, completely non-destructive).
-- - Fully references existing `patients` (patient_id) and `patient_prescriptions`.
-- - Does NOT alter or replace existing doctor consultation, EMR, or auth tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PATIENT MONITORING PLANS
-- Connects a patient and their clinical prescription to an active monitoring protocol.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_monitoring_plans (
  plan_id VARCHAR(255) PRIMARY KEY COMMENT 'Unique plan ID, e.g. plan-PID-2026-001-1',
  patient_id VARCHAR(255) NOT NULL COMMENT 'References existing patients(patient_id)',
  source_prescription_id VARCHAR(255) NULL COMMENT 'References source clinical prescription ID or code',
  title VARCHAR(255) NOT NULL COMMENT 'Clinical title, e.g. Acute Bronchitis Recovery & Vital Signs Protocol',
  diagnosis VARCHAR(255) NULL COMMENT 'Primary condition/diagnosis targeted',
  doctor_name VARCHAR(255) NULL COMMENT 'Prescribing physician name',
  created_date DATE NOT NULL COMMENT 'Protocol creation date (YYYY-MM-DD)',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Inactive / Concluded',
  notes TEXT NULL COMMENT 'Doctor advice or clinical rationale notes',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plans_patient_active (patient_id, is_active),
  INDEX idx_plans_source_rx (source_prescription_id),
  CONSTRAINT fk_pmp_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. PATIENT MONITORING PARAMETERS
-- Monitored vitals, practical instructions, frequencies, and alert thresholds.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_monitoring_parameters (
  parameter_id VARCHAR(255) PRIMARY KEY COMMENT 'Unique parameter ID, e.g. param-bp-PID-2026-001-1',
  plan_id VARCHAR(255) NOT NULL COMMENT 'References patient_monitoring_plans(plan_id)',
  patient_id VARCHAR(255) NOT NULL COMMENT 'References existing patients(patient_id)',
  parameter_type VARCHAR(50) NOT NULL COMMENT 'Categorical vital type: blood_pressure, heart_rate, blood_glucose, temperature, oxygen_saturation, respiratory_rate, weight, symptoms, custom',
  display_name VARCHAR(255) NOT NULL COMMENT 'Human-readable label, e.g. Blood Pressure, Body Temperature',
  unit VARCHAR(50) NOT NULL COMMENT 'Measurement unit: mmHg, bpm, °C, %, mg/dL, kg',
  source_prescription_id VARCHAR(255) NULL COMMENT 'Source prescription reference ID',
  reason_for_monitoring TEXT NOT NULL COMMENT 'Clinical indication/rationale for tracking',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Active tracking, 0 = Inactive',
  start_date DATE NOT NULL COMMENT 'Start date of monitoring (YYYY-MM-DD)',
  end_date DATE NULL COMMENT 'Optional end date of monitoring (e.g. course end)',
  frequency VARCHAR(100) NOT NULL COMMENT 'Daily, Twice daily, Three times daily, Weekly, As needed (PRN), Not specified',
  instructions TEXT NULL COMMENT 'Patient self-measurement guidance',
  baseline_value VARCHAR(100) NULL COMMENT 'Baseline vital recorded during doctor consultation',
  threshold_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether threshold checking is enabled for this parameter',
  threshold_source VARCHAR(50) NULL COMMENT 'physician_order, clinical_protocol, test_config, custom',
  lower_threshold DECIMAL(10,2) NULL COMMENT 'Lower bound for scalar values (Heart Rate, Temp, SpO2, Glucose, Weight)',
  upper_threshold DECIMAL(10,2) NULL COMMENT 'Upper bound for scalar values',
  systolic_lower DECIMAL(10,2) NULL COMMENT 'Systolic lower bound in mmHg',
  systolic_upper DECIMAL(10,2) NULL COMMENT 'Systolic upper bound in mmHg',
  diastolic_lower DECIMAL(10,2) NULL COMMENT 'Diastolic lower bound in mmHg',
  diastolic_upper DECIMAL(10,2) NULL COMMENT 'Diastolic upper bound in mmHg',
  threshold_notes TEXT NULL COMMENT 'Clinical explanation/source of configured threshold',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_params_plan (plan_id),
  INDEX idx_params_patient_type (patient_id, parameter_type, is_active),
  CONSTRAINT fk_pmp_plan FOREIGN KEY (plan_id) REFERENCES patient_monitoring_plans(plan_id) ON DELETE CASCADE,
  CONSTRAINT fk_pmp_param_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. PATIENT HEALTH LOGS
-- Discrete daily health journal submissions (session container for readings, symptoms, notes).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_health_logs (
  log_id VARCHAR(255) PRIMARY KEY COMMENT 'Unique health log session ID, e.g. log-1729000000000',
  patient_id VARCHAR(255) NOT NULL COMMENT 'References existing patients(patient_id)',
  monitoring_plan_id VARCHAR(255) NULL COMMENT 'References active monitoring plan at time of capture',
  log_date DATE NOT NULL COMMENT 'Calendar date of recording (YYYY-MM-DD)',
  log_time VARCHAR(50) NOT NULL COMMENT 'Formatted display time e.g. 09:30 AM',
  recorded_timestamp BIGINT NOT NULL COMMENT 'Unix epoch ms timestamp for fast chronological sorting',
  symptoms_json JSON NULL COMMENT 'Array of patient-reported symptoms e.g. ["Mild cough", "Fatigue"]',
  notes TEXT NULL COMMENT 'Patient observations and notes',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_logs_patient_date (patient_id, log_date DESC),
  INDEX idx_logs_patient_timestamp (patient_id, recorded_timestamp DESC),
  CONSTRAINT fk_phl_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  CONSTRAINT fk_phl_plan FOREIGN KEY (monitoring_plan_id) REFERENCES patient_monitoring_plans(plan_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. PATIENT HEALTH READINGS (TIME-SERIES)
-- Granular vital sign readings mapped to logs and parameters. Optimized for 7/30/90-day charts.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_health_readings (
  reading_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Surrogate autoincrement reading ID',
  log_id VARCHAR(255) NOT NULL COMMENT 'References parent patient_health_logs(log_id)',
  patient_id VARCHAR(255) NOT NULL COMMENT 'References existing patients(patient_id)',
  parameter_id VARCHAR(255) NULL COMMENT 'References patient_monitoring_parameters(parameter_id)',
  parameter_type VARCHAR(50) NOT NULL COMMENT 'Vital type: blood_pressure, heart_rate, blood_glucose, temperature, oxygen_saturation, respiratory_rate, weight, symptoms, custom',
  display_name VARCHAR(255) NOT NULL COMMENT 'Human readable label e.g. Blood Pressure',
  unit VARCHAR(50) NOT NULL COMMENT 'Unit: mmHg, bpm, °C, %, mg/dL, kg',
  display_value VARCHAR(100) NOT NULL COMMENT 'Formatted display value e.g. "120 / 80", "78", "37.2"',
  numeric_value DECIMAL(10,2) NULL COMMENT 'Single numeric reading for scalar calculations & charting',
  systolic DECIMAL(10,2) NULL COMMENT 'Systolic blood pressure in mmHg',
  diastolic DECIMAL(10,2) NULL COMMENT 'Diastolic blood pressure in mmHg',
  recorded_date DATE NOT NULL COMMENT 'Recorded date for date-range grouping',
  recorded_timestamp BIGINT NOT NULL COMMENT 'Recorded timestamp in epoch ms',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_readings_log (log_id),
  INDEX idx_readings_timeseries (patient_id, parameter_type, recorded_date DESC, recorded_timestamp DESC),
  INDEX idx_readings_param (parameter_id),
  CONSTRAINT fk_phr_log FOREIGN KEY (log_id) REFERENCES patient_health_logs(log_id) ON DELETE CASCADE,
  CONSTRAINT fk_phr_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  CONSTRAINT fk_phr_param FOREIGN KEY (parameter_id) REFERENCES patient_monitoring_parameters(parameter_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. PATIENT MEDICATION ADHERENCE
-- Tracks self-reported medication intake occurrences against existing prescriptions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_medication_adherence (
  adherence_id VARCHAR(255) PRIMARY KEY COMMENT 'Unique adherence record ID, e.g. adh-1729000000000-xyz',
  patient_id VARCHAR(255) NOT NULL COMMENT 'References existing patients(patient_id)',
  prescription_id VARCHAR(255) NOT NULL COMMENT 'Prescription ID reference',
  medicine_name VARCHAR(255) NOT NULL COMMENT 'Prescribed medicine name from ClinicalPrescription',
  dose_date DATE NOT NULL COMMENT 'Calendar date of the dose (YYYY-MM-DD)',
  dose_time VARCHAR(50) NOT NULL COMMENT 'Dose time e.g. 09:30 AM',
  dose_timestamp BIGINT NOT NULL COMMENT 'Epoch ms timestamp for chronological ordering',
  scheduled_occurrence VARCHAR(100) NULL COMMENT 'Slot: Morning, Afternoon, Evening, Night, Once Daily, As needed (PRN)',
  status ENUM('Taken', 'Skipped', 'Not Recorded') NOT NULL DEFAULT 'Not Recorded' COMMENT 'Patient self-reported intake status',
  notes TEXT NULL COMMENT 'Optional self-report notes e.g. Taken after food',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_adh_patient_date (patient_id, dose_date DESC),
  INDEX idx_adh_lookup (patient_id, prescription_id, medicine_name, dose_date),
  CONSTRAINT fk_pma_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. EXISTING NOTIFICATION TABLE INTEGRATION (NON-DESTRUCTIVE)
-- The existing `patient_notifications` table already supports `type VARCHAR(50)`
-- ('monitoring_reminder', 'monitoring_alert', 'medication_reminder').
-- The following optional metadata columns allow full persistence of Step 5 alert details
-- without altering any existing column definitions:
-- ----------------------------------------------------------------------------
-- Note: In MySQL 8.0.19+, ADD COLUMN IF NOT EXISTS is supported. For maximum cross-version
-- compatibility, these are provided as safe individual statements:
--
-- ALTER TABLE patient_notifications ADD COLUMN IF NOT EXISTS parameter_id VARCHAR(255) NULL;
-- ALTER TABLE patient_notifications ADD COLUMN IF NOT EXISTS parameter_name VARCHAR(255) NULL;
-- ALTER TABLE patient_notifications ADD COLUMN IF NOT EXISTS health_reading_id VARCHAR(255) NULL;
-- ALTER TABLE patient_notifications ADD COLUMN IF NOT EXISTS reading_value VARCHAR(100) NULL;
-- ALTER TABLE patient_notifications ADD COLUMN IF NOT EXISTS alert_type VARCHAR(50) NULL;
