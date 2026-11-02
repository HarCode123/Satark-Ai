/**
 * Monitoring Alert & Reminder Service for Satark AI Patient Portal
 * 
 * STEP 5 Implementation:
 * - Proactive, non-alarming monitoring reminders based on active monitoring frequencies
 * - Today's tracking status evaluation (Recorded vs Tracking Pending)
 * - Software threshold evaluation foundation for configured rules
 * - Deterministic notification deduplication (prevents duplicates on reload)
 * - Zero medical diagnosis, zero fake statuses, strictly neutral healthcare language
 */

import { PatientDataStore, PatientNotificationItem } from './patientStore';
import { 
  MonitoringPlan, 
  MonitoringParameter, 
  HealthLogEntry, 
  HealthLogReading,
  ParameterMonitoringStatus,
  ParameterThresholdConfig
} from '../types/monitoring';

export class MonitoringAlertService {
  /**
   * Evaluates today's real-time monitoring status for all active parameters.
   */
  static getTodayMonitoringStatuses(patientId?: string): ParameterMonitoringStatus[] {
    const activePlan = PatientDataStore.getActiveMonitoringPlan(patientId);
    if (!activePlan || !activePlan.parameters) {
      return [];
    }

    const todayDateStr = new Date().toISOString().split('T')[0];
    const allLogs = PatientDataStore.getHealthLogs(patientId);
    const todayLogs = allLogs.filter(l => l.date === todayDateStr);
    const latestReadingsMap = PatientDataStore.getLatestReadings(patientId);

    const activeParams = activePlan.parameters.filter(p => p.isActive);

    return activeParams.map(param => {
      // Determine expected frequency
      const freqRaw = (param.frequency || '').trim();
      const freqLower = freqRaw.toLowerCase();
      let isDue = false;
      let frequencyDisplay = freqRaw;

      if (!freqRaw || freqLower === 'not specified') {
        frequencyDisplay = 'Monitoring schedule not specified.';
        isDue = false;
      } else if (freqLower.includes('daily') || freqLower.includes('twice daily') || freqLower.includes('three times daily')) {
        isDue = true;
      } else if (freqLower.includes('weekly')) {
        // Due if no entry recorded in last 7 days
        const lastReading = latestReadingsMap[param.id] || latestReadingsMap[param.parameterType];
        if (!lastReading) {
          isDue = true;
        } else {
          const daysSince = Math.floor((Date.now() - (lastReading.timestamp || 0)) / (1000 * 60 * 60 * 24));
          isDue = daysSince >= 7;
        }
      } else {
        // PRN / As needed
        isDue = false;
      }

      // Check if today's reading has been recorded for this parameter
      let recordedTodayReading: HealthLogReading & { date: string; time: string } | null = null;
      for (const log of todayLogs) {
        const found = log.readings.find(r => r.parameterId === param.id || r.parameterType === param.parameterType);
        if (found) {
          recordedTodayReading = {
            ...found,
            date: log.date,
            time: log.time
          };
          break;
        }
      }

      const isRecordedToday = !!recordedTodayReading;
      const latestAny = latestReadingsMap[param.id] || latestReadingsMap[param.parameterType];

      let statusText: 'Recorded' | 'Pending' | 'Not Due' | 'Not Specified' = 'Pending';
      if (isRecordedToday) {
        statusText = 'Recorded';
      } else if (!isDue) {
        statusText = (!freqRaw || freqLower === 'not specified') ? 'Not Specified' : 'Not Due';
      } else {
        statusText = 'Pending';
      }

      const lastRecordedValue = recordedTodayReading ? recordedTodayReading.value : (latestAny ? latestAny.value : null);
      const lastRecordedDate = recordedTodayReading ? recordedTodayReading.date : (latestAny ? latestAny.date : null);
      const lastRecordedTime = recordedTodayReading ? recordedTodayReading.time : (latestAny ? latestAny.time : null);

      return {
        parameterId: param.id,
        parameterType: param.parameterType,
        displayName: param.displayName,
        unit: param.unit,
        frequency: frequencyDisplay,
        isDue,
        isRecordedToday,
        statusText,
        lastRecordedValue,
        lastRecordedDate,
        lastRecordedTime,
        thresholdConfigured: !!(param.threshold && param.threshold.enabled)
      };
    });
  }

  /**
   * Evaluates monitoring reminder notifications for due tasks.
   * Deterministic deduplication ensures notifications are never duplicated on page reload or navigation.
   */
  static evaluateMonitoringReminders(patientId?: string): PatientNotificationItem[] {
    const statuses = this.getTodayMonitoringStatuses(patientId);
    const todayDateStr = new Date().toISOString().split('T')[0];
    const existingNotifications = PatientDataStore.getNotifications();
    const createdReminders: PatientNotificationItem[] = [];

    const pId = patientId || 'PID-2026-001';

    for (const status of statuses) {
      // Only generate reminder if the parameter is due and has not been recorded today
      if (status.isDue && !status.isRecordedToday) {
        // Unique deterministic ID: patient + param + date + reminder
        const uniqueReminderId = `notif-reminder-${pId}-${status.parameterId}-${todayDateStr}`;

        // Deduplication: skip if already present
        const alreadyExists = existingNotifications.some(n => n.id === uniqueReminderId);
        if (!alreadyExists) {
          const newReminder: PatientNotificationItem = {
            id: uniqueReminderId,
            title: 'Health Monitoring Reminder',
            message: `Your daily ${status.displayName} reading is due for today (${todayDateStr}).`,
            date: todayDateStr,
            time: '09:00 AM',
            read: false,
            type: 'monitoring_reminder',
            parameterId: status.parameterId,
            parameterName: status.displayName,
            alertType: 'reminder'
          };

          PatientDataStore.addNotification(newReminder);
          createdReminders.push(newReminder);
        }
      }
    }

    return createdReminders;
  }

