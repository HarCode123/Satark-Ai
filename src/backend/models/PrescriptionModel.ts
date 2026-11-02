import {
  getDatabaseConnection,
  isUsingLocalFallback,
  getLocalPrescriptions,
  saveLocalPrescription,
  updateLocalPrescriptionStatus,
  LocalPrescription
} from "../db/mysql.ts";
import { ClinicalPrescription } from "../services/PrescriptionService.ts";

export interface PrescriptionRecord {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  provisionalDiagnosis: string;
  medications: any[];
  dietAdvice: string;
  followUp: string;
  doctorsNotes: string;
  fullPrescription: ClinicalPrescription;
  status: 'draft' | 'approved';
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
}

export class PrescriptionModel {
  /**
   * Generates a deterministic prescription ID or formats provided ID
   */
  static generateId(patientId: string): string {
    return `rx-${Date.now()}-${patientId}`;
  }

  /**
   * Create or update a prescription in MySQL / Local Fallback store (Prevents duplicates)
   */
  static async createOrUpdate(data: {
    prescriptionId?: string;
    patientId: string;
    doctorId: string;
    doctorName: string;
    visitDate: string;
    provisionalDiagnosis?: string;
    medications?: any[];
    dietAdvice?: string;
    followUp?: string;
    doctorsNotes?: string;
    fullPrescription: ClinicalPrescription;
    status?: 'draft' | 'approved';
  }): Promise<PrescriptionRecord> {
    const rxId = data.prescriptionId || this.generateId(data.patientId);
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    const medications = data.medications || data.fullPrescription?.medications || [];
    const diagnosis = data.provisionalDiagnosis || data.fullPrescription?.provisionalDiagnosis || "";
    const advice = data.dietAdvice || data.fullPrescription?.lifestyleDietAdvice || "";
    const followUp = data.followUp || data.fullPrescription?.followUp || "";
    const notes = data.doctorsNotes || data.fullPrescription?.doctorsNotes || "";
    const status = data.status || 'draft';
    const now = new Date().toISOString();

    if (isFallback) {
      const localData: LocalPrescription = {
        prescription_id: rxId,
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        doctor_name: data.doctorName,
        visit_date: data.visitDate || now.split("T")[0],
        provisional_diagnosis: diagnosis,
        medications_json: medications,
        diet_advice: advice,
        follow_up: followUp,
        doctors_notes: notes,
        full_prescription_json: data.fullPrescription,
        status,
        created_at: now,
        updated_at: now,
        approved_at: status === 'approved' ? now : undefined
      };

      const saved = saveLocalPrescription(localData);
      return this.mapFromLocal(saved);
    }

    const query = `
      INSERT INTO patient_prescriptions (
        prescription_id, patient_id, doctor_id, doctor_name,
        visit_date, provisional_diagnosis, medications_json,
        diet_advice, follow_up, doctors_notes,
        full_prescription_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        doctor_name = VALUES(doctor_name),
        visit_date = VALUES(visit_date),
        provisional_diagnosis = VALUES(provisional_diagnosis),
        medications_json = VALUES(medications_json),
        diet_advice = VALUES(diet_advice),
        follow_up = VALUES(follow_up),
        doctors_notes = VALUES(doctors_notes),
        full_prescription_json = VALUES(full_prescription_json),
        status = VALUES(status),
        updated_at = NOW();
    `;

    try {
      await pool.execute(query, [
        rxId,
        data.patientId,
        data.doctorId,
        data.doctorName,
        data.visitDate || now.split("T")[0],
        diagnosis,
        JSON.stringify(medications),
        advice,
        followUp,
        notes,
        JSON.stringify(data.fullPrescription),
        status
      ]);

      return {
        prescriptionId: rxId,
        patientId: data.patientId,
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        visitDate: data.visitDate || now.split("T")[0],
        provisionalDiagnosis: diagnosis,
        medications,
        dietAdvice: advice,
        followUp,
        doctorsNotes: notes,
        fullPrescription: data.fullPrescription,
        status,
        createdAt: now,
        updatedAt: now,
        approvedAt: status === 'approved' ? now : undefined
      };
    } catch (err: any) {
      console.error("❌ [PrescriptionModel] MySQL insert error, falling back to local:", err);
      const localData: LocalPrescription = {
        prescription_id: rxId,
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        doctor_name: data.doctorName,
        visit_date: data.visitDate || now.split("T")[0],
        provisional_diagnosis: diagnosis,
        medications_json: medications,
        diet_advice: advice,
        follow_up: followUp,
        doctors_notes: notes,
        full_prescription_json: data.fullPrescription,
        status,
        created_at: now,
        updated_at: now,
        approved_at: status === 'approved' ? now : undefined
      };
      const saved = saveLocalPrescription(localData);
      return this.mapFromLocal(saved);
    }
  }

