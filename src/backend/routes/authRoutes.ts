import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Public Auth Endpoints
router.post("/login", (req, res, next) => {
  AuthController.login(req, res).catch(next);
});

router.post("/register", (req, res, next) => {
  AuthController.register(req, res).catch(next);
});

router.post("/refresh", (req, res, next) => {
  AuthController.refresh(req, res).catch(next);
});

router.post("/logout", (req, res, next) => {
  AuthController.logout(req, res).catch(next);
});

// Protected Profile Endpoint
router.get("/me", authenticateToken, (req, res, next) => {
  AuthController.me(req, res).catch(next);
});

export default router;
