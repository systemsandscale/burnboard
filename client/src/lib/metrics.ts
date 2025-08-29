export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function dayOfMonth(date: Date): number {
  return date.getDate();
}

export function idealTargetSpendToDate(retainerCents: number, date: Date): number {
  const totalDays = daysInMonth(date);
  const currentDay = dayOfMonth(date);
  return Math.round((retainerCents * currentDay) / totalDays);
}

export function burnPct(spendCents: number, retainerCents: number): number {
  if (retainerCents === 0) return 0;
  return spendCents / retainerCents;
}

export function variance(spendCents: number, targetCents: number) {
  const varianceCents = spendCents - targetCents;
  const variancePct = targetCents > 0 ? (spendCents / targetCents) - 1 : 0;
  
  return {
    varianceCents,
    variancePct
  };
}

export function health(burnPctMTD: number): "OVER" | "ON_TRACK" | "UNDER" {
  if (burnPctMTD > 1.10) return "OVER";
  if (burnPctMTD < 0.90) return "UNDER";
  return "ON_TRACK";
}

export function calculateClientMetrics(
  spendCents: number, 
  retainerCents: number, 
  date: Date = new Date()
) {
  const idealTarget = idealTargetSpendToDate(retainerCents, date);
  const burnPercentage = burnPct(spendCents, retainerCents);
  const varianceData = variance(spendCents, idealTarget);
  const healthStatus = health(burnPercentage);

  return {
    burnPctMTD: burnPercentage,
    idealTargetSpendToDateCents: idealTarget,
    varianceCents: varianceData.varianceCents,
    variancePct: varianceData.variancePct,
    health: healthStatus
  };
}