  /**
   * Approves and publishes a prescription
   */
  static async approve(prescriptionId: string, doctorId: string): Promise<PrescriptionRecord | null> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const updated = updateLocalPrescriptionStatus(prescriptionId, 'approved');
      return updated ? this.mapFromLocal(updated) : null;
    }

    try {
      const query = `
        UPDATE patient_prescriptions
        SET status = 'approved', updated_at = NOW()
        WHERE prescription_id = ?
      `;
      await pool.execute(query, [prescriptionId]);
      return await this.findById(prescriptionId);
    } catch (err: any) {
      console.error("❌ [PrescriptionModel] MySQL approve error, attempting local update:", err);
      const updated = updateLocalPrescriptionStatus(prescriptionId, 'approved');
      return updated ? this.mapFromLocal(updated) : null;
    }
  }

  /**
   * Find prescriptions for a specific patient.
   * If includeDrafts is false (default for patient portal), only returns 'approved' prescriptions.
   */
  static async findByPatientId(patientId: string, includeDrafts: boolean = false): Promise<PrescriptionRecord[]> {
    const cleanId = (patientId || "").trim();
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const localRecords = getLocalPrescriptions();
      return localRecords
        .filter(p => (p.patient_id || "").trim().toLowerCase() === cleanId.toLowerCase() && (includeDrafts || p.status === 'approved'))
        .map(p => this.mapFromLocal(p))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    try {
      let query = `
        SELECT 
          prescription_id as prescriptionId,
          patient_id as patientId,
          doctor_id as doctorId,
          doctor_name as doctorName,
          visit_date as visitDate,
          provisional_diagnosis as provisionalDiagnosis,
          medications_json as medicationsJson,
          diet_advice as dietAdvice,
          follow_up as followUp,
          doctors_notes as doctorsNotes,
          full_prescription_json as fullPrescriptionJson,
          status,
          created_at as createdAt,
          updated_at as updatedAt
        FROM patient_prescriptions
        WHERE LOWER(TRIM(patient_id)) = LOWER(TRIM(?))
      `;

      if (!includeDrafts) {
        query += ` AND status = 'approved'`;
      }
      query += ` ORDER BY created_at DESC`;

      const [rows]: any = await pool.execute(query, [cleanId]);
      return (rows || []).map((r: any) => this.mapFromDb(r));
    } catch (err: any) {
      console.error("❌ [PrescriptionModel] MySQL findByPatientId error, falling back:", err);
      const localRecords = getLocalPrescriptions();
      return localRecords
        .filter(p => (p.patient_id || "").trim().toLowerCase() === cleanId.toLowerCase() && (includeDrafts || p.status === 'approved'))
        .map(p => this.mapFromLocal(p));
    }
  }

  /**
   * Find a single prescription by ID
   */
  static async findById(prescriptionId: string): Promise<PrescriptionRecord | null> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const localRecords = getLocalPrescriptions();
      const match = localRecords.find(p => p.prescription_id === prescriptionId);
      return match ? this.mapFromLocal(match) : null;
    }

    try {
      const query = `
        SELECT 
          prescription_id as prescriptionId,
          patient_id as patientId,
          doctor_id as doctorId,
          doctor_name as doctorName,
          visit_date as visitDate,
          provisional_diagnosis as provisionalDiagnosis,
          medications_json as medicationsJson,
          diet_advice as dietAdvice,
          follow_up as followUp,
          doctors_notes as doctorsNotes,
          full_prescription_json as fullPrescriptionJson,
          status,
          created_at as createdAt,
          updated_at as updatedAt
        FROM patient_prescriptions
        WHERE prescription_id = ?
        LIMIT 1
      `;
      const [rows]: any = await pool.execute(query, [prescriptionId]);
      if (!rows || rows.length === 0) return null;
      return this.mapFromDb(rows[0]);
    } catch (err: any) {
      console.error("❌ [PrescriptionModel] MySQL findById error, falling back:", err);
      const localRecords = getLocalPrescriptions();
      const match = localRecords.find(p => p.prescription_id === prescriptionId);
      return match ? this.mapFromLocal(match) : null;
    }
  }

  /**
   * Find all prescriptions (doctor overview)
   */
  static async findAll(doctorId?: string): Promise<PrescriptionRecord[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const localRecords = getLocalPrescriptions();
      return localRecords
        .filter(p => !doctorId || p.doctor_id === doctorId)
        .map(p => this.mapFromLocal(p))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    try {
      let query = `
        SELECT 
          prescription_id as prescriptionId,
          patient_id as patientId,
          doctor_id as doctorId,
          doctor_name as doctorName,
          visit_date as visitDate,
          provisional_diagnosis as provisionalDiagnosis,
          medications_json as medicationsJson,
          diet_advice as dietAdvice,
          follow_up as followUp,
          doctors_notes as doctorsNotes,
          full_prescription_json as fullPrescriptionJson,
          status,
          created_at as createdAt,
          updated_at as updatedAt
        FROM patient_prescriptions
      `;
      const params: any[] = [];
      if (doctorId) {
        query += ` WHERE doctor_id = ?`;
        params.push(doctorId);
      }
      query += ` ORDER BY created_at DESC`;

      const [rows]: any = await pool.execute(query, params);
      return (rows || []).map((r: any) => this.mapFromDb(r));
    } catch (err: any) {
      console.error("❌ [PrescriptionModel] MySQL findAll error, falling back:", err);
      const localRecords = getLocalPrescriptions();
      return localRecords
        .filter(p => !doctorId || p.doctor_id === doctorId)
        .map(p => this.mapFromLocal(p));
    }
  }

  private static mapFromLocal(item: LocalPrescription): PrescriptionRecord {
    return {
      prescriptionId: item.prescription_id,
      patientId: item.patient_id,
      doctorId: item.doctor_id,
      doctorName: item.doctor_name,
      visitDate: item.visit_date,
      provisionalDiagnosis: item.provisional_diagnosis,
      medications: typeof item.medications_json === 'string' ? JSON.parse(item.medications_json) : (item.medications_json || []),
      dietAdvice: item.diet_advice,
      followUp: item.follow_up,
      doctorsNotes: item.doctors_notes,
      fullPrescription: typeof item.full_prescription_json === 'string' ? JSON.parse(item.full_prescription_json) : (item.full_prescription_json || {}),
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      approvedAt: item.approved_at
    };
  }

  private static mapFromDb(row: any): PrescriptionRecord {
    return {
      prescriptionId: row.prescriptionId,
      patientId: row.patientId,
      doctorId: row.doctorId,
      doctorName: row.doctorName,
      visitDate: row.visitDate,
      provisionalDiagnosis: row.provisionalDiagnosis,
      medications: typeof row.medicationsJson === 'string' ? JSON.parse(row.medicationsJson) : (row.medicationsJson || []),
      dietAdvice: row.dietAdvice,
      followUp: row.followUp,
      doctorsNotes: row.doctorsNotes,
      fullPrescription: typeof row.fullPrescriptionJson === 'string' ? JSON.parse(row.fullPrescriptionJson) : (row.fullPrescriptionJson || {}),
      status: row.status,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined
    };
  }
}
