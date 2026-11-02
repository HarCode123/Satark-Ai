import { getDatabaseConnection, isUsingLocalFallback, saveLocalPatient, getLocalPatients } from "../db/mysql.ts";

export interface PatientRecord {
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  heightCm?: number;
  weightKg?: number;
  phoneNumber: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PatientModel {
  /**
   * Generates a unique patient ID (format: PID-YYYY-NNN)
   */
  static async generateUniqueId(): Promise<string> {
    const isFallback = isUsingLocalFallback();
    let currentPatients: any[] = [];

    if (isFallback) {
      currentPatients = getLocalPatients();
    } else {
      const pool = await getDatabaseConnection();
      if (pool) {
        const [rows] = await pool.query("SELECT patient_id as patientId FROM patients");
        currentPatients = rows as any[];
      } else {
        currentPatients = getLocalPatients();
      }
    }

    const year = new Date().getFullYear();
    const prefix = `PID-${year}-`;
    
    // Find all patients with the current year prefix and find the max serial
    const serials = currentPatients
      .map(p => {
        const pid = p.patientId || p.patient_id || "";
        if (pid.startsWith(prefix)) {
          const serialStr = pid.replace(prefix, "");
          const serialNum = parseInt(serialStr, 10);
          return isNaN(serialNum) ? 0 : serialNum;
        }
        return 0;
      });

    const maxSerial = serials.length > 0 ? Math.max(...serials) : 0;
    const nextSerial = maxSerial + 1;
    // Pad next serial to 3 digits (e.g., 001, 042, 108)
    const paddedSerial = String(nextSerial).padStart(3, "0");
    
    return `${prefix}${paddedSerial}`;
  }

  /**
   * Create or update a Patient in DB (Upsert)
   */
  static async create(
    firstName: string,
    lastName: string,
    age: number,
    gender: 'Male' | 'Female' | 'Other',
    heightCm: number | undefined,
    weightKg: number | undefined,
    phoneNumber: string,
    email: string | undefined,
    address: string | undefined,
    bloodGroup: string | undefined,
    allergies: string | undefined,
    customPatientId?: string
  ): Promise<PatientRecord> {
    const patientId = customPatientId || await this.generateUniqueId();
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const localRecord = saveLocalPatient(
        patientId,
        firstName,
        lastName,
        age,
        gender,
        heightCm,
        weightKg,
        phoneNumber,
        email,
        address,
        bloodGroup,
        allergies
      );
      return {
        patientId: localRecord.patient_id,
        firstName: localRecord.first_name,
        lastName: localRecord.last_name,
        age: localRecord.age,
        gender: localRecord.gender as any,
        heightCm: localRecord.height_cm,
        weightKg: localRecord.weight_kg,
        phoneNumber: localRecord.phone_number,
        email: localRecord.email,
        address: localRecord.address,
        bloodGroup: localRecord.blood_group,
        allergies: localRecord.allergies,
        createdAt: new Date(localRecord.created_at),
        updatedAt: new Date(localRecord.updated_at)
      };
    }

    const query = `
      INSERT INTO patients (patient_id, first_name, last_name, age, gender, height_cm, weight_kg, phone_number, email, address, blood_group, allergies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        age = VALUES(age),
        gender = VALUES(gender),
        height_cm = COALESCE(VALUES(height_cm), height_cm),
        weight_kg = COALESCE(VALUES(weight_kg), weight_kg),
        phone_number = VALUES(phone_number),
        email = COALESCE(VALUES(email), email),
        address = COALESCE(VALUES(address), address),
        blood_group = COALESCE(VALUES(blood_group), blood_group),
        allergies = COALESCE(VALUES(allergies), allergies),
        updated_at = CURRENT_TIMESTAMP
    `;
    const params = [
      patientId,
      firstName,
      lastName,
      age,
      gender,
      heightCm !== undefined ? heightCm : null,
      weightKg !== undefined ? weightKg : null,
      phoneNumber,
      email !== undefined ? email : null,
      address !== undefined ? address : null,
      bloodGroup !== undefined ? bloodGroup : null,
      allergies !== undefined ? allergies : null
    ];

    await pool.query(query, params);
    console.log(`💾 [Database] Successfully upserted patient in MySQL: ${patientId}`);

    return {
      patientId,
      firstName,
      lastName,
      age,
      gender,
      heightCm,
      weightKg,
      phoneNumber,
      email,
      address,
      bloodGroup,
      allergies,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Updates an existing patient record in MySQL / Local Fallback DB
   */
  static async update(
    patientId: string,
    updates: Partial<Omit<PatientRecord, 'patientId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PatientRecord | null> {
    const existing = await this.findById(patientId);
    if (!existing) return null;

    const updatedFirstName = updates.firstName ?? existing.firstName;
    const updatedLastName = updates.lastName ?? existing.lastName;
    const updatedAge = updates.age ?? existing.age;
    const updatedGender = updates.gender ?? existing.gender;
    const updatedHeight = updates.heightCm !== undefined ? updates.heightCm : existing.heightCm;
    const updatedWeight = updates.weightKg !== undefined ? updates.weightKg : existing.weightKg;
    const updatedPhone = updates.phoneNumber ?? existing.phoneNumber;
    const updatedEmail = updates.email !== undefined ? updates.email : existing.email;
    const updatedAddress = updates.address !== undefined ? updates.address : existing.address;
    const updatedBloodGroup = updates.bloodGroup !== undefined ? updates.bloodGroup : existing.bloodGroup;
    const updatedAllergies = updates.allergies !== undefined ? updates.allergies : existing.allergies;

    return await this.create(
      updatedFirstName,
      updatedLastName,
      updatedAge,
      updatedGender,
      updatedHeight,
      updatedWeight,
      updatedPhone,
      updatedEmail,
      updatedAddress,
      updatedBloodGroup,
      updatedAllergies,
      patientId
    );
  }

  /**
   * Find all registered patients
   */
  static async findAll(): Promise<PatientRecord[]> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const localRecords = getLocalPatients();
      return localRecords.map(r => ({
        patientId: r.patient_id,
        firstName: r.first_name,
        lastName: r.last_name,
        age: r.age,
        gender: r.gender as any,
        heightCm: r.height_cm,
        weightKg: r.weight_kg,
        phoneNumber: r.phone_number,
        email: r.email,
        address: r.address,
        bloodGroup: r.blood_group,
        allergies: r.allergies,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at)
      })).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
    }

