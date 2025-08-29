import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  timestamp, 
  date, 
  real,
  pgEnum 
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clientStatusEnum = pgEnum("client_status", ["ACTIVE", "INACTIVE"]);
export const healthStatusEnum = pgEnum("health_status", ["OVER", "ON_TRACK", "UNDER"]);

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  acceloId: varchar("accelo_id"),
  status: clientStatusEnum("status").notNull().default("ACTIVE"),
  startDate: date("start_date").notNull(),
  monthlyRetainerAmountCents: integer("monthly_retainer_amount_cents").notNull(),
  plannedHours: real("planned_hours"),
  hourlyBlendedRateCents: integer("hourly_blended_rate_cents"),
  accountManager: text("account_manager").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique()
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  departmentId: varchar("department_id").notNull().references(() => departments.id),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

export const clientTeams = pgTable("client_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  memberId: varchar("member_id").notNull().references(() => teamMembers.id)
});

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  memberId: varchar("member_id").notNull().references(() => teamMembers.id),
  departmentId: varchar("department_id").notNull().references(() => departments.id),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  hours: real("hours").notNull(),
  costCents: integer("cost_cents").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`)
});

export const burnSnapshots = pgTable("burn_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  date: date("date").notNull(),
  spendToDateCents: integer("spend_to_date_cents").notNull(),
  hoursToDate: real("hours_to_date").notNull(),
  targetSpendToDateCents: integer("target_spend_to_date_cents").notNull()
});

export const monthlySummaries = pgTable("monthly_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalHours: real("total_hours").notNull(),
  totalSpendCents: integer("total_spend_cents").notNull(),
  varianceCents: integer("variance_cents").notNull(),
  variancePct: real("variance_pct").notNull()
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  timeEntries: many(timeEntries),
  burnSnapshots: many(burnSnapshots),
  monthlySummaries: many(monthlySummaries),
  clientTeams: many(clientTeams)
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  teamMembers: many(teamMembers),
  timeEntries: many(timeEntries)
}));

export const teamMembersRelations = relations(teamMembers, ({ one, many }) => ({
  department: one(departments, {
    fields: [teamMembers.departmentId],
    references: [departments.id]
  }),
  timeEntries: many(timeEntries),
  clientTeams: many(clientTeams)
}));

export const clientTeamsRelations = relations(clientTeams, ({ one }) => ({
  client: one(clients, {
    fields: [clientTeams.clientId],
    references: [clients.id]
  }),
  member: one(teamMembers, {
    fields: [clientTeams.memberId],
    references: [teamMembers.id]
  })
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  client: one(clients, {
    fields: [timeEntries.clientId],
    references: [clients.id]
  }),
  member: one(teamMembers, {
    fields: [timeEntries.memberId],
    references: [teamMembers.id]
  }),
  department: one(departments, {
    fields: [timeEntries.departmentId],
    references: [departments.id]
  })
}));

export const burnSnapshotsRelations = relations(burnSnapshots, ({ one }) => ({
  client: one(clients, {
    fields: [burnSnapshots.clientId],
    references: [clients.id]
  })
}));

export const monthlySummariesRelations = relations(monthlySummaries, ({ one }) => ({
  client: one(clients, {
    fields: [monthlySummaries.clientId],
    references: [clients.id]
  })
}));

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertClientTeamSchema = createInsertSchema(clientTeams).omit({
  id: true
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true
});

export const insertBurnSnapshotSchema = createInsertSchema(burnSnapshots).omit({
  id: true
});

export const insertMonthlySummarySchema = createInsertSchema(monthlySummaries).omit({
  id: true
});

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type ClientTeam = typeof clientTeams.$inferSelect;
export type InsertClientTeam = z.infer<typeof insertClientTeamSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type BurnSnapshot = typeof burnSnapshots.$inferSelect;
export type InsertBurnSnapshot = z.infer<typeof insertBurnSnapshotSchema>;
export type MonthlySummary = typeof monthlySummaries.$inferSelect;
export type InsertMonthlySummary = z.infer<typeof insertMonthlySummarySchema>;

// Extended types with calculated fields
export type ClientWithMetrics = Client & {
  mtdSpendCents: number;
  mtdHours: number;
  burnPctMTD: number;
  idealTargetSpendToDateCents: number;
  varianceCents: number;
  variancePct: number;
  health: "OVER" | "ON_TRACK" | "UNDER";
  teamCount?: number;
};

export type DepartmentTimeData = {
  departmentId: string;
  departmentName: string;
  hours: number;
  spendCents: number;
  memberCount: number;
};

export type OverservingClientData = {
  clientId: string;
  clientName: string;
  averageOverservingHours: number;
  averageOverservingCents: number;
  accountManager: string;
};

export type OverservingEmployeeData = {
  memberId: string;
  memberName: string;
  department: string;
  averageOverservingHours: number;
  averageOverservingCents: number;
};

export type DashboardAnalytics = {
  topOverservingClients: OverservingClientData[];
  topOverservingEmployees: OverservingEmployeeData[];
  totalLostRevenueCents: number;
  hourlyRateCents: number;
};

// Settings table for app configuration
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  valueType: text("value_type").notNull().default("string"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Keep the original user schema for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
  valueType: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
