import { Request, Response } from "express";
import { PrescriptionModel } from "../models/PrescriptionModel.ts";
import { PatientModel } from "../models/PatientModel.ts";

export class PrescriptionController {
  /**
   * POST /api/prescriptions/draft
   * Save or update an unapproved draft prescription (Doctor/Clinic mode)
   */
  static async saveDraft(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (user && user.role === 'patient') {
        res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Patients cannot create or update prescription drafts."
        });
        return;
      }

      const { prescriptionId, patientId, fullPrescription } = req.body;

      if (!patientId || !fullPrescription) {
        res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Fields 'patientId' and 'fullPrescription' are required."
        });
        return;
      }

      // Verify patient exists
      const patient = await PatientModel.findById(patientId);
      if (!patient) {
        console.warn(`⚠️ [PrescriptionController] Patient ${patientId} not found during draft save.`);
      }

      const saved = await PrescriptionModel.createOrUpdate({
        prescriptionId,
        patientId,
        doctorId: user?.email || user?.userId || "doctor@satark.ai",
        doctorName: user?.name || "Dr. Harini, MD",
        visitDate: fullPrescription?.patientDetails?.date || new Date().toISOString().split("T")[0],
        provisionalDiagnosis: fullPrescription?.provisionalDiagnosis || "",
        medications: fullPrescription?.medications || [],
        dietAdvice: fullPrescription?.lifestyleDietAdvice || "",
        followUp: fullPrescription?.followUp || "",
        doctorsNotes: fullPrescription?.doctorsNotes || "",
        fullPrescription,
        status: 'draft'
      });

      console.log(`📝 [PrescriptionController] Draft prescription saved: ${saved.prescriptionId} for patient ${patientId}`);

      res.status(200).json({
        success: true,
        message: "Prescription draft saved successfully. It is not yet available to the patient.",
        data: saved
      });
    } catch (err: any) {
      console.error("❌ [PrescriptionController] Error saving draft prescription:", err);
      res.status(500).json({
        success: false,
        error: "Server Error",
        message: process.env.NODE_ENV === "production" ? "Failed to save prescription draft." : (err?.message || "Failed to save prescription draft.")
      });
    }
  }

  /**
   * POST /api/prescriptions/approve
   * Doctor approves and publishes prescription, making it visible to the patient
   */
  static async approveAndPublish(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (user && user.role === 'patient') {
        res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Patients are not authorized to approve prescriptions."
        });
        return;
      }

      const { prescriptionId, patientId, fullPrescription } = req.body;

      if (!patientId || (!prescriptionId && !fullPrescription)) {
        res.status(400).json({
          success: false,
          error: "Validation Error",
          message: "Fields 'patientId' and either 'prescriptionId' or 'fullPrescription' are required."
        });
        return;
      }

      let targetId = prescriptionId;

      // If full prescription is supplied, upsert first to guarantee up-to-date data
      if (fullPrescription) {
        const upserted = await PrescriptionModel.createOrUpdate({
          prescriptionId: targetId,
          patientId,
          doctorId: user?.email || user?.userId || "doctor@satark.ai",
          doctorName: user?.name || "Dr. Harini, MD",
          visitDate: fullPrescription?.patientDetails?.date || new Date().toISOString().split("T")[0],
          provisionalDiagnosis: fullPrescription?.provisionalDiagnosis || "",
          medications: fullPrescription?.medications || [],
          dietAdvice: fullPrescription?.lifestyleDietAdvice || "",
          followUp: fullPrescription?.followUp || "",
          doctorsNotes: fullPrescription?.doctorsNotes || "",
          fullPrescription,
          status: 'approved'
        });
        targetId = upserted.prescriptionId;
      }

      // Explicitly transition status to approved
      const approved = await PrescriptionModel.approve(targetId, user?.userId || user?.email || "doctor@satark.ai");

      if (!approved) {
        res.status(404).json({
          success: false,
          error: "Not Found",
          message: "Prescription could not be found to approve."
        });
        return;
      }

      console.log(`✅ [PrescriptionController] Prescription APPROVED & PUBLISHED: ${approved.prescriptionId} for patient ${patientId}`);

      res.status(200).json({
        success: true,
        message: "Prescription successfully approved and published to the Patient Portal.",
        data: approved
      });
    } catch (err: any) {
      console.error("❌ [PrescriptionController] Error approving prescription:", err);
      res.status(500).json({
        success: false,
        error: "Server Error",
        message: process.env.NODE_ENV === "production" ? "Failed to approve prescription." : (err?.message || "Failed to approve prescription.")
      });
    }
  }

  /**
   * GET /api/prescriptions
   * Get all prescriptions (Doctor view: includes drafts and approved)
   */
  static async getDoctorPrescriptions(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (user && user.role === 'patient') {
        res.status(403).json({
          success: false,
          error: "Forbidden",
          message: "Patients cannot view doctor prescription registry."
        });
        return;
      }

      const prescriptions = await PrescriptionModel.findAll();

      res.status(200).json({
        success: true,
        count: prescriptions.length,
        data: prescriptions
      });
    } catch (err: any) {
      console.error("❌ [PrescriptionController] Error fetching doctor prescriptions:", err);
      res.status(500).json({
        success: false,
        error: "Server Error",
        message: process.env.NODE_ENV === "production" ? "Failed to retrieve prescriptions." : (err?.message || "Failed to retrieve prescriptions.")
      });
    }
  }

  /**
   * GET /api/prescriptions/:id
   * Get specific prescription with strict patient authorization
   */
  static async getPrescriptionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;

      if (!id) {
        res.status(400).json({ success: false, message: "Prescription ID is required." });
        return;
      }

      const prescription = await PrescriptionModel.findById(id);
      if (!prescription) {
        res.status(404).json({ success: false, message: "Prescription record not found." });
        return;
      }

      // Security Check: If requester is a patient, they can ONLY view their own APPROVED prescription
      if (user && user.role === 'patient') {
        if (prescription.patientId !== user.patientId) {
          res.status(403).json({
            success: false,
            error: "Forbidden",
            message: "You are not authorized to view another patient's prescription record."
          });
          return;
        }

        if (prescription.status !== 'approved') {
          res.status(404).json({
            success: false,
            message: "Prescription is currently under clinical review and not yet approved by the doctor."
          });
          return;
        }
      }

      res.status(200).json({
        success: true,
        data: prescription
      });
    } catch (err: any) {
      console.error("❌ [PrescriptionController] Error fetching prescription by ID:", err);
      res.status(500).json({
        success: false,
        error: "Server Error",
        message: process.env.NODE_ENV === "production" ? "Failed to retrieve prescription." : (err?.message || "Failed to retrieve prescription.")
      });
    }
  }
}
