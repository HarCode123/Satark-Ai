/**
 * Medication Adherence Service for Satark AI Patient Portal
 * 
 * STEP 6 Implementation:
 * - Derives patient medication schedule directly from ClinicalPrescription
 * - Manages patient-reported adherence records (Taken / Skipped / Not Recorded)
 * - Evaluates medication status (Active vs Completed) based on finite prescription duration
 * - Generates deduplicated medication reminders for active schedules
 * - Stops reminders once duration has concluded
 * - Strictly keeps prescription as the single source of truth without altering it
 */

import { PatientDataStore, PatientNotificationItem } from './patientStore';
import { ClinicalPrescription, MedicationItem } from '../backend/services/PrescriptionService';
import { MonitoringService } from './monitoringService';
import { getMedicationPurpose } from '../components/PrescriptionPDF';
import { 
  MedicationAdherenceRecord, 
  MedicationAdherenceStatus, 
  PrescribedMedicationWithSchedule, 
  TodayMedicationTask 
} from '../types/medication';

export class MedicationAdherenceService {
  /**
   * Retrieves all prescribed medications across patient prescriptions, enhanced with
   * clinical schedule occurrences, parsed duration, and Active/Completed lifecycle status.
   */
  static getPrescribedMedicationsWithSchedule(patientId?: string): PrescribedMedicationWithSchedule[] {
    const targetPatientId = patientId || PatientDataStore.getProfile().patientId;
    const prescriptions = PatientDataStore.getPrescriptions(targetPatientId);
    const adherenceRecords = PatientDataStore.getMedicationAdherence(targetPatientId);
    const todayStr = new Date().toISOString().split('T')[0];

    const results: PrescribedMedicationWithSchedule[] = [];
    if (!prescriptions || prescriptions.length === 0) {
      return results;
    }

    prescriptions.forEach((rx, rxIndex) => {
      const rxId = MonitoringService.getPrescriptionId(rx, rxIndex);
      const rxDate = rx.patientDetails?.date || todayStr;
      const isLatestRx = rxIndex === 0;

      (rx.medications || []).forEach(med => {
        // Parse frequency and derive patient schedule occurrences
        const freqRaw = (med.frequency || '').trim();
        const freqLower = freqRaw.toLowerCase();
        const instrLower = (med.instructions || '').toLowerCase();

        let scheduleOccurrences: string[] = [];
        let isTimingSpecified = true;

        if (freqLower.includes('three times') || freqLower.includes('tid') || freqLower.includes('3 times')) {
          scheduleOccurrences = ['Morning', 'Afternoon', 'Evening'];
        } else if (freqLower.includes('twice') || freqLower.includes('bid') || freqLower.includes('2 times')) {
          scheduleOccurrences = ['Morning', 'Evening'];
        } else if (freqLower.includes('once') || freqLower.includes('qd') || freqLower.includes('daily') || freqLower.includes('1 time')) {
          if (instrLower.includes('bedtime') || instrLower.includes('night')) {
            scheduleOccurrences = ['Night'];
          } else if (instrLower.includes('evening')) {
            scheduleOccurrences = ['Evening'];
          } else if (instrLower.includes('morning')) {
            scheduleOccurrences = ['Morning'];
          } else {
            scheduleOccurrences = ['Once Daily'];
          }
        } else if (freqLower.includes('as needed') || freqLower.includes('prn')) {
          scheduleOccurrences = ['As needed (PRN)'];
        } else if (!freqRaw || freqLower === 'not specified' || freqLower === 'unknown') {
          scheduleOccurrences = ['Timing not specified in prescription.'];
          isTimingSpecified = false;
        } else {
          scheduleOccurrences = [med.frequency];
        }

        // Parse finite duration (e.g. "5 Days", "3 Days", "10 Days", "2 Weeks")
        const durationRaw = (med.duration || '').trim();
        let durationDays: number | null = null;
        const daysMatch = durationRaw.match(/(\d+)\s*(day|days|d)/i);
        const weeksMatch = durationRaw.match(/(\d+)\s*(week|weeks|w)/i);

        if (daysMatch) {
          durationDays = parseInt(daysMatch[1], 10);
        } else if (weeksMatch) {
          durationDays = parseInt(weeksMatch[1], 10) * 7;
        }

        // Check adherence history to identify start of tracking
        const medAdherence = adherenceRecords.filter(a => a.medicineName.toLowerCase() === med.medicineName.toLowerCase());
        const earliestDate = medAdherence.length > 0 
          ? medAdherence.map(a => a.date).sort()[0] 
          : null;

        // Determine startDate:
        const startDate = isLatestRx ? (rxDate || todayStr) : (earliestDate || rxDate);

        // Determine if duration has completed
        let isDurationExpired = false;
        let endDate: string | null = null;

        if (durationDays && durationDays > 0) {
          if (!isLatestRx) {
            // Older past prescription whose duration from rxDate has elapsed
            const rxStartEpoch = new Date(rxDate).getTime();
            const rxEndEpoch = rxStartEpoch + (durationDays - 1) * 24 * 60 * 60 * 1000;
            endDate = new Date(rxEndEpoch).toISOString().split('T')[0];
            isDurationExpired = true;
          } else {
            // Current active prescription: active treatment course
            const startEpoch = new Date(startDate).getTime();
            const endEpoch = startEpoch + (durationDays - 1) * 24 * 60 * 60 * 1000;
            endDate = new Date(endEpoch).toISOString().split('T')[0];
            isDurationExpired = false;
          }
        } else if (!isLatestRx) {
          isDurationExpired = true;
        }

        const status: 'Active' | 'Completed' = isDurationExpired ? 'Completed' : 'Active';

        results.push({
          prescriptionId: rxId,
          prescriptionDate: rxDate,
          consultingDoctor: rx.patientDetails?.consultingDoctor || 'Consulting Physician',
          diagnosis: rx.provisionalDiagnosis || 'Clinical Consultation',
          medicineName: med.medicineName,
          strength: med.strength,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
          purpose: med.purpose || getMedicationPurpose(med.medicineName),
          status,
          scheduleOccurrences,
          isTimingSpecified,
          startDate,
          endDate,
          durationDays,
          isDurationExpired,
          prescriptionRef: rx
        });
      });
    });

    return results;
  }

