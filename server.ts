import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
import url from "url";
import transcriptRoutes from "./src/backend/routes/transcriptRoutes.ts";
import emrRoutes from "./src/backend/routes/emrRoutes.ts";
import patientRoutes from "./src/backend/routes/patientRoutes.ts";
import patientPortalRoutes from "./src/backend/routes/patientPortalRoutes.ts";
import authRoutes from "./src/backend/routes/authRoutes.ts";
import prescriptionRoutes from "./src/backend/routes/prescriptionRoutes.ts";
import { getDatabaseConnection } from "./src/backend/db/mysql";
import { UserModel } from "./src/backend/models/UserModel.ts";
// Load environment variables from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Production CORS support if FRONTEND_URL is configured
  const allowedOrigin = process.env.FRONTEND_URL;
  if (allowedOrigin) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && origin === allowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      next();
    });
  }

  app.use(express.json());
  // Initialize MySQL connection and users table
  await getDatabaseConnection();
  await UserModel.ensureUsersTable();

  // Mount Authentication API routes (JWT Auth, login, register, refresh, logout, me)
  app.use("/api/auth", authRoutes);

  // Mount consultation transcripts API routes
  app.use("/api/transcripts", transcriptRoutes);

  // Mount structured Electronic Medical Records API routes
  app.use("/api/emr", emrRoutes);

  // Mount Patient Management API routes
  app.use("/api/patients", patientRoutes);

  // Mount Patient Portal API routes
  app.use("/api/patient", patientPortalRoutes);

  // Mount Digital Clinical Prescriptions API routes
  app.use("/api/prescriptions", prescriptionRoutes);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Explicit 404 JSON handler for unhandled API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      code: "API_ROUTE_NOT_FOUND",
      message: `API endpoint ${req.method} ${req.originalUrl} was not found.`
    });
  });

  // Global error handler for all /api routes to prevent HTML error pages
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api")) {
      console.error(`❌ [API Error] ${req.method} ${req.originalUrl}:`, err);
      return res.status(err.status || 500).json({
        success: false,
        error: err.name || "ServerError",
        message: err.message || "An unexpected internal server error occurred."
      });
    }
    next(err);
  });

  // Vite middleware for development or serving built assets in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Create HTTP server to wrap express app
  const server = http.createServer(app);

  // Initialize WebSocket server for selective proxying
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (ws, request) => {
    console.log("WebSocket connection established for Gemini Live Proxy");
    
    // Parse query parameters to determine model
    const reqUrl = url.parse(request.url || "", true);
    const selectedModel = (reqUrl.query.model as string) || "gemini-3.1-flash-live-preview";
    
    const apiKey = process.env.GEMINI_API_KEY || "";
    
    const sendError = (msg: string) => {
      try {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ error: msg }));
          setTimeout(() => {
            try { ws.close(); } catch (e) {}
          }, 300);
        }
      } catch (e) {
        console.error("Error sending error message on WS:", e);
      }
    };

    if (!apiKey) {
      sendError("Gemini API Key is missing on the server. Please set GEMINI_API_KEY in the Secrets menu.");
      return;
    }
    
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    let session: any = null;
    let isClosed = false;
    
    try {
      session = await ai.live.connect({
        model: selectedModel,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction:
            "You are a silent clinical transcription assistant. Do not converse, answer questions, or comment — any spoken reply you generate is discarded and never played to the user.",
        },
        callbacks: {
          onmessage: (message: any) => {
            if (isClosed) return;
            try {
              if (ws.readyState === 1) {
                ws.send(JSON.stringify(message));
              }
            } catch (e) {
              console.error("Error forwarding message to WebSocket client:", e);
            }
          },
          onerror: (err: any) => {
            console.error("Gemini Live API error:", err);
            if (isClosed) return;
            const msg = err?.message || "Gemini Live API connection error.";
            sendError(msg);
          },
          onclose: () => {
            console.log("Gemini Live API connection closed");
            if (isClosed) return;
            try { ws.close(); } catch (e) {}
          }
        }
      });
      
      // Send message confirming proxy connected to Gemini Live
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ connected: true }));
      }
    } catch (err: any) {
      console.error("Failed to connect to Gemini Live on server:", err);
      const msg = err?.message || "Failed to establish a live connection with Gemini.";
      sendError(msg);
      return;
    }
    
    ws.on("message", (data) => {
      if (isClosed || !session) return;
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: "audio/pcm;rate=16000",
            }
          });
        }
      } catch (e) {
        console.error("Error sending real-time input to Gemini:", e);
      }
    });
    
    ws.on("close", () => {
      console.log("Client WebSocket closed");
      isClosed = true;
      if (session) {
        try {
          session.close();
        } catch (e) {
          console.warn("Error closing Gemini live session:", e);
        }
        session = null;
      }
    });
    
    ws.on("error", (err) => {
      console.error("Client WebSocket error:", err);
      isClosed = true;
      if (session) {
        try {
          session.close();
        } catch (e) {
          console.warn("Error closing Gemini live session on client error:", e);
        }
        session = null;
      }
    });
  });

  // Selective upgrade to allow Vite development WebSocket to co-exist
  server.on("upgrade", (request, socket, head) => {
    const pathname = url.parse(request.url || "").pathname;
    if (pathname === "/api/live-proxy") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
