import { Request, Response } from "express";
import { PatientModel } from "../models/PatientModel.ts";

export class PatientController {
  /**
   * Retrieves all registered patients.
   */
  static async getAllPatients(req: Request, res: Response) {
    try {
      console.log("🔌 [PatientController] Fetching all patients...");
      const patients = await PatientModel.findAll();
      return res.status(200).json({
        success: true,
        data: patients
      });
    } catch (err: any) {
      console.error("❌ [PatientController] Error getting patients:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to retrieve patients from database."
      });
    }
  }

  /**
   * Retrieves a single patient by ID.
   */
  static async getPatientById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Patient ID parameter is required."
        });
      }

      console.log(`🔌 [PatientController] Fetching patient details for ID: ${id}`);
      const patient = await PatientModel.findById(id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: `Patient with ID ${id} was not found.`
        });
      }

      return res.status(200).json({
        success: true,
        data: patient
      });
    } catch (err: any) {
      console.error(`❌ [PatientController] Error getting patient by ID ${req.params.id}:`, err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to retrieve patient details."
      });
    }
  }

  /**
   * Registers a new patient with rigorous validation.
   */
  static async createPatient(req: Request, res: Response) {
    try {
      const {
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
      } = req.body;

      console.log(`🔌 [PatientController] Registering/upserting patient ID: ${patientId || 'new'}`);

      // Validation
      if (!firstName || typeof firstName !== 'string' || !firstName.trim() || firstName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "First name is required and must be at least 2 characters."
        });
      }

      if (!lastName || typeof lastName !== 'string' || !lastName.trim() || lastName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Last name is required and must be at least 2 characters."
        });
      }

      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        return res.status(400).json({
          success: false,
          message: "Age must be a valid number between 1 and 120 years."
        });
      }

      if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone number is required."
        });
      }

      const trimmedEmail = email && typeof email === 'string' ? email.trim() : undefined;
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address."
        });
      }

      const validGenders = ["Male", "Female", "Other"];
      if (!gender || !validGenders.includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be either Male, Female, or Other."
        });
      }

      // Height validation (30 cm - 250 cm if provided)
      const parsedHeight = heightCm ? parseFloat(heightCm) : undefined;
      if (parsedHeight !== undefined && (isNaN(parsedHeight) || parsedHeight < 30 || parsedHeight > 250)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a realistic height between 30 cm and 250 cm."
        });
      }

      // Weight validation (2 kg - 350 kg if provided)
      const parsedWeight = weightKg ? parseFloat(weightKg) : undefined;
      if (parsedWeight !== undefined && (isNaN(parsedWeight) || parsedWeight < 2 || parsedWeight > 350)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a realistic weight between 2 kg and 350 kg."
        });
      }

      const createdPatient = await PatientModel.create(
        firstName.trim(),
        lastName.trim(),
        ageNum,
        gender as 'Male' | 'Female' | 'Other',
        isNaN(parsedHeight as number) ? undefined : parsedHeight,
        isNaN(parsedWeight as number) ? undefined : parsedWeight,
        phoneNumber.trim(),
        trimmedEmail,
        address ? address.trim() : undefined,
        bloodGroup ? bloodGroup.trim() : undefined,
        allergies ? allergies.trim() : undefined,
        patientId ? String(patientId).trim() : undefined
      );

      return res.status(201).json({
        success: true,
        message: "Patient registered successfully.",
        data: createdPatient
      });
    } catch (err: any) {
      console.error("❌ [PatientController] Error registering patient:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to register patient in database."
      });
    }
  }

  /**
   * Updates an existing patient in MySQL / Local DB
   */
  static async updatePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Patient ID parameter is required."
        });
      }

      console.log(`🔌 [PatientController] Updating patient with ID: ${id}`);
      const updated = await PatientModel.update(id, req.body);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: `Patient with ID ${id} was not found.`
        });
      }

      return res.status(200).json({
        success: true,
        message: "Patient updated successfully in database.",
        data: updated
      });
    } catch (err: any) {
      console.error(`❌ [PatientController] Error updating patient ${req.params.id}:`, err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to update patient in database."
      });
    }
  }
}