    const query = `
      SELECT 
        patient_id as patientId,
        first_name as firstName,
        last_name as lastName,
        age,
        gender,
        height_cm as heightCm,
        weight_kg as weightKg,
        phone_number as phoneNumber,
        email,
        address,
        blood_group as bloodGroup,
        allergies,
        created_at as createdAt,
        updated_at as updatedAt
      FROM patients
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.query(query);
    return (rows as any[]).map(r => ({
      patientId: r.patientId,
      firstName: r.firstName,
      lastName: r.lastName,
      age: r.age,
      gender: r.gender,
      heightCm: r.heightCm !== null && r.heightCm !== undefined ? parseFloat(r.heightCm) : undefined,
      weightKg: r.weightKg !== null && r.weightKg !== undefined ? parseFloat(r.weightKg) : undefined,
      phoneNumber: r.phoneNumber,
      email: r.email || undefined,
      address: r.address || undefined,
      bloodGroup: r.bloodGroup || undefined,
      allergies: r.allergies || undefined,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt)
    }));
  }

  /**
   * Find patient by unique patientId
   */
  static async findById(patientId: string): Promise<PatientRecord | null> {
    const pool = await getDatabaseConnection();
    const isFallback = !pool || isUsingLocalFallback();

    if (isFallback) {
      const records = getLocalPatients();
      const match = records.find(r => r.patient_id === patientId);
      if (!match) return null;
      return {
        patientId: match.patient_id,
        firstName: match.first_name,
        lastName: match.last_name,
        age: match.age,
        gender: match.gender as any,
        heightCm: match.height_cm,
        weightKg: match.weight_kg,
        phoneNumber: match.phone_number,
        email: match.email,
        address: match.address,
        bloodGroup: match.blood_group,
        allergies: match.allergies,
        createdAt: new Date(match.created_at),
        updatedAt: new Date(match.updated_at)
      };
    }

    const query = `
      SELECT 
        patient_id as patientId,
        first_name as firstName,
        last_name as lastName,
        age,
        gender,
        height_cm as heightCm,
        weight_kg as weightKg,
        phone_number as phoneNumber,
        email,
        address,
        blood_group as bloodGroup,
        allergies,
        created_at as createdAt,
        updated_at as updatedAt
      FROM patients
      WHERE patient_id = ?
    `;

    const [rows] = await pool.query(query, [patientId]);
    const list = rows as any[];
    if (list.length === 0) return null;
    const r = list[0];
    return {
      patientId: r.patientId,
      firstName: r.firstName,
      lastName: r.lastName,
      age: r.age,
      gender: r.gender,
      heightCm: r.heightCm !== null && r.heightCm !== undefined ? parseFloat(r.heightCm) : undefined,
      weightKg: r.weightKg !== null && r.weightKg !== undefined ? parseFloat(r.weightKg) : undefined,
      phoneNumber: r.phoneNumber,
      email: r.email || undefined,
      address: r.address || undefined,
      bloodGroup: r.bloodGroup || undefined,
      allergies: r.allergies || undefined,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt)
    };
  }
}
