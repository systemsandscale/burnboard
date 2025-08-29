import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import type { InsertClient, InsertBurnSnapshot } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all clients with filters
  app.get("/api/clients", async (req, res) => {
    try {
      const querySchema = z.object({
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
        am: z.string().optional(),
        health: z.enum(["OVER", "ON_TRACK", "UNDER"]).optional(),
        dept: z.string().optional(),
        search: z.string().optional()
      });

      const filters = querySchema.parse(req.query);
      
      const clients = await storage.getClients({
        status: filters.status,
        accountManager: filters.am,
        health: filters.health,
        department: filters.dept,
        search: filters.search
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

  // Get single client with details
  app.get("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get team members for this client
      const teamMembers = await storage.getTeamMembersByClient(id);
      
      // Get latest burn snapshots (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const burnSnapshots = await storage.getBurnSnapshots(id, startOfMonth);

      // Get recent time entries
      const recentTimeEntries = await storage.getTimeEntries({
        clientId: id,
        startDate: startOfMonth
      });

      res.json({
        client,
        teamMembers,
        burnSnapshots,
        recentTimeEntries: recentTimeEntries.slice(0, 10) // Latest 10
      });
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get client history
  app.get("/api/clients/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      
      const monthlySummaries = await storage.getMonthlySummaries(id);
      
      // Get daily snapshots for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const dailySnapshots = await storage.getBurnSnapshots(id, startOfMonth);

      res.json({
        monthlySummaries,
        dailySnapshots
      });
    } catch (error) {
      console.error("Error fetching client history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get departments
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json({ departments });
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get client time by department
  app.get("/api/clients/:id/time-by-dept", async (req, res) => {
    try {
      const { id } = req.params;
      const querySchema = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/).optional()
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

  // Get dashboard summary
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dashboard analytics endpoint
  app.get("/api/dashboard/analytics", async (req, res) => {
    try {
      const analyticsData = await storage.getDashboardAnalytics();
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
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
        valueType: z.string().optional().default("string")
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

  // N8n webhook stub

  // minimal schema for current posts
  const timeEntrySchema = z.object({
    type: z.literal("time_entry"),
    data: z.object({
      clientId: z.string().min(1),           // Accelo company id (string)
      periodId: z.string().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      spendToDateCents: z.number().int().nonnegative(),
      hoursToDate: z.number().nonnegative(),
      targetSpendToDateCents: z.number().int().nonnegative().nullable().optional(),
    }),
  });

  app.post("/api/webhooks/n8n", async (req, res) => {
    try {
      const body = timeEntrySchema.parse(req.body);
      const d = body.data;

      // 1) ensure client exists (acceloId = clientId)
      const acceloId = d.clientId;
      // Find existing clients and check if one matches the acceloId
      const allClients = await storage.getClients();
      const existing = allClients.find(client => client.acceloId === acceloId);
      
      if (!existing) {
        const insertClient: InsertClient = {
          acceloId,
          name: `Client ${acceloId}`,     // placeholder; we can upsert real names later
          status: "ACTIVE",
          startDate: d.date,              // Use string date format (YYYY-MM-DD)
          monthlyRetainerAmountCents: d.targetSpendToDateCents ?? 0, // placeholder
          plannedHours: null,
          hourlyBlendedRateCents: null,
          accountManager: "",
        };
        await storage.createClient(insertClient);
      }

      // 2) create the daily burn snapshot for this client/date
      // Use the existing client ID or the acceloId as clientId reference
      const clientId = existing?.id ?? acceloId;
      const snap: InsertBurnSnapshot = {
        clientId: clientId,
        date: d.date,                     // Use string date format (YYYY-MM-DD)
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

  // Accelo refresh stub
  app.post("/api/accelo/refresh", async (req, res) => {
    try {
      // TODO: Implement background sync logic
      console.log("Accelo refresh triggered");
      
      res.json({ 
        success: true, 
        message: "Background sync initiated",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error triggering refresh:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
