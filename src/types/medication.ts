/**
 * Medication Adherence and Monitoring Types for Satark AI Patient Portal
 * 
 * STEP 6: Connects to existing ClinicalPrescription without duplicating prescription models.
 * Stores patient-reported adherence tracking and schedule occurrences.
 */

import { ClinicalPrescription, MedicationItem } from '../backend/services/PrescriptionService';

export type MedicationAdherenceStatus = 'Taken' | 'Skipped' | 'Not Recorded';

/**
 * Discrete patient-reported medication intake record.
 */
export interface MedicationAdherenceRecord {
  /** Unique adherence record identifier (e.g. adh-1729000000000-xyz) */
  id: string;
  /** Patient ID */
  patientId: string;
  /** Reference ID of the source prescription */
  prescriptionId: string;
  /** Prescribed medicine name */
  medicineName: string;
  /** Calendar date of the scheduled/recorded dose (YYYY-MM-DD) */
  date: string;
  /** Recorded time (e.g. "09:30 AM") */
  time: string;
  /** Unix timestamp for chronological sorting */
  timestamp: number;
  /** Scheduled occurrence if derived from frequency (e.g. "Morning", "Evening", "Daily") */
  scheduledOccurrence?: string;
  /** Patient-reported action */
  status: 'Taken' | 'Skipped';
  /** Optional patient notes (e.g. "Taken with warm water after breakfast") */
  notes?: string;
  /** ISO timestamp of record creation */
  createdAt: string;
}

/**
 * Prescribed medication combined with patient-facing schedule and active/completed status.
 * Derived dynamically from ClinicalPrescription without creating a duplicate database.
 */
export interface PrescribedMedicationWithSchedule {
  prescriptionId: string;
  prescriptionDate: string;
  consultingDoctor: string;
  diagnosis: string;
  medicineName: string;
  strength?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  purpose?: string;
  /** Status: Active or Completed (based on prescription duration) */
  status: 'Active' | 'Completed';
  /** Patient-facing daily schedule occurrences */
  scheduleOccurrences: string[];
  /** Whether the prescription specifies enough timing to derive a schedule */
  isTimingSpecified: boolean;
  /** Start and expiration information */
  startDate: string;
  endDate?: string | null;
  durationDays?: number | null;
  isDurationExpired: boolean;
  /** Underlying prescription reference */
  prescriptionRef: ClinicalPrescription;
}

/**
 * Today's dose tracking item presented to the patient.
 */
export interface TodayMedicationTask {
  medication: PrescribedMedicationWithSchedule;
  occurrence: string; // e.g. "Morning", "Evening", or "Timing not specified in prescription."
  status: MedicationAdherenceStatus;
  adherenceRecord?: MedicationAdherenceRecord;
}
