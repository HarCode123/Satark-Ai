import { Router } from "express";
import { EMRController } from "../controllers/EMRController.ts";

const router = Router();

// GET /api/emr - retrieve all structured clinical medical records
router.get("/", (req, res, next) => {
  EMRController.getAllEMR(req, res).catch(next);
});

// POST /api/emr/generate - process consultation transcript into digital prescription
router.post("/generate", (req, res, next) => {
  EMRController.generatePrescription(req, res).catch(next);
});

// POST /api/emr - manually create/test EMR records
router.post("/", (req, res, next) => {
  EMRController.createEMR(req, res).catch(next);
});

export default router;
