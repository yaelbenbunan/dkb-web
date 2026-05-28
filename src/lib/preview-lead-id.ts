function rand4(): string {
  return Math.floor(Math.random() * 0x10000)
    .toString(36)
    .padStart(4, "0")
    .slice(0, 4);
}

export function generateLeadId(): string {
  const ts = Date.now().toString(36);
  return `${ts}-${rand4()}`;
}

export function isLeadIdShape(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9]{4,}-[a-z0-9]{4}$/.test(v);
}
