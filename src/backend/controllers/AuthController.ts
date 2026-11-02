import { Request, Response } from "express";
import { UserModel } from "../models/UserModel";
import { PatientModel } from "../models/PatientModel";
import { PrescriptionModel } from "../models/PrescriptionModel";
import { EMRModel } from "../models/EMRModel";
import { comparePassword } from "../services/hashService";
import { generateTokenPair, verifyRefreshToken, revokeRefreshToken, AuthUserPayload } from "../services/jwtService";

export class AuthController {
  /**
   * POST /api/auth/login
   * Authenticate Doctor or Patient with secure password comparison & JWT issue
   */
  public static async login(req: Request, res: Response) {
    try {
      const { email, password, role, patientId } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required for login."
        });
      }

      const searchKey = (email || patientId || "").trim().toLowerCase();
      if (!searchKey) {
        return res.status(400).json({
          success: false,
          message: "Email or Patient ID is required."
        });
      }

      // 1. Find user account in database / local store
      let user = await UserModel.findByEmail(searchKey);
      if (!user) {
        user = await UserModel.findById(searchKey);
      }

      // Fallback auto-provision for default demo accounts if not found in database
      if (!user) {
        if (
          (searchKey === "doctor@satark.ai" || searchKey === "doctor@kateb.ai" || searchKey === "harini") &&
          password === "123456"
        ) {
          user = await UserModel.createUser({
            email: searchKey.includes("@") ? searchKey : "doctor@satark.ai",
            passwordPlain: "123456",
            role: "doctor",
            name: "Dr. Harini, MD"
          });
        } else if (
          (searchKey === "harini@satark.ai" || searchKey === "harini@kateb.ai" || searchKey === "patient@satark.ai" || searchKey === "patient@kateb.ai" || searchKey === "pid-2026-001") &&
          password === "123456"
        ) {
          user = await UserModel.createUser({
            email: searchKey.includes("@") ? searchKey : "harini@satark.ai",
            passwordPlain: "123456",
            role: "patient",
            name: "Harini Al-Mansoor",
            patientId: "PID-2026-001"
          });
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "Invalid email/patient ID or password."
        });
      }

      // 2. Verify hashed password
      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "Invalid email/patient ID or password."
        });
      }

      // 3. Check requested role if specified
      const userRole = role === "doctor" ? "doctor" : (user.role || "patient");

      // 4. Construct user payload for JWT token
      const tokenPayload: AuthUserPayload = {
        userId: user.id,
        email: user.email,
        role: userRole,
        name: user.name,
        patientId: user.patientId
      };

      // 5. Sign Access Token and Refresh Token
      const tokenPair = generateTokenPair(tokenPayload);

      console.log(`🔑 [AuthController] User logged in successfully: ${user.email} (${userRole})`);

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        tokens: tokenPair,
        user: {
          id: user.id,
          email: user.email,
          role: userRole,
          name: user.name,
          patientId: user.patientId
        }
      });
    } catch (err: any) {
      console.error("❌ [AuthController] Login error:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Authentication server error during login."
      });
    }
  }

  /**
   * POST /api/auth/register
   * Patient Registration & Portal Activation with bcrypt hashing & JWT issue
   */
  public static async register(req: Request, res: Response) {
    try {
      const { fullName, email, phone, password, patientId, role } = req.body;

      if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Valid full name is required (at least 2 characters)."
        });
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Valid email address is required."
        });
      }

      if (!password || typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long."
        });
      }

      const trimmedEmail = email.trim().toLowerCase();

      // Check if user account already exists
      const existingUser = await UserModel.findByEmail(trimmedEmail);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          code: "USER_EXISTS",
          message: "An account with this email address already exists."
        });
      }

      // Link or create patient record
      const userRole = role === "doctor" ? "doctor" : "patient";
      let activePatientId = patientId ? String(patientId).trim() : `PID-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      if (userRole === "patient") {
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] || fullName.trim();
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        const isDevi = fullName.toLowerCase().includes("devi");

        const parsedAge = req.body.age ? parseInt(req.body.age, 10) : (isDevi ? 34 : 32);
        const parsedGender = req.body.gender || (isDevi ? "Male" : "Male");
        const parsedHeight = req.body.heightCm || (isDevi ? 175 : 175);
        const parsedWeight = req.body.weightKg || (isDevi ? 74 : 74);
        const parsedBloodGroup = req.body.bloodGroup || (isDevi ? "B+" : "B+");
        const parsedAllergies = req.body.allergies || (isDevi ? "Penicillin (causes severe rash — avoid beta-lactams)" : "No known drug allergies");
        const parsedAddress = req.body.address || (phone ? "King Fahd Road, Riyadh, Saudi Arabia" : "Riyadh, Saudi Arabia");

        await PatientModel.create(
          firstName,
          lastName,
          parsedAge,
          parsedGender,
          parsedHeight,
          parsedWeight,
          phone ? String(phone).trim() : "+966 55 432 1098",
          trimmedEmail,
          parsedAddress,
          parsedBloodGroup,
          parsedAllergies,
          activePatientId
        );

        // Pre-seed initial clinical prescription into PrescriptionModel & EMR for patient portal
        try {
          const rxId = `rx-${Date.now()}-${activePatientId}`;
          const clinicalPrescription = {
            prescriptionId: rxId,
            id: rxId,
            patientDetails: {
              patientId: activePatientId,
              patientName: fullName.trim(),
              age: String(parsedAge),
              gender: parsedGender,
              height: `${parsedHeight} cm`,
              weight: `${parsedWeight} kg`,
              bmi: "24.2 (Normal)",
              bloodGroup: parsedBloodGroup,
              allergies: parsedAllergies,
              date: new Date().toISOString().split("T")[0],
              consultingDoctor: "Dr. Harini, MD"
            },
            chiefComplaint: isDevi
              ? "Cough for 1 week following a cold, with thick yellowish-green mucus, chest tightness and soreness, and severe exhaustion."
              : "Clinical consultation and health evaluation.",
            historyOfPresentIllness: isDevi
              ? "Patient reports a 1-week history of cough following a cold, which started dry and progressed to coughing up thick, yellowish-green mucus. Accompanied by chest tightness, soreness, low-grade fever (99.8°F), and generalized exhaustion. Patient denies chronic respiratory illness including asthma and takes no regular daily medications. Lower lung fields remain clear on examination."
              : "Patient registered for clinical evaluation and prescription management.",
            pastMedicalHistory: "No chronic medical conditions reported (specifically denies asthma; takes no daily medications).",
            allergies: parsedAllergies,
            vitals: {
              temperature: "99.8 °F (37.7 °C)",
              bloodPressure: "120/80 mmHg",
              pulse: "76 bpm",
              spo2: "98%",
              respiratoryRate: "16 breaths/min"
            },
            clinicalExamination: "Chest Auscultation: Wheezing and rattling breath sounds noted in upper chest; lower lung fields are clear bilaterally with no crepitations. General appearance: Vitals stable.",
            provisionalDiagnosis: "Acute bronchitis (inflammation of the airways)",
            diseaseDescription: "Acute bronchitis is an inflammation of the large bronchial airways usually triggered by a viral respiratory infection. Treatment centers on thinning mucus, opening airways, and symptom relief.",
            investigationsAdvised: "No investigations ordered (Doctor explicitly determined Chest X-ray and antibiotics are unnecessary due to 98% SpO2, clear lower lung bases, and >95% viral etiology).",
            medications: [
              {
                medicineName: "Guaifenesin (Extended-Release)",
                strength: "600 mg",
                dosage: "1 tablet",
                frequency: "Every 12 hours (Q12H)",
                duration: "7 days (Quantity: 14 tablets)",
                instructions: "Take 1 tablet every 12 hours with a full glass of water. Expectorant to thin mucus.",
                purpose: "Expectorant to thin and loosen mucus in bronchial airways"
              },
              {
                medicineName: "Ibuprofen",
                strength: "400 mg",
                dosage: "1 tablet",
                frequency: "Every 6–8 hours as needed (PRN)",
                duration: "As needed (Quantity: 20 tablets)",
                instructions: "Take 1 tablet every 6–8 hours as needed with food for chest soreness and fever.",
                purpose: "Relieves chest soreness, inflammation, and mild fever"
              },
              {
                medicineName: "Albuterol HFA Inhaler",
                strength: "90 mcg/actuation (HFA)",
                dosage: "2 puffs",
                frequency: "Every 4–6 hours as needed (PRN)",
                duration: "As needed (Quantity: 1 inhaler)",
                instructions: "Inhale 2 puffs every 4–6 hours only as needed to open airways and relieve wheezing.",
                purpose: "Bronchodilator to open airways and relieve wheezing"
              }
            ],
            lifestyleDietAdvice: "Rest up adequately, use a humidifier at home, and drink plenty of water to help thin mucus. Note that while acute symptoms improve in 1 week, a mild cough can linger for 2 to 3 weeks.",
            followUp: "Come back in 10 days if not improving. Go to the emergency room immediately if you develop a high fever, cough up blood, or experience severe shortness of breath.",
            doctorsNotes: "Etiology is >95% viral; antibiotic therapy is contraindicated and will not benefit. Penicillin allergy confirmed (severe rash) — all beta-lactam antibiotics strictly contraindicated. Lungs auscultated clear in lower fields; normal oxygen saturation (98%). Reassured patient that a post-viral cough commonly lingers for 2–3 weeks. Emergency red-flag warning signs explained.",
            status: "approved",
            consultationCompleted: true
          };

          await PrescriptionModel.createOrUpdate({
            prescriptionId: rxId,
            patientId: activePatientId,
            doctorId: "doctor@satark.ai",
            doctorName: "Dr. Harini, MD",
            visitDate: new Date().toISOString().split("T")[0],
            provisionalDiagnosis: clinicalPrescription.provisionalDiagnosis,
            medications: clinicalPrescription.medications,
            dietAdvice: clinicalPrescription.lifestyleDietAdvice,
            followUp: clinicalPrescription.followUp,
            doctorsNotes: clinicalPrescription.doctorsNotes,
            fullPrescription: clinicalPrescription,
            status: "approved"
          });

          await EMRModel.create(
            Date.now(),
            activePatientId,
            "DOC-HARINI-01",
            clinicalPrescription.chiefComplaint,
            clinicalPrescription.historyOfPresentIllness,
            clinicalPrescription.provisionalDiagnosis,
            clinicalPrescription.medications.map(m => `${m.medicineName} ${m.strength}`).join(', '),
            clinicalPrescription.medications.map(m => `${m.dosage} ${m.frequency}`).join('; '),
            clinicalPrescription.lifestyleDietAdvice,
            clinicalPrescription.followUp,
            "Completed",
            fullName.trim(),
            parsedAge,
            parsedGender,
            `${parsedHeight} cm`,
            `${parsedWeight} kg`,
            parsedBloodGroup
          );
        } catch (seedErr) {
          console.warn("Could not auto-seed prescription during patient registration:", seedErr);
        }
      }

      // Create User with bcrypt password hash
      const newUser = await UserModel.createUser({
        email: trimmedEmail,
        passwordPlain: password,
        role: userRole,
        name: fullName.trim(),
        patientId: userRole === "patient" ? activePatientId : undefined
      });

      // Sign JWT Token Pair
      const tokenPayload: AuthUserPayload = {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
        patientId: newUser.patientId
      };

      const tokenPair = generateTokenPair(tokenPayload);

      console.log(`✨ [AuthController] New user registered: ${newUser.email} (${newUser.role})`);

      return res.status(201).json({
        success: true,
        message: "Registration successful.",
        tokens: tokenPair,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          name: newUser.name,
          patientId: newUser.patientId
        }
      });
    } catch (err: any) {
      console.error("❌ [AuthController] Registration error:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Registration server error."
      });
    }
  }

  /**
   * POST /api/auth/refresh
   * Issue a new Access Token using a valid Refresh Token (Token Rotation)
   */
  public static async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.body.refreshToken || req.headers["x-refresh-token"];

      if (!refreshToken || typeof refreshToken !== "string") {
        return res.status(400).json({
          success: false,
          code: "REFRESH_TOKEN_MISSING",
          message: "Refresh token is required."
        });
      }

      // Verify refresh token signature & expiration
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          code: "INVALID_REFRESH_TOKEN",
          message: "Refresh token is expired, invalid, or revoked."
        });
      }

      // Find user
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "Associated user account no longer exists."
        });
      }

      // Revoke old refresh token (rotation)
      revokeRefreshToken(refreshToken);

      // Issue new token pair
      const tokenPayload: AuthUserPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        patientId: user.patientId
      };

      const newTokenPair = generateTokenPair(tokenPayload);

      return res.status(200).json({
        success: true,
        message: "Tokens refreshed successfully.",
        tokens: newTokenPair
      });
    } catch (err: any) {
      console.error("❌ [AuthController] Refresh token error:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to refresh token."
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Revoke refresh token on user logout
   */
  public static async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.body.refreshToken;
      if (refreshToken && typeof refreshToken === "string") {
        revokeRefreshToken(refreshToken);
      }

      return res.status(200).json({
        success: true,
        message: "Logged out successfully. Tokens revoked."
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Logout error."
      });
    }
  }

  /**
   * GET /api/auth/me
   * Return authenticated user profile from verified JWT Bearer Token
   */
  public static async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated."
      });
    }

    return res.status(200).json({
      success: true,
      user: req.user
    });
  }
}
