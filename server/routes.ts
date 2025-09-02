import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import type { InsertClient, InsertBurnSnapshot } from "@shared/schema";

/**
 * Registers all API routes on the provided Express app and returns an HTTP server.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // ---------- DEV: one-time DB init route ----------
  // Creates the minimal tables needed for webhook data.
  app.post("/api/dev/init", async (_req, res) => {
    try {
      // Use storage.db if you expose it; otherwise import { db } from "./db"
      const { db } = await import("./db");

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
  // ---------- END DEV route ----------

  // ---------- Clients list with filters ----------
  app.get("/api/clients", async (req, res) => {
    try {
      const querySchema = z.object({
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        am: z.string().optional(),
        health: z.enum(["OVER", "ON_TRACK", "UNDER"]).optional(),
        dept: z.string().optional(),
        search: z.string().optional(),
      });

      const filters = querySchema.parse(req.query);

      const clients = await storage.getClients({
        status: filters.status,
        accountManager: filters.am,
        health: filters.health,
        department: filters.dept,
        search: filters.search,
      });

      res.json({ clients });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error("Error fetching clients:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // ---------- Single client ----------
  app.get("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const teamMembers = await storage.getTeamMembersByClient(id);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const burnSnapshots = await storage.getBurnSnapshots(id, startOfMonth);

      const recentTimeEntries = await storage.getTimeEntries({
        clientId: id,
        startDate: startOfMonth,
      });

      res.json({
        client,
        teamMembers,
        burnSnapshots,
        recentTimeEntries: recentTimeEntries.slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------- Client history ----------
  app.get("/api/clients/:id/history", async (req, res) => {
    try {
      const { id } = req.params;

      const monthlySummaries = await storage.getMonthlySummaries(id);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const dailySnapshots = await storage.getBurnSnapshots(id, startOfMonth);

      res.json({
        monthlySummaries,
        dailySnapshots,
      });
    } catch (error) {
      console.error("Error fetching client history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------- Departments ----------
  app.get("/api/departments", async (_req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json({ departments });
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------- Client time by department ----------
  app.get("/api/clients/:id/time-by-dept", async (req, res) => {
    try {
      const { id } = req.params;
      const querySchema = z.object({
        month: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional(),
      });

      const { month } = querySchema.parse(req.query);

      const departmentData = await storage.getClientTimeByDepartment(id, month);

      res.json({ departmentData });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error("Error fetching department time:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // ---------- Dashboard summary ----------
  app.get("/api/dashboard/summary", async (_req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------- Dashboard analytics ----------
  app.get("/api/dashboard/analytics", async (_req, res) => {
    try {
      const analyticsData = await storage.getDashboardAnalytics();
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------- Settings ----------
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json({ settings });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);

      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }

      res.json({ setting });
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settingSchema = z.object({
        key: z.string(),
        value: z.string(),
        valueType: z.string().optional().default("string"),
      });

      const { key, value, valueType } = settingSchema.parse(req.body);

      const setting = await storage.setSetting(key, value, valueType);
      res.json({ setting });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error("Error setting value:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // ---------- N8n webhook (time_entry prototype) ----------
  const timeEntrySchema = z.object({
    type: z.literal("time_entry"),
    data: z.object({
      clientId: z.string().min(1), // Accelo company id (string)
      periodId: z.string().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      spendToDateCents: z.number().int().nonnegative(),
      hoursToDate: z.number().nonnegative(),
      targetSpendToDateCents: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional(),
    }),
  });

  app.post("/api/webhooks/n8n", async (req, res) => {
    try {
      const body = timeEntrySchema.parse(req.body);
      const d = body.data;

      // ensure client exists (acceloId = clientId)
      const acceloId = d.clientId;

      // find existing by acceloId
      const allClients = await storage.getClients();
      const existing = allClients.find((c) => c.acceloId === acceloId);

      if (!existing) {
        const insertClient: InsertClient = {
          acceloId,
          name: `Client ${acceloId}`,
          status: "ACTIVE",
          startDate: d.date, // ISO date string okay if storage handles it
          monthlyRetainerAmountCents: d.targetSpendToDateCents ?? 0, // placeholder
          plannedHours: null,
          hourlyBlendedRateCents: null,
          accountManager: "",
        };
        await storage.createClient(insertClient);
      }

      // upsert daily burn snapshot (using acceloId as key when id is unknown)
      const clientKey = existing?.id ?? acceloId;
      const snap: InsertBurnSnapshot = {
        clientId: clientKey,
        date: d.date,
        spendToDateCents: d.spendToDateCents,
        hoursToDate: d.hoursToDate,
        targetSpendToDateCents: d.targetSpendToDateCents ?? 0,
      };
      await storage.createBurnSnapshot(snap);

      return res.json({ success: true, saved: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(err).message });
      }
      console.error("webhook error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------- Clients upsert webhook (accepts list from n8n) ----------
  const clientsUpsertSchema = z.object({
    clients: z.array(
      z.object({
        id: z.string().min(1),          // Accelo company id (string)
        name: z.string().min(1),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
      })
    ),
  });

  app.post("/api/webhooks/clients", async (req, res) => {
    try {
      const body = clientsUpsertSchema.parse(req.body);

      let created = 0;
      for (const c of body.clients) {
        const insert: InsertClient = {
          acceloId: c.id,
          name: c.name,
          status: c.status,
          startDate: new Date().toISOString(), // placeholder
          monthlyRetainerAmountCents: 0,       // placeholder
          plannedHours: null,
          hourlyBlendedRateCents: null,
          accountManager: "",
        };

        // idempotent enough for now; if your storage throws on duplicate,
        // you can wrap in try/catch and ignore 'duplicate key' errors.
        await storage.createClient(insert);
        created++;
      }

      return res.json({ success: true, created });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(err).message });
      }
      console.error("clients upsert error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- DEV: inspect DB columns for "clients" and "burn_snapshots" ---
  app.get("/api/dev/columns", async (_req, res) => {
    try {
      const { db } = await import("./db");
      const clientsCols = await db.execute(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'clients'
        ORDER BY ordinal_position
      `);
      const burnCols = await db.execute(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'burn_snapshots'
        ORDER BY ordinal_position
      `);
      res.json({
        clients: clientsCols.rows,
        burn_snapshots: burnCols.rows,
      });
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  // Create and return HTTP server for Vite/dev integration
  const httpServer = createServer(app);
  return httpServer;
}
