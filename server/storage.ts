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
  type InsertSettings,
  users,
  clients,
  departments,
  teamMembers,
  clientTeams,
  timeEntries,
  burnSnapshots,
  monthlySummaries,
  settings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";

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
  getBurnSnapshots(clientId: string, startDate?: Date, endDate?: Date): Promise<BurnSnapshot[]>;
  createBurnSnapshot(snapshot: InsertBurnSnapshot): Promise<BurnSnapshot>;

  // Monthly summary methods
  getMonthlySummaries(clientId: string): Promise<MonthlySummary[]>;
  createMonthlySummary(summary: InsertMonthlySummary): Promise<MonthlySummary>;

  // Analytics methods
  getClientTimeByDepartment(clientId: string, month?: string): Promise<DepartmentTimeData[]>;
  getDashboardSummary(): Promise<{
    activeClients: number;
    onTrackPercentage: number;
    totalRetainerCents: number;
    mtdSpendCents: number;
  }>;
  getDashboardAnalytics(): Promise<DashboardAnalytics>;
  getTopOverservingClients(months?: number): Promise<OverservingClientData[]>;
  getTopOverservingEmployees(months?: number): Promise<OverservingEmployeeData[]>;
  calculateLostRevenue(): Promise<number>;

  // Settings methods
  getSettings(): Promise<Settings[]>;
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(key: string, value: string, valueType?: string): Promise<Settings>;
  getHourlyRate(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getClients(filters?: {
    status?: "ACTIVE" | "INACTIVE";
    accountManager?: string;
    health?: "OVER" | "ON_TRACK" | "UNDER";
    department?: string;
    search?: string;
  }): Promise<ClientWithMetrics[]> {
    let query = db.select().from(clients);
    
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(clients.status, filters.status));
    }
    
    if (filters?.accountManager) {
      conditions.push(eq(clients.accountManager, filters.accountManager));
    }
    
    if (filters?.search) {
      conditions.push(sql`${clients.name} ILIKE ${'%' + filters.search + '%'}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const clientList = await query;

    // Calculate metrics for each client
    const clientsWithMetrics: ClientWithMetrics[] = [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    for (const client of clientList) {
      // Get MTD time entries
      const mtdEntries = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.clientId, client.id),
            gte(timeEntries.start, startOfMonth),
            lte(timeEntries.start, endOfMonth)
          )
        );

      const mtdSpendCents = mtdEntries.reduce((sum, entry) => sum + entry.costCents, 0);
      const mtdHours = mtdEntries.reduce((sum, entry) => sum + entry.hours, 0);
      
      // Calculate burn metrics using domain logic that would be in lib/metrics.ts
      const daysInMonth = endOfMonth.getDate();
      const dayOfMonth = now.getDate();
      const idealTargetSpendToDateCents = Math.round(
        (client.monthlyRetainerAmountCents * dayOfMonth) / daysInMonth
      );
      
      const burnPctMTD = client.monthlyRetainerAmountCents > 0 ? 
        mtdSpendCents / client.monthlyRetainerAmountCents : 0;
      
      const varianceCents = mtdSpendCents - idealTargetSpendToDateCents;
      const variancePct = idealTargetSpendToDateCents > 0 ? 
        (mtdSpendCents / idealTargetSpendToDateCents) - 1 : 0;
      
      let health: "OVER" | "ON_TRACK" | "UNDER" = "ON_TRACK";
      if (burnPctMTD > 1.10) health = "OVER";
      else if (burnPctMTD < 0.90) health = "UNDER";

      // Apply health filter if specified
      if (filters?.health && health !== filters.health) {
        continue;
      }

      // Apply department filter if specified
      if (filters?.department) {
        const departmentQuery = await db
          .select()
          .from(departments)
          .where(eq(departments.name, filters.department));
        
        if (departmentQuery.length === 0) {
          continue; // Department doesn't exist
        }
        
        const departmentId = departmentQuery[0].id;
        const hasTimeInDepartment = await db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.clientId, client.id),
              eq(timeEntries.departmentId, departmentId)
            )
          )
          .limit(1);
          
        if (hasTimeInDepartment.length === 0) {
          continue; // Client has no time entries in this department
        }
      }

      clientsWithMetrics.push({
        ...client,
        mtdSpendCents,
        mtdHours,
        burnPctMTD,
        idealTargetSpendToDateCents,
        varianceCents,
        variancePct,
        health
      });
    }

    return clientsWithMetrics;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(insertClient)
      .returning();
    return client;
  }

  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values(insertDepartment)
      .returning();
    return department;
  }

  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers);
  }

  async getTeamMembersByClient(clientId: string): Promise<TeamMember[]> {
    const result = await db
      .select({ teamMember: teamMembers })
      .from(teamMembers)
      .innerJoin(clientTeams, eq(clientTeams.memberId, teamMembers.id))
      .where(eq(clientTeams.clientId, clientId));
    
    return result.map(row => row.teamMember);
  }

  async createTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values(insertMember)
      .returning();
    return member;
  }

  async getClientTeams(clientId?: string): Promise<ClientTeam[]> {
    let query = db.select().from(clientTeams);
    
    if (clientId) {
      query = query.where(eq(clientTeams.clientId, clientId));
    }
    
    return await query;
  }

  async createClientTeam(insertClientTeam: InsertClientTeam): Promise<ClientTeam> {
    const [clientTeam] = await db
      .insert(clientTeams)
      .values(insertClientTeam)
      .returning();
    return clientTeam;
  }

  async getTimeEntries(filters?: {
    clientId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TimeEntry[]> {
    let query = db.select().from(timeEntries);
    
    const conditions = [];
    
    if (filters?.clientId) {
      conditions.push(eq(timeEntries.clientId, filters.clientId));
    }
    
    if (filters?.startDate) {
      conditions.push(gte(timeEntries.start, filters.startDate));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(timeEntries.start, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(timeEntries.start));
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [timeEntry] = await db
      .insert(timeEntries)
      .values(insertTimeEntry)
      .returning();
    return timeEntry;
  }

  async getBurnSnapshots(clientId: string, startDate?: Date, endDate?: Date): Promise<BurnSnapshot[]> {
    let query = db
      .select()
      .from(burnSnapshots)
      .where(eq(burnSnapshots.clientId, clientId));
    
    const conditions = [eq(burnSnapshots.clientId, clientId)];
    
    if (startDate) {
      conditions.push(gte(burnSnapshots.date, startDate.toISOString().split('T')[0]));
    }
    
    if (endDate) {
      conditions.push(lte(burnSnapshots.date, endDate.toISOString().split('T')[0]));
    }
    
    return await db
      .select()
      .from(burnSnapshots)
      .where(and(...conditions))
      .orderBy(burnSnapshots.date);
  }

  async createBurnSnapshot(insertSnapshot: InsertBurnSnapshot): Promise<BurnSnapshot> {
    const [snapshot] = await db
      .insert(burnSnapshots)
      .values(insertSnapshot)
      .returning();
    return snapshot;
  }

  async getMonthlySummaries(clientId: string): Promise<MonthlySummary[]> {
    return await db
      .select()
      .from(monthlySummaries)
      .where(eq(monthlySummaries.clientId, clientId))
      .orderBy(desc(monthlySummaries.year), desc(monthlySummaries.month));
  }

  async createMonthlySummary(insertSummary: InsertMonthlySummary): Promise<MonthlySummary> {
    const [summary] = await db
      .insert(monthlySummaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  async getClientTimeByDepartment(clientId: string, month?: string): Promise<DepartmentTimeData[]> {
    let startDate: Date;
    let endDate: Date;
    
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const result = await db
      .select({
        departmentId: departments.id,
        departmentName: departments.name,
        totalHours: sql<number>`sum(${timeEntries.hours})::numeric`,
        totalCostCents: sql<number>`sum(${timeEntries.costCents})::integer`,
        memberCount: sql<number>`count(distinct ${timeEntries.memberId})::integer`
      })
      .from(timeEntries)
      .innerJoin(departments, eq(timeEntries.departmentId, departments.id))
      .where(
        and(
          eq(timeEntries.clientId, clientId),
          gte(timeEntries.start, startDate),
          lte(timeEntries.start, endDate)
        )
      )
      .groupBy(departments.id, departments.name);

    return result.map(row => ({
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      hours: Number(row.totalHours) || 0,
      spendCents: Number(row.totalCostCents) || 0,
      memberCount: Number(row.memberCount) || 0
    }));
  }

  async getDashboardSummary(): Promise<{
    activeClients: number;
    onTrackPercentage: number;
    totalRetainerCents: number;
    mtdSpendCents: number;
  }> {
    const activeClientsResult = await db
      .select({ count: sql<number>`count(*)::integer` })
      .from(clients)
      .where(eq(clients.status, "ACTIVE"));

    const activeClients = Number(activeClientsResult[0]?.count) || 0;

    const totalRetainerResult = await db
      .select({ 
        total: sql<number>`sum(${clients.monthlyRetainerAmountCents})::bigint` 
      })
      .from(clients)
      .where(eq(clients.status, "ACTIVE"));

    const totalRetainerCents = Number(totalRetainerResult[0]?.total) || 0;

    // Get MTD spend across all active clients
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const mtdSpendResult = await db
      .select({ 
        total: sql<number>`sum(${timeEntries.costCents})::bigint` 
      })
      .from(timeEntries)
      .innerJoin(clients, eq(timeEntries.clientId, clients.id))
      .where(
        and(
          eq(clients.status, "ACTIVE"),
          gte(timeEntries.start, startOfMonth),
          lte(timeEntries.start, endOfMonth)
        )
      );

    const mtdSpendCents = Number(mtdSpendResult[0]?.total) || 0;

    // Calculate on-track percentage (simplified)
    const clientsWithMetrics = await this.getClients({ status: "ACTIVE" });
    const onTrackCount = clientsWithMetrics.filter(c => c.health === "ON_TRACK").length;
    const onTrackPercentage = activeClients > 0 ? Math.round((onTrackCount / activeClients) * 100) : 0;

    return {
      activeClients,
      onTrackPercentage,
      totalRetainerCents,
      mtdSpendCents
    };
  }

  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const [topOverservingClients, topOverservingEmployees, hourlyRate] = await Promise.all([
      this.getTopOverservingClients(3),
      this.getTopOverservingEmployees(3),
      this.getHourlyRate()
    ]);

    const totalLostRevenueCents = await this.calculateLostRevenue();

    return {
      topOverservingClients,
      topOverservingEmployees,
      totalLostRevenueCents,
      hourlyRateCents: hourlyRate * 100
    };
  }

  async getTopOverservingClients(months: number = 3): Promise<OverservingClientData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        accountManager: clients.accountManager,
        totalHours: sql<number>`sum(${timeEntries.hours})::numeric`,
        totalCostCents: sql<number>`sum(${timeEntries.costCents})::integer`,
        retainerCents: sql<number>`(${clients.monthlyRetainerAmountCents} * ${months})::integer`
      })
      .from(timeEntries)
      .innerJoin(clients, eq(timeEntries.clientId, clients.id))
      .where(
        and(
          gte(timeEntries.start, startDate),
          eq(clients.status, "ACTIVE")
        )
      )
      .groupBy(clients.id, clients.name, clients.accountManager, clients.monthlyRetainerAmountCents)
      .having(sql`sum(${timeEntries.costCents}) > (${clients.monthlyRetainerAmountCents} * ${months})`)
      .orderBy(sql`(sum(${timeEntries.costCents}) - (${clients.monthlyRetainerAmountCents} * ${months})) DESC`)
      .limit(5);

    return result.map(row => ({
      clientId: row.clientId,
      clientName: row.clientName,
      accountManager: row.accountManager,
      averageOverservingHours: (Number(row.totalHours) || 0) / months,
      averageOverservingCents: (Number(row.totalCostCents) - Number(row.retainerCents)) / months
    }));
  }

  async getTopOverservingEmployees(months: number = 3): Promise<OverservingEmployeeData[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await db
      .select({
        memberId: teamMembers.id,
        memberName: teamMembers.name,
        departmentName: departments.name,
        totalHours: sql<number>`sum(${timeEntries.hours})::numeric`,
        totalCostCents: sql<number>`sum(${timeEntries.costCents})::integer`,
        avgRetainerUsage: sql<number>`avg(${timeEntries.costCents} / ${clients.monthlyRetainerAmountCents})::numeric`
      })
      .from(timeEntries)
      .innerJoin(teamMembers, eq(timeEntries.memberId, teamMembers.id))
      .innerJoin(departments, eq(teamMembers.departmentId, departments.id))
      .innerJoin(clients, eq(timeEntries.clientId, clients.id))
      .where(
        and(
          gte(timeEntries.start, startDate),
          eq(clients.status, "ACTIVE")
        )
      )
      .groupBy(teamMembers.id, teamMembers.name, departments.name)
      .having(sql`avg(${timeEntries.costCents} / ${clients.monthlyRetainerAmountCents}) > 0.2`)
      .orderBy(sql`sum(${timeEntries.costCents}) DESC`)
      .limit(5);

    return result.map(row => ({
      memberId: row.memberId,
      memberName: row.memberName,
      department: row.departmentName,
      averageOverservingHours: (Number(row.totalHours) || 0) / months,
      averageOverservingCents: (Number(row.totalCostCents) || 0) / months
    }));
  }

  async calculateLostRevenue(): Promise<number> {
    const hourlyRate = await this.getHourlyRate();
    const overservingClients = await this.getTopOverservingClients(1); // Last month

    const totalOverservingCents = overservingClients.reduce((sum, client) => {
      return sum + Math.max(0, client.averageOverservingCents);
    }, 0);

    return totalOverservingCents;
  }

  // Settings methods
  async getSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string, valueType: string = "string"): Promise<Settings> {
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
    return setting ? parseFloat(setting.value) : 150; // Default $150/hour
  }
}

export const storage = new DatabaseStorage();
