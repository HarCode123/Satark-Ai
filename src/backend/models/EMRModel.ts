import { getDatabaseConnection, isUsingLocalFallback, saveLocalEMRRecord, getLocalEMRRecords, getLocalTranscripts, getLocalPatients } from "../db/mysql.ts";

export interface EMRRecord {
  emrId?: number;
  consultationId: number;
  patientId: string;
  patientName?: string;
  age?: string | number;
  gender?: string;
  height?: string;
  weight?: string;
  bloodGroup?: string;
  doctorId: string;
  visitDate?: Date;
  chiefComplaint: string;
  symptoms: string;
  diagnosis: string;
  medications: string;
  dosage: string;
  advice: string;
  followUpDate: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  rawTranscript?: string; // Loaded via reference join
}

export class EMRModel {
  /**
   * Save a new structured EMR record.
   */
  static async create(
    consultationId: number,
    patientId: string,
    doctorId: string,
    chiefComplaint: string,
    symptoms: string,
    diagnosis: string,
    medications: string,
    dosage: string,
    advice: string,
    followUpDate: string,
    status: string = "Completed",
    patientName?: string,
    age?: string | number,
    gender?: string,
    height?: string,
    weight?: string,
    bloodGroup?: string
  ): Promise<EMRRecord> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const record = saveLocalEMRRecord(
        consultationId,
        patientId,
        doctorId,
        chiefComplaint,
        symptoms,
        diagnosis,
        medications,
        dosage,
        advice,
        followUpDate,
        status,
        patientName,
        age,
        gender,
        height,
        weight,
        bloodGroup
      );

      return {
        emrId: record.emr_id,
        consultationId: record.consultation_id,
        patientId: record.patient_id,
        patientName: record.patient_name || patientName,
        age: record.age !== undefined ? record.age : age,
        gender: record.gender || gender,
        height: record.height || height,
        weight: record.weight || weight,
        bloodGroup: record.blood_group || bloodGroup,
        doctorId: record.doctor_id,
        visitDate: new Date(record.visit_date),
        chiefComplaint: record.chief_complaint,
        symptoms: record.symptoms,
        diagnosis: record.diagnosis,
        medications: record.medications,
        dosage: record.dosage,
        advice: record.advice,
        followUpDate: record.follow_up_date,
        status: record.status,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at)
      };
    }

    const query = `
      INSERT INTO electronic_medical_records (
        consultation_id, patient_id, doctor_id, 
        chief_complaint, symptoms, diagnosis, 
        medications, dosage, advice, follow_up_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result]: any = await pool.execute(query, [
        consultationId,
        patientId,
        doctorId,
        chiefComplaint,
        symptoms,
        diagnosis,
        medications,
        dosage,
        advice,
        followUpDate,
        status
      ]);

      return {
        emrId: result.insertId,
        consultationId,
        patientId,
        patientName,
        age,
        gender,
        height,
        weight,
        bloodGroup,
        doctorId,
        visitDate: new Date(),
        chiefComplaint,
        symptoms,
        diagnosis,
        medications,
        dosage,
        advice,
        followUpDate,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (err: any) {
      console.error("❌ [EMRModel] Error inserting structured EMR record:", err);
      throw err;
    }
  }

  /**
   * Fetch all electronic medical records with a live relational JOIN on raw transcripts and patients table.
   */
  static async findAll(): Promise<EMRRecord[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const records = getLocalEMRRecords();
      const transcripts = getLocalTranscripts();
      const patients = getLocalPatients();

      return records.map(e => {
        const matchingTranscript = transcripts.find(t => t.id === e.consultation_id);
        const matchingPatient = patients.find(p => p.patient_id === e.patient_id);

        const resolvedName = e.patient_name || (matchingPatient ? `${matchingPatient.first_name} ${matchingPatient.last_name}` : undefined);
        const resolvedAge = e.age !== undefined && e.age !== null ? e.age : (matchingPatient ? matchingPatient.age : undefined);
        const resolvedGender = e.gender || (matchingPatient ? matchingPatient.gender : undefined);
        const resolvedHeight = e.height || (matchingPatient && matchingPatient.height_cm ? `${matchingPatient.height_cm} cm` : undefined);
        const resolvedWeight = e.weight || (matchingPatient && matchingPatient.weight_kg ? `${matchingPatient.weight_kg} kg` : undefined);
        const resolvedBloodGroup = e.blood_group || (matchingPatient ? matchingPatient.blood_group : undefined);

        return {
          emrId: e.emr_id,
          consultationId: e.consultation_id,
          patientId: e.patient_id,
          patientName: resolvedName,
          age: resolvedAge,
          gender: resolvedGender,
          height: resolvedHeight,
          weight: resolvedWeight,
          bloodGroup: resolvedBloodGroup,
          doctorId: e.doctor_id,
          visitDate: new Date(e.visit_date),
          chiefComplaint: e.chief_complaint,
          symptoms: e.symptoms,
          diagnosis: e.diagnosis,
          medications: e.medications,
          dosage: e.dosage,
          advice: e.advice,
          followUpDate: e.follow_up_date,
          status: e.status,
          createdAt: new Date(e.created_at),
          updatedAt: new Date(e.updated_at),
          rawTranscript: matchingTranscript ? matchingTranscript.raw_transcript : undefined
        };
      }).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
    }

    const query = `
      SELECT 
        e.emr_id as emrId,
        e.consultation_id as consultationId,
        e.patient_id as patientId,
        COALESCE(CONCAT(p.first_name, ' ', p.last_name), e.patient_id) as patientName,
        p.age as age,
        p.gender as gender,
        p.height_cm as height,
        p.weight_kg as weight,
        p.blood_group as bloodGroup,
        e.doctor_id as doctorId,
        e.visit_date as visitDate,
        e.chief_complaint as chiefComplaint,
        e.symptoms as symptoms,
        e.diagnosis as diagnosis,
        e.medications as medications,
        e.dosage as dosage,
        e.advice as advice,
        e.follow_up_date as followUpDate,
        e.status as status,
        e.created_at as createdAt,
        e.updated_at as updatedAt,
        t.raw_transcript as rawTranscript
      FROM electronic_medical_records e
      LEFT JOIN consultation_transcripts t ON e.consultation_id = t.id
      LEFT JOIN patients p ON e.patient_id = p.patient_id
      ORDER BY e.created_at DESC
    `;

    try {
      const [rows]: any = await pool.execute(query);
      return rows;
    } catch (err: any) {
      console.error("❌ [EMRModel] Error executing relational query to fetch EMRs:", err);
      throw err;
    }
  }
}
