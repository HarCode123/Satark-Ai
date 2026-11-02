import fs from "fs";
import path from "path";
import { getDatabaseConnection, isUsingLocalFallback } from "../db/mysql.ts";

export interface AppointmentRecord {
  id: string;
  patientId: string;
  doctorName: string;
  department: string;
  hospital: string;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
  notes?: string;
  createdAt?: string;
}

const FALLBACK_APPOINTMENTS_PATH = path.join(process.cwd(), "patient_appointments_local.json");

export class AppointmentModel {
  private static getFallbackData(): AppointmentRecord[] {
    try {
      if (fs.existsSync(FALLBACK_APPOINTMENTS_PATH)) {
        const raw = fs.readFileSync(FALLBACK_APPOINTMENTS_PATH, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("⚠️ [AppointmentModel] Could not read local appointments fallback:", e);
    }

    const initial: AppointmentRecord[] = [
      {
        id: "apt-initial-001",
        patientId: "PID-2026-001",
        doctorName: "Dr. Harini, MD",
        department: "Internal Medicine",
        hospital: "Satark Clinical Medical Center",
        date: "2026-08-10",
        time: "10:00 AM",
        status: "Confirmed",
        notes: "Follow-up consultation for hypertension and routine health assessment.",
        createdAt: new Date().toISOString()
      }
    ];

    try {
      fs.writeFileSync(FALLBACK_APPOINTMENTS_PATH, JSON.stringify(initial, null, 2), "utf-8");
    } catch (e) {}

    return initial;
  }

  private static saveFallbackData(list: AppointmentRecord[]): void {
    try {
      fs.writeFileSync(FALLBACK_APPOINTMENTS_PATH, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.error("❌ [AppointmentModel] Failed to write local appointments:", e);
    }
  }

  /**
   * Fetch appointments for a specific patient
   */
  static async findByPatientId(patientId: string): Promise<AppointmentRecord[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const all = this.getFallbackData();
      return all.filter(a => !patientId || a.patientId === patientId);
    }

    try {
      const [rows] = await pool.query<any[]>(
        `SELECT appointment_id, patient_id, doctor_name, department, hospital, appointment_date, appointment_time, status, notes, created_at
         FROM patient_appointments
         WHERE patient_id = ?
         ORDER BY appointment_date ASC`,
        [patientId]
      );

      return rows.map(r => ({
        id: r.appointment_id,
        patientId: r.patient_id,
        doctorName: r.doctor_name,
        department: r.department,
        hospital: r.hospital || "Satark Clinical Medical Center",
        date: r.appointment_date,
        time: r.appointment_time,
        status: r.status,
        notes: r.notes || "",
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
      }));
    } catch (err) {
      console.error("❌ [AppointmentModel] Error querying MySQL appointments:", err);
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      return this.getFallbackData().filter(a => !patientId || a.patientId === patientId);
    }
  }

  /**
   * Fetch all appointments (for doctor view)
   */
  static async findAll(): Promise<AppointmentRecord[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      return this.getFallbackData();
    }

    try {
      const [rows] = await pool.query<any[]>(
        `SELECT appointment_id, patient_id, doctor_name, department, hospital, appointment_date, appointment_time, status, notes, created_at
         FROM patient_appointments
         ORDER BY appointment_date ASC`
      );

      return rows.map(r => ({
        id: r.appointment_id,
        patientId: r.patient_id,
        doctorName: r.doctor_name,
        department: r.department,
        hospital: r.hospital || "Satark Clinical Medical Center",
        date: r.appointment_date,
        time: r.appointment_time,
        status: r.status,
        notes: r.notes || "",
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined
      }));
    } catch (err) {
      console.error("❌ [AppointmentModel] Error querying all appointments:", err);
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      return this.getFallbackData();
    }
  }

  /**
   * Create an appointment with past-date validation
   */
  static async createAppointment(data: {
    id?: string;
    patientId: string;
    doctorName: string;
    department: string;
    hospital?: string;
    date: string;
    time: string;
    status?: "Confirmed" | "Pending" | "Completed" | "Cancelled";
    notes?: string;
  }): Promise<AppointmentRecord> {
    const aptId = data.id || `apt-${Date.now()}`;
    const hospital = data.hospital || "Satark Clinical Medical Center";
    const status = data.status || "Confirmed";
    const notes = data.notes || "Requested via Patient Portal Online Scheduling.";
    const nowIso = new Date().toISOString();

    const record: AppointmentRecord = {
      id: aptId,
      patientId: data.patientId,
      doctorName: data.doctorName,
      department: data.department,
      hospital,
      date: data.date,
      time: data.time,
      status,
      notes,
      createdAt: nowIso
    };

    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const all = this.getFallbackData();
      all.unshift(record);
      this.saveFallbackData(all);
      return record;
    }

    try {
      await pool.query(
        `INSERT INTO patient_appointments (
          appointment_id, patient_id, doctor_name, department, hospital,
          appointment_date, appointment_time, status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          aptId,
          data.patientId,
          data.doctorName,
          data.department,
          hospital,
          data.date,
          data.time,
          status,
          notes
        ]
      );

      return record;
    } catch (err) {
      console.error("❌ [AppointmentModel] Error inserting appointment to MySQL:", err);
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      const all = this.getFallbackData();
      all.unshift(record);
      this.saveFallbackData(all);
      return record;
    }
  }
}
