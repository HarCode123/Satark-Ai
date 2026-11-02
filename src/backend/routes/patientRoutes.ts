import { Router } from "express";
import { PatientController } from "../controllers/PatientController.ts";

const router = Router();

// GET /api/patients - retrieve all registered clinical patients
router.get("/", (req, res, next) => {
  PatientController.getAllPatients(req, res).catch(next);
});

// GET /api/patients/:id - retrieve a single patient's complete file by ID
router.get("/:id", (req, res, next) => {
  PatientController.getPatientById(req, res).catch(next);
});

// POST /api/patients - register a new patient in the system
router.post("/", (req, res, next) => {
  PatientController.createPatient(req, res).catch(next);
});

// POST /api/patients/register - alias for registering/upserting patient
router.post("/register", (req, res, next) => {
  PatientController.createPatient(req, res).catch(next);
});

// PUT /api/patients/:id - update an existing patient in the database
router.put("/:id", (req, res, next) => {
  PatientController.updatePatient(req, res).catch(next);
});

export default router;
