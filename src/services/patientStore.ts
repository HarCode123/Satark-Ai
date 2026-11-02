import { ClinicalPrescription } from '../backend/services/PrescriptionService';
import { MonitoringPlan, MonitoringParameter, HealthLogEntry, HealthLogReading } from '../types/monitoring';
import { MedicationAdherenceRecord } from '../types/medication';
import { MonitoringService } from './monitoringService';

export interface AppointmentItem {
  id: string;
  doctorName: string;
  department: string;
  hospital: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface PatientNotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  time: string;
  read: boolean;
  type: 'appointment' | 'prescription' | 'followup' | 'lab' | 'monitoring_reminder' | 'monitoring_alert' | 'medication_reminder';
  /** Optional reference to parameter ID */
  parameterId?: string;
  /** Optional parameter name */
  parameterName?: string;
  /** Optional health reading reference ID */
  healthReadingId?: string;
  /** Optional reading value */
  readingValue?: string;
  /** Categorical alert sub-type */
  alertType?: 'reminder' | 'missed_tracking' | 'threshold_breach';
}

export interface DoctorConsultedItem {
  doctorName: string;
  department: string;
  visitCount: number;
  lastVisitDate: string;
}

export interface MedicalTimelineItem {
  year: string;
  events: { title: string; date: string; category: string }[];
}

export interface PatientProfileData {
  photoUrl?: string;
  patientId: string;
  name: string;
  age: string;
  gender: 'Male' | 'Female';
  bloodGroup: string;
  phone: string;
  email: string;
  emergencyContact: string;
  address: string;
  medicalConditions: string;
  allergies: string;
  height: string;
  weight: string;
  bmi: string;
}

const STORAGE_KEY_PROFILE = 'kateb_patient_profile';
const STORAGE_KEY_APPOINTMENTS = 'kateb_patient_appointments';
const STORAGE_KEY_PRESCRIPTIONS = 'kateb_patient_prescriptions';
const STORAGE_KEY_NOTIFICATIONS = 'kateb_patient_notifications';
const STORAGE_KEY_MONITORING_PLANS = 'kateb_patient_monitoring_plans';
const STORAGE_KEY_HEALTH_LOGS = 'satark_patient_health_logs';
const STORAGE_KEY_MEDICATION_ADHERENCE = 'satark_patient_medication_adherence';

function dispatchPatientDataUpdated() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('patient-data-updated'));
  }
}

// Initial realistic default data for Harini Al-Mansoor
export const DEFAULT_PATIENT_PROFILE: PatientProfileData = {
  patientId: 'PID-2026-001',
  name: 'Harini Al-Mansoor',
  age: '28',
  gender: 'Female',
  bloodGroup: 'O+',
  phone: '+966 50 123 4567',
  email: 'harini@satark.ai',
  emergencyContact: '+966 55 987 6543 (Rashid Al-Mansoor - Spouse)',
  address: 'King Fahd Road, District 4, Riyadh, Saudi Arabia',
  medicalConditions: 'Mild Essential Hypertension',
  allergies: 'Penicillin (Mild skin rash)',
  height: '165 cm',
  weight: '62 kg',
  bmi: '22.8 (Normal)'
};

export const INITIAL_PRESCRIPTIONS: ClinicalPrescription[] = [];

export const INITIAL_MONITORING_PLANS: MonitoringPlan[] = [];

export const INITIAL_HEALTH_LOGS: HealthLogEntry[] = [];

export const INITIAL_MEDICATION_ADHERENCE: MedicationAdherenceRecord[] = [];

export const INITIAL_APPOINTMENTS: AppointmentItem[] = [];

export const INITIAL_NOTIFICATIONS: PatientNotificationItem[] = [];


