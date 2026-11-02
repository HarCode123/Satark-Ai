import fs from "fs";
import path from "path";
import { getDatabaseConnection, isUsingLocalFallback } from "../db/mysql.ts";
import { MonitoringPlan, HealthLogEntry } from "../../types/monitoring.ts";
import { MedicationAdherenceRecord } from "../../types/medication.ts";

const FALLBACK_PLANS_PATH = path.join(process.cwd(), "monitoring_plans_local.json");
const FALLBACK_LOGS_PATH = path.join(process.cwd(), "health_logs_local.json");
const FALLBACK_ADHERENCE_PATH = path.join(process.cwd(), "medication_adherence_local.json");

export class MonitoringModel {
  // --- Monitoring Plans ---
  static async getPlansByPatientId(patientId: string): Promise<MonitoringPlan[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      try {
        if (fs.existsSync(FALLBACK_PLANS_PATH)) {
          const list: MonitoringPlan[] = JSON.parse(fs.readFileSync(FALLBACK_PLANS_PATH, "utf-8"));
          return list.filter(p => !patientId || p.patientId === patientId);
        }
      } catch (e) {}
      return [];
    }

    try {
      const [plans]: any = await pool.query(
        `SELECT plan_id, patient_id, source_prescription_id, title, diagnosis, doctor_name, created_date, is_active, notes
         FROM patient_monitoring_plans WHERE patient_id = ? ORDER BY created_at DESC`,
        [patientId]
      );

      const result: MonitoringPlan[] = [];
      for (const p of plans) {
        const [params]: any = await pool.query(
          `SELECT parameter_id, plan_id, patient_id, parameter_type, display_name, unit,
                  source_prescription_id, reason_for_monitoring, is_active, start_date, end_date,
                  frequency, instructions, baseline_value, threshold_enabled, threshold_source,
                  lower_threshold, upper_threshold, systolic_lower, systolic_upper, diastolic_lower,
                  diastolic_upper, threshold_notes
           FROM patient_monitoring_parameters WHERE plan_id = ?`,
          [p.plan_id]
        );

        result.push({
          id: p.plan_id,
          patientId: p.patient_id,
          sourcePrescriptionId: p.source_prescription_id,
          title: p.title,
          diagnosis: p.diagnosis,
          doctorName: p.doctor_name,
          createdDate: p.created_date ? new Date(p.created_date).toISOString().split("T")[0] : "",
          isActive: Boolean(p.is_active),
          notes: p.notes,
          parameters: params.map((pm: any) => ({
            id: pm.parameter_id,
            patientId: pm.patient_id,
            parameterType: pm.parameter_type,
            displayName: pm.display_name,
            unit: pm.unit,
            sourcePrescriptionId: pm.source_prescription_id,
            reasonForMonitoring: pm.reason_for_monitoring,
            isActive: Boolean(pm.is_active),
            startDate: pm.start_date ? new Date(pm.start_date).toISOString().split("T")[0] : "",
            endDate: pm.end_date ? new Date(pm.end_date).toISOString().split("T")[0] : undefined,
            frequency: pm.frequency,
            instructions: pm.instructions,
            baselineValue: pm.baseline_value,
            threshold: Boolean(pm.threshold_enabled) ? {
              enabled: true,
              source: pm.threshold_source,
              lowerThreshold: pm.lower_threshold !== null ? Number(pm.lower_threshold) : undefined,
              upperThreshold: pm.upper_threshold !== null ? Number(pm.upper_threshold) : undefined,
              systolicLower: pm.systolic_lower !== null ? Number(pm.systolic_lower) : undefined,
              systolicUpper: pm.systolic_upper !== null ? Number(pm.systolic_upper) : undefined,
              diastolicLower: pm.diastolic_lower !== null ? Number(pm.diastolic_lower) : undefined,
              diastolicUpper: pm.diastolic_upper !== null ? Number(pm.diastolic_upper) : undefined,
              notes: pm.threshold_notes
            } : undefined
          }))
        });
      }
      return result;
    } catch (err) {
      console.error("❌ [MonitoringModel] Error getting plans:", err);
      if (process.env.NODE_ENV === "production") throw err;
      return [];
    }
  }

  static async savePlan(plan: MonitoringPlan): Promise<void> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      try {
        let list: MonitoringPlan[] = [];
        if (fs.existsSync(FALLBACK_PLANS_PATH)) {
          list = JSON.parse(fs.readFileSync(FALLBACK_PLANS_PATH, "utf-8"));
        }
        const idx = list.findIndex(p => p.id === plan.id || p.sourcePrescriptionId === plan.sourcePrescriptionId);
        if (idx >= 0) list[idx] = plan;
        else list.unshift(plan);
        fs.writeFileSync(FALLBACK_PLANS_PATH, JSON.stringify(list, null, 2), "utf-8");
      } catch (e) {
        console.error("❌ [MonitoringModel] Fallback savePlan error:", e);
      }
      return;
    }

    try {
      await pool.query(
        `INSERT INTO patient_monitoring_plans (
          plan_id, patient_id, source_prescription_id, title, diagnosis, doctor_name, created_date, is_active, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title), diagnosis = VALUES(diagnosis), doctor_name = VALUES(doctor_name),
          is_active = VALUES(is_active), notes = VALUES(notes), updated_at = NOW()`,
        [
          plan.id,
          plan.patientId,
          plan.sourcePrescriptionId || null,
          plan.title,
          plan.diagnosis || null,
          plan.doctorName || null,
          plan.createdDate || new Date().toISOString().split("T")[0],
          plan.isActive ? 1 : 0,
          plan.notes || null
        ]
      );

      for (const param of plan.parameters || []) {
        await pool.query(
          `INSERT INTO patient_monitoring_parameters (
            parameter_id, plan_id, patient_id, parameter_type, display_name, unit,
            source_prescription_id, reason_for_monitoring, is_active, start_date, end_date,
            frequency, instructions, baseline_value, threshold_enabled, threshold_source,
            lower_threshold, upper_threshold, systolic_lower, systolic_upper, diastolic_lower,
            diastolic_upper, threshold_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            display_name = VALUES(display_name), unit = VALUES(unit), is_active = VALUES(is_active),
            frequency = VALUES(frequency), instructions = VALUES(instructions), baseline_value = VALUES(baseline_value),
            threshold_enabled = VALUES(threshold_enabled), lower_threshold = VALUES(lower_threshold),
            upper_threshold = VALUES(upper_threshold), systolic_lower = VALUES(systolic_lower),
            systolic_upper = VALUES(systolic_upper), diastolic_lower = VALUES(diastolic_lower),
            diastolic_upper = VALUES(diastolic_upper), updated_at = NOW()`,
          [
            param.id,
            plan.id,
            plan.patientId,
            param.parameterType,
            param.displayName,
            param.unit,
            param.sourcePrescriptionId || null,
            param.reasonForMonitoring,
            param.isActive ? 1 : 0,
            param.startDate || new Date().toISOString().split("T")[0],
            param.endDate || null,
            param.frequency,
            param.instructions || null,
            param.baselineValue || null,
            param.threshold?.enabled ? 1 : 0,
            param.threshold?.source || null,
            param.threshold?.lowerThreshold ?? null,
            param.threshold?.upperThreshold ?? null,
            param.threshold?.systolicLower ?? null,
            param.threshold?.systolicUpper ?? null,
            param.threshold?.diastolicLower ?? null,
            param.threshold?.diastolicUpper ?? null,
            param.threshold?.notes || null
          ]
        );
      }
    } catch (err) {
      console.error("❌ [MonitoringModel] Error saving plan to MySQL:", err);
      if (process.env.NODE_ENV === "production") throw err;
    }
  }

  // --- Health Logs ---
  static async getHealthLogsByPatientId(patientId: string): Promise<HealthLogEntry[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      try {
        if (fs.existsSync(FALLBACK_LOGS_PATH)) {
          const list: HealthLogEntry[] = JSON.parse(fs.readFileSync(FALLBACK_LOGS_PATH, "utf-8"));
          return list.filter(l => !patientId || l.patientId === patientId);
        }
      } catch (e) {}
      return [];
    }

    try {
      const [logs]: any = await pool.query(
        `SELECT log_id, patient_id, monitoring_plan_id, log_date, log_time, recorded_timestamp, symptoms_json, notes
         FROM patient_health_logs WHERE patient_id = ? ORDER BY recorded_timestamp DESC`,
        [patientId]
      );

      const result: HealthLogEntry[] = [];
      for (const l of logs) {
        const [readings]: any = await pool.query(
          `SELECT reading_id, log_id, patient_id, parameter_id, parameter_type, display_name, unit,
                  display_value, numeric_value, systolic, diastolic, recorded_date, recorded_timestamp
           FROM patient_health_readings WHERE log_id = ?`,
          [l.log_id]
        );

        let symptoms: string[] = [];
        try {
          symptoms = typeof l.symptoms_json === "string" ? JSON.parse(l.symptoms_json) : (l.symptoms_json || []);
        } catch (e) {}

        result.push({
          id: l.log_id,
          patientId: l.patient_id,
          date: l.log_date ? new Date(l.log_date).toISOString().split("T")[0] : "",
          time: l.log_time,
          timestamp: Number(l.recorded_timestamp),
          readings: readings.map((r: any) => ({
            parameterId: r.parameter_id,
            parameterType: r.parameter_type,
            displayName: r.display_name,
            unit: r.unit,
            value: r.display_value,
            numericValue: r.numeric_value !== null ? Number(r.numeric_value) : undefined,
            systolic: r.systolic !== null ? Number(r.systolic) : undefined,
            diastolic: r.diastolic !== null ? Number(r.diastolic) : undefined
          })),
          symptoms,
          notes: l.notes || "",
          createdAt: l.created_at ? new Date(l.created_at).toISOString() : new Date().toISOString()
        });
      }
      return result;
    } catch (err) {
      console.error("❌ [MonitoringModel] Error getting health logs:", err);
      if (process.env.NODE_ENV === "production") throw err;
      return [];
    }
  }

  static async saveHealthLog(entry: HealthLogEntry): Promise<void> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      try {
        let list: HealthLogEntry[] = [];
        if (fs.existsSync(FALLBACK_LOGS_PATH)) {
          list = JSON.parse(fs.readFileSync(FALLBACK_LOGS_PATH, "utf-8"));
        }
        const idx = list.findIndex(l => l.id === entry.id);
        if (idx >= 0) list[idx] = entry;
        else list.unshift(entry);
        fs.writeFileSync(FALLBACK_LOGS_PATH, JSON.stringify(list, null, 2), "utf-8");
      } catch (e) {
        console.error("❌ [MonitoringModel] Fallback saveHealthLog error:", e);
      }
      return;
    }

    try {
      await pool.query(
        `INSERT INTO patient_health_logs (
          log_id, patient_id, monitoring_plan_id, log_date, log_time, recorded_timestamp, symptoms_json, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          log_date = VALUES(log_date), log_time = VALUES(log_time), recorded_timestamp = VALUES(recorded_timestamp),
          symptoms_json = VALUES(symptoms_json), notes = VALUES(notes), updated_at = NOW()`,
        [
          entry.id,
          entry.patientId,
          null,
          entry.date,
          entry.time,
          entry.timestamp || Date.now(),
          JSON.stringify(entry.symptoms || []),
          entry.notes || null
        ]
      );

      for (const r of entry.readings || []) {
        await pool.query(
          `INSERT INTO patient_health_readings (
            log_id, patient_id, parameter_id, parameter_type, display_name, unit,
            display_value, numeric_value, systolic, diastolic, recorded_date, recorded_timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.id,
            entry.patientId,
            r.parameterId || null,
            r.parameterType,
            r.displayName,
            r.unit,
            r.value,
            r.numericValue ?? null,
            r.systolic ?? null,
            r.diastolic ?? null,
            entry.date,
            entry.timestamp || Date.now()
          ]
        );
      }
    } catch (err) {
      console.error("❌ [MonitoringModel] Error saving health log:", err);
      if (process.env.NODE_ENV === "production") throw err;
    }
  }

  // --- Medication Adherence ---
  static async getAdherenceByPatientId(patientId: string): Promise<MedicationAdherenceRecord[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      try {
        if (fs.existsSync(FALLBACK_ADHERENCE_PATH)) {
          const list: MedicationAdherenceRecord[] = JSON.parse(fs.readFileSync(FALLBACK_ADHERENCE_PATH, "utf-8"));
          return list.filter(a => !patientId || a.patientId === patientId);
        }
      } catch (e) {}
      return [];
    }

    try {
      const [rows]: any = await pool.query(
        `SELECT adherence_id, patient_id, prescription_id, medicine_name, dose_date, dose_time,
                dose_timestamp, scheduled_occurrence, status, notes
         FROM patient_medication_adherence WHERE patient_id = ? ORDER BY dose_date DESC, dose_timestamp DESC`,
        [patientId]
      );

      return rows.map((r: any) => ({
        id: r.adherence_id,
        patientId: r.patient_id,
        prescriptionId: r.prescription_id,
        medicineName: r.medicine_name,
        date: r.dose_date ? new Date(r.dose_date).toISOString().split("T")[0] : "",
        time: r.dose_time,
        timestamp: Number(r.dose_timestamp),
        scheduledOccurrence: r.scheduled_occurrence,
        status: r.status,
        notes: r.notes
      }));
    } catch (err) {
      console.error("❌ [MonitoringModel] Error getting adherence:", err);
      if (process.env.NODE_ENV === "production") throw err;
      return [];
    }
  }

  static async recordAdherence(record: MedicationAdherenceRecord): Promise<void> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      try {
        let list: MedicationAdherenceRecord[] = [];
        if (fs.existsSync(FALLBACK_ADHERENCE_PATH)) {
          list = JSON.parse(fs.readFileSync(FALLBACK_ADHERENCE_PATH, "utf-8"));
        }
        const idx = list.findIndex(a => a.id === record.id);
        if (idx >= 0) list[idx] = record;
        else list.unshift(record);
        fs.writeFileSync(FALLBACK_ADHERENCE_PATH, JSON.stringify(list, null, 2), "utf-8");
      } catch (e) {
        console.error("❌ [MonitoringModel] Fallback recordAdherence error:", e);
      }
      return;
    }

    try {
      await pool.query(
        `INSERT INTO patient_medication_adherence (
          adherence_id, patient_id, prescription_id, medicine_name, dose_date, dose_time,
          dose_timestamp, scheduled_occurrence, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = VALUES(status), notes = VALUES(notes), updated_at = NOW()`,
        [
          record.id,
          record.patientId,
          record.prescriptionId,
          record.medicineName,
          record.date,
          record.time,
          record.timestamp || Date.now(),
          record.scheduledOccurrence || null,
          record.status,
          record.notes || null
        ]
      );
    } catch (err) {
      console.error("❌ [MonitoringModel] Error recording adherence:", err);
      if (process.env.NODE_ENV === "production") throw err;
    }
  }
}
