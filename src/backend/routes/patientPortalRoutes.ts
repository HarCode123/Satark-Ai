import { Router, Request, Response } from "express";
import { PatientDataStore } from "../../services/patientStore.ts";
import { PatientModel } from "../models/PatientModel.ts";
import { PrescriptionModel } from "../models/PrescriptionModel.ts";
import { AppointmentModel } from "../models/AppointmentModel.ts";
import { MonitoringModel } from "../models/MonitoringModel.ts";
import { optionalAuthenticateToken } from "../middleware/authMiddleware.ts";

const router = Router();
router.use(optionalAuthenticateToken);

// Helper to sanitize error messages in production
function getSafeErrorMessage(err: any, defaultMsg: string = "An error occurred while processing the request."): string {
  if (process.env.NODE_ENV === "production") {
    return defaultMsg;
  }
  return err?.message || defaultMsg;
}

// Helper to determine target patient ID
function getTargetPatientId(req: Request): string {
  const q = typeof req.query.patientId === 'string' ? req.query.patientId.trim() : undefined;
  const b = typeof req.body?.patientId === 'string' ? req.body.patientId.trim() : undefined;
  const u = req.user?.patientId ? req.user.patientId.trim() : undefined;
  return q || b || u || "PID-2026-001";
}

// GET /api/patient/profile
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const targetPatientId = getTargetPatientId(req);
    const dbPatient = await PatientModel.findById(targetPatientId);
    if (dbPatient) {
      const hStr = dbPatient.heightCm ? `${dbPatient.heightCm} cm` : '175 cm';
      const wStr = dbPatient.weightKg ? `${dbPatient.weightKg} kg` : '74 kg';
      const hNum = dbPatient.heightCm || 175;
      const wNum = dbPatient.weightKg || 74;
      const bmiVal = (wNum / Math.pow(hNum / 100, 2)).toFixed(1);

      return res.status(200).json({
        success: true,
        data: {
          patientId: dbPatient.patientId,
          name: `${dbPatient.firstName} ${dbPatient.lastName}`.trim(),
          age: String(dbPatient.age),
          gender: dbPatient.gender,
          bloodGroup: dbPatient.bloodGroup || 'B+',
          phone: dbPatient.phoneNumber,
          email: dbPatient.email || '',
          emergencyContact: `${dbPatient.phoneNumber} (Primary Contact)`,
          address: dbPatient.address || 'King Fahd Road, Riyadh, Saudi Arabia',
          medicalConditions: 'Active Clinical Patient Account',
          allergies: dbPatient.allergies || 'No known drug allergies',
          height: hStr,
          weight: wStr,
          bmi: `${bmiVal} (Normal)`
        }
      });
    }

    const profile = PatientDataStore.getProfile();
    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        patientId: targetPatientId || profile.patientId
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve profile.") });
  }
});

// GET /api/patient/history
router.get("/history", (req: Request, res: Response) => {
  try {
    const targetPatientId = getTargetPatientId(req);
    const prescriptions = PatientDataStore.getPrescriptions(targetPatientId);
    const timeline = PatientDataStore.getMedicalHistoryTimeline();
    return res.status(200).json({
      success: true,
      data: {
        prescriptions,
        timeline
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve medical history.") });
  }
});

// GET /api/patient/prescriptions
router.get("/prescriptions", async (req: Request, res: Response) => {
  try {
    const targetPatientId = getTargetPatientId(req);
    let records = await PrescriptionModel.findByPatientId(targetPatientId, false);

    // If no records in database for this patient, check client local store
    if (records.length === 0) {
      const storeRx = PatientDataStore.getPrescriptions(targetPatientId);
      if (storeRx.length > 0) {
        return res.status(200).json({ success: true, count: storeRx.length, data: storeRx });
      }
    }

    // Format for patient frontend view
    const formatted = records.map(r => {
      const full: any = r.fullPrescription || {};
      return {
        ...full,
        prescriptionId: r.prescriptionId,
        id: r.prescriptionId,
        status: r.status,
        patientDetails: {
          ...(full.patientDetails || {}),
          patientId: r.patientId,
          consultingDoctor: r.doctorName || full.patientDetails?.consultingDoctor || "Dr. Harini, MD",
          date: r.visitDate || full.patientDetails?.date
        },
        provisionalDiagnosis: r.provisionalDiagnosis || full.provisionalDiagnosis || "Prescription Protocol",
        medications: r.medications || full.medications || [],
        lifestyleDietAdvice: r.dietAdvice || full.lifestyleDietAdvice || "",
        followUp: r.followUp || full.followUp || "",
        doctorsNotes: r.doctorsNotes || full.doctorsNotes || ""
      };
    });

    return res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (err: any) {
    console.error("❌ [PatientPortal] Error retrieving prescriptions:", err);
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve prescriptions.") });
  }
});

// GET /api/patient/appointments
router.get("/appointments", async (req: Request, res: Response) => {
  try {
    const patientId = getTargetPatientId(req);
    const list = await AppointmentModel.findByPatientId(patientId);
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    console.error("❌ [PatientPortal] Error retrieving appointments:", err);
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve appointments.") });
  }
});

// POST /api/patient/appointments - Persist new appointment to MySQL with date validation
router.post("/appointments", async (req: Request, res: Response) => {
  try {
    const { doctorName, department, hospital, date, time, notes, patientId } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "Appointment date and time are required."
      });
    }

    // Validate that appointment date is not in the past
    const todayStr = new Date().toISOString().split("T")[0];
    if (date < todayStr) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DATE",
        message: "Appointment date cannot be in the past."
      });
    }

    const targetPatientId = patientId || "PID-2026-001";

    const newApt = await AppointmentModel.createAppointment({
      patientId: targetPatientId,
      doctorName: doctorName || "Dr. Harini, MD",
      department: department || "Internal Medicine",
      hospital: hospital || "Satark Clinical Medical Center",
      date,
      time,
      status: "Confirmed",
      notes: notes || "Requested via Patient Portal Online Scheduling."
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked and persisted successfully.",
      data: newApt
    });
  } catch (err: any) {
    console.error("❌ [PatientPortal] Error booking appointment:", err);
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to book appointment.") });
  }
});

