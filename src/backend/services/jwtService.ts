import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// Internal signing keys (does not require external environment secrets)
const JWT_SECRET = process.env.JWT_SECRET || "kateb_clinical_ai_internal_secret_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "kateb_clinical_ai_refresh_secret_2026";


export interface AuthUserPayload {
  userId: string;
  email: string;
  role: "doctor" | "patient";
  name: string;
  patientId?: string;
}

export interface JwtTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string; // e.g. "15m"
  tokenType: string;
}

// Local Refresh Token Whitelist Persistence for revocation
const REFRESH_TOKENS_PATH = path.join(process.cwd(), "refresh_tokens_local.json");

class RefreshTokenStore {
  private activeTokens: Set<string> = new Set();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(REFRESH_TOKENS_PATH)) {
        const raw = fs.readFileSync(REFRESH_TOKENS_PATH, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.activeTokens = new Set(list);
        }
      }
    } catch (e) {
      console.warn("⚠️ [JWTService] Could not read refresh tokens file, starting empty.");
    }
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(REFRESH_TOKENS_PATH, JSON.stringify(Array.from(this.activeTokens), null, 2), "utf-8");
    } catch (e) {
      console.error("❌ [JWTService] Failed to persist active refresh tokens to disk:", e);
    }
  }

  public add(token: string) {
    this.activeTokens.add(token);
    this.saveToDisk();
  }

  public has(token: string): boolean {
    return this.activeTokens.has(token);
  }

  public remove(token: string) {
    this.activeTokens.delete(token);
    this.saveToDisk();
  }
}

const refreshTokenStore = new RefreshTokenStore();

/**
 * Generate Access Token (15 Minutes validity)
 */
export function generateAccessToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "15m",
    issuer: "kateb-clinical-ai",
    subject: payload.userId
  });
}

/**
 * Generate Refresh Token (7 Days validity)
 */
export function generateRefreshToken(payload: AuthUserPayload): string {
  const refreshToken = jwt.sign(
    { userId: payload.userId, role: payload.role, type: "refresh" },
    JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
      issuer: "kateb-clinical-ai",
      subject: payload.userId
    }
  );

  refreshTokenStore.add(refreshToken);
  return refreshToken;
}

/**
 * Generate both Access Token and Refresh Token
 */
export function generateTokenPair(payload: AuthUserPayload): JwtTokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    expiresIn: "15m",
    tokenType: "Bearer"
  };
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token: string): AuthUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: "kateb-clinical-ai" }) as AuthUserPayload;
    return decoded;
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      console.warn("🔒 [JWTService] Access Token expired");
    } else {
      console.warn("🔒 [JWTService] Invalid Access Token signature or structure:", err.message);
    }
    return null;
  }
}

/**
 * Verify Refresh Token
 */
export function verifyRefreshToken(token: string): { userId: string; role: "doctor" | "patient" } | null {
  try {
    if (!refreshTokenStore.has(token)) {
      console.warn("🔒 [JWTService] Refresh Token has been revoked or is not in active store");
      return null;
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, { issuer: "kateb-clinical-ai" }) as {
      userId: string;
      role: "doctor" | "patient";
      type: string;
    };

    if (decoded.type !== "refresh") {
      return null;
    }

    return { userId: decoded.userId, role: decoded.role };
  } catch (err: any) {
    console.warn("🔒 [JWTService] Invalid or expired Refresh Token:", err.message);
    return null;
  }
}

/**
 * Revoke a Refresh Token on logout or rotation
 */
export function revokeRefreshToken(token: string): boolean {
  if (refreshTokenStore.has(token)) {
    refreshTokenStore.remove(token);
    return true;
  }
  return false;
}
