const denver: Intl.DateTimeFormatOptions = { timeZone: "America/Denver" };

export function formatChallengeDate(iso: string | null): string {
  if (!iso) return "Open";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-US", {
    ...denver,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    ...denver,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function proofLabel(proof: string): string {
  if (proof === "photo") return "Photo";
  if (proof === "video") return "Video";
  if (proof === "text") return "Words";
  return "Anything";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}
