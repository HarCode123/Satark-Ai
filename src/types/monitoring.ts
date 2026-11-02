/**
 * Monitoring Data Types for Satark AI Patient Portal
 * 
 * Foundation for connecting ClinicalPrescription -> Monitoring Plan -> Monitoring Parameters.
 * Clean, clinically grounded, extensible data model without over-engineering.
 */

export type MonitoringParameterType =
  | 'blood_pressure'
  | 'heart_rate'
  | 'blood_glucose'
  | 'temperature'
  | 'oxygen_saturation'
  | 'respiratory_rate'
  | 'weight'
  | 'symptoms'
  | 'custom';

export type MonitoringFrequency = 
  | 'Daily'
  | 'Twice daily'
  | 'Three times daily'
  | 'Weekly'
  | 'As needed (PRN)'
  | 'Not specified';

export interface MonitoringParameter {
  /** Unique identifier for the parameter (e.g. param-bp-001) */
  id: string;
  /** Patient ID this parameter belongs to */
  patientId: string;
  /** Parameter type category */
  parameterType: MonitoringParameterType;
  /** Human-readable display label (e.g. "Blood Pressure", "Body Temperature") */
  displayName: string;
  /** Measurement unit (e.g. "mmHg", "bpm", "°C", "%", "mg/dL", "kg") */
  unit: string;
  /** Reference to the source prescription ID that originated this monitoring requirement */
  sourcePrescriptionId?: string;
  /** Clinical rationale for tracking this parameter */
  reasonForMonitoring: string;
  /** Whether this parameter is currently active for patient tracking */
  isActive: boolean;
  /** Date tracking was initiated (YYYY-MM-DD) */
  startDate: string;
  /** Optional date tracking concludes (e.g. at end of medication course) */
  endDate?: string | null;
  /** Recommended measurement frequency */
  frequency: string;
  /** Practical instructions for self-measurement */
  instructions?: string;
  /** Value recorded during the physical doctor consultation (kept distinct from future self-tracking) */
  baselineValue?: string | null;
  /** Optional software threshold configuration for rule-based monitoring alerts */
  threshold?: ParameterThresholdConfig;
}

/**
 * Optional threshold configuration for a monitoring parameter.
 * Used for software-defined alert boundaries.
 * Medical thresholds are never invented; alerts only trigger when a threshold is explicitly configured and enabled.
 */
export interface ParameterThresholdConfig {
  /** Whether threshold checking is enabled for this parameter */
  enabled: boolean;
  /** Source or justification for the configured threshold */
  source?: 'physician_order' | 'clinical_protocol' | 'test_config' | 'custom';
  /** Optional lower bound for single-value numeric parameters */
  lowerThreshold?: number | null;
  /** Optional upper bound for single-value numeric parameters */
  upperThreshold?: number | null;
  /** Systolic lower bound for blood pressure */
  systolicLower?: number | null;
  /** Systolic upper bound for blood pressure */
  systolicUpper?: number | null;
  /** Diastolic lower bound for blood pressure */
  diastolicLower?: number | null;
  /** Diastolic upper bound for blood pressure */
  diastolicUpper?: number | null;
  /** Optional note explaining the configured threshold */
  notes?: string;
}

/**
 * Real-time monitoring status of an individual parameter for the current day/schedule.
 */
export interface ParameterMonitoringStatus {
  parameterId: string;
  parameterType: MonitoringParameterType;
  displayName: string;
  unit: string;
  frequency: string;
  isDue: boolean;
  isRecordedToday: boolean;
  statusText: 'Recorded' | 'Pending' | 'Not Due' | 'Not Specified';
  lastRecordedValue?: string | null;
  lastRecordedDate?: string | null;
  lastRecordedTime?: string | null;
  thresholdConfigured: boolean;
}

export interface MonitoringPlan {
  /** Unique plan identifier (e.g. plan-PID-2026-001-1) */
  id: string;
  /** Patient identifier */
  patientId: string;
  /** Identifier of the clinical prescription this plan was derived from */
  sourcePrescriptionId?: string;
  /** Clinical title or focus of this monitoring protocol */
  title: string;
  /** Diagnosis or primary condition targeted */
  diagnosis?: string;
  /** Consulting physician who issued the underlying prescription */
  doctorName?: string;
  /** Plan creation date (YYYY-MM-DD) */
  createdDate: string;
  /** Whether the monitoring plan is currently active */
  isActive: boolean;
  /** Target monitoring parameters established by the plan */
  parameters: MonitoringParameter[];
  /** Optional physician guidance or notes */
  notes?: string;
}

/**
 * Individual parameter reading captured in a patient's health log.
 */
export interface HealthLogReading {
  /** Reference to the MonitoringParameter id */
  parameterId: string;
  /** Categorical type */
  parameterType: MonitoringParameterType;
  /** Human-readable parameter label (e.g. "Blood Pressure") */
  displayName: string;
  /** Measurement unit (e.g. "mmHg", "bpm", "°C", "%", "mg/dL", "kg") */
  unit: string;
  /** Formatted string representation for display (e.g. "120 / 80", "78", "37.2") */
  value: string;
  /** Optional structured numeric components for validation / future queries */
  systolic?: number | null;
  diastolic?: number | null;
  numericValue?: number | null;
}

/**
 * A discrete patient health journal entry representing a single session/submission.
 */
export interface HealthLogEntry {
  /** Unique log entry identifier (e.g. log-1729000000000) */
  id: string;
  /** Patient identifier */
  patientId: string;
  /** ID of the active monitoring plan at time of capture */
  monitoringPlanId?: string;
  /** Calendar date of recording (YYYY-MM-DD) */
  date: string;
  /** Formatted local time of recording (e.g. "09:30 AM") */
  time: string;
  /** Unix epoch timestamp for accurate chronological sorting */
  timestamp: number;
  /** Values captured for each active monitoring parameter */
  readings: HealthLogReading[];
  /** Patient-reported symptoms observed during entry */
  symptoms: string[];
  /** Optional free-text notes / observations */
  notes?: string;
  /** ISO timestamp of record creation */
  createdAt: string;
}
