export interface UserSession {
  id: string;
  email: string;
  role: "doctor" | "patient";
  name: string;
  patientId?: string;
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: string;
}

const ACCESS_TOKEN_KEY = "kateb_jwt_access_token";
const REFRESH_TOKEN_KEY = "kateb_jwt_refresh_token";
const USER_SESSION_KEY = "kateb_user_session";

export class AuthService {
  /**
   * Get stored Access Token
   */
  public static getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get stored Refresh Token
   */
  public static getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Get current authenticated user session
   */
  public static getUser(): UserSession | null {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Save auth session & tokens
   */
  public static saveSession(tokens: JwtTokens, user: UserSession) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  }

  /**
   * Clear session & logout
   */
  public static async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });
      } catch (err) {
        console.warn("Logout endpoint error:", err);
      }
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
    localStorage.removeItem("kateb_patient_profile");
  }

  /**
   * Get Auth Headers for API requests
   */
  public static getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Login API Call
   */
  public static async login(credentials: {
    email?: string;
    password?: string;
    role?: "doctor" | "patient";
    patientId?: string;
  }): Promise<{ success: boolean; user?: UserSession; message?: string }> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        this.saveSession(result.tokens, result.user);
        return { success: true, user: result.user };
      }

      return {
        success: false,
        message: result.message || "Login failed. Please check your credentials."
      };
    } catch (err: any) {
      console.error("❌ Auth login service error:", err);
      return {
        success: false,
        message: "Network error connecting to authentication service."
      };
    }
  }

  /**
   * Register API Call
   */
  public static async register(userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    patientId?: string;
    role?: "doctor" | "patient";
  }): Promise<{ success: boolean; user?: UserSession; message?: string }> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        this.saveSession(result.tokens, result.user);
        return { success: true, user: result.user };
      }

      return {
        success: false,
        message: result.message || "Registration failed."
      };
    } catch (err: any) {
      console.error("❌ Auth register service error:", err);
      return {
        success: false,
        message: "Network error connecting to registration service."
      };
    }
  }

  /**
   * Refresh Token API Call
   */
  public static async refreshSession(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        const currentUser = this.getUser();
        if (currentUser) {
          this.saveSession(result.tokens, currentUser);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("❌ Refresh session error:", err);
      return false;
    }
  }

  /**
   * Fetch Me / Validate current token
   */
  public static async fetchCurrentUser(): Promise<UserSession | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      let response = await fetch("/api/auth/me", {
        headers: this.getAuthHeaders()
      });

      if (response.status === 401) {
        // Try token refresh
        const refreshed = await this.refreshSession();
        if (refreshed) {
          response = await fetch("/api/auth/me", {
            headers: this.getAuthHeaders()
          });
        }
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          localStorage.setItem(USER_SESSION_KEY, JSON.stringify(result.user));
          return result.user;
        }
      }
      return null;
    } catch (err) {
      return this.getUser();
    }
  }
}
