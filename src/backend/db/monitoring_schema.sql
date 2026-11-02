-- ============================================================================
-- SATARK AI / KATEB AI - PATIENT HEALTH MONITORING SYSTEM SCHEMA (STEP 8A)
-- ============================================================================
-- Clean, normalized, time-series ready MySQL schema design for:
-- 1. Patient Monitoring Plans (linked to Clinical Prescriptions)
-- 2. Monitoring Parameters & Rule-based Alert Thresholds
-- 3. Patient Health Logs (Session journals with reported symptoms & notes)
-- 4. Longitudinal Health Readings (BP systolic/diastolic, vitals, custom params)
-- 5. Medication Adherence Tracking (Taken, Skipped, Not Recorded)
--
-- Single Source of Truth Alignment:
-- - Reuses existing `patients` (patient_id) and `patient_prescriptions` tables.
-- - No duplication of prescription or patient data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: patient_monitoring_plans
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_monitoring_plans (
  plan_id VARCHAR(255) PRIMARY KEY,
  patient_id VARCHAR(255) NOT NULL,
  source_prescription_id VARCHAR(255) NULL,
  title VARCHAR(255) NOT NULL,
  diagnosis VARCHAR(255) NULL,
  doctor_name VARCHAR(255) NULL,
  created_date DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plans_patient_active (patient_id, is_active),
  INDEX idx_plans_source_rx (source_prescription_id),
  CONSTRAINT fk_pmp_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 2: patient_monitoring_parameters
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_monitoring_parameters (
  parameter_id VARCHAR(255) PRIMARY KEY,
  plan_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  parameter_type VARCHAR(50) NOT NULL COMMENT 'blood_pressure, heart_rate, blood_glucose, temperature, oxygen_saturation, respiratory_rate, weight, symptoms, custom',
  display_name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  source_prescription_id VARCHAR(255) NULL,
  reason_for_monitoring TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  frequency VARCHAR(100) NOT NULL COMMENT 'Daily, Twice daily, Three times daily, Weekly, As needed (PRN), Not specified',
  instructions TEXT NULL,
  baseline_value VARCHAR(100) NULL,
  threshold_enabled TINYINT(1) NOT NULL DEFAULT 0,
  threshold_source VARCHAR(50) NULL COMMENT 'physician_order, clinical_protocol, test_config, custom',
  lower_threshold DECIMAL(10,2) NULL,
  upper_threshold DECIMAL(10,2) NULL,
  systolic_lower DECIMAL(10,2) NULL,
  systolic_upper DECIMAL(10,2) NULL,
  diastolic_lower DECIMAL(10,2) NULL,
  diastolic_upper DECIMAL(10,2) NULL,
  threshold_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_params_plan (plan_id),
  INDEX idx_params_patient_type (patient_id, parameter_type, is_active),
  CONSTRAINT fk_pmp_plan FOREIGN KEY (plan_id) REFERENCES patient_monitoring_plans(plan_id) ON DELETE CASCADE,
  CONSTRAINT fk_pmp_param_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 3: patient_health_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_health_logs (
  log_id VARCHAR(255) PRIMARY KEY,
  patient_id VARCHAR(255) NOT NULL,
  monitoring_plan_id VARCHAR(255) NULL,
  log_date DATE NOT NULL,
  log_time VARCHAR(50) NOT NULL COMMENT 'Formatted display time e.g. 09:30 AM',
  recorded_timestamp BIGINT NOT NULL COMMENT 'Unix epoch millisecond timestamp for chronological sorting',
  symptoms_json JSON NULL COMMENT 'Array of patient-reported symptoms e.g. ["Mild cough", "Fatigue"]',
  notes TEXT NULL COMMENT 'Optional free-text patient observations',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_logs_patient_date (patient_id, log_date DESC),
  INDEX idx_logs_patient_timestamp (patient_id, recorded_timestamp DESC),
  CONSTRAINT fk_phl_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  CONSTRAINT fk_phl_plan FOREIGN KEY (monitoring_plan_id) REFERENCES patient_monitoring_plans(plan_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 4: patient_health_readings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_health_readings (
  reading_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  log_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  parameter_id VARCHAR(255) NULL,
  parameter_type VARCHAR(50) NOT NULL COMMENT 'blood_pressure, heart_rate, blood_glucose, temperature, oxygen_saturation, respiratory_rate, weight, symptoms, custom',
  display_name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  display_value VARCHAR(100) NOT NULL COMMENT 'Formatted display string e.g. 120 / 80 or 37.2',
  numeric_value DECIMAL(10,2) NULL COMMENT 'Single numeric reading for scalars (HR, Temp, SpO2, Glucose, Weight)',
  systolic DECIMAL(10,2) NULL COMMENT 'Blood pressure systolic value in mmHg',
  diastolic DECIMAL(10,2) NULL COMMENT 'Blood pressure diastolic value in mmHg',
  recorded_date DATE NOT NULL,
  recorded_timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_readings_log (log_id),
  INDEX idx_readings_timeseries (patient_id, parameter_type, recorded_date DESC, recorded_timestamp DESC),
  INDEX idx_readings_param (parameter_id),
  CONSTRAINT fk_phr_log FOREIGN KEY (log_id) REFERENCES patient_health_logs(log_id) ON DELETE CASCADE,
  CONSTRAINT fk_phr_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  CONSTRAINT fk_phr_param FOREIGN KEY (parameter_id) REFERENCES patient_monitoring_parameters(parameter_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 5: patient_medication_adherence
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_medication_adherence (
  adherence_id VARCHAR(255) PRIMARY KEY,
  patient_id VARCHAR(255) NOT NULL,
  prescription_id VARCHAR(255) NOT NULL COMMENT 'References source clinical prescription',
  medicine_name VARCHAR(255) NOT NULL,
  dose_date DATE NOT NULL COMMENT 'Calendar date of intake YYYY-MM-DD',
  dose_time VARCHAR(50) NOT NULL COMMENT 'Recorded time e.g. 09:30 AM',
  dose_timestamp BIGINT NOT NULL COMMENT 'Epoch ms for exact chronological timeline',
  scheduled_occurrence VARCHAR(100) NULL COMMENT 'Morning, Afternoon, Evening, Night, Once Daily, As needed (PRN)',
  status ENUM('Taken', 'Skipped', 'Not Recorded') NOT NULL DEFAULT 'Not Recorded',
  notes TEXT NULL COMMENT 'Patient self-reported intake note',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_adh_patient_date (patient_id, dose_date DESC),
  INDEX idx_adh_lookup (patient_id, prescription_id, medicine_name, dose_date),
  CONSTRAINT fk_pma_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