// GET /api/patient/upcoming-appointment
router.get("/upcoming-appointment", async (req: Request, res: Response) => {
  try {
    const targetPatientId = getTargetPatientId(req);
    const appointments = await AppointmentModel.findByPatientId(targetPatientId);
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Find earliest confirmed/pending appointment on or after today
    const upcoming = appointments
      .filter(a => (a.status === "Confirmed" || a.status === "Pending") && a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || appointments[0] || null;

    return res.status(200).json({ success: true, data: upcoming });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve upcoming appointment.") });
  }
});

// GET /api/patient/doctor
router.get("/doctor", (req: Request, res: Response) => {
  try {
    const targetPatientId = getTargetPatientId(req);
    const prescriptions = PatientDataStore.getPrescriptions(targetPatientId);
    const doctors = PatientDataStore.getDoctorsConsulted();
    const primaryDoctor = doctors[0] || {
      doctorName: "Dr. Harini, MD",
      department: "Internal Medicine",
      visitCount: prescriptions.length,
      lastVisitDate: prescriptions[0]?.patientDetails?.date || "No prior visits"
    };
    return res.status(200).json({ success: true, data: primaryDoctor });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve doctor information.") });
  }
});

// GET /api/patient/notifications
router.get("/notifications", (req: Request, res: Response) => {
  try {
    const notifications = PatientDataStore.getNotifications();
    return res.status(200).json({ success: true, data: notifications });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve notifications.") });
  }
});

// GET /api/patient/prescription/:id
router.get("/prescription/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prescription = await PrescriptionModel.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription record not found." });
    }

    const full: any = prescription.fullPrescription || {};
    const formatted = {
      ...full,
      prescriptionId: prescription.prescriptionId,
      id: prescription.prescriptionId,
      status: prescription.status,
      patientDetails: {
        ...(full.patientDetails || {}),
        patientId: prescription.patientId,
        consultingDoctor: prescription.doctorName || full.patientDetails?.consultingDoctor || "Dr. Harini, MD",
        date: prescription.visitDate || full.patientDetails?.date
      },
      provisionalDiagnosis: prescription.provisionalDiagnosis || full.provisionalDiagnosis || "Prescription Protocol",
      medications: prescription.medications || full.medications || [],
      lifestyleDietAdvice: prescription.dietAdvice || full.lifestyleDietAdvice || "",
      followUp: prescription.followUp || full.followUp || "",
      doctorsNotes: prescription.doctorsNotes || full.doctorsNotes || ""
    };

    return res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve prescription.") });
  }
});

// --- Monitoring & Health Logs Endpoints ---

// GET /api/patient/monitoring-plans
router.get("/monitoring-plans", async (req: Request, res: Response) => {
  try {
    const targetPatientId = getTargetPatientId(req);
    const plans = await MonitoringModel.getPlansByPatientId(targetPatientId);
    return res.status(200).json({ success: true, data: plans });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve monitoring plans.") });
  }
});

// POST /api/patient/monitoring-plans
router.post("/monitoring-plans", async (req: Request, res: Response) => {
  try {
    const plan = req.body;
    if (!plan || !plan.id) {
      return res.status(400).json({ success: false, message: "Valid monitoring plan object is required." });
    }
    if (!plan.patientId) {
      plan.patientId = getTargetPatientId(req);
    }
    await MonitoringModel.savePlan(plan);
    return res.status(200).json({ success: true, message: "Monitoring plan persisted successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to save monitoring plan.") });
  }
});

// GET /api/patient/health-logs
router.get("/health-logs", async (req: Request, res: Response) => {
  try {
    const targetPatientId = getTargetPatientId(req);
    const logs = await MonitoringModel.getHealthLogsByPatientId(targetPatientId);
    return res.status(200).json({ success: true, data: logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve health logs.") });
  }
});

// POST /api/patient/health-logs
router.post("/health-logs", async (req: Request, res: Response) => {
  try {
    const log = req.body;
    if (!log || !log.id) {
      return res.status(400).json({ success: false, message: "Valid health log object is required." });
    }
    if (!log.patientId) {
      log.patientId = getTargetPatientId(req);
    }
    await MonitoringModel.saveHealthLog(log);
    return res.status(201).json({ success: true, message: "Health log persisted successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to save health log.") });
  }
});

// GET /api/patient/medication-adherence
router.get("/medication-adherence", async (req: Request, res: Response) => {
  try {
    const targetPatientId = getTargetPatientId(req);
    const records = await MonitoringModel.getAdherenceByPatientId(targetPatientId);
    return res.status(200).json({ success: true, data: records });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to retrieve medication adherence.") });
  }
});

// POST /api/patient/medication-adherence
router.post("/medication-adherence", async (req: Request, res: Response) => {
  try {
    const record = req.body;
    if (!record || !record.id) {
      return res.status(400).json({ success: false, message: "Valid adherence record is required." });
    }
    if (!record.patientId) {
      record.patientId = getTargetPatientId(req);
    }
    await MonitoringModel.recordAdherence(record);
    return res.status(200).json({ success: true, message: "Medication adherence logged successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: getSafeErrorMessage(err, "Failed to record medication adherence.") });
  }
});

export default router;
