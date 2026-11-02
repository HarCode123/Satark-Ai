import { Router } from "express";
import { PrescriptionController } from "../controllers/PrescriptionController.ts";
import { optionalAuthenticateToken } from "../middleware/authMiddleware.ts";

const router = Router();

// POST /api/prescriptions/draft - Save/update unapproved draft
router.post("/draft", optionalAuthenticateToken, (req, res, next) => {
  PrescriptionController.saveDraft(req, res).catch(next);
});

// POST /api/prescriptions/approve - Authorize and publish prescription to Patient Portal
router.post("/approve", optionalAuthenticateToken, (req, res, next) => {
  PrescriptionController.approveAndPublish(req, res).catch(next);
});

// GET /api/prescriptions - List all prescriptions
router.get("/", optionalAuthenticateToken, (req, res, next) => {
  PrescriptionController.getDoctorPrescriptions(req, res).catch(next);
});

// GET /api/prescriptions/:id - Retrieve specific prescription
router.get("/:id", optionalAuthenticateToken, (req, res, next) => {
  PrescriptionController.getPrescriptionById(req, res).catch(next);
});

export default router;