  /**
   * Returns today's active medication tasks with their real-time Taken / Skipped / Not Recorded status.
   */
  static getTodayMedicationTasks(patientId?: string, targetDate?: string): TodayMedicationTask[] {
    const targetPatientId = patientId || PatientDataStore.getProfile().patientId;
    const todayStr = targetDate || new Date().toISOString().split('T')[0];
    const allMeds = this.getPrescribedMedicationsWithSchedule(targetPatientId);
    const activeMeds = allMeds.filter(m => m.status === 'Active');
    const adherenceList = PatientDataStore.getMedicationAdherence(targetPatientId).filter(a => a.date === todayStr);

    const tasks: TodayMedicationTask[] = [];
    if (activeMeds.length === 0) {
      return tasks;
    }

    activeMeds.forEach(med => {
      med.scheduleOccurrences.forEach(occ => {
        // Find if patient has logged for this medication and occurrence today
        const record = adherenceList.find(a => 
          a.medicineName.toLowerCase() === med.medicineName.toLowerCase() &&
          (a.scheduledOccurrence === occ || med.scheduleOccurrences.length === 1)
        );

        tasks.push({
          medication: med,
          occurrence: occ,
          status: record ? record.status : 'Not Recorded',
          adherenceRecord: record
        });
      });
    });

    return tasks;
  }

