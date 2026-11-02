import { Request, Response } from "express";
import { TranscriptModel } from "../models/TranscriptModel.ts";
import { EMRModel } from "../models/EMRModel.ts";
import { PrescriptionService } from "../services/PrescriptionService.ts";

export class TranscriptController {
  /**
   * Saves a finalized transcript to the database exactly as generated,
   * then automatically runs the medical AI pipeline to extract a structured EMR,
   * inserting the resulting EMR row linked via consultationId.
   * POST /api/transcripts/save
   */
  static async saveTranscript(req: Request, res: Response): Promise<void> {
    try {
      const { doctorId, patientId, transcript } = req.body;

      // 1. Validate Input Params
      if (!doctorId || typeof doctorId !== "string" || doctorId.trim() === "") {
        res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "A valid 'doctorId' is required."
        });
        return;
      }

      if (!patientId || typeof patientId !== "string" || patientId.trim() === "") {
        res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "A valid 'patientId' is required."
        });
        return;
      }

      if (!transcript || typeof transcript !== "string" || transcript.trim() === "") {
        res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "A non-empty 'transcript' text is required to save."
        });
        return;
      }

      console.log(`📥 [TranscriptController] Received save request for Patient: ${patientId}, Doctor: ${doctorId}`);

      // 2. Insert raw transcript into database using our model (exact match, no formatting or AI changes)
      const transcriptRecord = await TranscriptModel.create(
        doctorId.trim(),
        patientId.trim(),
        transcript.trim()
      );

      const consultationId = transcriptRecord.id;
      if (!consultationId) {
        throw new Error("Failed to retrieve a valid consultationId from the transcript record.");
      }

      console.log(`🧠 [TranscriptController] Saved transcript under Consultation ID: ${consultationId}. Triggering clinical EMR extraction...`);

      // 3. Generate structured EMR from the raw dialogue transcript
      const structuredEMR = await PrescriptionService.generateEMR(transcript.trim());

      // 4. Save EMR to database, referencing the consultation transcript ID
      const emrRecord = await EMRModel.create(
        consultationId,
        patientId.trim(),
        doctorId.trim(),
        structuredEMR.chiefComplaint,
        structuredEMR.symptoms,
        structuredEMR.diagnosis,
        structuredEMR.medications,
        structuredEMR.dosage,
        structuredEMR.advice,
        structuredEMR.followUp,
        "Completed"
      );

      console.log(`✅ [TranscriptController] Relational EMR Record successfully saved with EMR ID: ${emrRecord.emrId}`);

      // 5. Return success response with both elements
      res.status(201).json({
        success: true,
        message: "Transcript saved and structured EMR generated/persisted successfully.",
        data: {
          transcript: transcriptRecord,
          emr: emrRecord
        }
      });
      
    } catch (err: any) {
      console.error("❌ [TranscriptController] Error saving transcript or structuring EMR:", err);
      
      // Handle database or backend errors gracefully
      res.status(500).json({
        success: false,
        error: "Database / Server Error",
        message: "An internal server error occurred while writing EMR data to the database.",
        details: process.env.NODE_ENV !== "production" ? err.message : undefined
      });
    }
  }

  /**
   * Optional/Extended API to list saved transcripts.
   * GET /api/transcripts
   */
  static async getTranscripts(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      let targetPatientId: string | undefined;

      if (user && user.role === "patient") {
        targetPatientId = user.patientId || "PID-2026-001";
      } else if (req.query.patientId && typeof req.query.patientId === "string") {
        targetPatientId = req.query.patientId;
      }

      let records = await TranscriptModel.findAll();
      if (targetPatientId) {
        records = records.filter(r => r.patientId === targetPatientId);
      }

      res.status(200).json({
        success: true,
        data: records
      });
    } catch (err: any) {
      console.error("❌ [TranscriptController] Error fetching transcripts:", err);
      res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to retrieve transcripts from database."
      });
    }
  }
}