// Helper methods for Patient Data Management
export class PatientDataStore {
  static cleanupLegacyMockData(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const rxSaved = localStorage.getItem(STORAGE_KEY_PRESCRIPTIONS);
      const validPrescriptionIds = new Set<string>();

      if (rxSaved) {
        const parsed: any[] = JSON.parse(rxSaved);
        // Only keep prescriptions that were created from an actual completed consultation session
        const cleaned = parsed.filter(p => 
          p.consultationCompleted === true &&
          !p.chiefComplaint?.includes('Severe dry cough for 4 days keeping patient awake') &&
          !p.chiefComplaint?.includes('Sore throat, difficulty swallowing') &&
          p.patientDetails?.date !== '2026-07-28' &&
          p.patientDetails?.date !== '2026-07-25'
        );
        cleaned.forEach((p, idx) => {
          const rxId = MonitoringService.getPrescriptionId(p, idx);
          validPrescriptionIds.add(rxId);
          if (p.id) validPrescriptionIds.add(p.id);
        });
        localStorage.setItem(STORAGE_KEY_PRESCRIPTIONS, JSON.stringify(cleaned));
      }

      const adhSaved = localStorage.getItem(STORAGE_KEY_MEDICATION_ADHERENCE);
      if (adhSaved) {
        const parsed: MedicationAdherenceRecord[] = JSON.parse(adhSaved);
        // Keep ONLY adherence records that are tied to a valid completed prescription
        const cleaned = parsed.filter(a => 
          !a.id?.startsWith('adh-init-') &&
          a.prescriptionId &&
          validPrescriptionIds.has(a.prescriptionId)
        );
        localStorage.setItem(STORAGE_KEY_MEDICATION_ADHERENCE, JSON.stringify(cleaned));
      }

      const planSaved = localStorage.getItem(STORAGE_KEY_MONITORING_PLANS);
      if (planSaved) {
        const parsed: MonitoringPlan[] = JSON.parse(planSaved);
        // Keep ONLY monitoring plans originating from a valid completed prescription
        const cleaned = parsed.filter(p => 
          !p.id?.includes('plan-PID-2026-001-20260728') &&
          p.sourcePrescriptionId &&
          validPrescriptionIds.has(p.sourcePrescriptionId)
        );
        localStorage.setItem(STORAGE_KEY_MONITORING_PLANS, JSON.stringify(cleaned));
      }

      const logSaved = localStorage.getItem(STORAGE_KEY_HEALTH_LOGS);
      if (logSaved) {
        const parsed: HealthLogEntry[] = JSON.parse(logSaved);
        const cleaned = parsed.filter(l => 
          !l.id?.startsWith('log-1722330000000-') && 
          !l.id?.startsWith('log-1722243600000-') &&
          !l.id?.includes('mock') &&
          !l.id?.includes('init')
        );
        localStorage.setItem(STORAGE_KEY_HEALTH_LOGS, JSON.stringify(cleaned));
      }

      const notifSaved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (notifSaved) {
        const parsed: PatientNotificationItem[] = JSON.parse(notifSaved);
        const cleaned = parsed.filter(n => 
          !n.id.startsWith('notif-00') && 
          !n.id.includes('rx-PID-2026-001-20260728') &&
          (!n.id.startsWith('notif-med-') || Array.from(validPrescriptionIds).some(rxId => n.id.includes(rxId)))
        );
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(cleaned));
      }

