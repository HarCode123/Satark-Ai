import fs from "fs";
import path from "path";
import { getDatabaseConnection, isUsingLocalFallback } from "../db/mysql";
import { hashPassword, comparePassword } from "../services/hashService";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: "doctor" | "patient";
  name: string;
  patientId?: string;
  createdAt: string;
  updatedAt: string;
}

const FALLBACK_USERS_PATH = path.join(process.cwd(), "users_local.json");

// Ensure default users exist in fallback storage
async function getInitialDefaultUsers(): Promise<UserRecord[]> {
  const defaultPasswordHash = await hashPassword("123456");
  const now = new Date().toISOString();

  return [
    {
      id: "usr-doctor-001",
      email: "doctor@satark.ai",
      passwordHash: defaultPasswordHash,
      role: "doctor",
      name: "Dr. Harini, MD",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-doctor-002",
      email: "doctor@kateb.ai",
      passwordHash: defaultPasswordHash,
      role: "doctor",
      name: "Dr. Harini, MD",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-patient-001",
      email: "harini@satark.ai",
      passwordHash: defaultPasswordHash,
      role: "patient",
      name: "Harini Al-Mansoor",
      patientId: "PID-2026-001",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-patient-002",
      email: "harini@kateb.ai",
      passwordHash: defaultPasswordHash,
      role: "patient",
      name: "Harini Al-Mansoor",
      patientId: "PID-2026-001",
      createdAt: now,
      updatedAt: now
    },
    {
      id: "usr-patient-003",
      email: "patient@satark.ai",
      passwordHash: defaultPasswordHash,
      role: "patient",
      name: "Harini Al-Mansoor",
      patientId: "PID-2026-001",
      createdAt: now,
      updatedAt: now
    }
  ];
}

export class UserModel {
  private static localUsersCache: UserRecord[] | null = null;

  /**
   * Initialize local JSON persistence for fallback mode
   */
  private static async getLocalUsers(): Promise<UserRecord[]> {
    if (this.localUsersCache) return this.localUsersCache;

    try {
      if (fs.existsSync(FALLBACK_USERS_PATH)) {
        const raw = fs.readFileSync(FALLBACK_USERS_PATH, "utf-8");
        this.localUsersCache = JSON.parse(raw);
        return this.localUsersCache || [];
      } else {
        const initialUsers = await getInitialDefaultUsers();
        fs.writeFileSync(FALLBACK_USERS_PATH, JSON.stringify(initialUsers, null, 2), "utf-8");
        this.localUsersCache = initialUsers;
        return initialUsers;
      }
    } catch (e) {
      console.error("❌ [UserModel] Error reading local users file:", e);
      return [];
    }
  }

  private static saveLocalUsers(users: UserRecord[]) {
    try {
      this.localUsersCache = users;
      fs.writeFileSync(FALLBACK_USERS_PATH, JSON.stringify(users, null, 2), "utf-8");
    } catch (e) {
      console.error("❌ [UserModel] Error saving local users file:", e);
    }
  }

  /**
   * Ensure table exists in MySQL and seed default accounts
   */
  public static async ensureUsersTable() {
    const pool = await getDatabaseConnection();
    if (!pool || isUsingLocalFallback()) return;

    try {
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          patient_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      await pool.query(createTableSql);

      // Seed initial users into MySQL if empty
      const [rows]: any = await pool.query("SELECT COUNT(*) as cnt FROM users");
      if (rows && rows[0] && rows[0].cnt === 0) {
        console.log("🌱 [UserModel] Seeding default users into MySQL...");
        const initialUsers = await getInitialDefaultUsers();
        for (const u of initialUsers) {
          await pool.query(
            `INSERT IGNORE INTO users (id, email, password_hash, role, name, patient_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [u.id, u.email, u.passwordHash, u.role, u.name, u.patientId || null]
          );
        }
      }
    } catch (err: any) {
      console.warn("⚠️ [UserModel] Failed to initialize users table in MySQL:", err.message);
    }
  }

  /**
   * Find user by Email
   */
  public static async findByEmail(email: string): Promise<UserRecord | null> {
    const searchEmail = email.trim().toLowerCase();
    const pool = await getDatabaseConnection();

    if (!pool || isUsingLocalFallback()) {
      const users = await this.getLocalUsers();
      const matched = users.find(u => u.email.toLowerCase() === searchEmail);
      return matched || null;
    }

    try {
      const [rows]: any = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [searchEmail]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          email: r.email,
          passwordHash: r.password_hash,
          role: r.role,
          name: r.name,
          patientId: r.patient_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      }
      return null;
    } catch (err) {
      console.error("❌ [UserModel] Error finding user by email in MySQL:", err);
      // Fallback
      const users = await this.getLocalUsers();
      return users.find(u => u.email.toLowerCase() === searchEmail) || null;
    }
  }

  /**
   * Find user by ID or Patient ID
   */
  public static async findById(id: string): Promise<UserRecord | null> {
    const pool = await getDatabaseConnection();

    if (!pool || isUsingLocalFallback()) {
      const users = await this.getLocalUsers();
      const matched = users.find(u => u.id === id || u.patientId === id);
      return matched || null;
    }

    try {
      const [rows]: any = await pool.query("SELECT * FROM users WHERE id = ? OR patient_id = ?", [id, id]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          email: r.email,
          passwordHash: r.password_hash,
          role: r.role,
          name: r.name,
          patientId: r.patient_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      }
      return null;
    } catch (err) {
      console.error("❌ [UserModel] Error finding user by ID in MySQL:", err);
      const users = await this.getLocalUsers();
      return users.find(u => u.id === id || u.patientId === id) || null;
    }
  }

  /**
   * Create a new user record
   */
  public static async createUser(data: {
    email: string;
    passwordPlain: string;
    role: "doctor" | "patient";
    name: string;
    patientId?: string;
  }): Promise<UserRecord> {
    const passwordHash = await hashPassword(data.passwordPlain);
    const userId = `usr-${data.role}-${Date.now()}`;
    const now = new Date().toISOString();

    const newRecord: UserRecord = {
      id: userId,
      email: data.email.trim().toLowerCase(),
      passwordHash,
      role: data.role,
      name: data.name.trim(),
      patientId: data.patientId,
      createdAt: now,
      updatedAt: now
    };

    const pool = await getDatabaseConnection();

    if (!pool || isUsingLocalFallback()) {
      const users = await this.getLocalUsers();
      users.push(newRecord);
      this.saveLocalUsers(users);
      console.log(`💾 [UserModel] User created in local storage: ${newRecord.email}`);
      return newRecord;
    }

    try {
      const query = `
        INSERT INTO users (id, email, password_hash, role, name, patient_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await pool.query(query, [
        newRecord.id,
        newRecord.email,
        newRecord.passwordHash,
        newRecord.role,
        newRecord.name,
        newRecord.patientId || null
      ]);
      console.log(`💾 [UserModel] User created in MySQL DB: ${newRecord.email}`);
      return newRecord;
    } catch (err: any) {
      console.error("❌ [UserModel] Error creating user in MySQL, saving to local fallback:", err.message);
      const users = await this.getLocalUsers();
      users.push(newRecord);
      this.saveLocalUsers(users);
      return newRecord;
    }
  }
}
