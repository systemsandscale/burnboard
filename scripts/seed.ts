import { db } from "../server/db";
import { 
  clients, 
  departments, 
  teamMembers, 
  clientTeams, 
  timeEntries, 
  burnSnapshots, 
  monthlySummaries,
  type InsertClient,
  type InsertDepartment,
  type InsertTeamMember,
  type InsertClientTeam,
  type InsertTimeEntry,
  type InsertBurnSnapshot,
  type InsertMonthlySummary
} from "../shared/schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Clear existing data
    await db.delete(burnSnapshots);
    await db.delete(monthlySummaries);
    await db.delete(timeEntries);
    await db.delete(clientTeams);
    await db.delete(teamMembers);
    await db.delete(departments);
    await db.delete(clients);

    // Create departments
    const deptData: InsertDepartment[] = [
      { name: "SEO" },
      { name: "Paid Media" },
      { name: "Content" },
      { name: "Web Development" },
      { name: "Analytics" },
      { name: "Customer Experience" }
    ];

    const insertedDepartments = await db.insert(departments).values(deptData).returning();
    console.log(`✅ Created ${insertedDepartments.length} departments`);

    // Create clients
    const clientData: InsertClient[] = [
      {
        name: "Acme Corporation",
        acceloId: "ACC001",
        status: "ACTIVE",
        startDate: "2024-01-15",
        monthlyRetainerAmountCents: 1500000, // $15,000
        plannedHours: 120,
        hourlyBlendedRateCents: 12500, // $125
        accountManager: "Sarah Johnson"
      },
      {
        name: "TechFlow Solutions",
        acceloId: "ACC002", 
        status: "ACTIVE",
        startDate: "2024-02-01",
        monthlyRetainerAmountCents: 2500000, // $25,000
        plannedHours: 200,
        hourlyBlendedRateCents: 12500,
        accountManager: "Mike Chen"
      },
      {
        name: "Global Dynamics",
        acceloId: "ACC003",
        status: "ACTIVE", 
        startDate: "2024-03-10",
        monthlyRetainerAmountCents: 800000, // $8,000
        plannedHours: 64,
        hourlyBlendedRateCents: 12500,
        accountManager: "Emma Davis"
      },
      {
        name: "Innovate Labs",
        acceloId: "ACC004",
        status: "ACTIVE",
        startDate: "2024-01-05",
        monthlyRetainerAmountCents: 3200000, // $32,000
        plannedHours: 256,
        hourlyBlendedRateCents: 12500,
        accountManager: "Sarah Johnson"
      },
      {
        name: "Digital Pioneers",
        acceloId: "ACC005",
        status: "ACTIVE",
        startDate: "2024-02-20",
        monthlyRetainerAmountCents: 1200000, // $12,000
        plannedHours: 96,
        hourlyBlendedRateCents: 12500,
        accountManager: "Mike Chen"
      },
      {
        name: "Future Systems",
        acceloId: "ACC006",
        status: "ACTIVE",
        startDate: "2024-04-01",
        monthlyRetainerAmountCents: 1800000, // $18,000
        plannedHours: 144,
        hourlyBlendedRateCents: 12500,
        accountManager: "Emma Davis"
      },
      {
        name: "NextGen Commerce",
        acceloId: "ACC007",
        status: "ACTIVE",
        startDate: "2024-03-15",
        monthlyRetainerAmountCents: 2200000, // $22,000
        plannedHours: 176,
        hourlyBlendedRateCents: 12500,
        accountManager: "Sarah Johnson"
      },
      {
        name: "Quantum Technologies",
        acceloId: "ACC008",
        status: "ACTIVE",
        startDate: "2024-01-30",
        monthlyRetainerAmountCents: 2800000, // $28,000
        plannedHours: 224,
        hourlyBlendedRateCents: 12500,
        accountManager: "Mike Chen"
      },
      {
        name: "Legacy Corp",
        acceloId: "ACC009",
        status: "INACTIVE",
        startDate: "2023-06-01",
        monthlyRetainerAmountCents: 1000000, // $10,000
        plannedHours: 80,
        hourlyBlendedRateCents: 12500,
        accountManager: "Emma Davis"
      },
      {
        name: "Old School Industries",
        acceloId: "ACC010",
        status: "INACTIVE",
        startDate: "2023-03-15",
        monthlyRetainerAmountCents: 600000, // $6,000
        plannedHours: 48,
        hourlyBlendedRateCents: 12500,
        accountManager: "Sarah Johnson"
      }
    ];

    const insertedClients = await db.insert(clients).values(clientData).returning();
    console.log(`✅ Created ${insertedClients.length} clients`);

    // Create team members
    const teamMemberData: InsertTeamMember[] = [
      { name: "Alex Rodriguez", email: "alex@agency.com", role: "SEO Specialist", departmentId: insertedDepartments[0].id },
      { name: "Maria Garcia", email: "maria@agency.com", role: "SEO Manager", departmentId: insertedDepartments[0].id },
      { name: "James Wilson", email: "james@agency.com", role: "PPC Specialist", departmentId: insertedDepartments[1].id },
      { name: "Lisa Zhang", email: "lisa@agency.com", role: "Paid Media Manager", departmentId: insertedDepartments[1].id },
      { name: "David Kim", email: "david@agency.com", role: "Content Writer", departmentId: insertedDepartments[2].id },
      { name: "Rachel Brown", email: "rachel@agency.com", role: "Content Strategist", departmentId: insertedDepartments[2].id },
      { name: "Tom Anderson", email: "tom@agency.com", role: "Frontend Developer", departmentId: insertedDepartments[3].id },
      { name: "Sophie Taylor", email: "sophie@agency.com", role: "Backend Developer", departmentId: insertedDepartments[3].id },
      { name: "Kevin Lee", email: "kevin@agency.com", role: "UX Designer", departmentId: insertedDepartments[3].id },
      { name: "Emily Chen", email: "emily@agency.com", role: "Data Analyst", departmentId: insertedDepartments[4].id },
      { name: "Michael Foster", email: "michael@agency.com", role: "Analytics Manager", departmentId: insertedDepartments[4].id },
      { name: "Jessica Liu", email: "jessica@agency.com", role: "CX Specialist", departmentId: insertedDepartments[5].id },
      { name: "Daniel Park", email: "daniel@agency.com", role: "CX Manager", departmentId: insertedDepartments[5].id },
      { name: "Amy Thompson", email: "amy@agency.com", role: "Junior SEO Specialist", departmentId: insertedDepartments[0].id },
      { name: "Ryan Miller", email: "ryan@agency.com", role: "Junior Developer", departmentId: insertedDepartments[3].id },
      { name: "Grace Wong", email: "grace@agency.com", role: "Content Editor", departmentId: insertedDepartments[2].id },
      { name: "Noah Davis", email: "noah@agency.com", role: "PPC Analyst", departmentId: insertedDepartments[1].id },
      { name: "Olivia Johnson", email: "olivia@agency.com", role: "Social Media Manager", departmentId: insertedDepartments[2].id },
      { name: "Lucas Martinez", email: "lucas@agency.com", role: "Technical SEO", departmentId: insertedDepartments[0].id },
      { name: "Chloe White", email: "chloe@agency.com", role: "UX Researcher", departmentId: insertedDepartments[3].id }
    ];

    const insertedTeamMembers = await db.insert(teamMembers).values(teamMemberData).returning();
    console.log(`✅ Created ${insertedTeamMembers.length} team members`);

    // Create client team assignments (2-4 members per active client)
    const clientTeamData: InsertClientTeam[] = [];
    const activeClients = insertedClients.filter(c => c.status === "ACTIVE");
    
    activeClients.forEach((client, index) => {
      const teamSize = 2 + Math.floor(Math.random() * 3); // 2-4 members
      const assignedMembers = insertedTeamMembers
        .slice(index * 2, index * 2 + teamSize)
        .map(member => ({
          clientId: client.id,
          memberId: member.id
        }));
      clientTeamData.push(...assignedMembers);
    });

    await db.insert(clientTeams).values(clientTeamData);
    console.log(`✅ Created ${clientTeamData.length} client team assignments`);

    // Generate time entries for current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = now.getDate();

    const timeEntryData: InsertTimeEntry[] = [];
    
    for (const client of activeClients) {
      const clientTeamMembers = clientTeamData
        .filter(ct => ct.clientId === client.id)
        .map(ct => insertedTeamMembers.find(tm => tm.id === ct.memberId))
        .filter(Boolean);

      // Generate entries for each day up to today
      for (let day = 1; day <= today; day++) {
        const date = new Date(currentYear, currentMonth, day);
        
        // Each team member has a chance to log time
        for (const member of clientTeamMembers) {
          if (Math.random() > 0.3) { // 70% chance of logging time
            const hours = 1 + Math.random() * 7; // 1-8 hours
            const costCents = Math.round(hours * (client.hourlyBlendedRateCents || 12500));
            
            timeEntryData.push({
              clientId: client.id,
              memberId: member!.id,
              departmentId: member!.departmentId,
              start: new Date(date.setHours(9, 0, 0, 0)),
              end: new Date(date.setHours(9 + Math.floor(hours), (hours % 1) * 60, 0, 0)),
              hours: Math.round(hours * 10) / 10,
              costCents
            });
          }
        }
      }
    }

    await db.insert(timeEntries).values(timeEntryData);
    console.log(`✅ Created ${timeEntryData.length} time entries`);

    // Generate burn snapshots for current month
    const burnSnapshotData: InsertBurnSnapshot[] = [];
    
    for (const client of activeClients) {
      let cumulativeSpend = 0;
      let cumulativeHours = 0;
      
      for (let day = 1; day <= today; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = date.toISOString().split('T')[0];
        
        // Calculate spend for this day
        const dayEntries = timeEntryData.filter(entry => 
          entry.clientId === client.id && 
          new Date(entry.start).getDate() === day
        );
        
        const daySpend = dayEntries.reduce((sum, entry) => sum + entry.costCents, 0);
        const dayHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
        
        cumulativeSpend += daySpend;
        cumulativeHours += dayHours;
        
        const targetSpendToDate = Math.round(
          (client.monthlyRetainerAmountCents * day) / daysInCurrentMonth
        );
        
        burnSnapshotData.push({
          clientId: client.id,
          date: dateStr,
          spendToDateCents: cumulativeSpend,
          hoursToDate: cumulativeHours,
          targetSpendToDateCents: targetSpendToDate
        });
      }
    }

    await db.insert(burnSnapshots).values(burnSnapshotData);
    console.log(`✅ Created ${burnSnapshotData.length} burn snapshots`);

    // Generate monthly summaries for last 12 months
    const monthlySummaryData: InsertMonthlySummary[] = [];
    
    for (const client of insertedClients) {
      for (let i = 1; i <= 12; i++) {
        const summaryDate = new Date(currentYear, currentMonth - i, 1);
        const year = summaryDate.getFullYear();
        const month = summaryDate.getMonth() + 1;
        
        // Generate realistic but varied monthly data
        const baseHours = (client.plannedHours || 80) * (0.7 + Math.random() * 0.6); // 70-130% of planned
        const totalHours = Math.round(baseHours * 10) / 10;
        const totalSpendCents = Math.round(totalHours * (client.hourlyBlendedRateCents || 12500));
        const varianceCents = totalSpendCents - client.monthlyRetainerAmountCents;
        const variancePct = (totalSpendCents / client.monthlyRetainerAmountCents) - 1;
        
        monthlySummaryData.push({
          clientId: client.id,
          month,
          year,
          totalHours,
          totalSpendCents,
          varianceCents,
          variancePct
        });
      }
    }

    await db.insert(monthlySummaries).values(monthlySummaryData);
    console.log(`✅ Created ${monthlySummaryData.length} monthly summaries`);

    console.log("🎉 Database seeded successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });