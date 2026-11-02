/**
 * Types and Dummy Data for Satark AI - Clinical Healthcare Assistant
 */

export type RoutePath = 
  | '/' 
  | '/login' 
  | '/signup'
  | '/dashboard' 
  | '/emr-records' 
  | '/patients'
  | '/patient-dashboard'
  | '/patient-health-monitoring'
  | '/patient-medications'
  | '/patient-prescriptions'
  | '/patient-consultations'
  | '/patient-medical-records'
  | '/patient-appointments'
  | '/patient-daily-log'
  | '/patient-notifications'
  | '/patient-profile'
  | '/patient-history'
  | '/doctor-patient-monitoring'
  | '/clinical-assistant';

export type UserRole = 'doctor' | 'patient';

export interface PatientRecord {
  sNo: number;
  patientId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female';
  visitDate: string;
  diagnosis: string;
  prescription: string;
  followUpDate: string;
}

export const DUMMY_RECORDS: PatientRecord[] = [];
