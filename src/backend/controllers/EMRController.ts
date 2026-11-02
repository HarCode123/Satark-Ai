import { Request, Response } from "express";
import { EMRModel } from "../models/EMRModel.ts";
import { PrescriptionService } from "../services/PrescriptionService.ts";

export class EMRController {
  /**
   * Retrieves all structured Electronic Medical Records from the database.
   * GET /api/emr
   */
  static async getAllEMR(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      let targetPatientId: string | undefined;

      if (user && user.role === "patient") {
        targetPatientId = user.patientId || "PID-2026-001";
      } else if (req.query.patientId && typeof req.query.patientId === "string") {
        targetPatientId = req.query.patientId;
      }

      let records = await EMRModel.findAll();
      if (targetPatientId) {
        records = records.filter(r => r.patientId === targetPatientId);
      }
      
      res.status(200).json({
        success: true,
        count: records.length,
        data: records
      });
    } catch (err: any) {
      console.error("❌ [EMRController] Error fetching EMR records:", err);
      res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to retrieve Electronic Medical Records from the database.",
        details: process.env.NODE_ENV !== "production" ? err.message : undefined
      });
    }
  }

  /**
   * Generates a complete digital clinical prescription from patient details & consultation transcript.
   * POST /api/emr/generate
   */
  static async generatePrescription(req: Request, res: Response): Promise<void> {
    try {
      const { patientInfo, transcript } = req.body;

      if (!transcript || typeof transcript !== "string") {
        res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "A valid consultation transcript text is required."
        });
        return;
      }

      console.log("🩺 [EMRController] Generating clinical prescription for patient ID:", patientInfo?.patientId || "Unspecified");

      const prescription = await PrescriptionService.generateClinicalPrescription(
        patientInfo || {},
        transcript
      );

      res.status(200).json({
        success: true,
        message: "Clinical prescription generated successfully.",
        data: prescription
      });
    } catch (err: any) {
      console.error("❌ [EMRController] Error generating prescription:", err);
      res.status(500).json({
        success: false,
        error: "Generation Error",
        message: "Failed to process consultation transcript into clinical prescription.",
        details: err.message
      });
    }
  }

  /**
   * Manual creation of an EMR record in database
   * POST /api/emr
   */
  static async createEMR(req: Request, res: Response): Promise<void> {
    try {
      const {
        consultationId,
        patientId,
        patientName,
        age,
        gender,
        height,
        weight,
        bloodGroup,
        doctorId,
        chiefComplaint,
        symptoms,
        diagnosis,
        medications,
        dosage,
        advice,
        followUpDate,
        status
      } = req.body;

      if (!consultationId || !patientId || !doctorId) {
        res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Fields 'consultationId', 'patientId', and 'doctorId' are required."
        });
        return;
      }

      const record = await EMRModel.create(
        parseInt(consultationId, 10),
        patientId,
        doctorId,
        chiefComplaint || "",
        symptoms || "",
        diagnosis || "",
        medications || "",
        dosage || "",
        advice || "",
        followUpDate || "",
        status || "Completed",
        patientName,
        age,
        gender,
        height,
        weight,
        bloodGroup
      );

      res.status(201).json({
        success: true,
        message: "EMR record created manually.",
        data: record
      });
    } catch (err: any) {
      console.error("❌ [EMRController] Error manual-creating EMR:", err);
      res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to save EMR record manually."
      });
    }
  }
}
