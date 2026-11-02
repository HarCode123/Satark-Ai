import { getDatabaseConnection, isUsingLocalFallback, saveLocalTranscript, getLocalTranscripts } from "../db/mysql.ts";

export interface TranscriptRecord {
  id?: number;
  doctorId: string;
  patientId: string;
  rawTranscript: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TranscriptModel {
  /**
   * Save a new raw transcript exactly as-is.
   * Utilizes Prepared SQL Statements for security and performance.
   */
  static async create(doctorId: string, patientId: string, transcript: string): Promise<TranscriptRecord> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();
    
    if (isFallback) {
      const localRecord = saveLocalTranscript(doctorId, patientId, transcript);
      return {
        id: localRecord.id,
        doctorId: localRecord.doctor_id,
        patientId: localRecord.patient_id,
        rawTranscript: localRecord.raw_transcript,
        createdAt: new Date(localRecord.created_at),
        updatedAt: new Date(localRecord.updated_at)
      };
    }

    const query = `
      INSERT INTO consultation_transcripts (doctor_id, patient_id, raw_transcript)
      VALUES (?, ?, ?)
    `;

    try {
      const [result]: any = await pool.execute(query, [doctorId, patientId, transcript]);
      
      return {
        id: result.insertId,
        doctorId,
        patientId,
        rawTranscript: transcript,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (err: any) {
      console.error("❌ [TranscriptModel] Error executing prepared INSERT statement:", err);
      throw err;
    }
  }

  /**
   * Retrieve all transcripts (for verification or historical logs).
   */
  static async findAll(): Promise<TranscriptRecord[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();
    
    if (isFallback) {
      const localRecords = getLocalTranscripts();
      return localRecords.map(r => ({
        id: r.id,
        doctorId: r.doctor_id,
        patientId: r.patient_id,
        rawTranscript: r.raw_transcript,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at)
      }));
    }

    const query = `
      SELECT id, doctor_id as doctorId, patient_id as patientId, raw_transcript as rawTranscript, created_at as createdAt, updated_at as updatedAt
      FROM consultation_transcripts
      ORDER BY created_at DESC
    `;

    try {
      const [rows]: any = await pool.execute(query);
      return rows;
    } catch (err: any) {
      console.error("❌ [TranscriptModel] Error executing SELECT query:", err);
      throw err;
    }
  }
}
