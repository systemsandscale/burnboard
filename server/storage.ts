// server/storage.ts
import {
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Department,
  type InsertDepartment,
  type TeamMember,
  type InsertTeamMember,
  type ClientTeam,
  type InsertClientTeam,
  type TimeEntry,
  type InsertTimeEntry,
  type BurnSnapshot,
  type InsertBurnSnapshot,
  type MonthlySummary,
  type InsertMonthlySummary,
  type ClientWithMetrics,
  type DepartmentTimeData,
  type OverservingClientData,
  type OverservingEmployeeData,
  type DashboardAnalytics,
  type Settings,
  users,
  clients,
  departments,
  teamMembers,
  clientTeams,
  timeEntries,
  burnSnapshots,
  monthlySummaries,
  settings,
} from "@shared/schema";
import { db } from "./db";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Client methods
  getClients(filters?: {
    status?: "ACTIVE" | "INACTIVE";
    accountManager?: string;
    health?: "OVER" | "ON_TRACK" | "UNDER";
    department?: string;
    search?: string;
  }): Promise<ClientWithMetrics[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;

  // Department methods
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;

  // Team member methods
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMembersByClient(clientId: string): Promise<TeamMember[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;

  // Client team methods
  getClientTeams(clientId?: string): Promise<ClientTeam[]>;
  createClientTeam(clientTeam: InsertClientTeam): Promise<ClientTeam>;

  // Time entry methods
  getTimeEntries(filters?: {
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;

  // Burn snapshot methods
  getBurnSnapshots(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BurnSnapshot[]>;
  createBurnSnapshot(snapshot: InsertBurnSnapshot): Promise<BurnSnapshot>;

  // Monthly summary methods
  getMonthlySummaries(clientId: string): Promise<MonthlySummary[]>;
  createMonthlySummary(summary: InsertMonthlySummary): Promise<MonthlySummary>;

  // Analytics methods
  getClientTimeByDepartment(
    clientId: string,
    month?: string,
  ): Promise<DepartmentTimeData[]>;
  getDashboardSummary(): Promise<{
    activeClients: number;
    onTrackPercentage: number;
    totalRetainerCents: number;
    mtdSpendCents: number;
  }>;
  getDashboardAnalytics(): Promise<DashboardAnalytics>;
  getTopOverservingClients(months?: number): Promise<OverservingClientData[]>;
  getTopOverservingEmployees(
    months?: number,
  ): Promise<OverservingEmployeeData[]>;
  calculateLostRevenue(): Promise<number>;

  // Settings methods
  getSettings(): Promise<Settings[]>;
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(key: string, value: string, valueType?: string): Promise<Settings>;
  getHourlyRate(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // ---------- Users ----------
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ---------- Clients ----------
  async getClients(filters?: {
    status?: "ACTIVE" | "INACTIVE";
    accountManager?: string;
    health?: "OVER" | "ON_TRACK" | "UNDER";
    department?: string;
    search?: string;
  }): Promise<ClientWithMetrics[]> {
    const where: any[] = [];

    // Default to ACTIVE if no explicit filter
    const status = (filters?.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE";
    if (status) where.push(eq(clients.status, status));
    if (filters?.accountManager)
      where.push(eq(clients.accountManager, filters.accountManager));
    if (filters?.search)
      where.push(sql`${clients.name} ILIKE ${"%" + filters.search + "%"}`);

    const baseQuery =
      where.length > 0
        ? db
            .select()
            .from(clients)
            .where(and(...where))
        : db.select().from(clients);

    const clientList = await baseQuery.orderBy(clients.name);

    // Compute simple metrics from timeEntries (later we can switch to burnSnapshots)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const result: ClientWithMetrics[] = [];
    for (const c of clientList) {
      const mtdEntries = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.clientId, c.id),
            gte(timeEntries.start, startOfMonth),
            lte(timeEntries.start, endOfMonth),
          ),
        );

      const mtdSpendCents = mtdEntries.reduce(
        (sum, e) => sum + (e.costCents ?? 0),
        0,
      );
      const mtdHours = mtdEntries.reduce((sum, e) => sum + (e.hours ?? 0), 0);

      const daysInMonth = endOfMonth.getDate();
      const dayOfMonth = now.getDate();
      const idealTargetSpendToDateCents = Math.round(
        ((c.monthlyRetainerAmountCents ?? 0) * dayOfMonth) / daysInMonth,
      );

      const burnPctMTD =
        (c.monthlyRetainerAmountCents ?? 0) > 0
          ? mtdSpendCents / (c.monthlyRetainerAmountCents ?? 1)
          : 0;

      const varianceCents = mtdSpendCents - idealTargetSpendToDateCents;
      const variancePct =
        idealTargetSpendToDateCents > 0
          ? mtdSpendCents / idealTargetSpendToDateCents - 1
          : 0;

      let health: "OVER" | "ON_TRACK" | "UNDER" = "ON_TRACK";
      if (burnPctMTD > 1.1) health = "OVER";
      else if (burnPctMTD < 0.9) health = "UNDER";

      // Optional health filter
      if (filters?.health && health !== filters.health) continue;

      result.push({
        ...c,
        mtdSpendCents,
        mtdHours,
        burnPctMTD,
        idealTargetSpendToDateCents,
        varianceCents,
        variancePct,
        health,
      });
    }

    return result;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  // UPSERT by acceloId so n8n can post repeatedly without duplicates
  async createClient(insertClient: InsertClient): Promise<Client> {
    const [row] = await db
      .insert(clients)
      .values(insertClient)
      .onConflictDoUpdate({
        target: clients.acceloId, // unique on acceloId
        set: {
          name: insertClient.name,
          status: insertClient.status ?? "ACTIVE",
          startDate: insertClient.startDate ?? sql`now()`,
          monthlyRetainerAmountCents:
            insertClient.monthlyRetainerAmountCents ?? 0,
          plannedHours: insertClient.plannedHours ?? null,
          hourlyBlendedRateCents: insertClient.hourlyBlendedRateCents ?? null,
          accountManager: insertClient.accountManager ?? "",
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return row;
  }

  // ---------- Departments ----------
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async createDepartment(
    insertDepartment: InsertDepartment,
  ): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values(insertDepartment)
      .returning();
    return department;
  }

  // ---------- Team members ----------
  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers);
  }

  async getTeamMembersByClient(clientId: string): Promise<TeamMember[]> {
    const rows = await db
      .select({ teamMember: teamMembers })
      .from(teamMembers)
      .innerJoin(clientTeams, eq(clientTeams.memberId, teamMembers.id))
      .where(eq(clientTeams.clientId, clientId));
    return rows.map((r) => r.teamMember);
  }

  async createTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values(insertMember)
      .returning();
    return member;
  }

  // ---------- Client ↔ team ----------
  async getClientTeams(clientId?: string): Promise<ClientTeam[]> {
    let query = db.select().from(clientTeams);
    if (clientId) query = query.where(eq(clientTeams.clientId, clientId));
    return await query;
  }

  async createClientTeam(
    insertClientTeam: InsertClientTeam,
  ): Promise<ClientTeam> {
    const [clientTeam] = await db
      .insert(clientTeams)
      .values(insertClientTeam)
      .returning();
    return clientTeam;
  }

  // ---------- Time entries ----------
  async getTimeEntries(filters?: {
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TimeEntry[]> {
    let query = db.select().from(timeEntries);
    const where: any[] = [];
    if (filters?.clientId)
      where.push(eq(timeEntries.clientId, filters.clientId));
    if (filters?.startDate)
      where.push(gte(timeEntries.start, filters.startDate));
    if (filters?.endDate) where.push(lte(timeEntries.start, filters.endDate));
    if (where.length > 0) query = query.where(and(...where));
    return await query.orderBy(desc(timeEntries.start));
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [timeEntry] = await db
      .insert(timeEntries)
      .values(insertTimeEntry)
      .returning();
    return timeEntry;
  }

  // ---------- Burn snapshots ----------
  async getBurnSnapshots(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BurnSnapshot[]> {
    const where: any[] = [eq(burnSnapshots.clientId, clientId)];
    if (startDate)
      where.push(gte(burnSnapshots.date, startDate.toISOString().slice(0, 10)));
    if (endDate)
      where.push(lte(burnSnapshots.date, endDate.toISOString().slice(0, 10)));

    const query =
      where.length > 0
        ? db
            .select()
            .from(burnSnapshots)
            .where(and(...where))
        : db.select().from(burnSnapshots);

    return await query.orderBy(burnSnapshots.date);
  }

  // UPSERT by (clientId, date)
  async createBurnSnapshot(
    insertSnapshot: InsertBurnSnapshot,
  ): Promise<BurnSnapshot> {
    const [row] = await db
      .insert(burnSnapshots)
      .values(insertSnapshot)
      .onConflictDoUpdate({
        target: [burnSnapshots.clientId, burnSnapshots.date],
        set: {
          spendToDateCents: insertSnapshot.spendToDateCents,
          hoursToDate: insertSnapshot.hoursToDate,
          targetSpendToDateCents: insertSnapshot.targetSpendToDateCents ?? 0,
        },
      })
      .returning();
    return row;
  }

  // ---------- Monthly summaries ----------
  async getMonthlySummaries(clientId: string): Promise<MonthlySummary[]> {
    return await db
      .select()
      .from(monthlySummaries)
      .where(eq(monthlySummaries.clientId, clientId))
      .orderBy(desc(monthlySummaries.year), desc(monthlySummaries.month));
  }

  async createMonthlySummary(
    insertSummary: InsertMonthlySummary,
  ): Promise<MonthlySummary> {
    const [summary] = await db
      .insert(monthlySummaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  // ---------- Analytics ----------
  async getClientTimeByDepartment(
    clientId: string,
    month?: string,
  ): Promise<DepartmentTimeData[]> {
    let startDate: Date;
    let endDate: Date;

    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const rows = await db
      .select({
        departmentId: departments.id,
        departmentName: departments.name,
        totalHours: sql<number>`sum(${timeEntries.hours})::numeric`,
        totalCostCents: sql<number>`sum(${timeEntries.costCents})::integer`,
        memberCount: sql<number>`count(distinct ${timeEntries.memberId})::integer`,
      })
      .from(timeEntries)
      .innerJoin(departments, eq(timeEntries.departmentId, departments.id))
      .where(
        and(
          eq(timeEntries.clientId, clientId),
          gte(timeEntries.start, startDate),
          lte(timeEntries.start, endDate),
        ),
      )
      .groupBy(departments.id, departments.name);

    return rows.map((r) => ({
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      hours: Number(r.totalHours) || 0,
      spendCents: Number(r.totalCostCents) || 0,
      memberCount: Number(r.memberCount) || 0,
    }));
  }

  async getDashboardSummary(): Promise<{
    activeClients: number;
    onTrackPercentage: number;
    totalRetainerCents: number;
    mtdSpendCents: number;
  }> {
    const activeClientsRow = await db
      .select({ count: sql<number>`count(*)::integer` })
      .from(clients)
      .where(eq(clients.status, "ACTIVE"));
    const activeClients = Number(activeClientsRow[0]?.count) || 0;

    const totalRetainerRow = await db
      .select({
        total: sql<number>`sum(${clients.monthlyRetainerAmountCents})::bigint`,
      })
      .from(clients)
      .where(eq(clients.status, "ACTIVE"));
    const totalRetainerCents = Number(totalRetainerRow[0]?.total) || 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const mtdSpendRow = await db
      .select({
        total: sql<number>`sum(${timeEntries.costCents})::bigint`,
      })
      .from(timeEntries)
      .innerJoin(clients, eq(timeEntries.clientId, clients.id))
      .where(
        and(
          eq(clients.status, "ACTIVE"),
          gte(timeEntries.start, startOfMonth),
          lte(timeEntries.start, endOfMonth),
        ),
      );
    const mtdSpendCents = Number(mtdSpendRow[0]?.total) || 0;

    const withMetrics = await this.getClients({ status: "ACTIVE" });
    const onTrackCount = withMetrics.filter(
      (c) => c.health === "ON_TRACK",
    ).length;
    const onTrackPercentage =
      activeClients > 0 ? Math.round((onTrackCount / activeClients) * 100) : 0;

    return {
      activeClients,
      onTrackPercentage,
      totalRetainerCents,
      mtdSpendCents,
    };
  }

  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const [topOverservingClients, topOverservingEmployees, hourlyRate] =
      await Promise.all([
        this.getTopOverservingClients(3),
        this.getTopOverservingEmployees(3),
        this.getHourlyRate(),
      ]);

    const totalLostRevenueCents = await this.calculateLostRevenue();

    return {
      topOverservingClients,
      topOverservingEmployees,
      totalLostRevenueCents,
      hourlyRateCents: hourlyRate * 100,
    };
  }

  async getTopOverservingClients(
    months: number = 3,
  ): Promise<OverservingClientData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const rows = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        accountManager: clients.accountManager,
        totalHours: sql<number>`sum(${timeEntries.hours})::numeric`,
        totalCostCents: sql<number>`sum(${timeEntries.costCents})::integer`,
        retainerCents: sql<number>`(${clients.monthlyRetainerAmountCents} * ${months})::integer`,
      })
      .from(timeEntries)
      .innerJoin(clients, eq(timeEntries.clientId, clients.id))
      .where(
        and(gte(timeEntries.start, startDate), eq(clients.status, "ACTIVE")),
      )
      .groupBy(
        clients.id,
        clients.name,
        clients.accountManager,
        clients.monthlyRetainerAmountCents,
      )
      .having(
        sql`sum(${timeEntries.costCents}) > (${clients.monthlyRetainerAmountCents} * ${months})`,
      )
      .orderBy(
        sql`(sum(${timeEntries.costCents}) - (${clients.monthlyRetainerAmountCents} * ${months})) DESC`,
      )
      .limit(5);

    return rows.map((r) => {
      const totalCostCents = Number(r.totalCostCents) || 0;
      const retainerCents = Number(r.retainerCents) || 0;
      const totalHours = Number(r.totalHours) || 0;

      const overservingCents = Math.max(0, totalCostCents - retainerCents);
      const overservingHours =
        totalCostCents > 0
          ? (overservingCents / totalCostCents) * totalHours
          : 0;

      return {
        clientId: r.clientId,
        clientName: r.clientName,
        accountManager: r.accountManager,
        averageOverservingHours: overservingHours / months,
        averageOverservingCents: overservingCents / months,
      };
    });
  }

  async getTopOverservingEmployees(
    months: number = 3,
  ): Promise<OverservingEmployeeData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const rows = await db
      .select({
        memberId: teamMembers.id,
        memberName: teamMembers.name,
        departmentName: departments.name,
        totalHours: sql<number>`sum(${timeEntries.hours})::numeric`,
        totalCostCents: sql<number>`sum(${timeEntries.costCents})::integer`,
        avgRetainerUsage: sql<number>`avg(${timeEntries.costCents} / ${clients.monthlyRetainerAmountCents})::numeric`,
      })
      .from(timeEntries)
      .innerJoin(teamMembers, eq(timeEntries.memberId, teamMembers.id))
      .innerJoin(departments, eq(teamMembers.departmentId, departments.id))
      .innerJoin(clients, eq(timeEntries.clientId, clients.id))
      .where(
        and(gte(timeEntries.start, startDate), eq(clients.status, "ACTIVE")),
      )
      .groupBy(teamMembers.id, teamMembers.name, departments.name)
      .having(
        sql`avg(${timeEntries.costCents} / ${clients.monthlyRetainerAmountCents}) > 0.2`,
      )
      .orderBy(sql`sum(${timeEntries.costCents}) DESC`)
      .limit(5);

    return rows.map((r) => {
      const totalCostCents = Number(r.totalCostCents) || 0;
      const totalHours = Number(r.totalHours) || 0;
      const avgRetainerUsage = Number(r.avgRetainerUsage) || 0;

      const baselineUsage = 0.2;
      const overservingRatio = Math.max(0, avgRetainerUsage - baselineUsage);
      const overservingHours = overservingRatio * totalHours;

      return {
        memberId: r.memberId,
        memberName: r.memberName,
        department: r.departmentName,
        averageOverservingHours: overservingHours / months,
        averageOverservingCents: totalCostCents / months,
      };
    });
  }

  async calculateLostRevenue(): Promise<number> {
    const hourlyRate = await this.getHourlyRate();
    const overservingClients = await this.getTopOverservingClients(1);
    const overservingEmployees = await this.getTopOverservingEmployees(1);

    const clientOverservingHours = overservingClients.reduce(
      (sum, c) => sum + Math.max(0, c.averageOverservingHours),
      0,
    );
    const employeeOverservingHours = overservingEmployees.reduce(
      (sum, e) => sum + Math.max(0, e.averageOverservingHours),
      0,
    );

    const totalOverservingHours = Math.max(
      clientOverservingHours,
      employeeOverservingHours,
    );

    const lostRevenueCents = totalOverservingHours * (hourlyRate * 100);
    return lostRevenueCents;
  }

  // ---------- Settings ----------
  async getSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(
    key: string,
    value: string,
    valueType: string = "string",
  ): Promise<Settings> {
    const existing = await this.getSetting(key);

    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, valueType, updatedAt: sql`now()` })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({ key, value, valueType })
        .returning();
      return created;
    }
  }

  async getHourlyRate(): Promise<number> {
    const setting = await this.getSetting("hourly_rate");
    return setting ? parseFloat(setting.value) : 150;
  }
}

export const storage = new DatabaseStorage();
