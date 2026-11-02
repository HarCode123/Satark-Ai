import { Router } from "express";
import { TranscriptController } from "../controllers/TranscriptController.ts";

const router = Router();

// Save final raw transcripts from doctor-patient consultation sessions
router.post("/save", (req, res, next) => {
  TranscriptController.saveTranscript(req, res).catch(next);
});

// Fetch historical raw transcripts for EMR listings/audits
router.get("/", (req, res, next) => {
  TranscriptController.getTranscripts(req, res).catch(next);
});

export default router;
