import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  const port = parseInt(process.env.PORT || "5000", 10);

  // --- DEV: one-time DB init route ---
  app.post("/api/dev/init", async (_req, res) => {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS clients (
          accelo_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT DEFAULT 'ACTIVE',
          start_date TIMESTAMPTZ,
          monthly_retainer_amount_cents INTEGER DEFAULT 0,
          planned_hours REAL,
          hourly_blended_rate_cents INTEGER,
          account_manager TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS burn_snapshots (
          client_id TEXT NOT NULL REFERENCES clients(accelo_id) ON DELETE CASCADE,
          date DATE NOT NULL,
          spend_to_date_cents INTEGER NOT NULL DEFAULT 0,
          hours_to_date REAL NOT NULL DEFAULT 0,
          target_spend_to_date_cents INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (client_id, date)
        );
      `);

      res.json({ ok: true, created: ["clients", "burn_snapshots"] });
    } catch (e: any) {
      console.error("init error", e);
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });
  // --- END DEV route ---

  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