  /**
   * Compares a health reading against an explicitly configured parameter threshold rule.
   * Strict safety rules:
   * 1. If no threshold is configured or enabled -> returns null (never invent thresholds or classify).
   * 2. If breached -> creates a monitoring_alert notification.
   * 3. Reading is never modified.
   * 4. Does not diagnose the patient (no "hypertension", "critical", etc.).
   * 5. Uses deterministic ID for deduplication: alert-${logId}-${parameterId}.
   */
  static checkReadingThresholdAlert(
    reading: HealthLogReading,
    log: HealthLogEntry,
    param?: MonitoringParameter
  ): PatientNotificationItem | null {
    if (!param || !param.threshold || !param.threshold.enabled) {
      return null;
    }

    const alertId = `notif-alert-${log.id}-${reading.parameterId}`;
    const existingNotifications = PatientDataStore.getNotifications();
    if (existingNotifications.some(n => n.id === alertId)) {
      return null; // Already alerted for this reading
    }

    let isBreached = false;
    let alertMessage = '';

    if (reading.parameterType === 'blood_pressure') {
      const systolic = reading.systolic ?? (reading.value.includes('/') ? parseFloat(reading.value.split('/')[0]) : null);
      const diastolic = reading.diastolic ?? (reading.value.includes('/') ? parseFloat(reading.value.split('/')[1]) : null);

      const t = param.threshold;
      let sysBreach = false;
      let diaBreach = false;

      if (systolic !== null && !isNaN(systolic)) {
        if (t.systolicUpper != null && systolic > t.systolicUpper) sysBreach = true;
        if (t.systolicLower != null && systolic < t.systolicLower) sysBreach = true;
      }

      if (diastolic !== null && !isNaN(diastolic)) {
        if (t.diastolicUpper != null && diastolic > t.diastolicUpper) diaBreach = true;
        if (t.diastolicLower != null && diastolic < t.diastolicLower) diaBreach = true;
      }

      if (sysBreach || diaBreach) {
        isBreached = true;
        alertMessage = `Blood Pressure reading (${reading.value} mmHg) recorded on ${log.date} at ${log.time} is outside the configured monitoring range.`;
      }
    } else {
      const numVal = reading.numericValue ?? parseFloat(reading.value);
      const t = param.threshold;

      if (!isNaN(numVal)) {
        let valBreach = false;
        if (t.upperThreshold != null && numVal > t.upperThreshold) valBreach = true;
        if (t.lowerThreshold != null && numVal < t.lowerThreshold) valBreach = true;

        if (valBreach) {
          isBreached = true;
          alertMessage = `${reading.displayName} reading (${reading.value} ${reading.unit}) recorded on ${log.date} at ${log.time} is outside the configured monitoring range.`;
        }
      }
    }

    if (isBreached) {
      const alertNotif: PatientNotificationItem = {
        id: alertId,
        title: 'Monitoring Range Alert',
        message: alertMessage,
        date: log.date,
        time: log.time,
        read: false,
        type: 'monitoring_alert',
        parameterId: reading.parameterId,
        parameterName: reading.displayName,
        healthReadingId: `${log.id}-${reading.parameterId}`,
        readingValue: reading.value,
        alertType: 'threshold_breach'
      };

      PatientDataStore.addNotification(alertNotif);
      return alertNotif;
    }

    return null;
  }

  /**
   * Helper for testing threshold alert logic without altering permanent patient clinical data.
   * Enables a test threshold on an active parameter.
   */
  static configureTestThreshold(parameterId: string, config: ParameterThresholdConfig): void {
    const plan = PatientDataStore.getActiveMonitoringPlan();
    if (!plan) return;

    const updatedParams = plan.parameters.map(p => {
      if (p.id === parameterId || p.parameterType === parameterId) {
        return {
          ...p,
          threshold: config
        };
      }
      return p;
    });

    PatientDataStore.saveMonitoringPlan({
      ...plan,
      parameters: updatedParams
    });
  }

  /**
   * Clears any test threshold on a parameter.
   */
  static clearTestThreshold(parameterId: string): void {
    const plan = PatientDataStore.getActiveMonitoringPlan();
    if (!plan) return;

    const updatedParams = plan.parameters.map(p => {
      if (p.id === parameterId || p.parameterType === parameterId) {
        const copy = { ...p };
        delete copy.threshold;
        return copy;
      }
      return p;
    });

    PatientDataStore.saveMonitoringPlan({
      ...plan,
      parameters: updatedParams
    });
  }
}