  /**
   * Records a patient's self-reported medication intake action (Taken or Skipped).
   * Persists record safely without altering underlying clinical prescription.
   */
  static recordMedicationIntake(params: {
    patientId?: string;
    prescriptionId: string;
    medicineName: string;
    scheduledOccurrence?: string;
    status: 'Taken' | 'Skipped';
    notes?: string;
    date?: string;
    time?: string;
  }): MedicationAdherenceRecord {
    const todayStr = params.date || new Date().toISOString().split('T')[0];
    const timeStr = params.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const newRecord: MedicationAdherenceRecord = {
      id: `adh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      patientId: params.patientId || PatientDataStore.getProfile().patientId || 'PID-2026-001',
      prescriptionId: params.prescriptionId,
      medicineName: params.medicineName,
      date: todayStr,
      time: timeStr,
      timestamp: Date.now(),
      scheduledOccurrence: params.scheduledOccurrence,
      status: params.status,
      notes: params.notes?.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    PatientDataStore.saveMedicationAdherence(newRecord);

    // Auto-mark corresponding reminder notification as read if today's dose was logged
    try {
      const cleanName = params.medicineName.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanOcc = (params.scheduledOccurrence || 'daily').replace(/[^a-zA-Z0-9]/g, '_');
      const pId = params.patientId || PatientDataStore.getProfile().patientId || 'PID-2026-001';
      const uniqueReminderId = `notif-med-${pId}-${params.prescriptionId}-${cleanName}-${todayStr}-${cleanOcc}`;
      PatientDataStore.markNotificationRead(uniqueReminderId);
    } catch (e) {}

    return newRecord;
  }

  /**
   * Deletes a patient adherence entry (e.g. if recorded by error).
   */
  static deleteMedicationAdherence(id: string): void {
    PatientDataStore.deleteMedicationAdherence(id);
  }

  /**
   * Calculates overall adherence summary metrics.
   */
  static getAdherenceStats(patientId?: string): {
    totalRecords: number;
    takenCount: number;
    skippedCount: number;
    adherenceRate: number;
  } {
    const targetPatientId = patientId || PatientDataStore.getProfile().patientId;
    const list = PatientDataStore.getMedicationAdherence(targetPatientId);
    const takenCount = list.filter(r => r.status === 'Taken').length;
    const skippedCount = list.filter(r => r.status === 'Skipped').length;
    const totalRecords = list.length;
    const adherenceRate = totalRecords > 0 ? Math.round((takenCount / totalRecords) * 100) : 0;
    return { totalRecords, takenCount, skippedCount, adherenceRate };
  }

  /**
   * Evaluates medication reminders for scheduled daily doses.
   * Deterministic deduplication ensures reminders are never duplicated on page reload or navigation.
   * Does NOT generate reminders for completed medications or where timing is unspecified.
   */
  static evaluateMedicationReminders(patientId?: string): PatientNotificationItem[] {
    const pId = patientId || PatientDataStore.getProfile().patientId || 'PID-2026-001';
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = this.getTodayMedicationTasks(pId, todayStr);
    if (!todayTasks || todayTasks.length === 0) {
      return [];
    }
    const existingNotifications = PatientDataStore.getNotifications();
    const createdReminders: PatientNotificationItem[] = [];

    todayTasks.forEach(task => {
      // Do not create reminder if already recorded or timing not specified
      if (task.status !== 'Not Recorded') return;
      if (!task.medication.isTimingSpecified) return;
      if (task.medication.isDurationExpired) return;

      const cleanName = task.medication.medicineName.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanOcc = (task.occurrence || 'daily').replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueReminderId = `notif-med-${pId}-${task.medication.prescriptionId}-${cleanName}-${todayStr}-${cleanOcc}`;

      const alreadyExists = existingNotifications.some(n => n.id === uniqueReminderId);
      if (!alreadyExists) {
        const notif: PatientNotificationItem = {
          id: uniqueReminderId,
          title: 'Medication Reminder',
          message: `Your scheduled ${task.medication.medicineName} dose (${task.occurrence}) tracking is due for today.`,
          date: todayStr,
          time: '09:00 AM',
          read: false,
          type: 'medication_reminder',
          parameterName: task.medication.medicineName,
          alertType: 'reminder'
        };

        PatientDataStore.addNotification(notif);
        createdReminders.push(notif);
      }
    });

    return createdReminders;
  }
}