      const aptSaved = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      if (aptSaved) {
        const parsed: AppointmentItem[] = JSON.parse(aptSaved);
        const cleaned = parsed.filter(a => a.id !== 'apt-001');
        localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(cleaned));
      }
    } catch (e) {}
  }

  static getProfile(): PatientProfileData {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawUser = localStorage.getItem('kateb_user_session');
        const user = rawUser ? JSON.parse(rawUser) : null;
        const saved = localStorage.getItem(STORAGE_KEY_PROFILE);

        if (saved) {
          const parsed = JSON.parse(saved);
          if (user && user.role === 'patient') {
            // Strict match: only use saved profile if it matches the current authenticated patient
            if (user.patientId && parsed.patientId && parsed.patientId.trim().toLowerCase() === user.patientId.trim().toLowerCase()) {
              return parsed;
            }
            if (user.email && parsed.email && parsed.email.trim().toLowerCase() === user.email.trim().toLowerCase()) {
              return parsed;
            }
          } else if (user && user.role === 'doctor') {
            return parsed;
          }
        }

        if (user && user.role === 'patient') {
          const isDevi = (user.name || '').toLowerCase().includes('devi');
          return {
            patientId: user.patientId || (isDevi ? 'PID-2026-004' : 'PID-2026-001'),
            name: user.name || (isDevi ? 'Devi Prasad' : 'Patient'),
            age: isDevi ? '34' : '28',
            gender: isDevi ? 'Male' : 'Female',
            bloodGroup: isDevi ? 'B+' : 'O+',
            phone: '+966 55 432 1098',
            email: user.email || '',
            emergencyContact: '+966 55 432 1098 (Primary Contact)',
            address: 'King Fahd Road, Riyadh, Saudi Arabia',
            medicalConditions: 'Active Clinical Patient Account',
            allergies: isDevi ? 'Penicillin (causes severe rash — avoid beta-lactams)' : 'No known drug allergies',
            height: isDevi ? '175 cm' : '165 cm',
            weight: isDevi ? '74 kg' : '62 kg',
            bmi: isDevi ? '24.2 (Normal)' : '22.8 (Normal)'
          };
        }
      }
    } catch (e) {}
    return DEFAULT_PATIENT_PROFILE;
  }

  static async syncProfileFromServer(patientId?: string): Promise<PatientProfileData | null> {
    try {
      if (typeof window === 'undefined') return null;
      const rawUser = localStorage.getItem('kateb_user_session');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const targetId = patientId || user?.patientId || this.getProfile()?.patientId;
      if (!targetId) return null;

      const res = await fetch(`/api/patient/profile?patientId=${encodeURIComponent(targetId)}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('kateb_jwt_access_token') ? { 'Authorization': `Bearer ${localStorage.getItem('kateb_jwt_access_token')}` } : {})
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.saveProfile(json.data);
          return json.data;
        }
      }
    } catch (e) {
      console.warn("Could not sync profile from server:", e);
    }
    return null;
  }

  static saveProfile(profile: PatientProfileData): void {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch (e) {}
  }

  static getPrescriptions(patientId?: string): ClinicalPrescription[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRESCRIPTIONS);
      if (saved) {
        const parsed: any[] = JSON.parse(saved);
        // Only return prescriptions generated from an actual completed consultation that are approved (not draft)
        const real = parsed.filter(p => 
          p.status !== 'draft' &&
          !p.chiefComplaint?.includes('Severe dry cough for 4 days keeping patient awake') &&
          !p.chiefComplaint?.includes('Sore throat, difficulty swallowing') &&
          p.patientDetails?.date !== '2026-07-28' &&
          p.patientDetails?.date !== '2026-07-25'
        );

        let targetId = patientId;
        if (!targetId && typeof window !== 'undefined') {
          try {
            const rawUser = localStorage.getItem('kateb_user_session');
            if (rawUser) {
              const u = JSON.parse(rawUser);
              if (u.role === 'patient' && u.patientId) {
                targetId = u.patientId;
              }
            }
          } catch (e) {}
        }

        if (targetId) {
          const targetIdClean = targetId.trim().toLowerCase();
          const filtered = real.filter(p => {
            const pId = (p.patientDetails?.patientId || p.patientId || '').trim().toLowerCase();
            return pId === targetIdClean;
          });
          if (filtered.length > 0) return filtered;

          // If no match by ID alone, check if patient name matches active user
          const activeUser = typeof window !== 'undefined' ? localStorage.getItem('kateb_user_session') : null;
          if (activeUser) {
            try {
              const u = JSON.parse(activeUser);
              if (u.name && u.role === 'patient') {
                const nameMatch = real.filter(p => 
                  (p.patientDetails?.patientName || '').toLowerCase().includes(u.name.toLowerCase())
                );
                if (nameMatch.length > 0) return nameMatch;
              }
            } catch (e) {}
          }
          return [];
        }
        return real;
      }
    } catch (e) {}
    return [];
  }

  static addPrescription(prescription: ClinicalPrescription): void {
    let existingList: any[] = [];
    try {
      const rawSaved = localStorage.getItem(STORAGE_KEY_PRESCRIPTIONS);
      if (rawSaved) existingList = JSON.parse(rawSaved);
    } catch (e) {}

    const rxId = (prescription as any).prescriptionId || (prescription as any).id;
    // Deduplicate: avoid creating duplicate entries when approved/saved more than once
    const filtered = existingList.filter(p => {
      if (rxId && (p.prescriptionId === rxId || p.id === rxId)) return false;
      if ((prescription as any).consultationId && p.consultationId === (prescription as any).consultationId) return false;
      return true;
    });

    const updated = [prescription, ...filtered];
    try {
      localStorage.setItem(STORAGE_KEY_PRESCRIPTIONS, JSON.stringify(updated));
    } catch (e) {}

    // Auto-create notification
    this.addNotification({
      id: `notif-${Date.now()}`,
      title: 'New Digital Prescription Issued',
      message: `Dr. ${prescription.patientDetails?.consultingDoctor || 'Harini, MD'} has uploaded a new prescription for ${prescription.provisionalDiagnosis || 'Consultation'}.`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type: 'prescription'
    });

    // Auto-create upcoming appointment if follow up specified
    if (prescription.followUp && prescription.followUp.length > 3) {
      this.addAppointment({
        id: `apt-${Date.now()}`,
        doctorName: prescription.patientDetails?.consultingDoctor || 'Dr. Harini, MD',
        department: 'Internal Medicine',
        hospital: 'Satark Clinical Medical Center',
        date: prescription.followUp.includes('(') ? prescription.followUp.split('(')[1].replace(')', '') : 'In 7 Days',
        time: '10:00 AM',
        status: 'Confirmed',
        notes: `Follow-up for ${prescription.provisionalDiagnosis || 'recent consultation'}.`
      });
    }

    // Auto-derive and attach patient monitoring plan from prescription data
    try {
      const plan = MonitoringService.deriveMonitoringPlanFromPrescription(prescription);
      if (plan && plan.parameters.length > 0) {
        this.saveMonitoringPlan(plan);
      }
    } catch (err) {
      console.warn("Could not derive monitoring plan from prescription:", err);
    }

    // Trigger custom event for UI re-render
    dispatchPatientDataUpdated();
  }

  static getAppointments(): AppointmentItem[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      if (saved) {
        const parsed: AppointmentItem[] = JSON.parse(saved);
        return parsed.filter(a => a.id !== 'apt-001');
      }
    } catch (e) {}
    return [];
  }

  static addAppointment(apt: AppointmentItem): void {
    const list = this.getAppointments();
    const updated = [apt, ...list];
    try {
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  static getNotifications(): PatientNotificationItem[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (saved) {
        const parsed: PatientNotificationItem[] = JSON.parse(saved);
        return parsed.filter(n => !n.id.startsWith('notif-00') && !n.id.includes('rx-PID-2026-001-20260728'));
      }
    } catch (e) {}
    return [];
  }

  static addNotification(notif: PatientNotificationItem): void {
    const list = this.getNotifications();
    if (list.some(n => n.id === notif.id)) {
      return; // Deduplication: notification with this ID is already present
    }
    const updated = [notif, ...list];
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  static markNotificationRead(id: string): void {
    const list = this.getNotifications();
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  static markAllNotificationsRead(): void {
    const list = this.getNotifications();
    const updated = list.map(n => ({ ...n, read: true }));
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  static getDoctorsConsulted(): DoctorConsultedItem[] {
    const prescriptions = this.getPrescriptions();
    if (prescriptions.length === 0) return [];

    const map = new Map<string, { dept: string; count: number; date: string }>();

    prescriptions.forEach(p => {
      const doc = p.patientDetails?.consultingDoctor || 'Dr. Harini, MD';
      const dept = doc.includes('Endocrinology') ? 'Endocrinology' : doc.includes('Cardiology') ? 'Cardiology' : doc.includes('Gastroenterology') ? 'Gastroenterology' : 'Internal Medicine';
      const date = p.patientDetails?.date || new Date().toISOString().split('T')[0];

      if (!map.has(doc)) {
        map.set(doc, { dept, count: 1, date });
      } else {
        const curr = map.get(doc)!;
        map.set(doc, { dept: curr.dept, count: curr.count + 1, date: curr.date > date ? curr.date : date });
      }
    });

    const result: DoctorConsultedItem[] = [];
    map.forEach((val, key) => {
      result.push({
        doctorName: key,
        department: val.dept,
        visitCount: val.count,
        lastVisitDate: val.date
      });
    });

    return result;
  }

  static getMedicalHistoryTimeline(): MedicalTimelineItem[] {
    const prescriptions = this.getPrescriptions();
    if (prescriptions.length === 0) return [];

    const yearMap = new Map<string, { title: string; date: string; category: string }[]>();
    prescriptions.forEach(p => {
      const d = p.patientDetails?.date || new Date().toISOString().split('T')[0];
      const year = d.split('-')[0] || new Date().getFullYear().toString();
      const events = yearMap.get(year) || [];
      events.push({
        title: `${p.provisionalDiagnosis || 'Clinical Consultation'}`,
        date: d,
        category: 'Prescription & Diagnosis'
      });
      yearMap.set(year, events);
    });

    const result: MedicalTimelineItem[] = [];
    yearMap.forEach((events, year) => {
      result.push({ year, events });
    });
    return result;
  }

  // ==========================================
  // Health Monitoring Plans Persistence Methods
  // ==========================================

  static getMonitoringPlans(patientId?: string): MonitoringPlan[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MONITORING_PLANS);
      if (saved) {
        const parsed: MonitoringPlan[] = JSON.parse(saved);
        const validRxIds = new Set(this.getPrescriptions().map((p, idx) => MonitoringService.getPrescriptionId(p, idx)));
        const real = parsed.filter(p => 
          !p.id?.includes('plan-PID-2026-001-20260728') &&
          (!p.sourcePrescriptionId || validRxIds.has(p.sourcePrescriptionId))
        );
        if (patientId) {
          return real.filter(p => p.patientId === patientId);
        }
        return real;
      }
    } catch (e) {}
    return [];
  }

  static getActiveMonitoringPlan(patientId?: string): MonitoringPlan | null {
    const plans = this.getMonitoringPlans(patientId);
    return plans.find(p => p.isActive) || null;
  }

  static getPlanByPrescriptionId(sourcePrescriptionId: string): MonitoringPlan | null {
    const plans = this.getMonitoringPlans();
    return plans.find(p => p.sourcePrescriptionId === sourcePrescriptionId) || null;
  }

  static hasActivePlanForPrescription(rx: ClinicalPrescription, index: number = 0): boolean {
    const rxId = MonitoringService.getPrescriptionId(rx, index);
    const plans = this.getMonitoringPlans(rx.patientDetails?.patientId);
    return plans.some(p => p.sourcePrescriptionId === rxId && p.isActive);
  }

  static saveMonitoringPlan(plan: MonitoringPlan): void {
    const plans = this.getMonitoringPlans();
    const existingIndex = plans.findIndex(p => p.id === plan.id || p.sourcePrescriptionId === plan.sourcePrescriptionId);
    let updated: MonitoringPlan[];
    if (existingIndex >= 0) {
      updated = [...plans];
      updated[existingIndex] = plan;
    } else {
      updated = [plan, ...plans];
    }
    try {
      localStorage.setItem(STORAGE_KEY_MONITORING_PLANS, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  // ==========================================
  // Health Logs Persistence Methods (Step 3)
  // ==========================================

  static getHealthLogs(patientId?: string): HealthLogEntry[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HEALTH_LOGS);
      if (saved) {
        const parsed: HealthLogEntry[] = JSON.parse(saved);
        const real = parsed.filter(l => !l.id?.startsWith('log-1722330000000-') && !l.id?.startsWith('log-1722243600000-'));
        const filtered = patientId ? real.filter(l => l.patientId === patientId) : real;
        return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
    } catch (e) {}
    return [];
  }

  static addHealthLog(entry: HealthLogEntry): void {
    const list = this.getHealthLogs();
    const updated = [entry, ...list.filter(l => l.id !== entry.id)];
    try {
      localStorage.setItem(STORAGE_KEY_HEALTH_LOGS, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  static updateHealthLog(entry: HealthLogEntry): void {
    const list = this.getHealthLogs();
    const index = list.findIndex(l => l.id === entry.id);
    let updated: HealthLogEntry[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = entry;
    } else {
      updated = [entry, ...list];
    }
    try {
      localStorage.setItem(STORAGE_KEY_HEALTH_LOGS, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  static deleteHealthLog(id: string): void {
    const list = this.getHealthLogs();
    const updated = list.filter(l => l.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_HEALTH_LOGS, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  /**
   * Returns a map of latest readings keyed by parameterId and parameterType.
   */
  static getLatestReadings(patientId?: string): Record<string, HealthLogReading & { date: string; time: string; timestamp: number }> {
    const logs = this.getHealthLogs(patientId);
    const map: Record<string, HealthLogReading & { date: string; time: string; timestamp: number }> = {};

    for (const log of logs) {
      for (const reading of log.readings) {
        if (!map[reading.parameterId]) {
          map[reading.parameterId] = {
            ...reading,
            date: log.date,
            time: log.time,
            timestamp: log.timestamp
          };
        }
        if (!map[reading.parameterType]) {
          map[reading.parameterType] = {
            ...reading,
            date: log.date,
            time: log.time,
            timestamp: log.timestamp
          };
        }
      }
    }
    return map;
  }

  /**
   * Returns whether a health log has been recorded today.
   */
  static hasLoggedToday(patientId?: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    const logs = this.getHealthLogs(patientId);
    return logs.some(l => l.date === today);
  }

  // ==========================================
  // Medication Adherence Persistence (Step 6)
  // ==========================================

  static getMedicationAdherence(patientId?: string): MedicationAdherenceRecord[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEDICATION_ADHERENCE);
      if (saved) {
        const parsed: MedicationAdherenceRecord[] = JSON.parse(saved);
        const validRxIds = new Set(this.getPrescriptions().map((p, idx) => MonitoringService.getPrescriptionId(p, idx)));
        const real = parsed.filter(a => 
          !a.id?.startsWith('adh-init-') &&
          (!a.prescriptionId || validRxIds.has(a.prescriptionId))
        );
        const filtered = patientId ? real.filter(a => a.patientId === patientId) : real;
        return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
    } catch (e) {}
    return [];
  }

  static saveMedicationAdherence(record: MedicationAdherenceRecord): void {
    const list = this.getMedicationAdherence();
    const existingIndex = list.findIndex(a => 
      a.id === record.id || 
      (a.patientId === record.patientId && 
       a.prescriptionId === record.prescriptionId && 
       a.medicineName === record.medicineName && 
       a.date === record.date && 
       (a.scheduledOccurrence || '') === (record.scheduledOccurrence || ''))
    );

    let updated: MedicationAdherenceRecord[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = record;
    } else {
      updated = [record, ...list];
    }

    try {
      localStorage.setItem(STORAGE_KEY_MEDICATION_ADHERENCE, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }

  static deleteMedicationAdherence(id: string): void {
    const list = this.getMedicationAdherence();
    const updated = list.filter(a => a.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_MEDICATION_ADHERENCE, JSON.stringify(updated));
    } catch (e) {}
    dispatchPatientDataUpdated();
  }
}

// Clean up any legacy mock data on startup
PatientDataStore.cleanupLegacyMockData();
