export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(cents / 100);
}

export function formatPercent(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours.toFixed(1)}h`;
}

export function formatVariance(varianceCents: number, variancePct: number): {
  text: string;
  color: string;
  sign: string;
} {
  const isPositive = varianceCents >= 0;
  const sign = isPositive ? "+" : "";
  const color = isPositive ? "text-green-600" : "text-red-600";
  
  return {
    text: `${sign}${formatCurrency(Math.abs(varianceCents))} (${sign}${formatPercent(Math.abs(variancePct))})`,
    color,
    sign
  };
}

export function getHealthColor(health: "OVER" | "ON_TRACK" | "UNDER"): string {
  switch (health) {
    case "OVER":
      return "bg-red-500 text-white";
    case "UNDER":
      return "bg-yellow-500 text-black";
    case "ON_TRACK":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

export function getBurnBarColor(burnPct: number): string {
  if (burnPct > 1.10) return "bg-red-500";
  if (burnPct < 0.90) return "bg-yellow-500";
  return "bg-primary";
}
